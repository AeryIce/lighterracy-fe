"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Item ringkas yang dikirim dari NYTCarousel */
export type NytItem = {
  isbn: string;
  title: string;
  author: string;
  rank: number;
  cover: string;
};

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  book: NytItem | null;
};

/* ---------- helpers ---------- */
function httpsify(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}
function decodeEntities(input = ""): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([\da-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}
/** Sanitasi ringan, tanpa `document` (aman SSR) */
function sanitizeHtml(raw = ""): string {
  let s = raw.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ` $1="#"`);
  return s;
}

/* ---------- types API /api/isbn/[code] ---------- */
type ApiBook = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  isbn13?: string | null;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    medium?: string;
    large?: string;
  } | null;
};
type ApiOk = { found: true; book: ApiBook };
type ApiNo = { found: false };
type ApiResp = ApiOk | ApiNo;

/* ---------- component ---------- */
export default function BookModal({ open, onOpenChange, book }: Props) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [full, setFull] = useState<ApiBook | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Kunci body scroll saat modal terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fetch detail Google Books saat dibuka
  useEffect(() => {
    setErr(null);
    setFull(null);
    if (!open || !book?.isbn) return;

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/isbn/${encodeURIComponent(book.isbn)}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as ApiResp;
        if (!cancelled) {
          if ("found" in data && data.found) setFull(data.book ?? null);
          else setErr("Data buku tidak ditemukan.");
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "Gagal memuat detail.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, book?.isbn]);

  if (!open || !book) return null;

  const cover =
    httpsify(full?.imageLinks?.large) ||
    httpsify(full?.imageLinks?.medium) ||
    httpsify(full?.imageLinks?.thumbnail) ||
    httpsify(full?.imageLinks?.smallThumbnail) ||
    book.cover ||
    "/og/og-from-upload.png";

  const author =
    (full?.authors?.length ? full.authors!.join(", ") : book.author) || "—";

  // *** PENTING: pakai description lebih dulu, baru fallback ke snippet
  const rawShort = full?.description ?? full?.textSnippet ?? "";
  const shortHtml = sanitizeHtml(decodeEntities(rawShort));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/45 p-3"
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white p-4 md:p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          {/* Cover */}
          <div className="relative w-full h-[300px] md:h-[360px] rounded-xl overflow-hidden bg-neutral-100">
            <Image
              src={cover || "/og/og-from-upload.png"}
              alt={book.title || "Book cover"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 300px, 360px"
            />
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              NYT #{book.rank}
            </div>
          </div>

          {/* Info ringkas */}
          <div className="flex flex-col">
            <div className="text-[11px] tracking-wide text-neutral-500 mb-1">
              NEW YORK TIMES PICK
            </div>
            <h2 className="text-xl md:text-2xl font-semibold leading-snug">
              {book.title || "—"}
            </h2>
            <div className="mt-1 text-sm text-neutral-700">{author}</div>

            <div
              className="mt-3 text-[15px] leading-relaxed text-neutral-800 line-clamp-5"
              dangerouslySetInnerHTML={{ __html: shortHtml }}
            />

            {/* STATUS: loading / error / info */}
            <div className="mt-2 text-xs">
              {loading ? (
                <div className="flex items-center gap-2 text-neutral-600">
                  <span className="inline-block h-3 w-3 rounded-full bg-neutral-400 animate-pulse" />
                  <span>Sedang mencari detail di database…</span>
                </div>
              ) : err ? (
                <div className="text-amber-700">
                  {err} Silakan coba lagi atau cari manual via menu <b>Cari Buku</b>.
                </div>
              ) : full && !full.isbn13 ? (
                <div className="text-neutral-600">
                  Detail ditemukan. ISBN-13 belum tersedia dari sumber ini.
                </div>
              ) : null}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                className="px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
                disabled={!book.isbn}
                onClick={() =>
                  book.isbn
                    ? router.push(`/isbn/${encodeURIComponent(book.isbn)}`)
                    : undefined
                }
              >
                Detail
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 text-sm"
                onClick={() => onOpenChange?.(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
