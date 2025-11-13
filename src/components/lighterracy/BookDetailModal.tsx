"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

/** Dimensi dari Google Books (bisa string "8 inches", "20 cm", dll) */
export type Dim =
  | { height?: string; width?: string; thickness?: string }
  | null;

/** Payload buku lengkap yang dipakai modal */
export type BookFull = {
  title: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  textSnippet?: string;
  categories?: string[];
  publisher?: string;
  publishedDate?: string;
  isbn13?: string | null;
  pageCount?: number | null;
  dimensions?: Dim;
  averageRating?: number | null;
  ratingsCount?: number | null;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    medium?: string;
    large?: string;
  } | null;
};

type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void; // optional (server page tidak kirim)
  book: BookFull | null;
};

/* ==== Utils ==== */
function decodeEntities(input = ""): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, num) =>
      String.fromCharCode(parseInt(num, 10))
    );
}

/** Sanitasi ringan agar tag dasar aktif tanpa risiko obvious XSS */
function sanitizeHtml(raw = ""): string {
  let s = raw.replace(
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ` $1="#"`);
  return s;
}

/** Konversi dimensi → string cm */
function toCm(dim?: Dim): string {
  if (!dim) return "—";
  const take = (v?: string) => (v || "").trim();
  const H = take(dim.height), W = take(dim.width), T = take(dim.thickness);

  const parseOne = (val: string) => {
    if (!val) return null;
    const m = val.toLowerCase().match(/([\d.,]+)/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(num)) return null;
    const isInch = /inch|in\b|["”]/.test(val.toLowerCase());
    const cm = isInch ? num * 2.54 : num;
    return Math.round(cm * 10) / 10;
  };

  const h = parseOne(H), w = parseOne(W), t = parseOne(T);
  const parts: string[] = [];
  if (w != null) parts.push(`${w}cm`);
  if (h != null) parts.push(`${h}cm`);
  if (t != null) parts.push(`${t}cm`);
  return parts.length ? parts.join(" × ") : "—";
}

export default function BookDetailModal({ open, onOpenChange, book }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // Lock background scroll saat modal terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // reset expand saat ganti buku
  useEffect(() => { setExpanded(false); }, [book?.isbn13, book?.title]);

  // ===== Derived values (aman sebelum early-return) =====
  const cover =
    book?.imageLinks?.large ||
    book?.imageLinks?.medium ||
    book?.imageLinks?.thumbnail ||
    book?.imageLinks?.smallThumbnail ||
    "/og/og-from-upload.png";

  const title = book?.title || "—";
  const subtitle = book?.subtitle || "";
  const authors = book?.authors?.length ? book.authors.join(", ") : "—";
  const publisher = book?.publisher || "—";
  const published = book?.publishedDate || "—";
  const categories = book?.categories ?? [];
  const pages = book?.pageCount ?? null;

  const safeSnippet = book?.textSnippet ? decodeEntities(book.textSnippet) : "";
  const safeDescHtml = book?.description
    ? sanitizeHtml(decodeEntities(book.description))
    : "";

  const showReadMore = useMemo(
    () => Boolean(safeDescHtml && safeDescHtml.length > 320),
    [safeDescHtml]
  );

  function handleClose() {
    if (typeof onOpenChange === "function") onOpenChange(false);
    else if (typeof window !== "undefined") {
      // fallback untuk Server Component: balik ke halaman sebelumnya
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/";
    }
  }

  async function handleCopy() {
    const isbn = book?.isbn13;
    if (!isbn) return;
    try {
      await navigator.clipboard.writeText(isbn);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // no-op
    }
  }

  // ESC untuk tutup
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Early return hanya untuk render (hooks sudah di atas)
  if (!open || !book) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/45"
      onClick={handleClose}
    >
      {/* wrapper scrollable full-screen */}
      <div
        className="h-full w-full overflow-y-auto overscroll-contain p-3 md:p-6 [-webkit-overflow-scrolling:touch]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* card modal */}
        <div className="mx-auto w-full max-w-5xl bg-white rounded-2xl shadow-xl max-h-[92vh] flex flex-col">
          {/* content scroll area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="grid gap-5 md:grid-cols-[240px_1fr]">
              {/* Cover kiri */}
              <div className="relative w-full h-[340px] md:h-[420px] rounded-xl overflow-hidden bg-neutral-100">
                <Image
                  src={cover}
                  alt={title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 340px, 420px"
                />
              </div>

              {/* Info kanan */}
              <div className="flex flex-col">
                <div className="text-sm text-neutral-600">{authors}</div>
                <h2 className="text-xl md:text-2xl font-semibold leading-snug mt-1">
                  {title}
                </h2>
                {subtitle ? (
                  <div className="mt-0.5 text-neutral-700">{subtitle}</div>
                ) : null}
                {safeSnippet ? (
                  <div className="mt-2 italic text-neutral-700">
                    {safeSnippet}
                  </div>
                ) : null}

                {/* meta ringkas */}
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                  <div><span className="text-neutral-500">Publisher:</span> {publisher}</div>
                  <div><span className="text-neutral-500">Published:</span> {published}</div>
                  <div><span className="text-neutral-500">ISBN-13:</span> {book.isbn13 || "—"}</div>
                  <div><span className="text-neutral-500">Pages:</span> {pages ?? "—"}</div>
                  <div className="col-span-2">
                    <span className="text-neutral-500">Dimensions:</span> {toCm(book.dimensions)}
                  </div>
                </div>

                {/* categories */}
                {categories.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {categories.map((c) => (
                      <span
                        key={c}
                        className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Deskripsi panjang */}
            {safeDescHtml ? (
              <div className="mt-5">
                <div
                  className={[
                    "text-sm leading-relaxed text-neutral-800 pr-1",
                    expanded ? "" : "max-h-[30vh] overflow-hidden"
                  ].join(" ")}
                  dangerouslySetInnerHTML={{ __html: safeDescHtml }}
                />
                {!expanded && showReadMore ? (
                  <button
                    type="button"
                    className="mt-2 text-brand text-sm"
                    onClick={() => setExpanded(true)}
                  >
                    Baca selengkapnya →
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* footer sticky */}
          <div className="sticky bottom-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 border-t px-4 py-3 flex items-center justify-end gap-2 rounded-b-2xl">
            {book.isbn13 ? (
              <button
                type="button"
                className={[
                  "px-3 py-2 rounded-lg bg-neutral-100 text-sm transition-transform",
                  copied ? "scale-[0.98]" : ""
                ].join(" ")}
                onClick={handleCopy}
                aria-live="polite"
              >
                {copied ? "Tersalin ✓" : "Copy ISBN"}
              </button>
            ) : null}
            <button
              type="button"
              className="px-4 py-2 rounded-lg bg-gray-200 text-sm"
              onClick={handleClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
