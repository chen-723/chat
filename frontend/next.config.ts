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
      // 添加更多远程主机配置（部署时根据需要添加）
      // {
      //   protocol: 'http',
      //   hostname: '192.168.1.100',
      //   port: '8000',
      //   pathname: '/static/**',
      // },
    ],
    dangerouslyAllowSVG: true,
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // 部署时需要添加服务器地址
      allowedOrigins: ['localhost:8000'],
      // 例如: allowedOrigins: ['localhost:8000', '192.168.1.100:8000'],
    },
  },
};

export default nextConfig;
