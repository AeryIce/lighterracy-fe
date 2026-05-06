import type { Metadata } from "next";
import { headers } from "next/headers";
import BookDetailModal, { type BookFull } from "@/components/lighterracy/BookDetailModal";

// Next 16 dynamic params shape in this project
type ParamsPromise = Promise<{ code: string }>;
export const dynamic = "force-dynamic";

type GoogleApiBook = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  textSnippet?: string;
  isbn13?: string | null;
  cover?: string | null;
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

type GoogleApiSuccess = { found: true; book: GoogleApiBook };
type GoogleApiNotFound = { found: false };
type GoogleApiResponse = GoogleApiSuccess | GoogleApiNotFound;

type InternalBookPayload = {
  id?: string | number | null;
  isbn_13?: string | null;
  isbn_10?: string | null;
  title?: string | null;
  subtitle?: string | null;
  authors?: unknown;
  publisher?: string | null;
  published_year?: number | string | null;
  language?: string | null;
  page_count?: number | null;
  categories?: unknown;
  category_internal?: string | null;
  tags?: unknown;
  cover_url?: string | null;
  description?: string | null;
  description_team?: string | null;
  description_google?: string | null;
  description_source?: string | null;
};

type LightcyPreviewResponse = {
  source?: string;
  mode?: string;
  context?: {
    book?: InternalBookPayload;
    core_summary?: unknown;
    materials?: unknown[];
  };
};

function getBackendUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const trimmed = raw.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : null;
}

function httpsify(u?: string | null): string | undefined {
  if (!u) return undefined;
  return u.startsWith("http://") ? u.replace("http://", "https://") : u;
}

function cleanText(value?: string | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  return [];
}

function coreSummaryToText(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  if (!payload || typeof payload !== "object") return "";

  const record = payload as Record<string, unknown>;
  const chunks: string[] = [];

  for (const key of ["one_liner", "summary", "description", "ideal_reader"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) chunks.push(value.trim());
  }

  const keyPoints = record.key_points;
  if (Array.isArray(keyPoints)) {
    const points = keyPoints
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter((item) => item.length > 0);

    if (points.length > 0) {
      chunks.push(points.map((point) => `• ${point}`).join("\n"));
    }
  }

  return chunks.join("\n\n").trim();
}

function pickInternalDescription(book: InternalBookPayload, coreSummary: unknown) {
  const team = cleanText(book.description_team);
  const main = cleanText(book.description);
  const core = coreSummaryToText(coreSummary);
  const google = cleanText(book.description_google);

  if (team) return { text: team, source: "Deskripsi internal" };
  if (main) return { text: main, source: book.description_source === "google" ? "Deskripsi Google Books" : "Deskripsi internal" };
  if (core) return { text: core, source: "Core Summary AI" };
  if (google) return { text: google, source: "Deskripsi Google Books" };

  return { text: "", source: "" };
}

function mapInternalBook(response: LightcyPreviewResponse, requestedIsbn: string): BookFull | null {
  const context = response.context;
  const b = context?.book;

  if (!b?.title) return null;

  const description = pickInternalDescription(b, context?.core_summary);
  const categories = [
    ...toStringArray(b.categories),
    ...toStringArray(b.category_internal),
    ...toStringArray(b.tags),
  ];

  const uniqueCategories = Array.from(new Set(categories)).slice(0, 8);
  const publishedYear = b.published_year ? String(b.published_year) : "";

  return {
    title: b.title,
    subtitle: cleanText(b.subtitle),
    authors: toStringArray(b.authors),
    publisher: cleanText(b.publisher),
    publishedDate: publishedYear,
    description: description.text,
    descriptionSourceLabel: description.source,
    textSnippet: "",
    isbn13: cleanText(b.isbn_13) || requestedIsbn,
    pageCount: b.page_count ?? null,
    dimensions: null,
    categories: uniqueCategories,
    averageRating: null,
    ratingsCount: null,
    imageLinks: {
      large: httpsify(b.cover_url),
      medium: httpsify(b.cover_url),
      thumbnail: httpsify(b.cover_url),
      smallThumbnail: httpsify(b.cover_url),
    },
    dataSource: "internal",
  };
}

async function fetchInternalBook(isbn: string): Promise<BookFull | null> {
  const backend = getBackendUrl();
  if (!backend) return null;

  try {
    const res = await fetch(
      `${backend}/api/lightcy/books/isbn/${encodeURIComponent(isbn)}`,
      { cache: "no-store" },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as LightcyPreviewResponse;
    return mapInternalBook(data, isbn);
  } catch {
    return null;
  }
}

async function fetchGoogleBook(isbn: string): Promise<BookFull | null> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (process.env.VERCEL ? "https" : "http");
  const base = `${proto}://${host}`;

  try {
    const res = await fetch(`${base}/api/isbn/${encodeURIComponent(isbn)}`, {
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as GoogleApiResponse;
    if (data.found !== true) return null;

    const b = data.book;

    return {
      title: b.title || "—",
      subtitle: b.subtitle || "",
      authors: b.authors ?? [],
      publisher: b.publisher || "",
      publishedDate: b.publishedDate || "",
      description: b.description || "",
      descriptionSourceLabel: b.description ? "Deskripsi Google Books" : "",
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
      dataSource: "google",
    };
  } catch {
    return null;
  }
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

  const internalBook = await fetchInternalBook(code);
  const book = internalBook ?? (await fetchGoogleBook(code));

  return <BookDetailModal open book={book} purchaseIsbn={code} />;
}
