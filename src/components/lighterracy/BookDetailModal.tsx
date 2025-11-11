// src/components/lighterracy/BookDetailModal.tsx
"use client";

import Image from "next/image";
import { useCallback } from "react";

type Dim = { height?: string; width?: string; thickness?: string } | null;

type Book = {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  categories: string[];
  description?: string;
  textSnippet?: string;
  isbn13: string | null;
  pageCount: number | null;
  dimensions: Dim;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string; medium?: string; large?: string } | null;
  cover?: string | null;
};

type Props = {
  open?: boolean; // dipakai pada page /isbn/[code] agar tampil sebagai konten modal
  book: Book | null;
};

/* -------------------- Helpers -------------------- */

// Decode entity umum tanpa akses DOM (aman untuk SSR)
function decodeEntities(input = ""): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

// Izinkan tag aman & rapikan paragraf
function sanitizeHtml(input = ""): string {
  if (!input) return "";
  // decode entities dahulu
  let s = decodeEntities(input);

  // Normalisasi line break → <br/>
  s = s.replace(/\r\n|\r|\n/g, "<br/>");

  // Escape semua tag…
  s = s.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // …lalu kembalikan tag yang diizinkan
  // (b, strong, i, em, br, p, ul, ol, li)
  s = s.replace(
    /&lt;(\/?(?:b|strong|i|em|br|p|ul|ol|li))&gt;/gi,
    "<$1>"
  );

  // Rapikan <br/><br/> menjadi pemisah paragraf
  s = s.replace(/(?:<br\s*\/?>\s*){2,}/gi, "<br/><br/>");

  return s;
}

// Ambil URL cover terbaik
function pickCover(b: Book | null): string {
  const cand =
    b?.cover ||
    b?.imageLinks?.large ||
    b?.imageLinks?.medium ||
    b?.imageLinks?.thumbnail ||
    b?.imageLinks?.smallThumbnail;
  return cand || "/og/og-from-upload.png";
}

// Konversi string dimensi (bisa "8.5 in" / "21 cm") → cm (angka)
function parseToCm(s?: string): number | null {
  if (!s) return null;
  const m = s.match(/([\d.]+)\s*(cm|mm|in|inch|inches|")/i);
  if (!m) return null;
  const val = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (Number.isNaN(val)) return null;
  if (unit === "cm") return val;
  if (unit === "mm") return val / 10;
  // inch family
  return val * 2.54;
}

function dimsToText(d: Dim): string | null {
  if (!d) return null;
  const h = parseToCm(d.height);
  const w = parseToCm(d.width);
  const t = parseToCm(d.thickness);
  const parts: string[] = [];
  if (h) parts.push(`${h.toFixed(1)} cm`);
  if (w) parts.push(`${w.toFixed(1)} cm`);
  if (t) parts.push(`${t.toFixed(1)} cm`);
  if (!parts.length) return null;
  return parts.join(" × ");
}

/* -------------------- Component -------------------- */

export default function BookDetailModal({ book }: Props) {
  const cover = pickCover(book);
  const title = book?.title || "—";
  const subtitle = book?.subtitle?.trim();
  const authors = (book?.authors ?? []).join(", ");
  const publisher =
    [book?.publisher, book?.publishedDate].filter(Boolean).join(" · ") || "";
  const cats = book?.categories ?? [];
  const isbn13 = book?.isbn13 || "—";
  const pages = book?.pageCount ?? null;
  const dims = dimsToText(book?.dimensions ?? null);

  const renderHtml = useCallback((html: string) => {
    return { __html: sanitizeHtml(html) };
  }, []);

  return (
    <div className="p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6 md:gap-8">
        {/* Cover */}
        <div className="justify-self-center md:justify-self-start">
          <div className="relative w-[220px] h-[320px] md:w-[240px] md:h-[360px] rounded-xl overflow-hidden bg-neutral-100 shadow">
            <Image
              src={cover}
              alt={title}
              fill
              className="object-cover"
              sizes="240px"
            />
          </div>
        </div>

        {/* Info */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold leading-snug">{title}</h1>
          {subtitle ? (
            <div className="text-sm text-neutral-600">{subtitle}</div>
          ) : null}

          {authors && (
            <div className="text-sm">
              <span className="text-neutral-500">Penulis: </span>
              <span className="font-medium">{authors}</span>
            </div>
          )}

          {publisher && (
            <div className="text-sm">
              <span className="text-neutral-500">Publikasi: </span>
              {publisher}
            </div>
          )}

          {/* Kategori */}
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {cats.map((c) => (
                <span
                  key={c}
                  className="inline-block rounded-full bg-amber-100 text-amber-900 text-xs px-2 py-1"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* ISBN, halaman, dimensi */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-sm">
            <div>
              <div className="text-neutral-500">ISBN-13</div>
              <div className="font-medium tracking-wide">{isbn13}</div>
            </div>
            <div>
              <div className="text-neutral-500">Halaman</div>
              <div className="font-medium">{pages ?? "—"}</div>
            </div>
            <div>
              <div className="text-neutral-500">Dimensi</div>
              <div className="font-medium">{dims ?? "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Snippet (miring) */}
      {book?.textSnippet ? (
        <p
          className="mt-6 italic text-neutral-700"
          dangerouslySetInnerHTML={renderHtml(book.textSnippet)}
        />
      ) : null}

      {/* Deskripsi (fallback: jika tidak ada, tulis info singkat) */}
      <div className="mt-4 text-[15px] leading-relaxed">
        {book?.description ? (
          <div
            dangerouslySetInnerHTML={renderHtml(book.description)}
          />
        ) : (
          <div className="text-neutral-600">
            (Tidak ada deskripsi dari Google Books.)
          </div>
        )}
      </div>
    </div>
  );
}
