import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/dashboard/:path*",
        destination: "/leads",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
