import path from 'path';
import type { NextConfig } from 'next';

// newrelic/load-externals is a CommonJS module with no type declarations
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nrExternals = require('newrelic/load-externals');

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.blob.core.windows.net',
        pathname: '/**',
      },
    ],
  },
  // New Relic is preloaded via NODE_OPTIONS at runtime; standalone file tracing
  // only copies a subset unless we explicitly include the full agent tree.
  outputFileTracingIncludes: {
    '/*': [
      './node_modules/newrelic/**',
      './node_modules/@newrelic/**',
      './node_modules/@apm-js-collab/**',
      './node_modules/@azure/**',
      './node_modules/@typespec/**',
      './scripts/bootstrap-config.mjs',
    ],
  },
  // Native NR addons lock .node files on Windows and break subsequent builds.
  outputFileTracingExcludes: {
    '/*': [
      './node_modules/@newrelic/native-metrics/**',
      './node_modules/@newrelic/fn-inspect/**',
      './node_modules/@datadog/pprof/**',
    ],
  },
  webpack(config, { isServer }) {
    nrExternals(config);
    if (process.env.CYPRESS === 'true' && !isServer) {
      const coverageLoader = path.resolve(
        __dirname,
        'scripts',
        'cypress-istanbul-loader.js'
      )

      config.module.rules.push({
        test: /\.[jt]sx?$/,
        include: [
          path.resolve(__dirname, 'app'),
          path.resolve(__dirname, 'components'),
          path.resolve(__dirname, 'utils'),
        ],
        exclude: /node_modules/,
        use: {
          loader: coverageLoader,
          options: {
            esModules: true,
            produceSourceMap: true,
          },
        },
        enforce: 'post',
      })
    }

    return config
  },
};

export default nextConfig;
