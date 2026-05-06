import Link from "next/link";
import type { Metadata } from "next";
import BookDetailModal from "@/components/lighterracy/BookDetailModal";

type ParamsPromise = Promise<{ code: string }>;
export const dynamic = "force-dynamic";

type VolumeInfoFull = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  industryIdentifiers?: { type?: string; identifier?: string }[];
  pageCount?: number;
  printedPageCount?: number;
  dimensions?: { height?: string; width?: string; thickness?: string };
  categories?: string[];
  averageRating?: number;
  ratingsCount?: number;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    medium?: string;
    large?: string;
  } | null;
  previewLink?: string;
  infoLink?: string;
};

type SearchItem = {
  id: string;
  selfLink: string;
  volumeInfo?: Partial<VolumeInfoFull>;
  searchInfo?: { textSnippet?: string };
};

type SearchResp = {
  totalItems?: number;
  items?: SearchItem[];
};

type VolumeResp = {
  volumeInfo?: VolumeInfoFull;
};

type IsbnApiBook = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  isbn13?: string | null;
  cover?: string | null;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    medium?: string;
    large?: string;
  } | null;
  pageCount?: number | null;
  printedPageCount?: number | null;
  dimensions?: { height?: string; width?: string; thickness?: string } | null;
  categories?: string[];
  averageRating?: number | null;
  ratingsCount?: number | null;
  previewLink?: string;
  infoLink?: string;
};

function httpsify(u?: string | null) {
  if (!u) return undefined;
  return u.startsWith("http://") ? u.replace("http://", "https://") : u;
}

function normalizeIsbn(input: string): string {
  return input.replace(/[^0-9Xx]/g, "").trim();
}

async function fetchBookFromGoogleBooks(isbn: string): Promise<IsbnApiBook | null> {
  const key = process.env.GOOGLE_BOOKS_API_KEY ?? "";

  const qs1 = new URLSearchParams({
    q: `isbn:${isbn}`,
    maxResults: "1",
    printType: "books",
    country: "ID",
    fields:
      "items(id,selfLink,volumeInfo(title,subtitle,authors,publisher,publishedDate,imageLinks,previewLink,infoLink,industryIdentifiers,pageCount,printedPageCount,dimensions,categories,averageRating,ratingsCount,description),searchInfo(textSnippet)),totalItems",
  });

  if (key) qs1.set("key", key);

  const url1 = `https://www.googleapis.com/books/v1/volumes?${qs1.toString()}`;

  let searchResponse: Response;

  try {
    searchResponse = await fetch(url1, { next: { revalidate: 600 } });
  } catch {
    return null;
  }

  if (!searchResponse.ok) return null;

  const searchData = (await searchResponse.json()) as SearchResp;
  const first = searchData.items?.[0];

  if (!first) return null;

  const qs2 = new URLSearchParams();
  if (key) qs2.set("key", key);

  const url2 = `${first.selfLink}${qs2.size ? `?${qs2.toString()}` : ""}`;
  let volumeData: VolumeResp = { volumeInfo: first.volumeInfo as VolumeInfoFull };

  try {
    const volumeResponse = await fetch(url2, { next: { revalidate: 600 } });
    if (volumeResponse.ok) {
      volumeData = (await volumeResponse.json()) as VolumeResp;
    }
  } catch {
    volumeData = { volumeInfo: first.volumeInfo as VolumeInfoFull };
  }

  const volumeInfo: VolumeInfoFull = {
    ...(first.volumeInfo ?? {}),
    ...(volumeData.volumeInfo ?? {}),
  };

  const isbn13 =
    volumeInfo.industryIdentifiers?.find((item) => item.type === "ISBN_13")
      ?.identifier ??
    volumeInfo.industryIdentifiers?.[0]?.identifier ??
    isbn;

  return {
    title: volumeInfo.title || "",
    subtitle: volumeInfo.subtitle || "",
    authors: volumeInfo.authors ?? [],
    publisher: volumeInfo.publisher || "",
    publishedDate: volumeInfo.publishedDate || "",
    description: volumeInfo.description || "",
    textSnippet: first.searchInfo?.textSnippet ?? "",
    categories: volumeInfo.categories ?? [],
    isbn13,
    pageCount: volumeInfo.pageCount ?? null,
    printedPageCount: volumeInfo.printedPageCount ?? null,
    dimensions: volumeInfo.dimensions ?? null,
    averageRating: volumeInfo.averageRating ?? null,
    ratingsCount: volumeInfo.ratingsCount ?? null,
    imageLinks: volumeInfo.imageLinks ?? null,
    previewLink: volumeInfo.previewLink || "",
    infoLink: volumeInfo.infoLink || "",
  };
}

function BookUnavailable({ isbn }: { isbn: string }) {
  return (
    <main className="min-h-screen bg-[#f7f7f7] px-4 py-10 text-neutral-950">
      <section className="mx-auto max-w-2xl rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          Lighterracy book detail
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight">
          Buku ini belum bisa ditampilkan.
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Lightcy belum berhasil mengambil detail untuk ISBN ini. Ini bukan berarti
          bukunya tidak ada; kadang sumber data buku sedang tidak memberi hasil yang
          lengkap.
        </p>
        <div className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ISBN yang dicari: <span className="font-semibold">{isbn}</span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/"
            className="rounded-full bg-[#0e2a47] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#12385f]"
          >
            Cari buku lain
          </Link>
          <Link
            href="/me"
            className="rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-800 transition hover:bg-amber-50"
          >
            Kembali ke ruang baca
          </Link>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const { code } = await params;
  const isbn = normalizeIsbn(code);

  return { title: `ISBN ${isbn || code} · Lighterracy` };
}

export default async function IsbnPage({
  params,
}: {
  params: ParamsPromise;
}) {
  const { code } = await params;
  const isbn = normalizeIsbn(code);

  if (!isbn) {
    return <BookUnavailable isbn={code} />;
  }

  const b = await fetchBookFromGoogleBooks(isbn);

  if (!b) {
    return <BookUnavailable isbn={isbn} />;
  }

  const book = {
    title: b.title || "—",
    subtitle: b.subtitle || "",
    authors: b.authors ?? [],
    publisher: b.publisher || "",
    publishedDate: b.publishedDate || "",
    description: b.description || "",
    textSnippet: b.textSnippet || "",
    isbn13: b.isbn13 ?? isbn,
    imageLinks: {
      large: httpsify(b.imageLinks?.large),
      medium: httpsify(b.imageLinks?.medium),
      thumbnail: httpsify(b.imageLinks?.thumbnail) ?? httpsify(b.cover),
      smallThumbnail: httpsify(b.imageLinks?.smallThumbnail),
    },
    pageCount: b.printedPageCount ?? b.pageCount ?? null,
    dimensions: b.dimensions ?? null,
    categories: b.categories ?? [],
    averageRating: b.averageRating ?? null,
    ratingsCount: b.ratingsCount ?? null,
  };

  return <BookDetailModal open book={book} />;
}
