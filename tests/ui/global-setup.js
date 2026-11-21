// Logs in once and stores the session: the Mendix trial license allows only one concurrent session, so tests must share it.
const { chromium } = require('@playwright/test');
module.exports = async (config) => {
  const base = config.projects[0].use.baseURL;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto(base + '/login.html');
  await p.fill('input[type=text]', process.env.TEST_USER || 'MockTester');
  await p.fill('input[type=password]', process.env.TEST_PASSWORD || 'MockTest-2026-Bedrock1');
  await p.click('button[type=submit]');
  await p.waitForSelector('[role=menuitem]', { timeout: 60000 });
  await p.context().storageState({ path: '.auth.json' });
  await b.close();
};
