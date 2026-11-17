@echo off
title GitHub repo downloader
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js was not found. Install the LTS version from https://nodejs.org and double-click this file again. & pause & exit /b 1)
node -e "const s=require('fs').readFileSync(process.argv[1],'utf8');new Function('require','process',s.slice(s.lastIndexOf('//JS-START')))(require,process)" "%~f0" %*
echo.
pause
exit /b
//JS-START
// GitHub repo downloader. Double-click it, press Enter to use the default repo (or paste another GitHub URL).
// Small files are fetched directly; every file over 1 MB is fetched in 1 MB byte-range slices, so large-file blocks do not apply.
// Every file is verified with Git's own blob SHA-1, interrupted runs resume, and finished files are skipped on a re-run.
// Public repo: no login. Private repo: it asks once for a read-only token (fine-grained, "Contents: Read-only").
// Behind a company proxy (direct connections time out)? It uses the Windows system proxy or HTTPS_PROXY automatically,
// or asks for the proxy address. A proxy that needs a login: --proxy http://user:password@host:port
// Optional arguments: <repo url>  --token <token>  --proxy <url>  --out <folder>  --all (also fetch module-parts/)
(async () => {
  const https = require('https'), http = require('http'), fs = require('fs'), path = require('path');
  const crypto = require('crypto'), readline = require('readline'), tls = require('tls'), cp = require('child_process');
  const API = process.env.GH_API_BASE || 'https://api.github.com';
  const RAW = process.env.GH_RAW_BASE || 'https://raw.githubusercontent.com';
  const CHUNK = Number(process.env.DL_CHUNK || 1000000);
  const WORKERS = Number(process.env.DL_WORKERS || 6);
  const DEFAULT_URL = 'https://github.com/Marcian1/GenAIShowcaseStarterApp-10.24.23';
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const positional = args.find((a, i) => !a.startsWith('--') && !['--token', '--out', '--proxy'].includes(args[i - 1]));
  const skipPrefixes = args.includes('--all') ? [] : ['module-parts/'];   // redundant copy of the big file in 1 MB parts
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const mb = (n) => (n / 1048576).toFixed(1) + ' MB';
  let netTimeout = 60000;

  // ---- proxy support (HTTPS through an HTTP proxy using CONNECT) ----
  function parseRegProxy(out) {   // text of: reg query "HKCU\...\Internet Settings"
    const enabled = /ProxyEnable\s+REG_DWORD\s+0x1\b/i.test(out); const m = /ProxyServer\s+REG_SZ\s+(.+)/i.exec(out);
    const pac = (/AutoConfigURL\s+REG_SZ\s+(.+)/i.exec(out) || [])[1];
    let proxy = '';
    if (enabled && m) {
      const v = m[1].trim();
      if (v.includes('=')) { const pick = (k) => (new RegExp('(?:^|;)' + k + '=([^;]+)', 'i').exec(v) || [])[1]; proxy = pick('https') || pick('http') || ''; }
      else proxy = v;
    }
    return { proxy: proxy.trim(), pac: pac ? pac.trim() : '' };
  }
  let pacUrl = '';
  function detectProxy() {
    const e = process.env; let p = opt('--proxy') || e.HTTPS_PROXY || e.https_proxy || e.ALL_PROXY || e.HTTP_PROXY || e.http_proxy || '';
    if (!p && process.platform === 'win32') {
      try {
        const out = cp.execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 5000 });
        const r = parseRegProxy(out); p = r.proxy; pacUrl = r.pac;
      } catch (_) {}
    }
    return p;
  }
  class ProxyAgent extends https.Agent {
    constructor(proxy) { super({ keepAlive: false }); this.proxy = new URL(proxy); }
    createConnection(options, cb) {
      const pr = this.proxy, host = options.host || options.hostname, port = options.port || 443, hdr = { Host: host + ':' + port };
      if (pr.username) hdr['Proxy-Authorization'] = 'Basic ' + Buffer.from(decodeURIComponent(pr.username) + ':' + decodeURIComponent(pr.password)).toString('base64');
      const req = http.request({ host: pr.hostname, port: pr.port || 80, method: 'CONNECT', path: host + ':' + port, headers: hdr });
      req.setTimeout(netTimeout, () => req.destroy(new Error('timeout reaching the proxy')));
      req.on('connect', (res, socket) => {
        if (res.statusCode !== 200) { socket.destroy(); return cb(new Error('the proxy refused the connection (HTTP ' + res.statusCode + (res.statusCode === 407 ? ' - it needs a login: use --proxy http://user:password@host:port' : '') + ')')); }
        cb(null, tls.connect({ socket, servername: options.servername || host }));
      });
      req.on('error', cb); req.end();
    }
  }
  let proxyUrl = '', proxyAgent = null;
  function setProxy(v) { v = (v || '').trim(); if (v && !/^https?:\/\//i.test(v)) v = 'http://' + v; proxyUrl = v; proxyAgent = v ? new ProxyAgent(v) : null; }
  const shownProxy = () => proxyUrl.replace(/\/\/[^@/]*@/, '//***@');
  setProxy(detectProxy());

  // One shared line reader for the whole run (a new reader per question loses buffered/piped input).
  let rl = null; const lineQueue = [], lineWaiters = []; let inputClosed = false;
  function ask(q, hidden) {
    if (!rl) {
      rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: !!process.stdin.isTTY });
      rl._writeToOutput = (s) => { process.stdout.write(rl.muted ? '' : s); };
      rl.on('line', l => { if (lineWaiters.length) lineWaiters.shift()(l); else lineQueue.push(l); });
      rl.on('close', () => { inputClosed = true; lineWaiters.splice(0).forEach(w => w('')); });
    }
    return new Promise(res => {
      rl.muted = false;
      if (inputClosed) process.stdout.write(q + '\n'); else { rl.setPrompt(q); rl.prompt(); }
      const done = (l) => { rl.muted = false; if (hidden) process.stdout.write('\n'); res((l || '').trim()); };
      if (hidden) rl.muted = true;
      if (lineQueue.length) done(lineQueue.shift()); else if (inputClosed) done(''); else lineWaiters.push(done);
    });
  }

  function request(url, headers = {}, redirects = 5) {
    return new Promise((resolve, reject) => {
      const u = new URL(url); const lib = u.protocol === 'http:' ? http : https;
      const agent = (u.protocol === 'https:' && proxyAgent) ? proxyAgent : undefined;
      const req = lib.request(u, { method: 'GET', headers: { 'User-Agent': 'repo-downloader', ...headers }, timeout: netTimeout, agent }, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
          res.resume(); const next = new URL(res.headers.location, u);
          const h = { ...headers }; if (next.host !== u.host) delete h.Authorization;
          return resolve(request(next.toString(), h, redirects - 1));
        }
        const parts = []; let ended = false;
        res.on('data', c => parts.push(c));
        res.on('end', () => { ended = true; const body = Buffer.concat(parts); const cl = res.headers['content-length'];
          if (cl !== undefined && Number(cl) !== body.length) return reject(new Error('incomplete response'));
          resolve({ status: res.statusCode, headers: res.headers, body }); });
        res.on('error', reject);
        res.on('close', () => { if (!ended) reject(new Error('connection closed early')); });
      });
      req.on('timeout', () => req.destroy(new Error('timeout')));
      req.on('error', reject); req.end();
    });
  }

  let token = opt('--token') || process.env.GITHUB_TOKEN || '';
  const apiHeaders = () => ({ Accept: 'application/vnd.github+json', ...(token ? { Authorization: 'Bearer ' + token } : {}) });
  const rawHeaders = (extra = {}) => ({ ...(token ? { Authorization: 'token ' + token } : {}), ...extra });

  async function retry(fn, label) {
    for (let t = 1; t <= 6; t++) {
      try { return await fn(); }
      catch (e) {
        if (e.fatal || t === 6) throw e;
        console.log(`  retry ${t} (${label}): ${e.message}`); await sleep(1500 * t);
      }
    }
  }
  async function api(p) {
    const r = await retry(() => request(API + p, apiHeaders()), p);
    if (r.status !== 200) { const e = new Error('GitHub answered ' + r.status + ' for ' + p); e.status = r.status; e.fatal = true; throw e; }
    return JSON.parse(r.body.toString('utf8'));
  }

  function parseRepo(s) {
    s = s.trim().replace(/\.git$/, '').replace(/^git@github\.com:/, 'https://github.com/');
    const m = /^(?:https?:\/\/)?(?:www\.)?(?:github\.com\/)?([\w.-]+)\/([\w.-]+)(?:\/tree\/(.+))?\/?$/.exec(s);
    if (!m) throw new Error('That does not look like a GitHub repo URL: ' + s);
    return { owner: m[1], repo: m[2], branch: m[3] };
  }

  const blobSha = (file, size) => new Promise((res, rej) => {
    const h = crypto.createHash('sha1'); h.update('blob ' + size + '\0');
    fs.createReadStream(file).on('data', d => h.update(d)).on('end', () => res(h.digest('hex'))).on('error', rej);
  });
  const bufSha = (buf) => crypto.createHash('sha1').update('blob ' + buf.length + '\0').update(buf).digest('hex');

  console.log('=== GitHub repo downloader (large files are fetched in 1 MB pieces) ===\n');
  if (proxyUrl) console.log('Using proxy ' + shownProxy() + '\n');
  const input = positional || (await ask(`Repo URL [Enter = ${DEFAULT_URL}]: `)) || DEFAULT_URL;
  const { owner, repo, branch: urlBranch } = parseRepo(input);
  const OUT = path.resolve(opt('--out') || path.join(process.cwd(), repo));

  async function loadTree() {
    const info = await api(`/repos/${owner}/${repo}`);
    const branch = urlBranch || info.default_branch;
    const ref = await api(`/repos/${owner}/${repo}/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`);
    const commit = ref.object.sha;
    const tree = await api(`/repos/${owner}/${repo}/git/trees/${commit}?recursive=1`);
    if (tree.truncated) throw new Error('This repository is too large to list in one request.');
    return { branch, commit, files: tree.tree.filter(e => e.type === 'blob') };
  }

  // Quick reachability check (15 s) so a blocked network is reported at once instead of after minutes of retries.
  async function checkNetwork() {
    for (;;) {
      netTimeout = 15000;
      try { await request(API + '/'); netTimeout = 60000; return true; }
      catch (e) {
        netTimeout = 60000;
        console.log(`\nCould not reach ${new URL(API).host}: ${e.message}` + (proxyUrl ? `  (proxy in use: ${shownProxy()})` : ''));
        if (/CERT|SELF_SIGNED|issuer/i.test(e.code || e.message)) {
          console.log('Your network inspects HTTPS with its own certificate. Install Node.js 22.15+ and run with NODE_OPTIONS=--use-system-ca,');
          console.log('or set NODE_EXTRA_CA_CERTS to your company root certificate file (.pem), then run this again.');
        } else {
          console.log('Direct connections look blocked on this network; you most likely have to go through a proxy.');
          console.log('Find it in Windows Settings > Network & internet > Proxy (or your browser settings) and type it as host:port.');
          if (pacUrl) console.log('Your system uses an automatic proxy script (' + pacUrl + '). Open that address in a browser and look for "PROXY host:port".');
        }
        const p = await ask('Proxy (host:port, or http://user:password@host:port), or press Enter to quit: ');
        if (!p) { console.log('Stopped.'); return false; }
        setProxy(p);
      }
    }
  }
  if (!(await checkNetwork())) return;

  let repoData;
  try { repoData = await loadTree(); }
  catch (e) {
    if (e.status && [401, 403, 404].includes(e.status) && !token) {
      console.log('\nGitHub will not show this repository without signing in (it is private, or the URL is wrong).');
      console.log('If it is private: create a read-only token at github.com > Settings > Developer settings >');
      console.log('Personal access tokens > Fine-grained tokens, limited to this repo with "Contents: Read-only".');
      token = await ask('Paste the token (it is hidden and not saved), or press Enter to quit: ', true);
      if (!token) { console.log('Stopped.'); return; }
      repoData = await loadTree();
    } else throw e;
  }
  const { branch, commit } = repoData;
  const skipped = repoData.files.filter(f => skipPrefixes.some(p => f.path.startsWith(p)));
  const files = repoData.files.filter(f => !skipped.includes(f)).sort((a, b) => b.size - a.size);
  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  console.log(`\n${owner}/${repo} @ ${branch}: ${files.length} files, ${mb(totalBytes)} -> ${OUT}`);
  if (skipped.length) console.log(`(skipping ${skipped.length} files under ${skipPrefixes.join(', ')} - the same data is in the single big file; use --all to include)`);
  const big = files.filter(f => f.size > CHUNK);
  if (big.length) console.log(`Large files (${big.length}) will be downloaded in ${mb(CHUNK)} slices: ${big.map(f => f.path + ' ' + mb(f.size)).slice(0, 5).join(', ')}\n`);

  const rawUrl = (p) => `${RAW}/${owner}/${repo}/${commit}/${p.split('/').map(encodeURIComponent).join('/')}`;
  async function get(url, extra, expectLen) {
    return retry(async () => {
      const r = await request(url, rawHeaders(extra));
      if (r.status === 200 || r.status === 206) { if (expectLen !== undefined && r.status === 206 && r.body.length !== expectLen) throw new Error('short slice'); return r; }
      const e = new Error('server answered ' + r.status); if (r.status !== 429 && r.status < 500) e.fatal = true; throw e;
    }, url.slice(-40));
  }

  async function fetchFile(e) {
    const dest = path.join(OUT, ...e.path.split('/')); fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && fs.statSync(dest).size === e.size && (await blobSha(dest, e.size)) === e.sha) return 'skipped';
    const url = rawUrl(e.path);
    if (e.size <= CHUNK) {
      for (let a = 1; a <= 2; a++) { const r = await get(url, {}); if (bufSha(r.body) === e.sha) { fs.writeFileSync(dest, r.body); return 'downloaded'; } }
      throw new Error('checksum mismatch');
    }
    const part = dest + '.partial';
    for (let a = 1; a <= 2; a++) {
      let have = fs.existsSync(part) ? fs.statSync(part).size : 0; if (have > e.size) { fs.unlinkSync(part); have = 0; }
      if (have) console.log(`  resuming ${e.path} at ${mb(have)}`);
      while (have < e.size) {
        const to = Math.min(have + CHUNK, e.size) - 1;
        const r = await get(url, { Range: `bytes=${have}-${to}` }, to - have + 1);
        if (r.status === 200) { fs.writeFileSync(part, r.body); have = r.body.length; break; }   // server ignored Range
        fs.appendFileSync(part, r.body); have += r.body.length;
        console.log(`  ${e.path}  ${mb(have)} / ${mb(e.size)}`);
      }
      if ((await blobSha(part, e.size)) === e.sha) { if (fs.existsSync(dest)) fs.unlinkSync(dest); fs.renameSync(part, dest); return 'downloaded'; }
      fs.unlinkSync(part); console.log('  checksum mismatch, starting this file over');
    }
    throw new Error('checksum mismatch');
  }

  let next = 0, done = 0, skippedOk = 0; const failed = []; let lastPrint = 0;
  async function worker() {
    while (next < files.length) {
      const e = files[next++];
      try { if ((await fetchFile(e)) === 'skipped') skippedOk++; } catch (err) { failed.push({ path: e.path, error: err.message }); }
      done++;
      if (Date.now() - lastPrint > 1500 || done === files.length) { lastPrint = Date.now(); console.log(`[${done}/${files.length}] files done` + (skippedOk ? `, ${skippedOk} already complete` : '') + (failed.length ? `, ${failed.length} FAILED` : '')); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(WORKERS, files.length) }, worker));

  if (failed.length) {
    console.log(`\n${failed.length} file(s) failed:`); failed.slice(0, 20).forEach(f => console.log('  ' + f.path + ' - ' + f.error));
    console.log('Run this file again: it resumes and only fetches what is missing.'); process.exitCode = 1;
  } else {
    console.log(`\nOK - all ${files.length} files downloaded and verified. Folder: ${OUT}`);
    const mpk = files.filter(f => f.path.endsWith('.mpk')).map(f => f.path); if (mpk.length) console.log('Module packages: ' + mpk.join(', ') + '\nImport one in Studio Pro: App > Import module package.');
  }
})().catch(e => { console.log('\nFAILED: ' + e.message); process.exitCode = 1; });
