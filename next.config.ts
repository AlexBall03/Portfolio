import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Deploy timestamp shown in the footer ("Last updated").
  env: { BUILD_TIME: new Date().toISOString() },
  // PGlite powers the optional local dev database only; keep it out of deployments.
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingExcludes: { '*': ['node_modules/@electric-sql/**'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
