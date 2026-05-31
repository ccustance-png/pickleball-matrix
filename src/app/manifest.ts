import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pickleball Matrix',
    short_name: 'PB Matrix',
    description: 'Track pickleball match results and player stats',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#84cc16',
    icons: [
      { src: '/icon', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
