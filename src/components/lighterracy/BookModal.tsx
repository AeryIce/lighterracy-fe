"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

type Item = { isbn: string; title: string; author: string; rank: number; cover: string };

type Full = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  categories?: string[];
  isbn13?: string | null;
  pageCount?: number | null;
  dimensions?: { height?: string; width?: string; thickness?: string } | null;
  averageRating?: number | null;
  ratingsCount?: number | null;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string; large?: string } | null;
  previewLink?: string;
  infoLink?: string;
};

type Props = { open: boolean; onOpenChange: (v: boolean) => void; book: Item | null };

/* ---------- helpers aman SSR ---------- */
function decodeEntities(s = ""): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}
function sanitizeHtml(input = ""): string {
  if (!input) return "";
  const decoded = decodeEntities(input);
  let s = decoded.replace(/<(\/?)(?!b|strong|i|em|br|p|ul|ol|li|sub|sup|a)([a-z0-9-]+)(\s[^>]*)?>/gi, "");
  s = s.replace(/<(b|strong|i|em|br|p|ul|ol|li|sub|sup)\b[^>]*>/gi, "<$1>");
  s = s.replace(/<a\b([^>]*)>/gi, (_m, attrs) => {
    const m = /\bhref\s*=\s*(['"]?)([^"' >]+)\1/i.exec(attrs || "");
    const href = m ? m[2] : "";
    if (!/^https?:\/\//i.test(href)) return "<span>";
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">`;
  });
  return s;
}
function httpsify(u?: string | null) {
  if (!u) return u ?? null;
  return u.startsWith("http://") ? u.replace("http://", "https://") : u;
}
function toCmStr(txt?: string): string | null {
  if (!txt) return null;
  const num = parseFloat(txt.replace(",", "."));
  if (Number.isNaN(num)) return txt;
  const isIn = /in(ch|ches)?|"/i.test(txt);
  const cm = isIn ? Math.round(num * 2.54 * 10) / 10 : num;
  return `${cm} cm`;
}
function joinDims(d?: { height?: string; width?: string; thickness?: string } | null): string | null {
  if (!d) return null;
  const parts = [toCmStr(d.height), toCmStr(d.width), toCmStr(d.thickness)].filter(Boolean) as string[];
  return parts.length ? parts.join(" × ") : null;
}
/* -------------------------------------- */

export default function BookModal({ open, onOpenChange, book }: Props) {
  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState<Full | null>(null);

  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  // Fetch detail hanya saat modal dibuka + ISBN ada
  useEffect(() => {
    const controller = new AbortController();
    if (!open || !book?.isbn) {
      setFull(null);
      return () => controller.abort();
    }
    (async () => {
      setLoading(true);
      setFull(null);
      try {
        const r = await fetch(`/api/isbn/${encodeURIComponent(book.isbn)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (r.ok) {
          const j = (await r.json()) as { found: boolean; book?: Full };
          setFull(j?.book ?? null);
        } else {
          setFull(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [open, book?.isbn]);

  // Lock scroll + ESC
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && handleClose();
    window.addEventListener("keydown", onEsc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onEsc);
    };
  }, [open, handleClose]);

  const title = full?.title || book?.title || "—";
  const subtitle = full?.subtitle || "";
  const cover =
    httpsify(full?.imageLinks?.large) ||
    httpsify(full?.imageLinks?.medium) ||
    httpsify(full?.imageLinks?.thumbnail) ||
    httpsify(full?.imageLinks?.smallThumbnail) ||
    httpsify(book?.cover) ||
    "/og/og-from-upload.png";
  const metaAuthors = full?.authors?.length ? full.authors.join(", ") : book?.author || "";
  const metaPub = [full?.publisher, full?.publishedDate].filter(Boolean).join(" · ");
  const dim = joinDims(full?.dimensions);
  const pages = full?.pageCount ?? null;

  const safeSnippet = useMemo(() => (full?.textSnippet ? sanitizeHtml(full.textSnippet) : ""), [full?.textSnippet]);
  const safeDesc = useMemo(() => (full?.description ? sanitizeHtml(full.description) : ""), [full?.description]);

  if (!open || !book) return null;

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="absolute inset-3 md:inset-8 bg-white rounded-2xl shadow-soft p-4 md:p-6 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg md:text-xl font-semibold leading-tight">
              {title}
              {subtitle ? <span className="block text-sm font-normal text-muted-foreground mt-0.5">{subtitle}</span> : null}
            </h2>
            <button
              onClick={handleClose}
              aria-label="Tutup"
              className="rounded-full px-2 text-xl leading-none hover:bg-black/5"
            >
              ×
            </button>
          </div>

          {/* Grid content compact */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-[200px,1fr] gap-4 md:gap-6">
            {/* Cover */}
            <div className="relative w-[200px] h-[280px] md:w-[220px] md:h-[320px] rounded-xl overflow-hidden bg-neutral-100 justify-self-center md:justify-self-start">
              <Image src={cover} alt={title} fill className="object-cover" sizes="220px" priority={false} />
            </div>

            {/* Right side */}
            <div className="text-sm leading-relaxed">
              {metaAuthors && (
                <div className="text-[13px] text-muted-foreground">
                  <span className="opacity-70">Penulis:</span> <b>{metaAuthors}</b>
                </div>
              )}
              {metaPub && (
                <div className="text-[13px] text-muted-foreground mt-1">
                  <span className="opacity-70">Publikasi: </span>
                  {metaPub}
                </div>
              )}
              {typeof book.rank === "number" && book.rank > 0 && (
                <div className="text-[13px] text-muted-foreground mt-1">
                  <span className="opacity-70">Peringkat NYT:</span> <b>#{book.rank}</b>
                </div>
              )}

              {!!full?.categories?.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {full.categories!.map((c, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-[13px] text-muted-foreground">
                {full?.isbn13 && (
                  <div>
                    <span className="opacity-70">ISBN-13:</span> {full.isbn13}
                  </div>
                )}
                {pages && (
                  <div>
                    <span className="opacity-70">Halaman:</span> {pages}
                  </div>
                )}
                {dim && (
                  <div>
                    <span className="opacity-70">Dimensi:</span> {dim}
                  </div>
                )}
              </div>

              {safeSnippet && (
                <p className="mt-3 italic text-[13px] text-muted-foreground" dangerouslySetInnerHTML={{ __html: safeSnippet }} />
              )}

              <div className="mt-3 text-[14px]">
                {loading ? (
                  <span className="opacity-60">Memuat deskripsi…</span>
                ) : safeDesc ? (
                  <div
                    className="leading-relaxed break-words [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safeDesc }}
                  />
                ) : (
                  <p className="opacity-70">(Tidak ada deskripsi dari Google Books.)</p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                <a href={`/isbn/${book.isbn}`} className="px-3 py-2 rounded-lg bg-amber-400 text-black text-sm">
                  Buka halaman detail
                </a>
                <button onClick={handleClose} className="px-3 py-2 rounded-lg bg-neutral-200 text-sm">
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
