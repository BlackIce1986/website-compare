import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    reactCompiler: true,
  },
  images: {
    unoptimized: true, // Disable image optimization for standalone mode
  },
};

export default nextConfig;
