import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Deploy timestamp shown in the footer ("Last updated").
  env: { BUILD_TIME: new Date().toISOString() },
  // GitHub avatars in the GitHub section; project images and the headshot uploaded to Vercel Blob.
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/projects/**' },
      { protocol: 'https', hostname: '*.public.blob.vercel-storage.com', pathname: '/profile/**' },
    ],
  },
  // PGlite powers the optional local dev database only; keep it out of deployments.
  serverExternalPackages: ['@electric-sql/pglite'],
  outputFileTracingExcludes: { '*': ['node_modules/@electric-sql/**'] },
  // Share cards read their fonts and static images (the headshot) from disk;
  // public/ isn't part of a function's filesystem unless traced in.
  outputFileTracingIncludes: { '/og/**': ['./src/assets/fonts/*.ttf', './public/assets/**'] },
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
      // The private admin is never indexed (robots.txt also disallows it).
      ...['/admin/:path*', '/api/admin/:path*'].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ];
  },
};

export default nextConfig;
