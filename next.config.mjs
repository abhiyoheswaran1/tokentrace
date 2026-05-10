/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  experimental: {
    serverMinification: false
  },
  typescript: {
    ignoreBuildErrors: true
  },
  serverExternalPackages: ["better-sqlite3"],
  typedRoutes: false
};

export default nextConfig;
