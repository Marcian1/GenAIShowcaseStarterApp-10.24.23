// UI tests for reranking, the search_query embedding fix and the Documentation page (mock in MOCK_BACKEND=hash mode).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const MOCK_LOG = path.join(__dirname, '..', '..', 'bedrock-local-emulator', '.runtime', 'mock.log');
async function openOverview(page, tab) {
  await page.goto('/p/aws-bedrock-implementation');
  await expect(page.getByText('AWS Bedrock demo')).toBeVisible();
  if (tab) await page.getByRole('tab', { name: tab, exact: true }).click();
}

test('models tab: reranker is selected, listed as Rerank, and has no Try button', async ({ page }) => {
  await openOverview(page, 'Models');
  await expect(page.locator('.mx-name-cmbRerankModel')).toContainText('Cohere Rerank 3.5');
  const row = page.locator('.widget-datagrid-grid-body .tr').filter({ hasText: 'Cohere Rerank 3.5' }).first();
  await expect(row).toContainText('Rerank');
  await expect(row.locator('.mx-name-btnTryModel')).toHaveCount(0);
  await expect(row.locator('.mx-name-inUseRerank')).toBeVisible();
});

test('ask tickets with reranking: badge, rerank note, mock saw search_query and a rerank call', async ({ page }) => {
  const before = fs.existsSync(MOCK_LOG) ? fs.statSync(MOCK_LOG).size : 0;
  await openOverview(page, 'Ask tickets');
  await expect(page.locator('.mx-name-txtAskRerank')).toContainText('Cohere Rerank 3.5');
  await page.getByText('Options', { exact: true }).click();
  await expect(page.locator('.mx-name-txtRerankInstead')).toBeVisible();
  await expect(page.locator('.mx-name-sldStrictness')).toBeHidden();
  await page.locator('.mx-name-btnExample1').click();
  await page.locator('.mx-name-btnAsk').click();
  await expect(page.getByText(/Reranked \d+ candidates with Cohere Rerank 3\.5, kept the best 5/)).toBeVisible({ timeout: 60000 });
  await expect(page.locator('.mx-name-ctnSource')).toHaveCount(5);
  if (fs.existsSync(MOCK_LOG)) {
    const log = fs.readFileSync(MOCK_LOG, 'utf8').slice(before);
    expect(log).toContain('input_type search_query');
    expect(log).toMatch(/cohere rerank of \d+ documents, top_n 5/);
  }
});

test('documentation: button opens the page with all tabs and back returns to the demo', async ({ page }) => {
  await openOverview(page);
  await page.locator('.mx-name-btnDocumentation').click();
  await expect(page.getByRole('heading', { name: 'Documentation' })).toBeVisible();
  for (const t of ['Overview', 'Getting started', 'How search works', 'Models', 'Reference', 'Local emulator', 'Troubleshooting'])
    await expect(page.getByRole('tab', { name: t, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'How search works', exact: true }).click();
  await expect(page.getByText('search_query').first()).toBeVisible();
  await page.locator('.mx-name-btnDocBack').click();
  await expect(page.getByText('AWS Bedrock demo')).toBeVisible();
});

test('documentation page is reachable by its URL', async ({ page }) => {
  await page.goto('/p/aws-bedrock-documentation');
  await expect(page.getByText('How the AWS Bedrock module works')).toBeVisible();
});
