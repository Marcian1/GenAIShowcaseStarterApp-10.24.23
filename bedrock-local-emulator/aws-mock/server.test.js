// Contract tests for the local AWS mock that backs AWSBedrockImplementation.
// Run: node --test bedrock-local-emulator/aws-mock
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const PORT = 18787;
const BASE = `http://127.0.0.1:${PORT}`;
let proc, creds;

async function post(p, body, headers = {}) {
  return fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
}
const signed = () => ({ authorization: `AWS4-HMAC-SHA256 Credential=${creds.key}/20260101/eu-central-1/bedrock/aws4_request`, 'x-amz-security-token': creds.token });
const cosine = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

before(async () => {
  proc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    env: { ...process.env, MOCK_PORT: String(PORT), MOCK_BACKEND: 'hash', AWS_WEB_IDENTITY_TOKEN_FILE: '', AWS_ROLE_ARN: '' }, stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { if ((await fetch(BASE + '/health')).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  const r = await fetch(BASE + '/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'Action=AssumeRoleWithWebIdentity&WebIdentityToken=t&RoleArn=arn:aws:iam::0:role/r&RoleSessionName=s' });
  const xml = await r.text();
  creds = { key: /<AccessKeyId>(.*?)</.exec(xml)[1], token: /<SessionToken>(.*?)</.exec(xml)[1] };
});
after(() => proc && proc.kill());

test('STS issues credentials', () => assert.ok(creds.key && creds.token));
test('STS answers GetCallerIdentity (used by the Test connection button)', async () => {
  const r = await fetch(BASE + '/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'Action=GetCallerIdentity' });
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<Arn>arn:aws:iam::\d+:assumed-role\/.+<\/Arn>/);
});
test('STS rejects unsupported actions', async () => {
  const r = await fetch(BASE + '/', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'Action=DeleteEverything' });
  assert.equal(r.status, 400);
});
test('Bedrock rejects unsigned calls', async () => {
  assert.equal((await fetch(BASE + '/foundation-models')).status, 403);
});
test('ListFoundationModels returns the three demo models', async () => {
  const j = await (await fetch(BASE + '/foundation-models', { headers: signed() })).json();
  assert.deepEqual(j.modelSummaries.map(m => m.providerName).sort(), ['Amazon', 'Anthropic', 'Cohere']);
});
test('Anthropic invoke echoes the last user message', async () => {
  const r = await post('/model/eu.anthropic.claude-sonnet-5/invoke', { messages: [{ role: 'user', content: 'hello bedrock' }] }, signed());
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.equal(j.role, 'assistant');
  assert.match(j.content[0].text, /hello bedrock/);
  assert.ok(j.usage.input_tokens > 0);
});
test('Titan embeddings honour dimensions and are L2-normalised', async () => {
  const j = await (await post('/model/amazon.titan-embed-text-v2:0/invoke', { inputText: 'printer error', dimensions: 256 }, signed())).json();
  assert.equal(j.embedding.length, 256);
  assert.ok(Math.abs(cosine(j.embedding, j.embedding) - 1) < 1e-3);
});
test('Cohere embeddings return one vector per text', async () => {
  const j = await (await post('/model/eu.cohere.embed-v4:0/invoke', { texts: ['a printer', 'screen freezes'], output_dimension: 128 }, signed())).json();
  assert.equal(j.embeddings.float.length, 2);
  assert.equal(j.embeddings.float[0].length, 128);
});
test('similar texts score higher than unrelated texts', async () => {
  const e = async (t) => (await (await post('/model/amazon.titan-embed-text-v2:0/invoke', { inputText: t, dimensions: 1024 }, signed())).json()).embedding;
  const [q, near, far] = await Promise.all([e('printer cannot print'), e('printer cannot print documents'), e('screen freezes after startup')]);
  assert.ok(cosine(q, near) > cosine(q, far));
});
test('unknown model gives 404', async () => {
  assert.equal((await post('/model/foo.bar/invoke', {}, signed())).status, 404);
});
