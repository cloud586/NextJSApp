import { defineConfig } from 'cypress';
import codeCoverageTask from '@cypress/code-coverage/task';

const NEXT_PORT = 3001;
const NEXT_URL = `http://localhost:${NEXT_PORT}`;

export default defineConfig({
  e2e: {
    baseUrl: NEXT_URL,
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    env: {
      codeCoverage: {
        expectFrontendCoverageOnly: true,
      },
    },
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
  },
});
