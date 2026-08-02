import type { NextConfig } from 'next';

if (process.env.CLOUDFLARE_PAGES === 'true') {
  throw new Error(
    'CLOUDFLARE_PAGES static export is unsupported: CTRL requires NextAuth, route handlers, middleware and the server-side BFF. Deploy with a supported Next.js server adapter instead.',
  );
}

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  async headers() {
    const securityHeaders = [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  // A trailing slash redirects Route Handlers (e.g. /api/auth/session → 308),
  // which breaks next-auth client-side session fetches.
  trailingSlash: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
  images: {
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
