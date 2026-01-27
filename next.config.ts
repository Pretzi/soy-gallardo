import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

// Define all static routes to pre-cache for offline access
const staticRoutes = [
  "/entries",
  "/entries/new", 
  "/localidades",
  "/secciones",
  "/settings",
  "/login",
  "/offline",
  "/~offline",
];

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  // Cache all pages for offline access
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  // Pre-cache important routes
  fallbacks: {
    document: "/offline",
  },
  // Workbox options for better offline support
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Pre-cache all static routes so they work offline immediately
    additionalManifestEntries: staticRoutes.map((route) => ({
      url: route,
      revision: Date.now().toString(), // Use build timestamp as revision
    })),
    // Runtime caching strategies
    runtimeCaching: [
      {
        // Cache page navigations (HTML)
        urlPattern: /^https?:\/\/.*\/(?!api\/).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "pages-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
          },
          networkTimeoutSeconds: 3,
        },
      },
      {
        // Cache static assets (JS, CSS)
        urlPattern: /\/_next\/static\/.*/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        // Cache images
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "image-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
          },
        },
      },
      {
        // Cache fonts
        urlPattern: /\.(?:woff|woff2|ttf|otf|eot)$/i,
        handler: "CacheFirst",
        options: {
          cacheName: "font-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
          },
        },
      },
      {
        // Cache API calls with Network First
        urlPattern: /\/api\/options\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-options-cache",
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 24 * 60 * 60, // 1 day
          },
          networkTimeoutSeconds: 3,
        },
      },
    ],
  },
});

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
  // Externalize native modules for server-side rendering
  serverExternalPackages: ['sharp', '@imgly/background-removal-node'],
  // Keep Turbopack config for dev mode
  turbopack: {},
};

export default withPWA(nextConfig);
