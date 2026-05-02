import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Cloudflare Pages optimization
  output: process.env.CLOUDFLARE_PAGES ? 'export' : 'standalone',
  trailingSlash: true,

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  images: {
    // Disable image optimization for static export on Cloudflare Pages
    unoptimized: process.env.CLOUDFLARE_PAGES === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.digitalocean.app',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.ondigitalocean.app',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
