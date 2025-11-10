import type { Metadata } from "next";
import { headers } from "next/headers";
import BookDetailModal from "@/components/lighterracy/BookDetailModal";

type ParamsPromise = Promise<{ code: string }>;

export const dynamic = "force-dynamic";

// helpers
function httpsify(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}
function stripHtml(html?: string) {
  if (!html) return "";
  return html.replace(/<[^>]+>/g, "").trim();
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

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || !data?.found) {
    // tetap tampilkan modal "not found" agar UX konsisten
    return <BookDetailModal open book={null} />;
  }

  const b = data.book as {
    title: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    cover?: string | null;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string } | null;
    pageCount?: number | null;
    printedPageCount?: number | null;
    dimensions?: { height?: string; width?: string; thickness?: string } | null;
    categories?: string[];
    averageRating?: number | null;
    ratingsCount?: number | null;
  };

  const book = {
    title: b.title || "—",
    subtitle: b.subtitle || "",
    authors: b.authors || [],
    publisher: b.publisher || "",
    publishedDate: b.publishedDate || "",
    description: stripHtml(b.description) || "",
    cover:
      httpsify(b.cover) ||
      httpsify(b.imageLinks?.thumbnail) ||
      httpsify(b.imageLinks?.smallThumbnail) ||
      "/og/og-from-upload.png",
    pageCount: b.printedPageCount ?? b.pageCount ?? null,
    dimensions: b.dimensions ?? null,
    categories: b.categories || [],
    averageRating: b.averageRating ?? null,
    ratingsCount: b.ratingsCount ?? null,
  };

  return <BookDetailModal open book={book} />;
}
