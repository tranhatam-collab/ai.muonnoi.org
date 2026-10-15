import { DomainError, ensure } from './domain.ts';
import type { Actor, Role } from './domain.ts';
export type AccessConfig = { issuer?: string; audience?: string; rolesJson?: string };
const cache = new Map<string,{expires:number;keys:(JsonWebKey & {kid?:string})[]}>();
function decode(part: string): Uint8Array<ArrayBuffer> {
  const raw=atob(part.replace(/-/g,'+').replace(/_/g,'/'));const bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;
}
function object(part: string): Record<string,unknown> { return JSON.parse(new TextDecoder().decode(decode(part))); }
export async function authenticate(request: Request, config: AccessConfig, fetcher: typeof fetch = fetch): Promise<Actor> {
  try {
    ensure(config.issuer && /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(config.issuer) && config.audience && config.rolesJson,'ACCESS_NOT_CONFIGURED',503);
    const token=request.headers.get('Cf-Access-Jwt-Assertion');ensure(token && token.length<=16000,'UNAUTHENTICATED',401);
    const parts=token.split('.');ensure(parts.length===3,'UNAUTHENTICATED',401);
    const header=object(parts[0]),payload=object(parts[1]);
    ensure(header.alg==='RS256' && typeof header.kid==='string' && !header.jku && !header.jwk,'UNAUTHENTICATED',401);
    const now=Math.floor(Date.now()/1000);
    ensure(payload.iss===config.issuer && Array.isArray(payload.aud) && payload.aud.includes(config.audience),'UNAUTHENTICATED',401);
    ensure(typeof payload.exp==='number' && payload.exp>now && typeof payload.iat==='number' && payload.iat<=now+30,'UNAUTHENTICATED',401);
    ensure(payload.nbf===undefined || (typeof payload.nbf==='number' && payload.nbf<=now),'UNAUTHENTICATED',401);
    ensure(typeof payload.email==='string' && typeof payload.sub==='string' && payload.sub.length>0,'UNAUTHENTICATED',401);
    let entry=cache.get(config.issuer);
    if(!entry || entry.expires<Date.now()) {
      const result=await fetcher(config.issuer+'/cdn-cgi/access/certs',{redirect:'error',signal:AbortSignal.timeout(5000)});
      ensure(result.ok,'ACCESS_KEYS_UNAVAILABLE',503);
      const jwks=await result.json() as {keys?: (JsonWebKey & {kid?:string})[]};
      ensure(Array.isArray(jwks.keys) && jwks.keys.length>0 && jwks.keys.length<=20,'ACCESS_KEYS_INVALID',503);
      entry={expires:Date.now()+300000,keys:jwks.keys};cache.set(config.issuer,entry);
    }
    const jwk=entry.keys.find(k=>k.kid===header.kid && k.kty==='RSA');ensure(jwk,'UNAUTHENTICATED',401);
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    ensure(await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])),'UNAUTHENTICATED',401);
    // Role comes only from server config. Header/body role and JWT role claims are ignored.
    const roles=JSON.parse(config.rolesJson) as Record<string,string>;
    const role=roles[payload.email.toLowerCase()];
    ensure(['owner','manager','worker','reviewer','finance'].includes(role),'FORBIDDEN',403);
    return {id:payload.sub,role:role as Role};
  } catch(error) {
    if(error instanceof DomainError)throw error;
    throw new DomainError('UNAUTHENTICATED',401);
  }
}
