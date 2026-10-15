import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { localStore } from './local-store.mjs';
import { Coordinator } from '../src/coordinator.ts';
import { route, command } from '../src/api.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
await mkdir(root+'.local',{recursive:true,mode:0o700});
const store=localStore(root+'.local/revenueops.sqlite');const coordinator=new Coordinator(store);
const port=Number(process.env.REVENUEOPS_PORT??8787);const origin=`http://127.0.0.1:${port}`;
const mime={'.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.html':'text/html; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try {
    // No LAN listener; Host validation also prevents DNS rebinding to the loopback preview.
    if(req.headers.host!==`127.0.0.1:${port}` || !['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){res.writeHead(403);res.end('LOOPBACK_ONLY');return;}
    const chunks=[];let total=0;
    for await(const chunk of req){total+=chunk.length;if(total>16384){res.writeHead(413);res.end('BODY_TOO_LARGE');return;}chunks.push(chunk);}
    const request=new Request(origin+req.url,{method:req.method,headers:req.headers,body:chunks.length?Buffer.concat(chunks):undefined});
    const response=await route(request,{
      // This actor is injected by the loopback-only development server, never from request input.
      authenticate:async()=>({id:'local-preview-owner',role:'owner'}),
      dispatch:async(name,payload,actor)=>command(coordinator,name,payload,actor),
      assets:async r=>{
        let path=new URL(r.url).pathname;if(path==='/')path='/index.html';
        try{return new Response(await readFile(root+'public'+path),{headers:{'Content-Type':mime[path.slice(path.lastIndexOf('.'))]??'text/plain'}});}
        catch{return new Response('Not found',{status:404});}
      }
    });
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
  } catch {res.writeHead(500);res.end('LOCAL_SERVER_ERROR');}
});
server.listen(port,'127.0.0.1',()=>console.log(`RevenueOps local preview: ${origin}\nSQLite persistent; AI, commerce and publishing locked; no provider calls.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
