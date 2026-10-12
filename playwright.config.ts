import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  // Tests run with reduced motion (no intro, no transitions); the motion tests opt back in.
  use: { baseURL: 'http://localhost:4173', locale: 'ko-KR', reducedMotion: 'reduce' },
  webServer: { command: 'npm run build && npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
