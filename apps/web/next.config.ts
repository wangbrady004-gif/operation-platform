import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/login",
        destination: "/access",
        permanent: false,
      },
      {
        source: "/jobs",
        destination: "/",
        permanent: false,
      },
      {
        source: "/run-paytm",
        destination: "/merchant-run",
        permanent: false,
      },
      {
        source: "/run-paytm/:path*",
        destination: "/merchant-run/:path*",
        permanent: false,
      },
      {
        source: "/paytm-merchants",
        destination: "/merchants",
        permanent: false,
      },
      {
        source: "/paytm-merchants/:path*",
        destination: "/merchants/:path*",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
