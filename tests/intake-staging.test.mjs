import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from '../workers/revenueops/node_modules/esbuild/lib/main.js';
import { Miniflare } from '../workers/revenueops/node_modules/miniflare/dist/src/index.js';

const execFile = promisify(execFileCallback);
const root = process.cwd();
const output = join(root, '.local/intake-staging');
const productionD1Id = '3ceac8b1-1c0f-47c3-ad05-2b9da0983c32';

function executableStatements(schema) {
  const sql = schema
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');
  const statements = [];
  let current = '';
  let trigger = false;
  for (const character of sql) {
    current += character;
    if (character !== ';') continue;
    const trimmed = current.trim();
    if (!trigger && /^CREATE\s+TRIGGER\b/i.test(trimmed)) trigger = true;
    if (trigger && !/\bEND;$/i.test(trimmed)) continue;
    if (trimmed) statements.push(trimmed);
    current = '';
    trigger = false;
  }
  if (current.trim()) throw new Error('schema ended with an incomplete SQL statement');
  return statements;
}

async function prepareAndBundle() {
  await execFile(process.execPath, ['tools/prepare-intake-staging.mjs'], { cwd: root });
  await build({
    entryPoints: ['workers/api/src/staging.ts'],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    outfile: join(output, 'worker.mjs'),
  });
}

async function startLocalWorker(authEnabled = false) {
  await prepareAndBundle();
  const [schema, worker] = await Promise.all([
    readFile(join(output, 'schema.sql'), 'utf8'),
    readFile(join(output, 'worker.mjs'), 'utf8'),
  ]);
  const mf = new Miniflare({
    telemetry: { enabled: false },
    workers: [{
      config: {
        name: 'ai-muonnoi-studio-staging-local',
        compatibilityDate: '2026-10-17',
        manifest: { mainModule: 'worker.js', modules: { 'worker.js': { type: 'esm', contents: worker } } },
        env: {
          iai_flow_db: { type: 'd1', id: 'isolated-local-staging' },
          APP_ORIGIN: { type: 'text', value: 'https://ai-muonnoi-studio-staging.invalid' },
          COOKIE_SECURE: { type: 'text', value: 'false' },
          COOKIE_SAME_SITE: { type: 'text', value: 'None' },
          STAGING_AUTH_ENABLED: { type: 'text', value: authEnabled ? 'true' : 'false' },
          STUDIO_INTAKE_ENABLED: { type: 'text', value: 'false' },
          STUDIO_TRIAGE_ENABLED: { type: 'text', value: 'false' },
          STUDIO_OPERATOR_IDS: { type: 'text', value: '' },
        },
      },
    }],
  });
  const db = await mf.getD1Database('iai_flow_db');
  for (const statement of executableStatements(schema)) await db.prepare(statement).run();
  return { db, mf };
}

test('generator produces an inert, isolated staging bundle from the current intake migrations', async () => {
  await assert.rejects(
    execFile(process.execPath, ['tools/prepare-intake-staging.mjs', '--remote'], { cwd: root }),
    /accepts no target arguments/,
  );
  await assert.rejects(
    execFile(process.execPath, ['tools/prepare-intake-staging.mjs', productionD1Id], { cwd: root }),
    /accepts no target arguments/,
  );
  await prepareAndBundle();
  const [config, schema, base, migration0010, migration0011] = await Promise.all([
    readFile(join(output, 'wrangler.toml'), 'utf8'),
    readFile(join(output, 'schema.sql'), 'utf8'),
    readFile('workers/api/staging/base.sql', 'utf8'),
    readFile('workers/api/migrations/0010_studio_intake.sql', 'utf8'),
    readFile('workers/api/migrations/0011_studio_triage.sql', 'utf8'),
  ]);

  assert.match(config, /^name = "ai-muonnoi-studio-staging"$/m);
  assert.match(config, /^account_id = "93112cc89181e75335cbd7ef7e392ba3"$/m);
  assert.match(config, /^workers_dev = true$/m);
  assert.match(config, /^database_id = "__SEPARATE_STAGING_D1_ID_REQUIRED__"$/m);
  assert.match(config, /^STAGING_AUTH_ENABLED = "false"$/m);
  assert.match(config, /^STUDIO_INTAKE_ENABLED = "false"$/m);
  assert.match(config, /^STUDIO_TRIAGE_ENABLED = "false"$/m);
  assert.doesNotMatch(config, /(?:^|\n)\s*(?:routes|triggers|AI|MAIL|PAYMENT|CRON)[A-Z0-9_]*\s*=/mi);
  assert.equal(config.includes(productionD1Id), false);
  assert.doesNotMatch(base, /\b(?:INSERT|UPDATE|DELETE)\b/i);
  for (const fragment of [base.trim(), migration0010.trim(), migration0011.trim()]) {
    assert.ok(schema.includes(fragment));
  }
});

