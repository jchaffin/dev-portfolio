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
  // sharp must stay external (native binary). @xenova/transformers and
  // onnxruntime-node are intentionally NOT listed here so webpack can apply
  // the alias below — substituting the WASM backend (onnxruntime-web) for
  // the native binary, which fails on Vercel because libonnxruntime.so is
  // not on LD_LIBRARY_PATH in the Lambda environment.
  serverExternalPackages: ["sharp"],
  turbopack: {
    resolveAlias: {
      // Redirect native onnxruntime-node to the WASM build so no platform binary is needed.
      "onnxruntime-node": "onnxruntime-web",
    },
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      // Server: redirect native onnxruntime-node to the WASM build.
      // Client: drop onnxruntime-node entirely (unused in browser).
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
