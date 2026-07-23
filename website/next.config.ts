import path from 'path';
import type { NextConfig } from 'next';

// Pin the app root so Turbopack does not walk up to the monorepo lockfile.
// On Vercel this avoids scanning/tracing the MCP package and speeds builds.
const appRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  trailingSlash: false,
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', 'anki-apkg-export', 'sql.js'],
  outputFileTracingRoot: appRoot,
  turbopack: {
    root: appRoot,
  },
  // Offline enrichment dumps are not needed in serverless traces.
  outputFileTracingExcludes: {
    '*': [
      'scripts/**/*',
      'node_modules/@napi-rs/canvas-android-arm64/**/*',
      'node_modules/@napi-rs/canvas-darwin-arm64/**/*',
      'node_modules/@napi-rs/canvas-darwin-x64/**/*',
      'node_modules/@napi-rs/canvas-linux-arm-gnueabihf/**/*',
      'node_modules/@napi-rs/canvas-linux-arm64-gnu/**/*',
      'node_modules/@napi-rs/canvas-linux-arm64-musl/**/*',
      'node_modules/@napi-rs/canvas-linux-riscv64-gnu/**/*',
      'node_modules/@napi-rs/canvas-win32-x64-msvc/**/*',
    ],
  },
};

export default nextConfig;
