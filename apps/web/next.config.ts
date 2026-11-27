import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The app lives in a workspace: trace from the monorepo root so the standalone
  // build includes the linked core package.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // The core package ships TypeScript source on purpose: one build, no stale dist.
  transpilePackages: ["@amdhousni/core"],
  // ioredis is loaded lazily at runtime; keep it out of the bundle.
  serverExternalPackages: ["ioredis"],
  poweredByHeader: false,
};

export default nextConfig;