test('the default staging Worker exposes only public health and capabilities while auth remains inert', async () => {
  const { db, mf } = await startLocalWorker();
  try {
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM users').first()).total, 0);
    const tables = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableNames = tables.results.map((row) => row.name);
    for (const table of ['users', 'sessions', 'rate_limits', 'studio_intake_briefs', 'studio_intake_state', 'studio_intake_events']) {
      assert.ok(tableNames.includes(table), table);
    }

    const health = await mf.dispatchFetch('https://local/api/health');
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, service: 'ai-muonnoi-studio-staging', stage: 'intake' });
    assert.equal((await mf.dispatchFetch('https://local/api/intake/capabilities')).status, 200);

    for (const [path, init] of [
      ['/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'nobody@example.invalid', password: 'not-a-seed' }) }],
      ['/api/logout', { method: 'POST' }],
      ['/api/me', {}],
    ]) {
      const denied = await mf.dispatchFetch(`https://local${path}`, init);
      assert.equal(denied.status, 503, path);
      assert.deepEqual(await denied.json(), { ok: false, error: 'STAGING_AUTH_DISABLED' });
    }
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM rate_limits').first()).total, 0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM sessions').first()).total, 0);

    for (const path of [
      '/api/register', '/api/email/send', '/api/payment/create-intent', '/api/webhook/payment',
      '/api/flows', '/api/posts', '/api/auth/google/start', '/api/auth/magic-link/request',
      '/api/ai/summarize', '/api/publishing/drafts', '/api/n8n/connections',
    ]) {
      const denied = await mf.dispatchFetch(`https://local${path}`, { method: 'POST' });
      assert.equal(denied.status, 404, path);
      assert.deepEqual(await denied.json(), { ok: false, error: 'STAGING_ROUTE_NOT_AVAILABLE' });
    }

    const productionOrigin = await mf.dispatchFetch('https://local/api/health', {
      headers: { Origin: 'https://ai.muonnoi.org' },
    });
    assert.equal(productionOrigin.headers.get('Access-Control-Allow-Origin'), null);
  } finally {
    await mf.dispose();
  }
});

test('enabled staging auth retains the origin, body, and cookie constraints', async () => {
  const { db, mf } = await startLocalWorker(true);
  try {
    const deniedLogin = await mf.dispatchFetch('https://local/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'not-a-seed' }),
    });
    assert.equal(deniedLogin.status, 403);
    assert.deepEqual(await deniedLogin.json(), { ok: false, error: 'STAGING_ORIGIN_REJECTED' });
    const crossSiteLogout = await mf.dispatchFetch('https://local/api/logout', {
      method: 'POST',
      headers: { Origin: 'https://ai.muonnoi.org' },
    });
    assert.equal(crossSiteLogout.status, 403);
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM rate_limits').first()).total, 0);

    const origin = 'https://ai-muonnoi-studio-staging.invalid';
    const oversizedLogin = await mf.dispatchFetch('https://local/api/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'x'.repeat(24_000) }),
    });
    assert.equal(oversizedLogin.status, 413);
    assert.deepEqual(await oversizedLogin.json(), { ok: false, error: 'STAGING_BODY_TOO_LARGE' });
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM rate_limits').first()).total, 0);

    const login = await mf.dispatchFetch('https://local/api/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.invalid', password: 'not-a-seed' }),
    });
    assert.equal(login.status, 401);
    assert.equal((await db.prepare('SELECT COUNT(*) AS total FROM rate_limits').first()).total, 1);
    assert.equal((await mf.dispatchFetch('https://local/api/me')).status, 401);
    const logout = await mf.dispatchFetch('https://local/api/logout', {
      method: 'POST',
      headers: { Origin: origin },
    });
    assert.equal(logout.status, 200);
    assert.match(logout.headers.get('Set-Cookie'), /HttpOnly/);
    assert.match(logout.headers.get('Set-Cookie'), /Secure/);
    assert.match(logout.headers.get('Set-Cookie'), /SameSite=Lax/);
    assert.match(logout.headers.get('Set-Cookie'), /Path=\//);
    assert.doesNotMatch(logout.headers.get('Set-Cookie'), /(?:^|;)\s*Domain=/i);
  } finally {
    await mf.dispose();
  }
});
