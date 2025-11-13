import type { Metadata } from "next";
import { headers } from "next/headers";
import BookDetailModal from "@/components/lighterracy/BookDetailModal";

type ParamsPromise = Promise<{ code: string }>;
export const dynamic = "force-dynamic";

/** ===== Types untuk response /api/isbn/[code] ===== */
type IsbnApiBook = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  isbn13?: string | null;
  cover?: string | null; // fallback lama
  imageLinks?:
    | {
        smallThumbnail?: string;
        thumbnail?: string;
        medium?: string;
        large?: string;
      }
    | null;
  pageCount?: number | null;
  printedPageCount?: number | null;
  dimensions?: { height?: string; width?: string; thickness?: string } | null;
  dimensionsCm?: {
    heightCm?: number;
    widthCm?: number;
    thicknessCm?: number;
  } | null;
  categories?: string[];
  averageRating?: number | null;
  ratingsCount?: number | null;
  previewLink?: string;
  infoLink?: string;
};

type IsbnApiSuccess = { found: true; book: IsbnApiBook };
type IsbnApiNotFound = { found: false };
type IsbnApiResponse = IsbnApiSuccess | IsbnApiNotFound;

function httpsify(u?: string | null) {
  if (!u) return undefined;
  return u.startsWith("http://") ? u.replace("http://", "https://") : u;
}

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `ISBN ${code} · Lighterracy` };
}

export default async function IsbnPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { code } = await params;

  // ===== Bangun BASE URL yang benar (lokal / Vercel) =====
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${proto}://${host}`;

  let data: IsbnApiResponse | null = null;

  try {
    const res = await fetch(
      `${base}/api/isbn/${encodeURIComponent(code)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      data = null;
    } else {
      data = (await res.json()) as IsbnApiResponse;
    }
  } catch {
    // Kalau error jaringan / fetch, anggap belum bisa ditampilkan
    data = null;
  }

  // Kalau error / not found → kirim book=null ke modal (UI fallback standar)
  if (!data || data.found !== true) {
    return <BookDetailModal open book={null} />;
  }

  const b = data.book;

  const book = {
    title: b.title || "—",
    subtitle: b.subtitle || "",
    authors: b.authors ?? [],
    publisher: b.publisher || "",
    publishedDate: b.publishedDate || "",
    description: b.description || "",
    textSnippet: b.textSnippet || "",
    isbn13: b.isbn13 ?? null,
    imageLinks: {
      large: httpsify(b.imageLinks?.large),
      medium: httpsify(b.imageLinks?.medium),
      thumbnail:
        httpsify(b.imageLinks?.thumbnail) ?? httpsify(b.cover),
      smallThumbnail: httpsify(b.imageLinks?.smallThumbnail),
    },
    pageCount: b.printedPageCount ?? b.pageCount ?? null,
    dimensions: b.dimensions ?? null,
    dimensionsCm: b.dimensionsCm ?? null,
    categories: b.categories ?? [],
    averageRating: b.averageRating ?? null,
    ratingsCount: b.ratingsCount ?? null,
    previewLink: b.previewLink ?? "",
    infoLink: b.infoLink ?? "",
  };

  // UI tetap sama: langsung buka BookDetailModal
  return <BookDetailModal open book={book} />;
}
