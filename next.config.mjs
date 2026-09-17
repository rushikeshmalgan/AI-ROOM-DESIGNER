import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { webpack }) => {
    // Test-only module swap for Playwright E2E runs. This branch is
    // unreachable unless PLAYWRIGHT_TEST_MODE is the literal string
    // '1' — it is never set by `next build`/`next start`, only by
    // playwright.config.js's webServer, so this never affects a real
    // deployment. See test/mocks/*.js and e2e/README.md for what each
    // swap replaces and why (no real Clerk/Replicate/Cloudinary/Redis
    // calls during E2E).
    if (process.env.PLAYWRIGHT_TEST_MODE === '1') {
      // node_modules packages resolve normally through resolve.alias.
      config.resolve.alias = {
        ...config.resolve.alias,
        '@clerk/nextjs/server$': path.resolve(__dirname, 'test/mocks/clerk-nextjs-server.js'),
        '@clerk/nextjs$': path.resolve(__dirname, 'test/mocks/clerk-nextjs.jsx'),
        'drizzle-orm$': path.resolve(__dirname, 'test/mocks/drizzle-orm.js'),
      };

      // Local "@/..." specifiers go through Next's own tsconfig-paths
      // resolution before generic resolve.alias entries are checked, so
      // aliasing the "@/..." string here never matches anything — the
      // real file has already been resolved to an absolute path by the
      // time webpack's alias step runs. NormalModuleReplacementPlugin
      // matches on that resolved absolute path instead, so it works
      // regardless of how the module was resolved.
      const localSwaps = [
        [/[\\/]config[\\/]db\.ts$/, 'test/mocks/db.js'],
        [/[\\/]config[\\/]replicateConfig\.ts$/, 'test/mocks/replicateConfig.js'],
        [/[\\/]config[\\/]ideogramConfig\.ts$/, 'test/mocks/ideogramConfig.js'],
        [/[\\/]config[\\/]cloudinaryConfig\.ts$/, 'test/mocks/cloudinaryConfig.js'],
        [/[\\/]lib[\\/]credits\.ts$/, 'test/mocks/credits.js'],
      ];
      for (const [pattern, mockPath] of localSwaps) {
        config.plugins.push(
          new webpack.NormalModuleReplacementPlugin(pattern, path.resolve(__dirname, mockPath))
        );
      }
    }
    return config;
  },
};

export default nextConfig;
