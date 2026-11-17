// Local mock of the AWS endpoints used by the AWSBedrockImplementation module:
//   - STS  AssumeRoleWithWebIdentity   (credentials come from the web-identity token file, as with IRSA)
//   - Bedrock Runtime  POST /model/{modelId}/invoke   (Anthropic, Cohere embed-v4, Titan embeddings v2)
//   - Bedrock          GET  /foundation-models
// The Java actions are NOT modified: the AWS SDK is pointed here with AWS_ENDPOINT_URL.
// Bedrock calls are rejected unless they are SigV4-signed with the key that this mock's STS issued.
const http = require('node:http');
const fs = require('node:fs');
const crypto = require('node:crypto');

const HOST = process.env.MOCK_HOST || '127.0.0.1';
const PORT = Number(process.env.MOCK_PORT || 8787);
const EXPECTED_TOKEN_FILE = process.env.AWS_WEB_IDENTITY_TOKEN_FILE; // optional: verify token content
const EXPECTED_ROLE = process.env.AWS_ROLE_ARN;                      // optional: verify role arn

const ACCESS_KEY_ID = 'ASIAMOCKLOCALBEDROCK';
const SECRET = crypto.randomBytes(20).toString('hex');
const SESSION_TOKEN = 'mock-session-token-' + crypto.randomBytes(8).toString('hex');

const log = (...a) => console.log(new Date().toISOString(), ...a);

function read(req) {
  return new Promise((res, rej) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => res(Buffer.concat(chunks).toString('utf8')));
    req.on('error', rej);
  });
}

function json(res, status, body, extra = {}) {
  res.writeHead(status, { 'content-type': 'application/json', 'x-amzn-requestid': crypto.randomUUID(), ...extra });
  res.end(JSON.stringify(body));
}

// ---------- STS ----------
function sts(res, form) {
  const p = new URLSearchParams(form);
  const action = p.get('Action');
  if (action === 'GetCallerIdentity') {
    const arn = (EXPECTED_ROLE || 'arn:aws:iam::000000000000:role/mock-bedrock-role').replace(':role/', ':assumed-role/') + '/mendix-local';
    log('STS GetCallerIdentity ->', arn);
    res.writeHead(200, { 'content-type': 'text/xml', 'x-amzn-requestid': crypto.randomUUID() });
    return res.end(`<GetCallerIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><GetCallerIdentityResult><Arn>${arn}</Arn><UserId>AROAMOCK:mendix-local</UserId><Account>000000000000</Account></GetCallerIdentityResult><ResponseMetadata><RequestId>${crypto.randomUUID()}</RequestId></ResponseMetadata></GetCallerIdentityResponse>`);
  }
  if (action !== 'AssumeRoleWithWebIdentity') {
    res.writeHead(400, { 'content-type': 'text/xml' });
    return res.end(`<ErrorResponse><Error><Type>Sender</Type><Code>InvalidAction</Code><Message>${action} not supported by mock</Message></Error></ErrorResponse>`);
  }
  const token = p.get('WebIdentityToken') || '';
  const role = p.get('RoleArn') || '';
  let problem = null;
  if (!token) problem = 'missing WebIdentityToken';
  else if (EXPECTED_TOKEN_FILE && fs.readFileSync(EXPECTED_TOKEN_FILE, 'utf8').trim() !== token.trim()) problem = 'web identity token does not match token file';
  else if (EXPECTED_ROLE && role !== EXPECTED_ROLE) problem = 'unexpected role ' + role;
  if (problem) {
    log('STS DENIED:', problem);
    res.writeHead(403, { 'content-type': 'text/xml' });
    return res.end(`<ErrorResponse><Error><Type>Sender</Type><Code>InvalidIdentityToken</Code><Message>${problem}</Message></Error><RequestId>mock</RequestId></ErrorResponse>`);
  }
  const exp = new Date(Date.now() + 3600 * 1000).toISOString();
  log('STS OK: issued credentials for', role, 'session', p.get('RoleSessionName'));
  res.writeHead(200, { 'content-type': 'text/xml', 'x-amzn-requestid': crypto.randomUUID() });
  res.end(`<AssumeRoleWithWebIdentityResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><AssumeRoleWithWebIdentityResult>
<Credentials><AccessKeyId>${ACCESS_KEY_ID}</AccessKeyId><SecretAccessKey>${SECRET}</SecretAccessKey><SessionToken>${SESSION_TOKEN}</SessionToken><Expiration>${exp}</Expiration></Credentials>
<SubjectFromWebIdentityToken>mock-subject</SubjectFromWebIdentityToken>
<AssumedRoleUser><AssumedRoleId>AROAMOCK:${p.get('RoleSessionName')}</AssumedRoleId><Arn>${role.replace(':role/', ':assumed-role/')}/${p.get('RoleSessionName')}</Arn></AssumedRoleUser>
<Provider>mock</Provider><Audience>mock</Audience></AssumeRoleWithWebIdentityResult>
<ResponseMetadata><RequestId>${crypto.randomUUID()}</RequestId></ResponseMetadata></AssumeRoleWithWebIdentityResponse>`);
}

