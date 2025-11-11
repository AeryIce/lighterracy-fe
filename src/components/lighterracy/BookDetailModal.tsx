"use client";

import Image from "next/image";
import { useEffect } from "react";

/** Dimensi dari Google Books (bisa string "8 inches", "20 cm", dll) */
export type Dim =
  | { height?: string; width?: string; thickness?: string }
  | null;

/** Payload buku lengkap yang dipakai modal */
export type BookFull = {
  title: string;
  subtitle?: string;
  authors?: string[];
  description?: string; // boleh mengandung HTML entities/tags dari Google
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
  onOpenChange?: (v: boolean) => void; // opsional (page / modal pembuka bisa tak kirim)
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
  // buang <script> / <style>
  let s = raw.replace(
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    ""
  );
  // buang on* handlers (onclick, onerror, dst)
  s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  // netralisir javascript: pada href/src
  s = s.replace(
    /\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi,
    ` $1="#"`
  );
  return s;
}

/** Konversi "8 in" / "8 inches" / `20 cm` → string cm untuk tampilan */
function toCm(dim?: Dim): string {
  if (!dim) return "—";
  const take = (s?: string) => (s || "").trim();
  const H = take(dim.height);
  const W = take(dim.width);
  const T = take(dim.thickness);

  const parseOne = (val: string) => {
    if (!val) return null;
    const m = val.toLowerCase().match(/([\d.,]+)/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(num)) return null;
    const isInch = /inch|in\b|["”]/.test(val.toLowerCase());
    const cm = isInch ? num * 2.54 : num;
    return Math.round(cm * 10) / 10; // 1 desimal
  };

  const h = parseOne(H);
  const w = parseOne(W);
  const t = parseOne(T);

  const parts: string[] = [];
  if (w != null) parts.push(`${w}cm`);
  if (h != null) parts.push(`${h}cm`);
  if (t != null) parts.push(`${t}cm`);
  return parts.length ? parts.join(" × ") : "—";
}

/* ==== Component ==== */
export default function BookDetailModal({ open, onOpenChange, book }: Props) {
  // Lock scroll saat modal terbuka (client-only)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !book) return null;

  const cover =
    book.imageLinks?.large ||
    book.imageLinks?.medium ||
    book.imageLinks?.thumbnail ||
    book.imageLinks?.smallThumbnail ||
    "/og/og-from-upload.png";

  const title = book.title || "—";
  const subtitle = book.subtitle || "";
  const authors = book.authors?.length ? book.authors.join(", ") : "—";
  const publisher = book.publisher || "—";
  const published = book.publishedDate || "—";
  const categories = book.categories ?? [];
  const pages = book.pageCount ?? null;

  const safeSnippet = book.textSnippet
    ? decodeEntities(book.textSnippet)
    : "";
  const safeDescHtml = book.description
    ? sanitizeHtml(decodeEntities(book.description))
    : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] grid place-items-center bg-black/45 p-3"
      onClick={() => onOpenChange?.(false)}
    >
      <div
        className="w-full max-w-5xl rounded-2xl bg-white shadow-xl p-4 md:p-6"
        onClick={(e) => e.stopPropagation()}
      >
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
              <div>
                <span className="text-neutral-500">Publisher:</span>{" "}
                {publisher}
              </div>
              <div>
                <span className="text-neutral-500">Published:</span>{" "}
                {published}
              </div>
              <div>
                <span className="text-neutral-500">ISBN-13:</span>{" "}
                {book.isbn13 || "—"}
              </div>
              <div>
                <span className="text-neutral-500">Pages:</span>{" "}
                {pages ?? "—"}
              </div>
              <div className="col-span-2">
                <span className="text-neutral-500">Dimensions:</span>{" "}
                {toCm(book.dimensions)}
              </div>
            </div>

            {/* categories */}
            {categories.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((c: string) => (
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

        {/* Deskripsi panjang (HTML aman) */}
        {safeDescHtml ? (
          <div
            className="mt-5 text-sm leading-relaxed text-neutral-800 max-h-[30vh] overflow-auto pr-1"
            dangerouslySetInnerHTML={{ __html: safeDescHtml }}
          />
        ) : null}

        <div className="mt-5 flex justify-end">
          <button
            className="px-4 py-2 rounded-lg bg-gray-200 text-sm"
            onClick={() => {
              if (typeof onOpenChange === "function") onOpenChange(false);
              else if (typeof window !== "undefined") window.history.back();
            }}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
