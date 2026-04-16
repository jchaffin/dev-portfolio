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
  serverExternalPackages: ["sharp", "@xenova/transformers", "onnxruntime-web"],
  turbopack: {
    resolveAlias: {
      // Use WASM build to avoid native libonnxruntime dependency (e.g. on Vercel / dev with Turbopack)
      "onnxruntime-node": "onnxruntime-web",
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      // Server: use WASM instead of native onnxruntime-node (no libonnxruntime.so on Vercel)
      // Client: do not bundle onnxruntime-node
      ...(isServer
        ? { "onnxruntime-node": "onnxruntime-web" }
        : { "onnxruntime-node$": false }),
    };
    return config;
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