// ---------- SigV4 check (verifies credentials came from our STS) ----------
function checkAuth(req) {
  const a = req.headers['authorization'] || '';
  const m = /Credential=([^/]+)\//.exec(a);
  if (!a.startsWith('AWS4-HMAC-SHA256') || !m) return 'missing SigV4 Authorization header';
  if (m[1] !== ACCESS_KEY_ID) return 'unknown access key ' + m[1];
  if (req.headers['x-amz-security-token'] !== SESSION_TOKEN) return 'bad/missing X-Amz-Security-Token';
  return null;
}

// ---------- deterministic embeddings (hashed bag-of-words, L2-normalised) ----------
const STOP = new Set('a an the and or of to in on for with is are was it this that i my me when every time as at by be'.split(' '));
function embed(text, dims) {
  const v = new Array(dims).fill(0);
  const toks = String(text).toLowerCase().match(/[a-z0-9]+/g) || [];
  for (const t of toks) {
    if (STOP.has(t)) continue;
    const h = crypto.createHash('md5').update(t).digest();
    const idx = h.readUInt32BE(0) % dims;
    v[idx] += 1; // cosine similarity then tracks word overlap
  }
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number((x / n).toFixed(6)));
}

// ---------- optional real AI via Ollama (OLLAMA_URL, OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL; MOCK_BACKEND=hash forces the fake) ----------
const OLLAMA = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL || 'llama3.2:3b';
const MAX_TOKENS = Number(process.env.OLLAMA_MAX_TOKENS || 250); // CPU-only: ~14 tokens/s, keep replies short so the UI does not hang
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'bge-m3';
let ollamaOk = null;
async function useOllama() {
  if (process.env.MOCK_BACKEND === 'hash') return false;
  if (ollamaOk === true) return true;
  try { const r = await fetch(OLLAMA + '/api/tags', { signal: AbortSignal.timeout(1500) }); ollamaOk = r.ok; } catch { ollamaOk = false; }
  if (!ollamaOk) log('Ollama not reachable at', OLLAMA, '- using fake responses');
  return ollamaOk;
}
const fitDims = (v, dims) => { // Bedrock callers ask for a fixed size; truncate/pad then re-normalise
  const o = v.length >= dims ? v.slice(0, dims) : v.concat(new Array(dims - v.length).fill(0));
  const n = Math.sqrt(o.reduce((s, x) => s + x * x, 0)) || 1;
  return o.map((x) => Number((x / n).toFixed(6)));
};
async function embedAll(texts, dims) {
  if (!(await useOllama())) return texts.map((t) => embed(t, dims));
  const r = await fetch(OLLAMA + '/api/embed', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model: EMBED_MODEL, input: texts }) });
  if (!r.ok) throw new Error('Ollama embed ' + r.status + ': ' + (await r.text()));
  const j = await r.json();
  log('  ollama', EMBED_MODEL, 'embedded', texts.length, 'texts, native dims', j.embeddings[0]?.length);
  return j.embeddings.map((v) => fitDims(v, dims));
}
const blockText = (c) => typeof c === 'string' ? c : (Array.isArray(c) ? c.map((b) => b.text || '').join('') : JSON.stringify(c));
async function ollamaChat(modelId, body) {
  const messages = [];
  const sys = body.system && blockText(body.system); if (sys) messages.push({ role: 'system', content: sys });
  for (const m of body.messages || []) messages.push({ role: m.role, content: blockText(m.content) });
  const r = await fetch(OLLAMA + '/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: CHAT_MODEL, messages, stream: false, keep_alive: '30m', options: { num_predict: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS) } }) });
  if (!r.ok) throw new Error('Ollama chat ' + r.status + ': ' + (await r.text()));
  const j = await r.json();
  log('  ollama', CHAT_MODEL, 'replied,', (j.message?.content || '').length, 'chars');
  return { id: 'msg_ollama_' + crypto.randomBytes(6).toString('hex'), type: 'message', role: 'assistant', model: modelId,
    content: [{ type: 'text', text: j.message?.content || '' }], stop_reason: j.done_reason === 'length' ? 'max_tokens' : 'end_turn', stop_sequence: null,
    usage: { input_tokens: j.prompt_eval_count || 0, output_tokens: j.eval_count || 0 } };
}

// ---------- model responses ----------
function anthropic(modelId, body) {
  const msgs = Array.isArray(body.messages) ? body.messages : [];
  const last = msgs.length ? msgs[msgs.length - 1].content : '';
  const text = typeof last === 'string' ? last : JSON.stringify(last);
  const excerpt = text.replace(/\s+/g, ' ').trim().slice(0, 300);
  return {
    id: 'msg_mock_' + crypto.randomBytes(6).toString('hex'),
    type: 'message', role: 'assistant', model: modelId,
    content: [{ type: 'text', text: `[mock ${modelId}] I received your prompt (${text.length} chars): ${excerpt}` }],
    stop_reason: 'end_turn', stop_sequence: null,
    usage: { input_tokens: Math.ceil(text.length / 4), output_tokens: 32 },
  };
}
async function cohere(body) {
  const texts = body.texts || [];
  const dims = Number(body.output_dimension || 1536);
  return { id: crypto.randomUUID(), response_type: 'embeddings_by_type', texts, embeddings: { float: await embedAll(texts, dims) } };
}
async function titan(body) {
  const dims = Number(body.dimensions || 1024);
  const [e] = await embedAll([body.inputText || ''], dims);
  return { embedding: e, inputTextTokenCount: Math.ceil((body.inputText || '').length / 4), embeddingsByType: { float: e } };
}

const MODELS = [
  ['eu.anthropic.claude-sonnet-5', 'Claude Sonnet 5', 'Anthropic'],
  ['eu.cohere.embed-v4:0', 'Embed v4', 'Cohere'],
  ['amazon.titan-embed-text-v2:0', 'Titan Text Embeddings V2', 'Amazon'],
].map(([id, name, prov]) => ({
  modelArn: `arn:aws:bedrock:eu-central-1::foundation-model/${id}`, modelId: id, modelName: name, providerName: prov,
  inputModalities: ['TEXT'], outputModalities: [id.includes('embed') ? 'EMBEDDING' : 'TEXT'],
  responseStreamingSupported: false, customizationsSupported: [], inferenceTypesSupported: ['ON_DEMAND'],
  modelLifecycle: { status: 'ACTIVE' },
}));

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    const body = await read(req);
    if (url.pathname === '/health') return json(res, 200, { ok: true });

    if (req.method === 'POST' && url.pathname === '/' && (req.headers['content-type'] || '').includes('x-www-form-urlencoded')) return sts(res, body);

    const bad = checkAuth(req);
    if (bad) { log('DENIED', req.method, url.pathname, '-', bad); return json(res, 403, { message: bad }, { 'x-amzn-errortype': 'UnrecognizedClientException' }); }

    if (req.method === 'GET' && url.pathname === '/foundation-models') {
      log('Bedrock ListFoundationModels');
      return json(res, 200, { modelSummaries: MODELS });
    }
    const m = /^\/model\/([^/]+)\/invoke$/.exec(url.pathname);
    if (req.method === 'POST' && m) {
      const modelId = decodeURIComponent(m[1]);
      const payload = body ? JSON.parse(body) : {};
      const guard = req.headers['x-amzn-bedrock-guardrailidentifier'];
      log('Bedrock InvokeModel', modelId, guard ? `(guardrail ${guard}/${req.headers['x-amzn-bedrock-guardrailversion']})` : '');
      let out;
      if (/anthropic/.test(modelId)) out = (await useOllama()) ? await ollamaChat(modelId, payload) : anthropic(modelId, payload);
      else if (/cohere/.test(modelId)) { out = await cohere(payload); log('  cohere embeddings for', (payload.texts || []).length, 'texts'); }
      else if (/titan-embed/.test(modelId)) out = await titan(payload);
      else return json(res, 404, { message: 'Model not supported by mock: ' + modelId }, { 'x-amzn-errortype': 'ResourceNotFoundException' });
      return json(res, 200, out, { 'x-amzn-bedrock-invocation-latency': '5' });
    }
    log('404', req.method, url.pathname);
    json(res, 404, { message: 'not found' });
  } catch (e) {
    log('ERROR', e.stack);
    json(res, 500, { message: String(e) });
  }
}).listen(PORT, HOST, () => log(`AWS mock (STS + Bedrock) listening on http://${HOST}:${PORT}`));
