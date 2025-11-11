"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import BookModal from "./BookModal";

/** payload tipis dari API /api/nyt */
type NYTRawItem = {
  isbn13?: string;
  title?: string;
  author?: string;
  rank?: number;
  book_image?: string;
};
type Item = {
  isbn: string;
  title: string;
  author: string;
  rank: number;
  cover: string;
};

type Props = {
  list?: string;    // default: trade-fiction-paperback
  speed?: number;   // 0.4–1.2
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

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/nyt?list=${encodeURIComponent(list)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`NYT fetch failed (${res.status})`);
        const data = (await res.json()) as { books?: NYTRawItem[]; list_name?: string; updated?: string };

        const mapped: Item[] = (data?.books ?? []).map((b) => ({
          isbn: b?.isbn13 ?? "",
          title: b?.title ?? "",
          author: b?.author ?? "",
          rank: Number(b?.rank ?? 0),
          cover: b?.book_image ?? "/og/og-from-upload.png",
        }));

        setItems(mapped);
        setMeta({ list_name: data?.list_name, updated: data?.updated });
        setError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setItems([]);
        setError(e instanceof Error ? e.message : "Gagal memuat data NYT");
      }
    })();
    return () => controller.abort();
  }, [list]);

  const loop = useMemo(() => (items && items.length ? [...items, ...items] : []), [items]);

  // auto-scroll
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const firstRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!wrapRef.current || !firstRef.current || loop.length === 0) return;
    const wrap = wrapRef.current;
    const firstWidth = firstRef.current.offsetWidth;
    let last = 0;
    const step = (t: number) => {
      if (!last) last = t;
      const dt = t - last;
      last = t;
      if (!paused) {
        wrap.scrollLeft += speed * Math.max(1, dt / 16.6);
        if (wrap.scrollLeft >= firstWidth) wrap.scrollLeft -= firstWidth;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [loop.length, speed, paused]);

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

      <div
        ref={wrapRef}
        className="w-full overflow-x-auto no-scrollbar mask-edge group select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        <div className="flex gap-4 w-max">
          <div ref={firstRef} className="flex gap-4">
            {items!.map((b, i) => (
              <Card key={`a-${b.isbn || i}`} b={b} onOpen={(it) => { setCurrent(it); setOpen(true); }} />
            ))}
          </div>
          <div aria-hidden className="flex gap-4">
            {items!.map((b, i) => (
              <Card key={`b-${b.isbn || i}`} b={b} onOpen={(it) => { setCurrent(it); setOpen(true); }} />
            ))}
          </div>
        </div>
      </div>

      {/* key memastikan remount agar state clean & klik terasa responsif */}
      <BookModal
        key={current?.isbn || "nyt-modal"}
        open={open}
        onOpenChange={(v) => { setOpen(v); if (!v) setCurrent(null); }}
        book={current}
      />
    </div>
  );
}

function Card({ b, onOpen }: { b: Item; onOpen: (b: Item) => void }) {
  return (
    <button
      onClick={() => onOpen(b)}
      className="min-w-[160px] flex-none text-center"
      aria-label={b.title ? `Lihat detail ${b.title}` : "Lihat detail buku"}
      title={b.title || ""}
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
      <div className="mt-2 text-[13px] font-medium leading-tight line-clamp-2 min-h-[2.6rem]">
        {b.title || "—"}
      </div>
      <div className="text-xs text-muted-foreground truncate min-h-[1rem]">
        {b.author || "—"}
      </div>
    </button>
  );
}
