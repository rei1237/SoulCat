import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "export",
  // A separate export folder lets local previews keep serving while a build completes.
  ...(process.env.SOULCAT_EXPORT_DIR ? {distDir:process.env.SOULCAT_EXPORT_DIR} : {}),
  trailingSlash: true,
  assetPrefix: "/_soulcat",
  images: { unoptimized: true },
  poweredByHeader: false,
  devIndicators: false,
};
export default nextConfig;
