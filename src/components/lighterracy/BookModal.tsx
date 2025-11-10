"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { isbn: string; title: string; author: string; rank: number; cover: string };
type Props = { open: boolean; onOpenChange: (v: boolean) => void; book: Item | null };

type GB = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  pageCount?: number;
  printedPageCount?: number;
  dimensions?: { height?: string; width?: string; thickness?: string };
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string; large?: string };
  previewLink?: string;
  infoLink?: string;
};

/** Sanitizer ringan: izinkan tag aman & a[href], buang atribut lain */
function sanitizeHtml(input: string): string {
  if (!input) return "";
  let s = input;

  // buang script/style/apapun yang bukan whitelist
  s = s.replace(
    /<(\/?)(?!b|strong|i|em|br|p|ul|ol|li|sub|sup|a)([a-z0-9-]+)(\s[^>]*)?>/gi,
    ""
  );

  // rapikan tag yang diizinkan (hilangkan atribut)
  s = s.replace(/<(b|strong|i|em|br|p|ul|ol|li|sub|sup)\b[^>]*>/gi, "<$1>");

  // khusus <a>: hanya biarkan href http/https, hilangkan atribut lain
  s = s.replace(
    /<a\b([^>]*?)>/gi,
    (_m, attrs) => {
      const hrefMatch = /\bhref\s*=\s*(['"]?)([^"' >]+)\1/i.exec(attrs || "");
      const href = hrefMatch ? hrefMatch[2] : "";
      if (!/^https?:\/\//i.test(href)) return "<span>";
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
    }
  );
  // pastikan penutup </a> tidak berubah
  return s;
}

export default function BookModal({ open, onOpenChange, book }: Props) {
  const [loading, setLoading] = useState(false);
  const [gb, setGb] = useState<GB | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open || !book?.isbn) return;
      setLoading(true);
      setGb(null);
      try {
        const res = await fetch(`/api/isbn/${encodeURIComponent(book.isbn)}`, { cache: "no-store" });
        const j = await res.json();
        if (!cancelled && res.ok && j?.found) setGb(j.book as GB);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [open, book?.isbn]);

  // lock scroll di belakang modal
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    window.addEventListener("keydown", onEsc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onEsc); };
  }, [open, onOpenChange]);

  const title = gb?.title || book?.title || "—";
  const authors = (gb?.authors && gb.authors.length ? gb.authors : [book?.author].filter(Boolean)) as string[];
  const cover =
    gb?.imageLinks?.large ||
    gb?.imageLinks?.medium ||
    gb?.imageLinks?.thumbnail ||
    gb?.imageLinks?.smallThumbnail ||
    book?.cover ||
    "/og/og-from-upload.png";

  const safeDescription = useMemo(() => sanitizeHtml(gb?.description || ""), [gb?.description]);

  if (!open || !book) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
      <div className="absolute inset-3 md:inset-8 bg-white rounded-2xl shadow-soft p-4 md:p-6 overflow-auto">
        {/* Header */}
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h2>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Tutup"
              className="rounded-full px-2 text-xl leading-none hover:bg-black/5"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-4 md:gap-6">
            {/* Cover */}
            <div className="w-[220px] h-[320px] md:w-[240px] md:h-[360px] rounded-xl overflow-hidden bg-neutral-100 justify-self-center md:justify-self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt={title} className="w-full h-full object-cover" />
            </div>

            {/* Right side */}
            <div className="text-sm leading-relaxed">
              {/* Meta 1 */}
              {authors?.length ? <div className="text-[13px] text-muted-foreground"><span className="opacity-70">Penulis:</span> <b>{authors.join(", ")}</b></div> : null}
              {(gb?.publisher || gb?.publishedDate) && (
                <div className="text-[13px] text-muted-foreground mt-1">
                  <span className="opacity-70">Publikasi: </span>
                  {[gb?.publisher, gb?.publishedDate].filter(Boolean).join(" · ")}
                </div>
              )}
              {(gb?.pageCount || gb?.printedPageCount || gb?.dimensions) && (
                <div className="text-[13px] text-muted-foreground mt-1 flex flex-wrap gap-x-6 gap-y-1">
                  {gb?.pageCount || gb?.printedPageCount ? (
                    <span><span className="opacity-70">Halaman:</span> {gb.pageCount || gb.printedPageCount}</span>
                  ) : null}
                  {gb?.dimensions ? (
                    <span>
                      <span className="opacity-70">Dimensi:</span>{" "}
                      {[gb.dimensions?.height, gb.dimensions?.width, gb.dimensions?.thickness].filter(Boolean).join(" × ")}
                    </span>
                  ) : null}
                </div>
              )}
              {typeof book.rank === "number" && book.rank > 0 ? (
                <div className="text-[13px] text-muted-foreground mt-1">
                  <span className="opacity-70">Peringkat NYT:</span> <b>#{book.rank}</b>
                </div>
              ) : null}

              {/* Categories */}
              {gb?.categories?.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {gb.categories.map((c, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-black/5">{c}</span>
                  ))}
                </div>
              ) : null}

              {/* Snippet (miring) */}
              {gb?.textSnippet ? (
                <p className="mt-3 italic text-[13px] text-muted-foreground">
                  {gb.textSnippet.replace(/<[^>]+>/g, "")}
                </p>
              ) : null}

              {/* Description (pertahankan HTML aman) */}
              <div className="mt-3 text-[14px]">
                {loading ? (
                  <span className="opacity-60">Memuat deskripsi…</span>
                ) : safeDescription ? (
                  <div
                    className="leading-relaxed break-words [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safeDescription }}
                  />
                ) : (
                  <p className="opacity-70">(Tidak ada deskripsi dari Google Books.)</p>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex gap-2">
                <a
                  href={`/isbn/${book.isbn}`}
                  className="px-3 py-2 rounded-lg bg-brand text-black text-sm"
                >
                  Buka halaman detail
                </a>
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-3 py-2 rounded-lg bg-neutral-200 text-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
