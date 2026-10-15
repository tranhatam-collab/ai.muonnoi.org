import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function makeD1(db) {
 const prepare=sql=>{
  let params=[];
  const statement={bind(...values){params=values;return statement;},execute(){
   const query=db.prepare(sql);
   if(/^\s*(SELECT|PRAGMA)/i.test(sql)){const results=query.all(...params);return {success:true,results,meta:{changes:0}};}
   const result=query.run(...params);return {success:true,results:[],meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)}};
  },async run(){return statement.execute();},async first(){return statement.execute().results[0]??null;},async all(){return statement.execute();}};
  return statement;
 };
 return {prepare,async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s.execute());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}};
}
export function studioDb(path=':memory:') {
 const db=new DatabaseSync(path);db.exec('PRAGMA foreign_keys=ON;PRAGMA busy_timeout=5000;');
 if(!db.prepare("SELECT name FROM sqlite_master WHERE name='publishing_drafts'").get()){
  // Local-only fixture identities. No production seed scripts, credentials or real customer data.
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,email TEXT,name TEXT,username TEXT,avatar_url TEXT,bio TEXT,role TEXT,is_verified INTEGER DEFAULT 0,status TEXT DEFAULT 'active');
  CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id INTEGER,created_at INTEGER,expires_at INTEGER);
  CREATE TABLE posts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER REFERENCES users(id),title TEXT NOT NULL,body TEXT NOT NULL,topic TEXT,post_type TEXT,visibility TEXT,is_hot INTEGER DEFAULT 0,is_verified INTEGER DEFAULT 0,is_ai INTEGER DEFAULT 0,vote_count INTEGER DEFAULT 0,comment_count INTEGER DEFAULT 0,created_at INTEGER,updated_at INTEGER);
  CREATE TABLE topics(id INTEGER PRIMARY KEY,slug TEXT UNIQUE,name TEXT,description TEXT,post_count INTEGER DEFAULT 0,created_at INTEGER);`);
  db.exec(readFileSync(new URL('../workers/api/migrations/0009_publishing_studio.sql',import.meta.url),'utf8'));
  const add=db.prepare('INSERT INTO users(id,email,name,role,status) VALUES(?,?,?,?,?)');
  add.run(1,'writer@example.test','Tác giả thử nghiệm','member','active');add.run(2,'reviewer@example.test','Biên tập viên thử nghiệm','moderator','active');add.run(3,'other@example.test','Tác giả khác','member','active');add.run(4,'inactive@example.test','Tài khoản bị khóa','admin','suspended');
 }
 const sessions={};
 for(const [role,id] of [['writer',1],['reviewer',2],['other',3],['inactive',4]]){
  const token=crypto.randomUUID();sessions[role]=token;db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(token,id,Date.now(),Date.now()+86400000);
 }
 return {db,d1:makeD1(db),sessions,close:()=>db.close()};
}
