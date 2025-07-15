import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "images.unsplash.com",
      "github.com",
      "avatars.githubusercontent.com",
      "res.cloudinary.com",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/github",
        destination: "https://github.com/jchaffin",
        permanent: false,
      },
      {
        source: "/linkedin",
        destination: "https://linkedin.com/in/jacobchaffin",
        permanent: false,
      },
    ];
  },
  // Enable compression
  compress: true,
  // Generate a standalone output for better performance
  output: "standalone",
  // Optimize for production
  swcMinify: true,
};

export default nextConfig;
