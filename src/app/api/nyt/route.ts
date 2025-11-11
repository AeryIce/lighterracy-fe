import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";     // jangan statik di CDN untuk route handler
export const revalidate = 0;                // respons /api/* tidak disimpan di edge

const REVALIDATE = 60 * 60; // 1 jam

type NytIsbn = { isbn10?: string; isbn13?: string };
type NytBook = {
  title?: string;
  author?: string;
  rank?: number;
  book_image?: string;
  isbns?: NytIsbn[];
};
type NytResults = {
  list_name?: string;
  published_date?: string;
  books?: NytBook[];
};
type NytResp = { results?: NytResults };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list") || "trade-fiction-paperback";

  const key =
    process.env.NYT_API_KEY ??
    process.env.NYT_BOOKS_API_KEY ??
    "";

  // fail-soft kalau key kosong
  if (!key) {
    return NextResponse.json({ books: [], list_name: list, updated: "" });
  }

  const qs = new URLSearchParams({ "api-key": key, offset: "0" });
  const url = `https://api.nytimes.com/svc/books/v3/lists/current/${encodeURIComponent(
    list
  )}.json?${qs.toString()}`;

  // Cache hanya untuk fetch keluar (NYT), 1 jam
  const res = await fetch(url, { next: { revalidate: REVALIDATE } });
  if (!res.ok) {
    return NextResponse.json({ books: [], list_name: list, updated: "" });
  }

  const json = (await res.json().catch(() => null)) as NytResp | null;
  const results = json?.results;

  const books = (results?.books ?? []).map((b) => ({
    isbn13: Array.isArray(b.isbns)
      ? b.isbns.find((x) => x.isbn13)?.isbn13 ?? ""
      : "",
    title: b.title ?? "",
    author: b.author ?? "",
    rank: Number(b.rank ?? 0),
    book_image: b.book_image ?? "",
  }));

  return NextResponse.json({
    books,
    list_name: results?.list_name ?? list,
    updated: results?.published_date ?? "",
  });
}
