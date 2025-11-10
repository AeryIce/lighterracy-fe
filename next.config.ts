import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // tambah cadangan yang mungkin kita pakai nanti:
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" }
    ],
  },
};

export default nextConfig;
