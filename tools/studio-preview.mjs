import { createServer } from 'node:http';import { mkdir,readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { studioDb } from './studio-db.mjs';import { handlePublishing } from '../.local/publishing.mjs';
const root=new URL('../',import.meta.url);await mkdir(new URL('.local/',root),{recursive:true,mode:0o700});
const fixture=studioDb(fileURLToPath(new URL('.local/studio.sqlite',root)));const port=Number(process.env.STUDIO_PORT||8789);const origin=`http://127.0.0.1:${port}`;
const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8'};
const server=createServer(async(req,res)=>{
 try{
  if(req.headers.host!==`127.0.0.1:${port}`||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.writeHead(403);res.end('LOOPBACK_ONLY');return;}
  const path=new URL(req.url,origin).pathname;const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>240000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const parsed=(req.headers.cookie||'').match(/(?:^|;\s*)studio_preview_role=(writer|reviewer)(?:;|$)/);const role=parsed?.[1]||'writer';
  if(path==='/__preview/identity'&&req.method==='POST'){
   if(req.headers.origin!==origin){res.writeHead(403);res.end();return;}
   const value=JSON.parse(Buffer.concat(chunks));if(!['writer','reviewer'].includes(value.role)){res.writeHead(400);res.end();return;}
   res.writeHead(200,{'Set-Cookie':`studio_preview_role=${value.role}; HttpOnly; SameSite=Strict; Path=/`,'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return;
  }
  if(path.startsWith('/api/publishing/')){
   const headers=new Headers(req.headers);headers.set('Cookie','ai_muonnoi_session='+fixture.sessions[role]);
   const request=new Request(origin+req.url,{method:req.method,headers,body:chunks.length?Buffer.concat(chunks):undefined});
   // Publication remains locked even in preview; tests use an isolated in-memory DB to exercise it.
   const result=await handlePublishing(request,{iai_flow_db:fixture.d1,APP_ORIGIN:origin,STUDIO_PUBLISH_ENABLED:'false'});
   let body=await result.text();if(path==='/api/publishing/capabilities'){body=JSON.stringify({...JSON.parse(body),localPreview:true,previewRole:role});}
   res.writeHead(result.status,Object.fromEntries(result.headers));res.end(body);return;
  }
  let asset=path==='/'||path==='/studio/'?'studio/index.html':path.slice(1);
  if(!['studio/index.html','studio/studio.css','studio/studio.js'].includes(asset)){res.writeHead(404);res.end('Preview exposes Studio only');return;}
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const body=await readFile(new URL(asset,root));res.writeHead(200,{'Content-Type':types[asset.split('.').pop()],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'"});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(500);res.end('PREVIEW_ERROR');}
});
server.listen(port,'127.0.0.1',()=>console.log(`Studio local-only: ${origin}/studio/ · persistent fixture SQLite · no provider calls`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{fixture.close();process.exit(0);}));
