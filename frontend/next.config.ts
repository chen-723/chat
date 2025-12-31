import type { NextConfig } from "next";
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // disable: process.env.NODE_ENV === 'development'
});

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
        hostname: 'www.372810.xyz',
        pathname: '/static/**',
      },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:8000', 'www.372810.xyz'],
    },
  },
  // 添加空的 webpack 配置以消除警告
  webpack: (config) => {
    return config;
  },
};

export default withPWA(nextConfig);
