import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3000',
      NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
      NEXT_PUBLIC_CONTACT_EMAIL: 'support@last-dot.com',
      NEXT_PUBLIC_ANALYTICS_ENABLED: 'false',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
    },
    environment: 'jsdom',
    globals: true,
  },
});
