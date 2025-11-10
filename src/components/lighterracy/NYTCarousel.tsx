"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import BookModal from "./BookModal";

type Item = {
  isbn: string;
  title: string;
  author: string;
  rank: number;
  cover: string;
};

type Props = {
  /** NYT list name; default: Paperback Trade Fiction */
  list?: string;
  /** kecepatan scroll px/frame (0.4–1.2 bagus) */
  speed?: number;
};

export default function NYTCarousel({
  list = "trade-fiction-paperback",
  speed = 0.6,
}: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);
  const [meta, setMeta] = useState<{ list_name?: string; updated?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // fetch via API route (API key aman di server)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/nyt?list=${encodeURIComponent(list)}`, {
          signal: controller.signal,
          cache: "force-cache",
        });
        if (!res.ok) throw new Error(`NYT fetch failed (${res.status})`);

        const data = await res.json();
        const mapped: Item[] = (data?.books ?? []).map((b: any) => ({
          isbn: b?.isbn13 ?? "",
          title: b?.title ?? "",
          author: b?.author ?? "",
          rank: Number(b?.rank ?? 0),
          cover: b?.book_image ?? "/og/og-from-upload.png",
        }));

        setItems(mapped);
        setMeta({ list_name: data?.list_name, updated: data?.updated });
        setError(null);
      } catch (e: any) {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(e?.message || "Gagal memuat data NYT");
      }
    })();
    return () => controller.abort();
  }, [list]);

  // duplikasi untuk efek loop
  const loop = useMemo(() => {
    if (!items || items.length === 0) return [] as Item[];
    return [...items, ...items];
  }, [items]);

  // ---------- AUTO SCROLL (tanpa CSS animation) ----------
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const firstRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || !firstRef.current || loop.length === 0) return;

    const wrap = wrapRef.current;
    const firstWidth = firstRef.current.offsetWidth; // lebar batch pertama

    let lastTime = 0;
    const step = (t: number) => {
      // throttle ke ~60fps
      if (!lastTime) lastTime = t;
      const dt = t - lastTime;
      lastTime = t;

      if (!paused) {
        // geser delta proporsional waktu agar stabil meski frame drop
        wrap.scrollLeft += speed * Math.max(1, dt / 16.6);
        if (wrap.scrollLeft >= firstWidth) {
          wrap.scrollLeft -= firstWidth; // reset mulus
        }
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [loop.length, speed, paused]);

  // loading skeleton
  if (items === null) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Rekomendasi New York Times</h3>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[160px] flex-none">
              <div className="w-[160px] h-[220px] rounded-xl skeleton" />
              <div className="mt-2 h-4 w-[140px] rounded skeleton" />
              <div className="mt-1 h-3 w-[90px] rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // kosong → sembunyikan section
  if (loop.length === 0) return null;

  return (
    <div className="space-y-2" aria-live="off">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {meta?.list_name ? `Rekomendasi NYT · ${meta.list_name}` : "Rekomendasi New York Times"}
        </h3>
        <span className="text-xs text-muted-foreground">
          {error ? "retry later" : `${items?.length ?? 0} pilihan`}
        </span>
      </div>

      {/* wrapper scrollable; no-scrollbar biar rapih; pause saat hover/touch */}
      <div
        ref={wrapRef}
        className="w-full overflow-x-auto no-scrollbar mask-edge group select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="flex gap-4 w-max">
          {/* batch 1 (measure width) */}
          <div ref={firstRef} className="flex gap-4">
            {items!.map((b, i) => (
              <Card key={`a-${b.isbn || i}`} b={b} onOpen={(it) => { setCurrent(it); setOpen(true); }} />
            ))}
          </div>
          {/* batch 2 (duplikat) */}
          <div aria-hidden className="flex gap-4">
            {items!.map((b, i) => (
              <Card key={`b-${b.isbn || i}`} b={b} onOpen={(it) => { setCurrent(it); setOpen(true); }} />
            ))}
          </div>
        </div>
      </div>

      <BookModal open={open} onOpenChange={setOpen} book={current} />
    </div>
  );
}

/* --- Item Card --- */
/* --- Item Card (rapih & center) --- */
function Card({ b, onOpen }: { b: Item; onOpen: (b: Item) => void }) {
  return (
    <button
      onClick={() => onOpen(b)}
      className="min-w-[160px] flex-none text-center"
      aria-label={b.title ? `Lihat detail ${b.title}` : "Lihat detail buku"}
      title={b.title || ""} // tooltip judul penuh saat hover
    >
      <div className="relative w-[160px] h-[220px] rounded-xl overflow-hidden shadow-soft">
        <Image
          src={b.cover || "/og/og-from-upload.png"}
          alt={b.title || "Book cover"}
          fill
          className="object-cover"
          sizes="160px"
        />
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          NYT #{b.rank}
        </div>
      </div>

      {/* Judul: center, 2 baris, tinggi tetap biar grid sejajar */}
      <div className="mt-2 text-[13px] font-medium leading-tight line-clamp-2 min-h-[2.6rem]">
        {b.title || "—"}
      </div>

      {/* Penulis: center, satu baris, tinggi tetap */}
      <div className="text-xs text-muted-foreground truncate min-h-[1rem]">
        {b.author || "—"}
      </div>
    </button>
  );
}

