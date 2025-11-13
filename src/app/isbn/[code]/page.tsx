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
        thumbnail?: string;
        smallThumbnail?: string;
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

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${proto}://${host}`;

  let data: IsbnApiResponse | null = null;
  let ok = false;

  try {
    const res = await fetch(
      `${base}/api/isbn/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );

    ok = res.ok;

    try {
      data = (await res.json()) as IsbnApiResponse;
    } catch {
      data = null;
    }
  } catch {
    // fetch ke API sendiri gagal (network/timeout)
    ok = false;
    data = null;
  }

  // Kalau apa pun di atas gagal / tidak found → kirim null ke modal (UI tetap sama)
  if (!ok || !data || data.found !== true) {
    return <BookDetailModal open book={null} />;
  }

  const b = data.book;

  const book = {
    title: b.title || "—",
    subtitle: b.subtitle || "",
    authors: b.authors ?? [],
    publisher: b.publisher || "",
    publishedDate: b.publishedDate || "",
    description: b.description || "", // kirim description langsung
    textSnippet: b.textSnippet || "",
    isbn13: b.isbn13 ?? null,
    imageLinks: {
      large: httpsify(b.imageLinks?.large),
      medium: httpsify(b.imageLinks?.medium),
      thumbnail:
        httpsify(b.imageLinks?.thumbnail) ?? httpsify(b.cover), // fallback ke cover lama
      smallThumbnail: httpsify(b.imageLinks?.smallThumbnail),
    },
    pageCount: b.printedPageCount ?? b.pageCount ?? null,
    dimensions: b.dimensions ?? null,
    dimensionsCm: b.dimensionsCm ?? null,
    categories: b.categories ?? [],
    averageRating: b.averageRating ?? null,
    ratingsCount: b.ratingsCount ?? null,
  };

  // onOpenChange sengaja tidak dikirim (server component).
  return <BookDetailModal open book={book} />;
}
