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
  cacheOnFrontEndNav: true,
  // Precache important static pages
  publicExcludes: ['!noprecache/**/*'],
  runtimeCaching: [
    {
      // HTML documents - StaleWhileRevalidate for instant offline access
      urlPattern: ({ request }: any) => request.destination === 'document',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'html-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        },
      },
    },
    {
      // Scripts, styles, workers - CacheFirst for performance
      urlPattern: ({ request }: any) => 
        request.destination === 'script' ||
        request.destination === 'style' ||
        request.destination === 'worker',
      handler: 'CacheFirst',
      options: {
        cacheName: 'asset-cache',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      // API calls - NetworkOnly (handled by client code)
      urlPattern: /^https?:\/\/[^/]+\/api\/.*/,
      handler: 'NetworkOnly',
    },
    {
      // Local images
      urlPattern: ({ request }: any) => request.destination === 'image',
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
      // S3 images - CacheFirst for offline support
      urlPattern: /^https:\/\/.*\.s3.*\.amazonaws\.com\/.*/,
      handler: 'CacheFirst',
      options: {
        cacheName: 's3-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
})(nextConfig);
