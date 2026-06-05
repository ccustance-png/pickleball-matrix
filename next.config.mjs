import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  customWorkerSrc: 'worker',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development', // skip SW in dev to avoid confusion
  workboxOptions: {
    disableDevLogs: true,
    // Never let the service worker touch API routes — especially uploads
    runtimeCaching: [
      {
        urlPattern: /^\/api\/.*/,
        handler: 'NetworkOnly',
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

export default withPWA(nextConfig);
