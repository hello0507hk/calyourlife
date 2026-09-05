/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 部署（Build）時忽略所有 ESLint 警告與錯誤
    ignoreDuringBuilds: true,
  },
  typescript: {
    // 部署時忽略 TypeScript 型別檢查錯誤
    ignoreBuildErrors: true,
  },
};

export default nextConfig;