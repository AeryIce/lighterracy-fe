"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import BookModal from "./BookModal";

type Item = { isbn: string; title: string; author: string; rank: number; cover: string };

export default function NYTCarousel() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<Item | null>(null);

  // fetch sekali
  useEffect(() => {
    fetch("/data/nyt.json")
      .then((r) => r.json())
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  // ⬅️ panggil hook ini TANPA SYARAT supaya urutan hook konsisten
  const loop = useMemo(() => {
    if (!items || items.length === 0) return [] as Item[];
    return [...items, ...items];
  }, [items]);

  // skeleton saat loading pertama
  if (items === null) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Rekomendasi New York Times</h3>
          <span className="text-xs text-muted-foreground">—</span>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-[160px]">
              <div className="w-[160px] h-[220px] rounded-xl skeleton" />
              <div className="mt-2 h-4 w-[140px] rounded skeleton" />
              <div className="mt-1 h-3 w-[90px] rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // jika kosong setelah fetch → sembunyikan section
  if (loop.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Rekomendasi New York Times</h3>
        <span className="text-xs text-muted-foreground">{items?.length ?? 0} pilihan</span>
      </div>

      <div className="w-full overflow-hidden">
        <div className="marquee-track animate-marquee flex gap-4">
          {loop.map((b, i) => (
            <button
              key={`${b.isbn}-${i}`}
              onClick={() => { setCurrent(b); setOpen(true); }}
              className="min-w-[160px] text-left"
              aria-label={`Lihat detail ${b.title}`}
            >
              <div className="relative w-[160px] h-[220px] rounded-xl overflow-hidden shadow-soft">
                <Image src={b.cover} alt={b.title} fill className="object-cover" />
                <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  NYT #{b.rank}
                </div>
              </div>
              <div className="mt-2 text-sm font-medium leading-snug line-clamp-2">{b.title}</div>
              <div className="text-xs text-muted-foreground">{b.author}</div>
            </button>
          ))}
        </div>
      </div>

      <BookModal open={open} onOpenChange={setOpen} book={current} />
    </div>
  );
}
