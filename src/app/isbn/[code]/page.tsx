import type { Metadata } from "next";
import { headers } from "next/headers";
import BookDetailModal from "@/components/lighterracy/BookDetailModal";

type ParamsPromise = Promise<{ code: string }>;

export const dynamic = "force-dynamic";

// ====== Types untuk response /api/isbn/[code] ======
type IsbnApiBook = {
  title: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string; // RAW dari API (bisa HTML + entities)
  textSnippet?: string;
  isbn13?: string | null;
  cover?: string | null;
  imageLinks?: { thumbnail?: string; smallThumbnail?: string } | null;
  pageCount?: number | null;
  printedPageCount?: number | null;
  dimensions?: { height?: string; width?: string; thickness?: string } | null;
  dimensionsCm?: { heightCm?: number; widthCm?: number; thicknessCm?: number } | null;
  categories?: string[];
  averageRating?: number | null;
  ratingsCount?: number | null;
};

type IsbnApiSuccess = { found: true; book: IsbnApiBook };
type IsbnApiNotFound = { found: false };
type IsbnApiResponse = IsbnApiSuccess | IsbnApiNotFound;

function httpsify(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

export async function generateMetadata({ params }: { params: ParamsPromise }): Promise<Metadata> {
  const { code } = await params;
  return { title: `ISBN ${code} · Lighterracy` };
}

export default async function IsbnPage({ params }: { params: ParamsPromise }) {
  const { code } = await params;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${proto}://${host}`;

  const res = await fetch(`${base}/api/isbn/${encodeURIComponent(code)}`, { cache: "no-store" });

  let data: IsbnApiResponse | null = null;
  try {
    data = (await res.json()) as IsbnApiResponse;
  } catch {
    data = null;
  }

  if (!res.ok || !data || data.found !== true) {
    return <BookDetailModal open book={null} />;
  }

  const b = data.book;

  const book = {
    title: b.title || "—",
    subtitle: b.subtitle || "",
    authors: b.authors || [],
    publisher: b.publisher || "",
    publishedDate: b.publishedDate || "",
    // kirim RAW agar bisa dirender HTML aman di modal
    descriptionHtml: b.description || "",
    textSnippet: b.textSnippet || "",
    isbn13: b.isbn13 ?? null,
    cover:
      httpsify(b.cover) ||
      httpsify(b.imageLinks?.thumbnail) ||
      httpsify(b.imageLinks?.smallThumbnail) ||
      "/og/og-from-upload.png",
    pageCount: b.printedPageCount ?? b.pageCount ?? null,
    dimensions: b.dimensions ?? null,
    dimensionsCm: b.dimensionsCm ?? null,
    categories: b.categories || [],
    averageRating: b.averageRating ?? null,
    ratingsCount: b.ratingsCount ?? null,
  };

  return <BookDetailModal open book={book} />;
}
