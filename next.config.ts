import type { NextConfig } from "next";
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.s3.amazonaws.com',
      },
    ],
  },
  // Empty turbopack config to acknowledge we're using Turbopack
  turbopack: {},
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  // Use StaleWhileRevalidate for navigation requests
  cacheOnFrontEndNav: true,
  runtimeCaching: [
    {
      // Cache all HTML pages
      urlPattern: /^https?:\/\/[^/]+\/(?!(api\/)).*$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
        networkTimeoutSeconds: 3,
      },
    },
    {
      // Don't cache API calls via service worker (let client handle it)
      urlPattern: /^https?:\/\/[^/]+\/api\/.*/,
      handler: 'NetworkOnly',
    },
    {
      // Cache images from own domain
      urlPattern: /.*\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // Cache S3 images
      urlPattern: /^https:\/\/.*\.s3.*\.amazonaws\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 's3-images',
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
  ],
})(nextConfig);
