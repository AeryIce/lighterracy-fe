import { NextResponse } from "next/server";

const BASE = "https://api.nytimes.com/svc/books/v3/lists/current";

export const revalidate = 60 * 60 * 12; // 12 jam

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const list = searchParams.get("list") || "trade-fiction-paperback";
    const key = process.env.NYT_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "NYT_API_KEY missing" }, { status: 500 });
    }

    const url = `${BASE}/${encodeURIComponent(list)}.json?api-key=${key}`;
    const res = await fetch(url, { next: { revalidate } });
    if (!res.ok) {
      return NextResponse.json({ error: "NYT fetch failed" }, { status: 502 });
    }
    const data = await res.json();

    const books = (data?.results?.books ?? []).map((b: any) => ({
      rank: b.rank,
      title: b.title,
      author: b.author,
      description: b.description,
      isbn13: (b.isbns?.[0]?.isbn13) || (b.primary_isbn13) || null,
      book_image: b.book_image || null,
      amazon_url: b.amazon_product_url || null
    }));

    return NextResponse.json({
      updated: data?.last_modified || data?.results?.published_date,
      list_name: data?.results?.list_name,
      books
    });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected NYT error" }, { status: 500 });
  }
}
