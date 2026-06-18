import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler (Babel-based auto-memoization) is intentionally OFF: it's an optional
  // optimization this app doesn't need and it slows builds. Plain React 19 is plenty fast here.
  // NOTE: production builds use `next build --webpack` (see package.json). A long-lived `next start`
  // process exhibits an intermittent Server-Action stall after sustained use (a Next 16 `next start`
  // runtime artifact — DB completes, no error; reproduces on both bundlers, see README decisions).
  // The default Turbopack production build hits it even on the first request; the webpack build
  // reliably handles a fresh-server flow, so production uses webpack. Dev uses Turbopack.
  // Pin the workspace root to this project (a stray lockfile elsewhere on the machine
  // can otherwise be inferred as the root). On Vercel this is a no-op.
  turbopack: {
    root: __dirname,
  },
  // Prisma's engine is already auto-externalized from the server bundle by Next 16;
  // listing it here is explicit and harmless.
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
