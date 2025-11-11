import { NextResponse } from "next/server";

// Pastikan route ini selalu dinamis & tidak memakai cache
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Next 16: matikan fetch cache default
export const fetchCache = "default-no-store";

const LIST_DEFAULT = "trade-fiction-paperback";

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
  const list = searchParams.get("list") || LIST_DEFAULT;

  // Baca key dari 2 nama variabel (aman ke dua-duanya)
  const key = process.env.NYT_API_KEY ?? process.env.NYT_BOOKS_API_KEY ?? "";

  // Jika key kosong: fail-soft & JANGAN cache
  if (!key) {
    return NextResponse.json(
      { books: [], list_name: list, updated: "", error: "missing_key" as const },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const qs = new URLSearchParams({ "api-key": key, offset: "0" });
  const url = `https://api.nytimes.com/svc/books/v3/lists/current/${encodeURIComponent(
    list
  )}.json?${qs.toString()}`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`NYT ${res.status}`);
    const json = (await res.json().catch(() => null)) as NytResp | null;
    const results = json?.results;

    const books = (results?.books ?? []).map((b) => ({
      isbn13: Array.isArray(b.isbns) ? b.isbns.find((x) => x.isbn13)?.isbn13 ?? "" : "",
      title: b.title ?? "",
      author: b.author ?? "",
      rank: Number(b.rank ?? 0),
      book_image: b.book_image ?? "",
    }));

    return NextResponse.json(
      {
        books,
        list_name: results?.list_name ?? list,
        updated: results?.published_date ?? "",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch_failed";
    return NextResponse.json(
      { books: [], list_name: list, updated: "", error: msg },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
