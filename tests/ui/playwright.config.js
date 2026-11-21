// UI tests for the AWS Bedrock demo (Overview page). Run via tests/run-all.ps1 or: npx playwright test
const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: '.',
  testMatch: '*.spec.js',
  globalSetup: require.resolve('./global-setup.js'),
  timeout: 45000,
  expect: { timeout: 20000 },
  workers: 1,
  reporter: [['list'], ['junit', { outputFile: '../ui-results.xml' }]],
  use: { storageState: '.auth.json', baseURL: process.env.APP_URL || 'http://localhost:8091', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
});
