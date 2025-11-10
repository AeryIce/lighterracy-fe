import { NextResponse } from "next/server";

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
    fields:
      "items(id,volumeInfo(title,authors,imageLinks,infoLink,publisher,publishedDate)),totalItems",
  });
  if (key) qs.set("key", key);

  const url = `https://www.googleapis.com/books/v1/volumes?${qs.toString()}`;
  const res = await fetch(url, { next: { revalidate } });
  if (!res.ok) return NextResponse.json({ items: [] }, { status: 502 });

  const data = await res.json();
  const items = (data?.items || []).map((it: any) => {
    const v = it.volumeInfo || {};
    return {
      id: it.id,
      title: v.title || "",
      authors: v.authors || [],
      thumbnail: v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail || null,
      infoLink: v.infoLink || "",
      publisher: v.publisher || "",
      publishedDate: v.publishedDate || "",
    };
  });

  return NextResponse.json({ items });
}
