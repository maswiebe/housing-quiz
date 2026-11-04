import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';

const systemChrome = '/usr/bin/google-chrome';
const preview = process.env.PLAYWRIGHT_PREVIEW === '1';
const baseURL = preview ? 'http://127.0.0.1:4173/housing-quiz/' : 'http://127.0.0.1:5173/';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync(systemChrome) ? systemChrome : undefined) },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command: preview ? 'npm run preview -- --port 4173 --strictPort' : 'npm run dev -- --port 5173 --strictPort',
    url: baseURL,
    reuseExistingServer: !preview && !process.env.CI,
  },
});
