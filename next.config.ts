import type { NextConfig } from 'next';
import { buildContentSecurityPolicy } from './src/lib/security/content-security-policy';

const nextConfig: NextConfig = {
  /* config options here */
  output: process.env.CLOUDFLARE_PAGES ? 'export' : 'standalone',
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
      securityHeaders.push({
        key: 'Content-Security-Policy',
        value: buildContentSecurityPolicy(),
      });
    }

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // trailingSlash is only needed for Cloudflare Pages static export.
  // In standalone mode it redirects Route Handlers (e.g. /api/auth/session → 308)
  // which breaks next-auth client-side session fetches.
  trailingSlash: process.env.CLOUDFLARE_PAGES === 'true',

  typescript: {
    ignoreBuildErrors: true,
  },

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
