import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default async () => {
  const react = (await import('@vitejs/plugin-react-swc')).default

  return defineConfig({
    plugins: [react(), tsconfigPaths()],
    resolve: {
      alias: [{ find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './$1') }],
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './setupTests.tsx',
      include: ['tests/**/*.test.{ts,tsx}'],
      server: {
        deps: {
          inline: ['@testing-library/react', '@testing-library/jest-dom'],
        },
      },
      environmentOptions: {
        jsdom: {
          resources: 'usable',
          userAgent: 'vitest-jsdom',
        },
      },
      coverage: {
        provider: 'v8',
        reporter: ['json', 'json-summary', 'lcov', 'html'],
        include: ['app/**/*.{ts,tsx}', 'components/**/*.{ts,tsx}', 'utils/**/*.{ts,tsx}', 'lib/**/*.{ts,tsx}'],
        exclude: [
          'node_modules/',
          'tests/',
          '.next/',
          'cypress/',
        ],
        reportsDirectory: 'coverage',
      },
    },
  })
}
