import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const productionExperimentalConfig =
  process.env.NODE_ENV === "production"
    ? {
        serverMinification: false
      }
    : {};

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  experimental: productionExperimentalConfig,
  typescript: {
    ignoreBuildErrors: true
  },
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: projectRoot,
  typedRoutes: false
};

export default nextConfig;
