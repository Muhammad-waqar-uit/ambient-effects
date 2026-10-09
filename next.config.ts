import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // GitHub Pages serves a static export; PPR and component caching
  // are dev-only features and must be disabled for output: "export".
  cacheComponents: false,
  partialPrefetching: false,
};

export default nextConfig;
