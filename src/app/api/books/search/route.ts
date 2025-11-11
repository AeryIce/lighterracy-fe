import { NextResponse } from "next/server";

type GBIndustryId = { type?: string; identifier?: string };
type GBImageLinks = { smallThumbnail?: string; thumbnail?: string };
type GBVolumeInfo = {
  title?: string;
  authors?: string[];
  imageLinks?: GBImageLinks | null;
  infoLink?: string;
  publisher?: string;
  publishedDate?: string;
  industryIdentifiers?: GBIndustryId[];
};
type GBItem = { id?: string; volumeInfo?: GBVolumeInfo | null };
type GBResponse = { items?: GBItem[] };

export const revalidate = 60 * 10; // 10 menit cache server

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ items: [] });

  const key = process.env.GOOGLE_BOOKS_API_KEY ?? "";
  const qs = new URLSearchParams({
    q,
    maxResults: "12",
    printType: "books",
    orderBy: "relevance",
    country: "ID",
    // minta identifier supaya dapat ISBN-13
    fields:
      "items(id,volumeInfo(title,authors,imageLinks,infoLink,publisher,publishedDate,industryIdentifiers)),totalItems",
  });
  if (key) qs.set("key", key);

  const url = `https://www.googleapis.com/books/v1/volumes?${qs.toString()}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) return NextResponse.json({ items: [] }, { status: 502 });

  const data = (await res.json()) as GBResponse;

  const items = (data.items ?? []).map((it) => {
    const v = it.volumeInfo ?? {};
    const isbn13 =
      v.industryIdentifiers?.find((x) => x?.type === "ISBN_13")?.identifier ??
      v.industryIdentifiers?.find(
        (x) => (x?.identifier || "").replace(/\D/g, "").length === 13
      )?.identifier ??
      undefined;

    return {
      id: it.id ?? "",
      title: v.title ?? "",
      authors: v.authors ?? [],
      thumbnail:
        v.imageLinks?.thumbnail ?? v.imageLinks?.smallThumbnail ?? null,
      infoLink: v.infoLink ?? "",
      publisher: v.publisher ?? "",
      publishedDate: v.publishedDate ?? "",
      isbn13, // dipakai kalau mau buka modal/detail cepat
    };
  });

  return NextResponse.json({ items });
}
