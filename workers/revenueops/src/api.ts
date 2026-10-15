import { agents, DomainError, ensure, exactKeys, portfolioScenario, requireRole, text } from './domain.ts';
import type { Actor } from './domain.ts';
import type { Coordinator, AiBinding } from './coordinator.ts';
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY',
  'Permissions-Policy':'camera=(), microphone=(), geolocation=()','Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'
};
export function json(value: unknown, status=200): Response {return Response.json(value,{status,headers:securityHeaders});}
export async function readBody(request: Request) {
  ensure(request.headers.get('Content-Type')?.split(';')[0].trim()==='application/json','JSON_REQUIRED',415);
  const reader=request.body?.getReader();ensure(reader,'BODY_REQUIRED',400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>16384){await reader.cancel();throw new DomainError('BODY_TOO_LARGE',413);}chunks.push(r.value);}
  const data=new Uint8Array(size);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
  try {const body=JSON.parse(new TextDecoder().decode(data));exactKeys(body,Object.keys(body??{}));return body;}catch(error){if(error instanceof DomainError)throw error;throw new DomainError('INVALID_JSON',400);}
}
export async function command(coordinator: Coordinator, name: string, payload: Record<string,unknown>, actor: Actor, ai?: AiBinding) {
  if(name==='report'){return coordinator.report(actor);}
  if(name==='daily'){exactKeys(payload,[]);return coordinator.planDay(actor);}
  if(name==='stop'){exactKeys(payload,[]);return coordinator.stop(actor);}
  if(name==='generate'){exactKeys(payload,['agentId']);return coordinator.generate(text(payload.agentId),actor,ai);}
  if(name==='work:list')return coordinator.work(actor);
  if(name==='work:offer')return coordinator.offerWork(payload,actor);
  if(name.startsWith('work:')) {
    const {id,...data}=payload;return coordinator.transitionWork(text(id),name.slice(5),data,actor);
  }
  throw new DomainError('NOT_FOUND',404);
}
export type Services = {
  authenticate: (request: Request)=>Promise<Actor>;
  dispatch: (name: string, payload: Record<string,unknown>, actor: Actor)=>Promise<unknown>;
  assets: (request: Request)=>Promise<Response>;
};
export async function route(request: Request, services: Services): Promise<Response> {
  const url=new URL(request.url);
  try {
    if(url.pathname==='/api/health' && request.method==='GET')return json({service:'tam-revenueops',release:'HOLD',version:'0.1.0'});
    if(url.pathname==='/api/catalog' && request.method==='GET')return json({status:'DRAFT_NOT_FOR_SALE',products:agents.map(a=>({id:a.id,name:a.name,scope:a.scope,priceVnd:a.priceVnd,commercialStatus:a.commercialStatus})),checkoutEnabled:false});
    if(url.pathname==='/api/checkout' || url.pathname==='/api/webhooks/payment')return json({error:'COMMERCE_NOT_IMPLEMENTED_AND_LOCKED'},423);
    if(url.pathname.startsWith('/api/')) {
      const actor=await services.authenticate(request);
      if(request.method==='POST')ensure(request.headers.get('Origin')===url.origin,'ORIGIN_REJECTED',403);
      if(request.method==='GET' && url.pathname==='/api/report')return json(await services.dispatch('report',{},actor));
      if(request.method==='GET' && url.pathname==='/api/work')return json(await services.dispatch('work:list',{},actor));
      if(request.method==='GET' && url.pathname==='/api/scenario'){
        requireRole(actor,['owner','manager','finance','reviewer']);
        return json(portfolioScenario(Number(url.searchParams.get('volume')??1),Number(url.searchParams.get('margin')??0)));
      }
      if(request.method==='POST') {
        const names:Record<string,string>={'/api/run-daily':'daily','/api/stop':'stop','/api/generate':'generate','/api/work/offer':'work:offer'};
        const name=names[url.pathname];const body=await readBody(request);
        if(name)return json(await services.dispatch(name,body,actor));
        const m=url.pathname.match(/^\/api\/work\/([a-zA-Z0-9:_-]+)\/(accept|submit|review|payable)$/);
        if(m){ensure(!('id' in body),'UNEXPECTED_FIELD',400);return json(await services.dispatch('work:'+m[2],{...body,id:m[1]},actor));}
      }
      throw new DomainError('NOT_FOUND',404);
    }
    ensure(['GET','HEAD'].includes(request.method),'METHOD_NOT_ALLOWED',405);
    // Explicit public asset allowlist prevents source, database, reports or paid products leaking.
    ensure(['/','/console','/shop','/sample','/orders','/work','/index.html','/app.js','/styles.css','/sample.html','/favicon.svg'].includes(url.pathname),'NOT_FOUND',404);
    const assetUrl=new URL(request.url);if(['/console','/shop','/orders','/work'].includes(url.pathname))assetUrl.pathname='/index.html';if(url.pathname==='/sample')assetUrl.pathname='/sample.html';
    const asset=await services.assets(new Request(assetUrl,request));
    const headers=new Headers(asset.headers);for(const [k,v] of Object.entries(securityHeaders))headers.set(k,v);
    return new Response(asset.body,{status:asset.status,headers});
  } catch(error) {
    if(error instanceof DomainError)return json({error:error.code},error.status);
    return json({error:'INTERNAL_ERROR'},500);
  }
}
