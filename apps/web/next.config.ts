import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const buildEnvironmentSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
  NEXT_PUBLIC_API_URL: z.url(),
  NEXT_PUBLIC_CONTACT_EMAIL: z.email(),
  INTERNAL_API_URL: z.url(),
  NEXT_OUTPUT_MODE: z.enum(['standalone', 'server']).default('standalone'),
});

const buildEnvironment = buildEnvironmentSchema.parse(process.env);
const projectDirectory = path.dirname(fileURLToPath(import.meta.url));
const developmentScriptPolicy = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${developmentScriptPolicy} https://*.posthog.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.posthog.com",
  "worker-src 'self' blob: data:",
  "frame-ancestors 'self' https://eu.posthog.com",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  process.env.NODE_ENV === 'production' ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const securityHeaders = [
  { key: 'x-content-type-options', value: 'nosniff' },
  { key: 'referrer-policy', value: 'strict-origin-when-cross-origin' },
  { key: 'content-security-policy', value: contentSecurityPolicy },
  {
    key: 'permissions-policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
];

const nextConfig: NextConfig = {
  compress: true,
  output: buildEnvironment.NEXT_OUTPUT_MODE === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: path.resolve(projectDirectory, '../..'),
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const internalApiUrl = buildEnvironment.INTERNAL_API_URL.replace(/\/$/u, '');

    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
