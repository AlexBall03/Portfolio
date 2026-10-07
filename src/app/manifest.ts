import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alexander D. Ball — Software Engineer',
    short_name: 'Alex Ball',
    start_url: '/',
    display: 'standalone',
    background_color: '#0B0F14',
    theme_color: '#0B0F14',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
