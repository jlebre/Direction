import { defineConfig, devices } from '@playwright/test'

/**
 * FASE 2 (E2E) — corre SEMPRE contra a app deployada (nunca `webServer`
 * local a apontar para produção por engano: sem servidor local aqui de
 * propósito). Alvo por omissão: a app em produção na Vercel.
 *
 * Isolado da CI normal: `npm run test:e2e` nunca corre automaticamente em
 * push/PR — só manualmente ou por um workflow_dispatch dedicado (ver
 * docs/v2/TESTING_STRATEGY.md).
 */
const BASE_URL = process.env.E2E_BASE_URL ?? 'https://direction-camtil.vercel.app'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // fixtures partilhadas (Camp A/B) — testes destrutivos correm em série de propósito
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
