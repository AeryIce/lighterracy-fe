"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";

type Promo = {
  id: string;
  title: string;
  subtitle: string;
  banner_url?: string;
  status: string;
  start_at?: string;
  end_at?: string;
};

type Pill = { label: string; href?: string };

type Props = {
  speed?: number;         // px/frame
  items?: Pill[];         // optional: langsung kasih pill
};

export default function PromoTicker({ speed = 0.7, items }: Props) {
  const [promos, setPromos] = useState<Promo[] | null>(items ? [] : null);

  useEffect(() => {
    if (items) return;
    fetch("/data/promos.json")
      .then((r) => r.json())
      .then(setPromos)
      .catch(() => setPromos([]));
  }, [items]);

  // bentuk pill dasar
  const base: Pill[] = useMemo(() => {
    if (items) return items;
    const list = promos || [];
    return list.map((p) => ({
      label: p.title.length > 28 ? p.title.slice(0, 26) + "…" : p.title,
      href: `/promos/${p.id}`,
    }));
  }, [items, promos]);

  // ⬇️ pastikan konten cukup lebar: kalau <6 item, gandakan sampai ≥12
  const MIN_UNIQUE = 6;
  const TARGET_TOTAL = 12;
  const display: Pill[] = useMemo(() => {
    if (base.length >= MIN_UNIQUE) return base;
    if (base.length === 0) return [];
    const times = Math.ceil(TARGET_TOTAL / base.length);
    return Array.from({ length: times }).flatMap(() => base);
  }, [base]);

  /* ============ Auto-scroll tanpa CSS animation ============ */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const firstRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || !firstRef.current || display.length === 0) return;

    const wrap = wrapRef.current;
    const firstWidth = firstRef.current.offsetWidth;

    let lastTime = 0;
    const step = (t: number) => {
      if (!lastTime) lastTime = t;
      const dt = t - lastTime;
      lastTime = t;

      if (!paused) {
        wrap.scrollLeft += speed * Math.max(1, dt / 16.6);
        if (wrap.scrollLeft >= firstWidth) wrap.scrollLeft -= firstWidth; // loop mulus
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [display.length, speed, paused]);

  if (!items && promos === null) {
    return (
      <div className="mx-auto max-w-screen-md px-4">
        <div className="h-9 rounded-full skeleton" />
      </div>
    );
  }
  if (display.length === 0) return null;

  return (
    <div className="mx-auto max-w-screen-md px-4">
      <div
        ref={wrapRef}
        className="w-full overflow-x-auto no-scrollbar mask-edge group rounded-full ring-1 ring-border bg-white/80 backdrop-blur"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="flex items-center gap-4 w-max px-4 py-2 select-none">
          {/* batch 1 (ukur lebar) */}
          <div ref={firstRef} className="flex items-center gap-4">
            {display.map((l, i) =>
              l.href ? (
                <Link
                  key={`a-${i}`}
                  href={l.href}
                  className="flex-none rounded-full px-3 py-1 text-[13px] bg-orange-50 ring-1 ring-orange-200 text-orange-700 hover:bg-orange-100 transition"
                >
                  🔥 {l.label}
                </Link>
              ) : (
                <span
                  key={`a-${i}`}
                  className="flex-none rounded-full px-3 py-1 text-[13px] bg-orange-50 ring-1 ring-orange-200 text-orange-700"
                >
                  🔥 {l.label}
                </span>
              )
            )}
          </div>
          {/* batch 2 (duplikat) */}
          <div aria-hidden className="flex items-center gap-4">
            {display.map((l, i) =>
              l.href ? (
                <Link
                  key={`b-${i}`}
                  href={l.href}
                  className="flex-none rounded-full px-3 py-1 text-[13px] bg-orange-50 ring-1 ring-orange-200 text-orange-700 hover:bg-orange-100 transition"
                >
                  🔥 {l.label}
                </Link>
              ) : (
                <span
                  key={`b-${i}`}
                  className="flex-none rounded-full px-3 py-1 text-[13px] bg-orange-50 ring-1 ring-orange-200 text-orange-700"
                >
                  🔥 {l.label}
                </span>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
