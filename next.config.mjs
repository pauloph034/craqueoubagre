import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
export default function nextConfig(phase) {
  return {
    // Keep development chunks isolated from production builds.
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next"),
    reactStrictMode: true,
    typedRoutes: true,
    poweredByHeader: false,
    allowedDevOrigins: ["127.0.0.1"],
    images: {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "media.api-sports.io"
        }
      ]
    }
  };
}
