import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321");

const nextConfig: NextConfig = {
  // E2E builds use their own folder so they never clobber a running dev server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // A stray lockfile in the user folder confuses Next's workspace detection.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  // Hero image uploads go through a server action (8 MB cap enforced in code).
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
  images: {
    // Product photos from Supabase Storage, served as AVIF/WebP at responsive sizes.
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        port: supabaseUrl.port,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
