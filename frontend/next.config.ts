import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/static/**',
      },
      {
        protocol: 'https',
        hostname: '209.74.81.100',
        port: '8000',
        pathname: '/static/**',
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:8000', '209.74.81.100:8000'],
    },
  },
};

export default nextConfig;
