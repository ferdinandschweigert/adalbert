import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove standalone output for Vercel
  // Vercel handles the build output automatically
  trailingSlash: false,
};

export default nextConfig;
