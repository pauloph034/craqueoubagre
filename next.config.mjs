/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.api-sports.io"
      }
    ]
  },
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next"
};

export default nextConfig;
