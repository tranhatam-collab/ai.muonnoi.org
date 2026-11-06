import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["nodemailer"],
  // Chưa có cấu hình ESLint riêng cho app; kiểm tra kiểu bằng `npm run typecheck`.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
