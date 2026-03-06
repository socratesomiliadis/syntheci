import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@syntheci/shared", "@syntheci/db", "@syntheci/ai"]
};

export default nextConfig;
