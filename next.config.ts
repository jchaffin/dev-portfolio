import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Note: eslint config moved to eslint.config.mjs in Next.js 16+
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  experimental: {
    // Disable strict mode for more lenient builds
    forceSwcTransforms: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: blob: https: http:;
              font-src 'self' data:;
              connect-src 'self' https://api.openai.com https://*.openai.com wss://*.openai.com https://api.cloud.copilotkit.ai blob:;
              media-src 'self' blob:;
              object-src 'none';
              base-uri 'self';
              form-action 'self';
              frame-ancestors 'none';
            `.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ];
  },
};

export default nextConfig;
