import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {build} from '../workers/revenueops/node_modules/esbuild/lib/main.js';
import {studioDb} from './studio-db.mjs';
await build({entryPoints:['workers/api/src/api/intake-api.ts'],bundle:true,format:'esm',platform:'node',target:'node24',outfile:'.local/intake-preview-handler.mjs'});
const {handleIntake}=await import('../.local/intake-preview-handler.mjs');
const fixture=studioDb();
fixture.db.exec(await readFile('workers/api/migrations/0010_studio_intake.sql','utf8'));
fixture.db.exec(await readFile('workers/api/migrations/0011_studio_triage.sql','utf8'));
const origin='http://127.0.0.1:8790';
const manifest=JSON.parse(await readFile('.local/site-manifest.json','utf8'));
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json',svg:'image/svg+xml',png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'none'"};
const server=createServer(async(req,res)=>{
 try{
  if(req.headers.host!=='127.0.0.1:8790'||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.writeHead(403);res.end();return;}
  const url=new URL(req.url,origin);
  // Test-only identity selection lives entirely in this loopback server, never in the shipped bundle.
  if(url.pathname==='/__preview/identity'&&req.method==='POST'){
   if(req.headers.origin!==origin){res.writeHead(403);res.end();return;}
   const role=url.searchParams.get('role');
   if(!['writer','reviewer','other','inactive'].includes(role)){res.writeHead(400);res.end();return;}
   res.writeHead(200,{...headers,'Content-Type':'application/json','Set-Cookie':`fixture_role=${role}; Path=/; HttpOnly; SameSite=Strict`});res.end(JSON.stringify({ok:true,localFixture:true,role}));return;
  }
  if(url.pathname.startsWith('/api/intake/')){
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>24000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const role=req.headers.cookie?.match(/(?:^|;\s*)fixture_role=(writer|reviewer|other|inactive)(?:;|$)/)?.[1]||'writer';
   const requestHeaders=new Headers(req.headers);requestHeaders.set('Cookie','ai_muonnoi_session='+fixture.sessions[role]);
   const request=new Request(url,{method:req.method,headers:requestHeaders,body:chunks.length?Buffer.concat(chunks):undefined});
   const response=await handleIntake(request,{iai_flow_db:fixture.d1,APP_ORIGIN:origin,STUDIO_INTAKE_ENABLED:'true',STUDIO_TRIAGE_ENABLED:'true',STUDIO_OPERATOR_IDS:'2'});
   let body=await response.text();if(url.pathname==='/api/intake/capabilities')body=JSON.stringify({...JSON.parse(body),localFixture:true});
   res.writeHead(response.status,{...Object.fromEntries(response.headers),...headers});res.end(body);return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const asset=url.pathname.slice(1)+(url.pathname.endsWith('/')?'index.html':'');
  if(!manifest.files.includes(asset)){res.writeHead(404,headers);res.end('Not in the public artifact');return;}
  const body=await readFile(new URL('../dist/site/'+asset,import.meta.url));
  res.writeHead(200,{...headers,'Content-Type':types[asset.split('.').pop()]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(500,headers);res.end('LOCAL_PREVIEW_ERROR');}
});
server.listen(8790,'127.0.0.1',()=>console.log(origin+'/offers/brief/ — loopback only, synthetic writer, ephemeral SQLite, no external API calls'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{fixture.close();process.exit(0);}));
