import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Suppress Vite's CJS deprecation warning (it's a notice, not a test failure).
// Without this, PowerShell treats the stderr output as indicating a non-zero exit.
process.env.VITE_CJS_IGNORE_WARNING = '1';

export default defineConfig({
  // Disable Vite's CSS pipeline entirely. The route handler and schema tests
  // have zero CSS imports. Without this, Vite crawls for postcss.config.mjs
  // and chokes on the Tailwind v4 plugin (@tailwindcss/postcss) which is
  // incompatible with the version of PostCSS Vite bundles internally.
  css: {
    postcss: {
      plugins: [], // empty — no PostCSS processing needed for these tests
    },
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
