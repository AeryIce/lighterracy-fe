import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

const inter = Inter({ subsets: ["latin"], display: "swap" });
// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });


export const metadata: Metadata = {
  title: "Lighterracy",
  description: "the more you read, the brighter your spirit",
  manifest: "/manifest.webmanifest",
  themeColor: "#FDA50F",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png", // iOS akan auto-round
    other: [
      { rel: "mask-icon", url: "/icons/maskable-512.png" }, // cadangan
    ],
  },
  openGraph: {
    title: "Lighterracy",
    description: "Temukan promo buku & rekomendasi bacaan.",
    images: [{ url: "https://picsum.photos/seed/lighterracy-og/1200/630", width: 1200, height: 630 }],
  },
  appleWebApp: {
    capable: true,
    title: "Lighterracy",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* iPhone 12/13/14 Pro Max */}
        <link rel="apple-touch-startup-image" href="/splash/launch-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 12/13/14 */}
        <link rel="apple-touch-startup-image" href="/splash/launch-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone X/XS/11 Pro */}
        <link rel="apple-touch-startup-image" href="/splash/launch-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        {/* iPhone 6/7/8/SE2 */}
        <link rel="apple-touch-startup-image" href="/splash/launch-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPhone 5/SE (1st) */}
        <link rel="apple-touch-startup-image" href="/splash/launch-640x1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad portrait */}
        <link rel="apple-touch-startup-image" href="/splash/launch-1536x2048.png"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* iPad Pro 12.9" portrait */}
        <link rel="apple-touch-startup-image" href="/splash/launch-2048x2732.png"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        {/* (opsional) iPad landscape umum */}
        <link rel="apple-touch-startup-image" href="/splash/launch-2048x1536.png"
          media="(device-width: 1024px) and (device-height: 768px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />
        <link rel="apple-touch-startup-image" href="/splash/launch-2732x2048.png"
          media="(device-width: 1366px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}