/**
 * Next.js configuration (ES Modules).
 *
 * Why .mjs and not .ts: Next.js 14.x does not support `next.config.ts`.
 * TypeScript config files were introduced in Next.js 15. The project
 * pins `next@14.2.5`, so this file uses JSDoc typing to retain the
 * same `NextConfig` shape without a build step.
 *
 * Configuration preserved from the previous `.ts` file:
 *   - reactStrictMode surfaces side-effect bugs in development.
 *   - Remote image patterns cover the basemap tile hosts.
 *
 * No package.json or import-site changes are required: Next.js
 * auto-discovers `next.config.mjs`, and no application code
 * imports this file directly.
 */

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cartocdn.com" },
    ],
  },
};

export default config;
