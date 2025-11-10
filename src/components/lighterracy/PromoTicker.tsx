"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

type Banner = { id: string; title: string; link_url: string; status: string };

export default function PromoTicker() {
  const [banners, setBanners] = useState<Banner[]>([]);
  useEffect(() => {
    fetch("/data/banners.json").then(r => r.json()).then(setBanners).catch(() => setBanners([]));
  }, []);
  if (!banners.length) return null;

  const items = [...banners, ...banners]; // loop mulus
  return (
    <div className="w-full overflow-hidden border rounded-xl shadow-soft">
      <div className="marquee-track animate-marquee flex">
        {items.map((b, idx) => (
          <Link
            key={`${b.id}-${idx}`}
            href={b.link_url}
            className="px-6 py-3 whitespace-nowrap text-sm hover:underline"
          >
            <span className="mr-2">🔥</span>{b.title}
          </Link>
        ))}
      </div>
    </div>
  );
}
