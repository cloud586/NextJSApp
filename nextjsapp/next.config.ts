import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  webpack(config, { isServer }) {
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
