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

// Defense-in-depth response headers for the local dashboard. The CSP keeps all
// resource loads same-origin (no third-party script/connect surface), and the
// frame protections block clickjacking of the unauthenticated UI. 'unsafe-inline'
// is required because Next.js injects inline bootstrap/hydration scripts and
// styles; everything else is locked to 'self'.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'"
    ].join("; ")
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  devIndicators: false,
  experimental: productionExperimentalConfig,
  // The published package ships source and runs `next build` on the end user's
  // machine at first `tokentrace serve`. Production installs omit devDependencies
  // such as @types/better-sqlite3, so Next's build-time type check cannot pass
  // there. Type safety is enforced in development and CI via `npm run verify`
  // (`tsc --noEmit`); this only disables the redundant check during the
  // user-machine build. Do not remove without making the user-side build
  // type-check-free another way.
  typescript: {
    ignoreBuildErrors: true
  },
  serverExternalPackages: ["better-sqlite3"],
  outputFileTracingRoot: projectRoot,
  typedRoutes: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  }
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
