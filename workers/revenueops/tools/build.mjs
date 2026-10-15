import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root=new URL('../',import.meta.url);await mkdir(new URL('.local/',root),{recursive:true,mode:0o700});
const result=spawnSync(process.execPath,[fileURLToPath(new URL('node_modules/wrangler/bin/wrangler.js',root)),'deploy','--config',fileURLToPath(new URL('wrangler.jsonc',root)),'--env','staging','--dry-run','--outdir','dist'],{cwd:fileURLToPath(root),stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:fileURLToPath(new URL('.local/wrangler.log',root))}});
process.exit(result.status??1);
