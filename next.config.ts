import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  // Cloudflare Pages optimization
  output: process.env.CLOUDFLARE_PAGES ? 'export' : 'standalone',
  // trailingSlash is only needed for Cloudflare Pages static export.
  // In standalone mode it redirects Route Handlers (e.g. /api/auth/session → 308)
  // which breaks next-auth client-side session fetches.
  trailingSlash: process.env.CLOUDFLARE_PAGES === 'true',

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
      {
        protocol: 'https',
        hostname: 'be.ctrl-assess.co.uk',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
