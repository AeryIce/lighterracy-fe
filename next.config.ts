import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "static01.nyt.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "books.googleusercontent.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "books.google.com" },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dmwstlk3b/**", // bucket kamu
      },
    ],
  },

  // Header global (berlaku untuk semua route)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Izinkan akses kamera & mic untuk origin sendiri (penting buat mobile)
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self)" },
          // Hardening ringan
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // Opsional: kecilkan bundle import zxing (boleh dihapus kalau ga perlu)
  experimental: {
    optimizePackageImports: ["@zxing/browser", "@zxing/library"],
  },
};

export default nextConfig;
