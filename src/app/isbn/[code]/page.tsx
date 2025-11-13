import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
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

  // Bangun origin yang SAMA persis dengan yang kamu pakai di browser
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${proto}://${host}`;

  let data: IsbnApiResponse | null = null;

  try {
    const res = await fetch(
      `${base}/api/isbn/${encodeURIComponent(code)}`,
      { cache: "no-store" },
    );

    try {
      // Tidak peduli status code-nya, yang penting JSON-nya kebaca
      data = (await res.json()) as IsbnApiResponse;
    } catch {
      data = null;
    }
  } catch {
    data = null;
  }

  // ❌ CASE: gagal / tidak ditemukan → tampilkan fallback page (bukan blank)
  if (!data || data.found !== true || !data.book) {
    return (
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Detail ISBN
          </p>
          <h1 className="text-lg font-semibold">
            Buku belum bisa ditampilkan
          </h1>
          <p className="text-sm text-slate-600">
            Kami belum bisa memuat detail untuk ISBN{" "}
            <span className="font-mono tracking-wide">{code}</span>. Bisa jadi
            Google Books sedang sulit diakses atau buku ini belum terdaftar.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm bg-black text-white"
            >
              Kembali ke beranda
            </Link>
            <Link
              href="/#search"
              className="inline-flex items-center rounded-full px-4 py-2 text-sm border border-slate-300 text-slate-700 bg-white"
            >
              Cari ISBN lain
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ✅ CASE: sukses → kirim ke BookDetailModal (UI/UX sama persis)
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
