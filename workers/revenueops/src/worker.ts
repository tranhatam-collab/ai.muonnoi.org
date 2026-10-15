import { DurableObject } from 'cloudflare:workers';
import { Coordinator } from './coordinator.ts';
import type { AiBinding } from './coordinator.ts';
import { authenticate } from './auth.ts';
import { command, json, route } from './api.ts';
import { defaultPolicy, DomainError } from './domain.ts';
import type { Actor } from './domain.ts';
import type { Scalar, Store } from './storage.ts';

interface Env {
  COORDINATOR: DurableObjectNamespace;
  ASSETS: Fetcher;
  AI?: AiBinding;
  ACCESS_ISSUER?: string;
  ACCESS_AUDIENCE?: string;
  ACCESS_ROLES_JSON?: string;
}
export class RevenueCoordinator extends DurableObject<Env> {
  coordinator: Coordinator;
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx,env); let depth=0;
    const store:Store={
      rows:<T>(query:string,...params:Scalar[])=>Array.from(ctx.storage.sql.exec(query,...params)) as T[],
      exec:(query,...params)=>{ctx.storage.sql.exec(query,...params);},
      transaction:<T>(fn:()=>T):T=>{if(depth)return fn();return ctx.storage.transactionSync(()=>{depth++;try{return fn();}finally{depth--;}});}
    };
    this.coordinator=new Coordinator(store);
  }
  async fetch(request: Request) {
    // This object has no public route. Only the authenticated parent Worker can address this binding.
    const data=await request.json() as {name:string;payload:Record<string,unknown>;actor:Actor};
    try {return json(await command(this.coordinator,data.name,data.payload,data.actor,this.env.AI));}
    catch(error){return error instanceof DomainError?json({error:error.code},error.status):json({error:'COORDINATOR_ERROR'},500);}
  }
}
export default {
  async fetch(request:Request,env:Env):Promise<Response> {
    return route(request,{
      authenticate:r=>authenticate(r,{issuer:env.ACCESS_ISSUER,audience:env.ACCESS_AUDIENCE,rolesJson:env.ACCESS_ROLES_JSON}),
      dispatch:async(name,payload,actor)=>{
        const stub=env.COORDINATOR.get(env.COORDINATOR.idFromName('portfolio-v1'));
        const response=await stub.fetch(new Request('https://coordinator.internal',{method:'POST',body:JSON.stringify({name,payload,actor})}));
        const data=await response.json() as {error?:string};if(!response.ok)throw new DomainError(data.error??'COORDINATOR_ERROR',response.status);return data;
      },
      assets:r=>env.ASSETS.fetch(r)
    });
  },
  async scheduled(_event:ScheduledController,env:Env) {
    if(!defaultPolicy.schedulerEnabled)return;
    const stub=env.COORDINATOR.get(env.COORDINATOR.idFromName('portfolio-v1'));
    const response=await stub.fetch(new Request('https://coordinator.internal',{method:'POST',body:JSON.stringify({name:'daily',payload:{},actor:{id:'system:daily-planner',role:'owner'}})}));
    if(!response.ok)throw new Error('DAILY_PLANNER_FAILED');
  }
};
