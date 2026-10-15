import { workerData,parentPort } from 'node:worker_threads';
import { localStore } from './local-store.mjs';
import { Coordinator } from '../src/coordinator.ts';
const store=localStore(workerData.path);const c=new Coordinator(store,workerData.policy,()=>new Date('2026-10-15T02:00:00Z'));
try{c.reserve(workerData.id,workerData.agentId,100,'ai',{id:'test-owner',role:'owner'});parentPort.postMessage('RESERVED');}
catch(e){parentPort.postMessage(e.code??e.message);}finally{store.close();}
