import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Never let the browser keep protected pages in its (back/forward) cache: after logout, Back must ask the server again.
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }],
      },
    ];
  },
};

export default nextConfig;