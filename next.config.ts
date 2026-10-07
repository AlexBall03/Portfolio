import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: false,
  cacheLife: {
    // Portfolio content changes only when it is edited (Phase 4 admin saves
    // will call updateTag), so a long lifetime is safe.
    content: { stale: 300, revalidate: 60 * 60 * 24, expire: 60 * 60 * 24 * 30 },
    // Live GitHub data: refresh every 15 minutes, matching the old API's s-maxage.
    github: { stale: 300, revalidate: 900, expire: 60 * 60 * 24 },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
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
