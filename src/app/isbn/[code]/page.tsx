import type { Metadata } from "next";
import BookDetailModal, { type BookFull } from "@/components/lighterracy/BookDetailModal";

// Next 16 dynamic params shape in this project
type ParamsPromise = Promise<{ code: string }>;
export const dynamic = "force-dynamic";

type BookSource = "internal" | "external_google" | "external_google_seed" | "not_found" | string;

type BookDetailPayload = {
  id?: string | number | null;
  requested_isbn?: string | null;
  isbn_13?: string | null;
  isbn_10?: string | null;
  title?: string | null;
  subtitle?: string | null;
  authors?: unknown;
  publisher?: string | null;
  published_year?: number | string | null;
  published_date?: string | null;
  language?: string | null;
  page_count?: number | null;
  categories?: unknown;
  category_internal?: string | null;
  tags?: unknown;
  cover_url?: string | null;
  cover_type?: string | null;
  edition_code?: string | null;
  size_code?: string | null;
  description?: string | null;
  description_team?: string | null;
  description_google?: string | null;
  description_source?: string | null;
  core_summary?: unknown;
  core_summary_source?: string | null;
  google_volume_id?: string | null;
  data_source?: string | null;
  data_source_label?: string | null;
  can_recommend?: boolean | null;
  is_recommendable?: boolean | null;
  data_origin?: string | null;
  curation_status?: string | null;
  average_rating?: number | null;
  ratings_count?: number | null;
  dimensions?: { height?: string; width?: string; thickness?: string } | null;
};

type BookDetailResponse = {
  ok?: boolean;
  requested_isbn?: string;
  source?: BookSource;
  source_label?: string;
  can_recommend?: boolean;
  show_purchase_links?: boolean;
  is_internal?: boolean;
  book?: BookDetailPayload | null;
  external_enrichment?: unknown;
};

type PageBookResult = {
  book: BookFull | null;
  source: BookSource;
  sourceLabel: string;
  canRecommend: boolean;
  showPurchaseLinks: boolean;
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
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          for (const key of ["name", "title", "label", "value"]) {
            const candidate = record[key];
            if (typeof candidate === "string" && candidate.trim()) {
              return candidate.trim();
            }
          }
        }
        return "";
      })
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

function pickDescription(book: BookDetailPayload, source: BookSource) {
  const team = cleanText(book.description_team);
  const main = cleanText(book.description);
  const core = coreSummaryToText(book.core_summary);
  const google = cleanText(book.description_google);

  if (team) return { text: team, label: "Deskripsi internal" };
  if (main) {
    const label =
      source === "external_google" || book.description_source === "external_google"
        ? "Deskripsi Google Books"
        : "Deskripsi internal";
    return { text: main, label };
  }
  if (core) return { text: core, label: "Core Summary AI" };
  if (google) return { text: google, label: "Deskripsi Google Books" };

  return { text: "", label: "" };
}

function mapBookDetail(response: BookDetailResponse, requestedIsbn: string): PageBookResult {
  const source = response.source ?? "not_found";
  const isCuratedInternal =
    source === "internal" && (response.can_recommend === true || response.is_internal === true);
  const b = response.book;

  if (!b?.title) {
    return {
      book: null,
      source,
      sourceLabel: response.source_label ?? "Belum ditemukan",
      canRecommend: false,
      showPurchaseLinks: false,
    };
  }

  const description = pickDescription(b, source);
  const categories = [
    ...toStringArray(b.categories),
    ...toStringArray(b.category_internal),
    ...toStringArray(b.tags),
  ];
  const uniqueCategories = Array.from(new Set(categories)).slice(0, 8);

  const publishedDate =
    cleanText(b.published_date) ||
    (b.published_year === null || b.published_year === undefined
      ? ""
      : String(b.published_year));

  const cover = httpsify(b.cover_url);

  return {
    book: {
      title: cleanText(b.title) || "—",
      subtitle: cleanText(b.subtitle),
      authors: toStringArray(b.authors),
      publisher: cleanText(b.publisher),
      publishedDate,
      description: description.text,
      descriptionSourceLabel: description.label,
      textSnippet: "",
      isbn13: cleanText(b.isbn_13) || requestedIsbn,
      pageCount: b.page_count ?? null,
      dimensions: b.dimensions ?? null,
      categories: uniqueCategories,
      averageRating: b.average_rating ?? null,
      ratingsCount: b.ratings_count ?? null,
      imageLinks: {
        large: cover,
        medium: cover,
        thumbnail: cover,
        smallThumbnail: cover,
      },
      dataSource: isCuratedInternal ? "internal" : "google",
    },
    source,
    sourceLabel:
      response.source_label ?? (isCuratedInternal ? "Data Lighterracy" : "Info eksternal"),
    canRecommend: response.can_recommend === true || b.can_recommend === true,
    showPurchaseLinks: response.show_purchase_links === true,
  };
}

async function fetchBookDetail(isbn: string): Promise<PageBookResult> {
  const backend = getBackendUrl();
  if (!backend) {
    return {
      book: null,
      source: "not_found",
      sourceLabel: "Backend belum tersambung",
      canRecommend: false,
      showPurchaseLinks: false,
    };
  }

  try {
    const res = await fetch(
      `${backend}/api/books/${encodeURIComponent(isbn)}/detail`,
      { cache: "no-store" },
    );

    if (!res.ok) {
      return {
        book: null,
        source: "not_found",
        sourceLabel: "Buku belum ditemukan",
        canRecommend: false,
        showPurchaseLinks: false,
      };
    }

    const data = (await res.json()) as BookDetailResponse;
    return mapBookDetail(data, isbn);
  } catch {
    return {
      book: null,
      source: "not_found",
      sourceLabel: "Buku belum ditemukan",
      canRecommend: false,
      showPurchaseLinks: false,
    };
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
  const result = await fetchBookDetail(code);

  return (
    <BookDetailModal
      open
      book={result.book}
      purchaseIsbn={code}
      showPurchaseLinks={result.showPurchaseLinks}
    />
  );
}
