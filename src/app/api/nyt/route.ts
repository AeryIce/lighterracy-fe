import { NextResponse } from "next/server";

type NYTApiBook = {
  primary_isbn13?: string;
  isbn13?: string;
  isbns?: Array<{ isbn13?: string }>;
  title?: string;
  author?: string;
  rank?: number;
  book_image?: string;
  description?: string;
};
type NYTApiResponse = {
  results?: {
    list_name?: string;
    updated?: string;
    books?: NYTApiBook[];
  } | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const list = searchParams.get("list") || "trade-fiction-paperback";

  const key = process.env.NYT_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing NYT_API_KEY" }, { status: 500 });

  const url = `https://api.nytimes.com/svc/books/v3/lists/current/${encodeURIComponent(list)}.json?api-key=${key}`;
  const upstream = await fetch(url, { next: { revalidate: 3600 } });
  if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });

  const json = (await upstream.json()) as NYTApiResponse;

  const books = (json?.results?.books ?? []).map((b) => ({
    isbn13: (b.primary_isbn13 || b.isbn13 || b.isbns?.[0]?.isbn13 || "") + "",
    title: b.title ?? "",
    author: b.author ?? "",
    rank: b.rank ?? null,
    book_image: b.book_image ?? "",
    description: b.description ?? "",
  }));

  return NextResponse.json(
    { list_name: json?.results?.list_name ?? "", updated: json?.results?.updated ?? "", books },
    { headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate=60" } }
  );
}
