import { NextResponse } from "next/server";

// --- types ---------------------------------------------------------------

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
type SearchResp = { totalItems?: number; items?: SearchItem[] };

type VolumeResp = { volumeInfo?: VolumeInfoFull };

// --- handler -------------------------------------------------------------

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  const { code } = await ctx.params;
  const isbn = (code || "").trim();
  if (!isbn) return NextResponse.json({ found: false }, { status: 400 });

  const key = process.env.GOOGLE_BOOKS_API_KEY ?? "";

  // Step 1 — cari volume + selfLink (+ snippet)
  const qs1 = new URLSearchParams({
    q: `isbn:${isbn}`,
    maxResults: "1",
    printType: "books",
    country: "ID",
    fields:
      "items(id,selfLink,volumeInfo(title,subtitle,authors,publisher,publishedDate,imageLinks,previewLink,infoLink),searchInfo(textSnippet)),totalItems",
  });
  if (key) qs1.set("key", key);

  const url1 = `https://www.googleapis.com/books/v1/volumes?${qs1.toString()}`;
  const r1 = await fetch(url1, { next: { revalidate: 600 } });
  if (!r1.ok) return NextResponse.json({ found: false }, { status: 502 });

  const s: SearchResp = await r1.json();
  const first = s.items?.[0];
  if (!first) return NextResponse.json({ found: false }, { status: 404 });

  // Step 2 — fetch selfLink untuk field lengkap (fallback ke step 1 jika perlu)
  const qs2 = new URLSearchParams();
  if (key) qs2.set("key", key);
  const url2 = `${first.selfLink}${qs2.size ? `?${qs2.toString()}` : ""}`;
  const r2 = await fetch(url2, { next: { revalidate: 600 } });
  const v: VolumeResp = r2.ok ? await r2.json() : { volumeInfo: first.volumeInfo as VolumeInfoFull };

  // Merge: data lengkap (step 2) override data tipis (step 1)
  const vi: VolumeInfoFull = {
    ...(first.volumeInfo ?? {}),
    ...(v.volumeInfo ?? {}),
  };

  // ISBN-13 (fallback ke apa pun yang tersedia)
  const isbn13 =
    vi.industryIdentifiers?.find((x) => x.type === "ISBN_13")?.identifier ??
    vi.industryIdentifiers?.[0]?.identifier ??
    null;

  return NextResponse.json({
    found: true as const,
    book: {
      title: vi.title || "",
      subtitle: vi.subtitle || "",
      authors: vi.authors ?? [],
      publisher: vi.publisher || "",
      publishedDate: vi.publishedDate || "",
      description: vi.description || "",
      textSnippet: first.searchInfo?.textSnippet ?? "",
      categories: vi.categories ?? [],
      isbn13,
      pageCount: vi.printedPageCount ?? vi.pageCount ?? null,
      dimensions: vi.dimensions ?? null,
      averageRating: vi.averageRating ?? null,
      ratingsCount: vi.ratingsCount ?? null,
      imageLinks: vi.imageLinks ?? null,
      previewLink: vi.previewLink || "",
      infoLink: vi.infoLink || "",
    },
  });
}
