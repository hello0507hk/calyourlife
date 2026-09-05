/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 允許在存在 TypeScript 型別警告時依然順利打包發布
    ignoreBuildErrors: true,
  },
  eslint: {
    // 部署時忽略 ESLint 檢查
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;