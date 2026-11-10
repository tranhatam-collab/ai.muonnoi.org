// Browser e2e over the PUBLIC build (dist/site): serves it with the Cloudflare `_headers` rules applied (so CSP is enforced),
// visits every HTML page at phone and desktop width, and reports console errors, CSP blocks, broken local links/images, overflow.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2]);
const headersTxt = fs.readFileSync(path.join(root, '_headers'), 'utf8');
const globalHeaders = {};
for (const line of headersTxt.split('\n').slice(1)) { const m = line.match(/^\s+([A-Za-z-]+):\s*(.*)$/); if (m) globalHeaders[m[1]] = m[2].trim(); }
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = path.join(root, p); if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404, globalHeaders); return res.end('not found'); }
  res.writeHead(200, { ...globalHeaders, 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const pages = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) pages.push('/' + path.relative(root, p).replace(/index\.html$/, '')); } })(root);
  pages.sort();
  const browser = await chromium.launch();
  const rows = []; const problems = [];
  for (const [label, vp] of [['phone', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
    const ctx = await browser.newContext({ viewport: vp }); 
    for (const p of pages) {
      const page = await ctx.newPage(); const errs = [], csp = [], failed = [];
      page.on('console', m => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t)) csp.push(t.slice(0, 160)); else if (m.type() === 'error' && !/Failed to load resource|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|api\.muonnoi\.org/i.test(t)) errs.push(t.slice(0, 160)); });
      page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 160)));
      page.on('requestfailed', r => { const u = r.url(); if (u.startsWith(base)) failed.push(u.replace(base, '')); });
      page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) failed.push(r.status() + ' ' + r.url().replace(base, '')); });
      const resp = await page.goto(base + p, { waitUntil: 'load' }).catch(e => ({ status: () => 'ERR ' + e.message.slice(0, 60) }));
      await page.waitForTimeout(250);
      const info = await page.evaluate(() => ({
        title: document.title, h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        brokenImgs: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
        localLinks: [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && h.startsWith('/') && !h.startsWith('//')).map(h => h.split('#')[0].split('?')[0]),
        inlineScripts: [...document.scripts].filter(s => !s.src && s.textContent.trim()).length,
      }));
      const dead = []; for (const h of [...new Set(info.localLinks)]) { if (!h) continue; let f = path.join(root, h); if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html'); if (!fs.existsSync(f) && !fs.existsSync(f + '.html')) dead.push(h); }
      rows.push({ vp: label, page: p, status: typeof resp.status === 'function' ? resp.status() : resp, title: info.title.slice(0, 40), h1: info.h1, lang: info.lang, overflowPx: info.overflow, csp: csp.length, errors: errs.length, failed: failed.length, deadLinks: dead.length, brokenImgs: info.brokenImgs.length, inline: info.inlineScripts });
      if (csp.length || errs.length || failed.length || dead.length || info.brokenImgs.length || info.overflow > 0 || !info.h1 || (typeof resp.status === 'function' && resp.status() !== 200)) problems.push({ vp: label, page: p, csp, errs, failed: [...new Set(failed)], dead, imgs: info.brokenImgs, overflow: info.overflow, h1: info.h1 });
      await page.close();
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`pages: ${pages.length}  visits: ${rows.length}  (CSP applied from _headers: ${Boolean(globalHeaders['Content-Security-Policy'])})`);
  console.log(JSON.stringify({ pages, problems }, null, 1));
  console.log('SUMMARY ' + JSON.stringify({ visits: rows.length, ok200: rows.filter(r => r.status === 200).length, withCspBlocks: rows.filter(r => r.csp).length, withJsErrors: rows.filter(r => r.errors).length, withFailedReq: rows.filter(r => r.failed).length, withDeadLinks: rows.filter(r => r.deadLinks).length, withBrokenImgs: rows.filter(r => r.brokenImgs).length, withHorizontalOverflow: rows.filter(r => r.overflowPx > 0).length, pagesWithoutH1: rows.filter(r => !r.h1).length, pagesWithInlineScripts: rows.filter(r => r.inline).length }));
})().catch(e => { console.error(e); process.exit(1); });
