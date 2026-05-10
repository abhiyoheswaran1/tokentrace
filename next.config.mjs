/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverMinification: false
  },
  serverExternalPackages: ["better-sqlite3"],
  typedRoutes: false
};

export default nextConfig;
