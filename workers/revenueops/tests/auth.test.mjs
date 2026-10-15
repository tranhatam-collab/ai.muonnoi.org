import test from 'node:test';import assert from 'node:assert/strict';
import { authenticate } from '../src/auth.ts';
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
async function fixture(options={}){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test-key';
 const issuer='https://test-'+crypto.randomUUID()+'.cloudflareaccess.com';const now=Math.floor(Date.now()/1000);
 const payload={iss:issuer,aud:['app-test'],sub:'verified-user',email:'owner@example.test',iat:now,exp:now+3600,...options};
 const h=encode({alg:'RS256',kid:'test-key'}),p=encode(payload);const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(h+'.'+p));
 const token=h+'.'+p+'.'+Buffer.from(sig).toString('base64url');
 return {request:new Request('https://revenue.example/api/report',{headers:{'Cf-Access-Jwt-Assertion':token}}),config:{issuer,audience:'app-test',rolesJson:JSON.stringify({'owner@example.test':'finance'})},fetcher:async()=>Response.json({keys:[jwk]}),token,payload};
}
test('signed JWT maps role from server configuration and ignores token role',async()=>{const f=await fixture({role:'owner'});assert.deepEqual(await authenticate(f.request,f.config,f.fetcher),{id:'verified-user',role:'finance'});});
test('tampered payload and unsigned alg none rejected',async()=>{
 const f=await fixture();const parts=f.token.split('.');parts[1]=encode({...f.payload,email:'other@example.test'});
 await assert.rejects(authenticate(new Request('https://revenue.example',{headers:{'Cf-Access-Jwt-Assertion':parts.join('.')}}),f.config,f.fetcher),{code:'UNAUTHENTICATED'});
 parts[0]=encode({alg:'none',kid:'test-key'});await assert.rejects(authenticate(new Request('https://revenue.example',{headers:{'Cf-Access-Jwt-Assertion':parts.join('.')}}),f.config,f.fetcher),{code:'UNAUTHENTICATED'});
});
test('expired token and incorrect audience fail before network',async()=>{
 for(const options of [{exp:1},{aud:['different-app']}]){const f=await fixture(options);let requests=0;await assert.rejects(authenticate(f.request,f.config,async()=>{requests++;throw Error();}),{code:'UNAUTHENTICATED'});assert.equal(requests,0);}
});
test('unconfigured or attacker-controlled issuer cannot trigger JWKS fetch',async()=>{
 const f=await fixture();let requests=0;await assert.rejects(authenticate(f.request,{...f.config,issuer:'https://attacker.example'},async()=>{requests++;throw Error();}),{code:'ACCESS_NOT_CONFIGURED'});assert.equal(requests,0);
});
test('valid signature without mapped role has no application access',async()=>{const f=await fixture();await assert.rejects(authenticate(f.request,{...f.config,rolesJson:'{}'},f.fetcher),{code:'FORBIDDEN'});});
