import type { NextConfig } from "next";

const testDistDir = process.env.IRTH_E2E_DIST_DIR?.trim();

const nextConfig: NextConfig = {
  reactCompiler: true,
  ...(testDistDir ? { distDir: testDistDir } : {}),
};

export default nextConfig;
