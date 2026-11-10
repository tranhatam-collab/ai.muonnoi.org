// Applies a directory of D1 (SQLite) migrations, in filename order, to a fresh in-memory database.
// Usage: node apply-d1-chain.mjs <migrationsDir> [--continue]
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2];
const keepGoing = process.argv.includes('--continue');
const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
const db = new DatabaseSync(':memory:');
let failed = 0;
for (const f of files) {
  const sql = readFileSync(join(dir, f), 'utf8');
  try { db.exec(sql); console.log('OK   ', f); }
  catch (e) { failed++; console.log('FAIL ', f, '->', String(e.message).split('\n')[0]); if (!keepGoing) break; }
}
const tables = db.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' order by 1").all().map(r => r.name);
console.log(`\napplied ${files.length - failed}/${files.length}; tables now: ${tables.length}`);
console.log(tables.join(', '));
process.exit(failed ? 1 : 0);
