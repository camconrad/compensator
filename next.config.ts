import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable SSR entirely to prevent hydration mismatches
  experimental: {
    // Force client-side rendering for all pages
  },
  images: {
    domains: ['via.placeholder.com', 'coin-images.coingecko.com'],
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none'
          }
        ],
      },
    ];
  },
};

export default nextConfig;
