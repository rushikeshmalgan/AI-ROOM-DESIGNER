import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Test-mode builds get their own output/cache directory. Webpack's
  // persistent build cache doesn't fully key off the env-var-driven
  // resolve.alias/plugin changes below, so a real build and a test-mode
  // build sharing one .next/cache could serve a stale, un-aliased
  // resolution from whichever build ran most recently — e.g. a real
  // `next build` in between two E2E runs silently poisoning the next
  // one. Separate directories make that class of staleness impossible
  // instead of relying on remembering to clear the cache by hand.
  distDir: process.env.PLAYWRIGHT_TEST_MODE === '1' ? '.next-e2e' : '.next',
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
