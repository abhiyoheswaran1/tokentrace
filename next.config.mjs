import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// optimizePackageImports turns named imports from these libraries into
// per-symbol imports so unused symbols are tree-shaken out of the
// client bundle. Lucide ships ~1000 icons; without this, the bundler
// can keep more of them than strictly necessary.
const baseExperimental = {
  optimizePackageImports: ["lucide-react", "recharts"]
};

const productionExperimentalConfig =
  process.env.NODE_ENV === "production"
    ? { ...baseExperimental, serverMinification: false }
    : baseExperimental;

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

// Bundle analyzer — install @next/bundle-analyzer as an optional devDep
// and run with: ANALYZE=true npm run build:app
// The wrapper is loaded dynamically so the package stays optional and
// production installs never need it.
let exported = nextConfig;
if (process.env.ANALYZE === "true") {
  try {
    const { default: bundleAnalyzer } = await import("@next/bundle-analyzer");
    exported = bundleAnalyzer({ enabled: true })(nextConfig);
  } catch (error) {
    console.warn(
      "ANALYZE=true was set but @next/bundle-analyzer is not installed. Run: npm install --save-dev @next/bundle-analyzer"
    );
  }
}

export default exported;
