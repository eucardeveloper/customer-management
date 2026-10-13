import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Optional same-origin mode for hosting (build with NEXT_PUBLIC_API_URL="" and API_PROXY_TARGET=<gateway URL>):
  // the browser then talks only to this app, which forwards /api/* to the gateway. That keeps the SameSite=Strict
  // session cookie first-party when the frontend and the gateway live on different hostnames.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET?.replace(/\/$/, "");
    if (!target) return [];
    return ["auth", "customers", "orders", "users"].map((area) => ({
      source: `/api/${area}/:path*`,
      destination: `${target}/api/${area}/:path*`,
    }));
  },
  // Never let the browser keep protected pages in its (back/forward) cache: after logout, Back must ask the server again.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;