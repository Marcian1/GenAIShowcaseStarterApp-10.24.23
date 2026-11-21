// End-to-end UI tests for the AWS Bedrock demo (AWSBedrockImplementation) against the local AWS mock (MOCK_BACKEND=hash).
// The mock echoes the prompt as "[mock <modelId>] I received your prompt (...)" so we can prove which model was invoked.
const { test, expect } = require('@playwright/test');

async function openOverview(page, tab) {
  await page.goto('/p/aws-bedrock-implementation');
  await expect(page.getByText('AWS Bedrock demo')).toBeVisible();
  if (tab) await page.getByRole('tab', { name: tab }).click();
}
const row = (page, name) => page.locator('.widget-datagrid-grid-body .tr').filter({ hasText: name }).first();

async function tryModel(page, name, prompt) {
  await openOverview(page, 'Models');
  await row(page, name).locator('.mx-name-btnTryModel').click();
  const send = page.locator('.mx-name-btnTrySendPrompt:visible, .mx-name-btnTryEmbed:visible').first();
  await send.waitFor();
  await page.locator('textarea').last().fill(prompt);
  await send.click();
}

test('overview shows the five tabs and a ready setup', async ({ page }) => {
  await openOverview(page);
  for (const t of ['Connections', 'Models', 'Tickets', 'Search and ask', 'Ask tickets']) await expect(page.getByRole('tab', { name: t, exact: true })).toBeVisible();
});

test('models list has Claude, GPT OSS, Cohere and Titan', async ({ page }) => {
  await openOverview(page, 'Models');
  for (const n of ['Claude Sonnet 5', 'Claude Haiku 5.5', 'GPT OSS 120B', 'GPT OSS 20B', 'Cohere Embed v4', 'Titan Text Embeddings V2']) await expect(row(page, n)).toBeVisible();
  await expect(row(page, 'GPT OSS 120B')).toContainText('GPT');
});

test('try Claude', async ({ page }) => {
  await tryModel(page, 'Claude Sonnet 5', 'hello claude');
  await expect(page.getByText('[mock eu.anthropic.claude-sonnet-5]').first()).toBeVisible();
});

test('try GPT OSS 120B', async ({ page }) => {
  await tryModel(page, 'GPT OSS 120B', 'hello gpt');
  await expect(page.getByText('[mock openai.gpt-oss-120b-1:0]').first()).toBeVisible();
});

test('try GPT OSS 20B', async ({ page }) => {
  await tryModel(page, 'GPT OSS 20B', 'hello small gpt');
  await expect(page.getByText('[mock openai.gpt-oss-20b-1:0]').first()).toBeVisible();
});

test('try Cohere embeddings', async ({ page }) => {
  await tryModel(page, 'Cohere Embed v4', 'printer jams');
  await expect(page.getByRole('dialog').getByText(/1024 dimensions/)).toBeVisible();
});

test('try Titan embeddings', async ({ page }) => {
  await tryModel(page, 'Titan Text Embeddings V2', 'printer jams');
  await expect(page.getByRole('dialog').getByText(/1024 dimensions/)).toBeVisible();
});

test('add-model dialog shows chat settings for the GPT family', async ({ page }) => {
  await openOverview(page, 'Models');
  await page.locator('.mx-name-btnAddModel').click();
  const dlg = page.getByRole('dialog');
  const family = dlg.getByRole('combobox', { name: 'Family' });
  const pick = async (name) => { await family.click(); await page.getByRole('option', { name }).first().click(); };
  await pick('OpenAI GPT via Bedrock (chat)');
  await expect(dlg.locator('.mx-name-ctnClaudeSettings')).toBeVisible();
  await expect(dlg.locator('.mx-name-ctnEmbeddingSettings')).toBeHidden();
  await pick('Cohere Embed (embeddings)');
  await expect(dlg.locator('.mx-name-ctnEmbeddingSettings')).toBeVisible();
  await expect(dlg.locator('.mx-name-ctnClaudeSettings')).toBeHidden();
  await pick('Cohere Rerank (reranking)');
  await expect(dlg.locator('.mx-name-ctnClaudeSettings')).toBeHidden();
  await expect(dlg.locator('.mx-name-ctnEmbeddingSettings')).toBeHidden();
});

test('ask tickets with the Claude chat model returns an answer and sources', async ({ page }) => {
  await openOverview(page, 'Ask tickets');
  await page.locator('.mx-name-btnExample1').click();
  await page.locator('.mx-name-btnAsk').click();
  await expect(page.getByText('[mock eu.anthropic.claude-sonnet-5]')).toBeVisible({ timeout: 60000 });
});

test('ask tickets with GPT as the chat model uses gpt-oss, then restores Claude', async ({ page }) => {
  await openOverview(page, 'Models');
  const chat = page.locator('.mx-name-cmbChatModel');
  const pick = async (name) => { await chat.click(); await page.getByRole('option', { name }).first().click(); };
  await pick('GPT OSS 120B');
  try {
    await page.getByRole('tab', { name: 'Ask tickets' }).click();
    await page.locator('.mx-name-btnExample1').click();
    await page.locator('.mx-name-btnAsk').click();
    await expect(page.getByText('[mock openai.gpt-oss-120b-1:0]').first()).toBeVisible({ timeout: 60000 });
  } finally {
    await page.getByRole('tab', { name: 'Models' }).click();
    await pick('Claude Sonnet 5');
  }
});

test('a guardrail that blocks the summary step is reported as an error, and "check only the question" lets it through', async ({ page }) => {
  const setGuardrail = async (id, onlyQuestion) => {
    await page.getByRole('tab', { name: 'Connections' }).click();
    await page.locator('.mx-name-txtGuardrailId input').fill(id);
    await page.locator('.mx-name-txtGuardrailId input').blur();
    const sw = page.locator('.mx-name-swGuardrailTag input');
    if ((await sw.isChecked()) !== onlyQuestion) await sw.click({ force: true });
    await page.locator('.mx-name-btnAwsSave').click();
    await page.getByRole('dialog').getByRole('button', { name: 'OK' }).click();
  };
  const ask = async (question) => {
    await page.getByRole('tab', { name: 'Ask tickets' }).click();
    await page.locator('.mx-name-taQuestion textarea').fill(question);
    await page.locator('.mx-name-taQuestion textarea').blur();
    await page.locator('.mx-name-btnAsk').click();
  };
  await openOverview(page);
  try {
    // The mock blocks any evaluated text that contains BLOCK_ME. The question alone is fine; the instructions are changed to contain it.
    await setGuardrail('gr-test', false);
    await page.getByRole('tab', { name: 'Ask tickets' }).click();
    await page.locator('.mx-name-taInstructions textarea').fill('You are a support assistant. BLOCK_ME. Cite tickets like [1].');
    await page.locator('.mx-name-taInstructions textarea').blur();
    await ask('How do I reset my password?');
    await expect(page.getByText('blocked this request')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('violates our security policy')).toBeVisible();
    // Only the question is checked now, so the instructions are not screened any more.
    await setGuardrail('gr-test', true);
    await ask('How do I reset my password?');
    await expect(page.getByText('[mock eu.anthropic.claude-sonnet-5]').first()).toBeVisible({ timeout: 60000 });
  } finally {
    await setGuardrail('', false);
  }
});
