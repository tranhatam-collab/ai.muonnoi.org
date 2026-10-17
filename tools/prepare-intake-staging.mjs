import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const productionD1Id = '3ceac8b1-1c0f-47c3-ad05-2b9da0983c32';
const stagingD1Placeholder = '__SEPARATE_STAGING_D1_ID_REQUIRED__';
const root = process.cwd();
const output = resolve(root, '.local/intake-staging');
const sources = [
  ['base', resolve(root, 'workers/api/staging/base.sql')],
  ['0010', resolve(root, 'workers/api/migrations/0010_studio_intake.sql')],
  ['0011', resolve(root, 'workers/api/migrations/0011_studio_triage.sql')],
];

if (process.argv.length !== 2) {
  throw new Error('This generator accepts no target arguments; remote and production execution are disabled.');
}

async function readValidated(label, path) {
  const sql = await readFile(path, 'utf8');
  if (!sql.trim()) throw new Error(`${label} is empty`);
  if (sql.includes(productionD1Id)) throw new Error(`${label} references the production D1 database`);
  if (/\b(?:ATTACH\s+DATABASE|VACUUM|PRAGMA\s+writable_schema|DROP\s+TABLE)\b/i.test(sql)) {
    throw new Error(`${label} contains an unsafe schema operation`);
  }
  if (label === 'base') {
    for (const table of ['users', 'sessions', 'rate_limits']) {
      if (!new RegExp(`CREATE\\s+TABLE\\s+${table}\\b`, 'i').test(sql)) {
        throw new Error(`base is missing ${table}`);
      }
    }
    if (/\b(?:INSERT|UPDATE|DELETE)\b/i.test(sql)) {
      throw new Error('base must remain schema-only without users, credentials, or seed data');
    }
  }
  return sql.trim();
}

const fragments = await Promise.all(sources.map(async ([label, path]) => [label, await readValidated(label, path)]));
const schema = fragments.map(([label, sql]) => `-- source: ${label}\n${sql}`).join('\n\n') + '\n';
const config = `name = "ai-muonnoi-studio-staging"
main = "../../workers/api/src/staging.ts"
compatibility_date = "2026-10-17"
account_id = "93112cc89181e75335cbd7ef7e392ba3"
workers_dev = true

[vars]
ENVIRONMENT = "staging"
APP_ORIGIN = "https://ai-muonnoi-studio-staging.invalid"
COOKIE_SECURE = "true"
COOKIE_SAME_SITE = "Lax"
STAGING_AUTH_ENABLED = "false"
STUDIO_INTAKE_ENABLED = "false"
STUDIO_TRIAGE_ENABLED = "false"
STUDIO_OPERATOR_IDS = ""

[[d1_databases]]
binding = "iai_flow_db"
database_name = "ai-muonnoi-studio-staging"
database_id = "${stagingD1Placeholder}"
`;

if (config.includes(productionD1Id)
  || /(?:^|\n)(?:routes|triggers)\s*=/mi.test(config)
  || /(?:^|\n)\s*(?:AI|MAIL|PAYMENT|CRON)[A-Z0-9_]*\s*=/m.test(config)) {
  throw new Error('Generated staging configuration is not isolated');
}

await mkdir(output, { recursive: true });
await Promise.all([
  writeFile(resolve(output, 'schema.sql'), schema),
  writeFile(resolve(output, 'wrangler.toml'), config),
]);

console.log(`Prepared isolated local staging bundle at ${output}`);
