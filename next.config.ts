import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      // tambah cadangan yang mungkin kita pakai nanti:
       // NYT book covers
      { protocol: "https", hostname: "static01.nyt.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "books.google.com" },
      { protocol: "https", hostname: "m.media-amazon.com" }, 
    ],
  },
};

export default nextConfig;
