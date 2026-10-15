import { DatabaseSync } from 'node:sqlite';
export function localStore(path=':memory:') {
  const db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');let depth=0;
  const store={
    rows:(query,...params)=>db.prepare(query).all(...params),
    exec:(query,...params)=>{if(params.length)db.prepare(query).run(...params);else db.exec(query);},
    transaction:fn=>{
      if(depth)return fn();db.exec('BEGIN IMMEDIATE');depth++;
      try{const result=fn();db.exec('COMMIT');return result;}
      catch(error){db.exec('ROLLBACK');throw error;}finally{depth--;}
    },
    close:()=>db.close(), db
  };return store;
}
