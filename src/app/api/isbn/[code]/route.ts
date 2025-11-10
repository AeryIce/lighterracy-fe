import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ---------------- helpers ----------------
function cleanIsbn(raw: string) {
  return (raw || "").toUpperCase().replace(/[^0-9X]/g, "");
}
function httpsify(url?: string | null) {
  if (!url) return null;
  return url.startsWith("http://") ? url.replace("http://", "https://") : url;
}

async function gbSearch(isbn: string, key?: string | null) {
  const base = "https://www.googleapis.com/books/v1/volumes";

  // attempt 1: dengan key + fields (hemat)
  {
    const qs = new URLSearchParams({
      q: `isbn:${isbn}`,
      maxResults: "1",
      projection: "lite",
      fields:
        "totalItems,items(id,selfLink,volumeInfo/title,volumeInfo/subtitle,volumeInfo/authors,volumeInfo/publisher,volumeInfo/publishedDate,volumeInfo/description,volumeInfo/pageCount,volumeInfo/categories,volumeInfo/imageLinks,volumeInfo/language,volumeInfo/previewLink,volumeInfo/infoLink,volumeInfo/industryIdentifiers)",
    });
    if (key) qs.set("key", key);

    const res = await fetch(`${base}?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.items?.[0]) return data.items[0];
    }
  }

  // attempt 2: dengan key, TANPA fields (lebih longgar)
  {
    const qs = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: "1" });
    if (key) qs.set("key", key);

    const res = await fetch(`${base}?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.items?.[0]) return data.items[0];
    }
  }

  // attempt 3: tanpa key (kadang hasil beda)
  {
    const qs = new URLSearchParams({ q: `isbn:${isbn}`, maxResults: "1" });
    const res = await fetch(`${base}?${qs.toString()}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data?.items?.[0]) return data.items[0];
    }
  }

  return null;
}

async function gbDetailById(id: string, key?: string | null) {
  const base = "https://www.googleapis.com/books/v1/volumes";
  const qs = new URLSearchParams({
    fields:
      "id,volumeInfo(title,subtitle,authors,publisher,publishedDate,description,pageCount,printedPageCount,dimensions,categories,averageRating,ratingsCount,imageLinks,language,previewLink,infoLink,canonicalVolumeLink),saleInfo(country,saleability,isEbook,retailPrice),accessInfo(webReaderLink)",
  });
  if (key) qs.set("key", key);

  const res = await fetch(`${base}/${encodeURIComponent(id)}?${qs.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}
// -----------------------------------------

// ⬇⬇⬇  PERHATIKAN: params sekarang Promise — WAJIB di-await
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await ctx.params;            // <--- FIX: await
    const isbn = cleanIsbn(code);

    if (!/^(\d{13}|\d{9}[\dX])$/.test(isbn)) {
      return NextResponse.json(
        { found: false, reason: "Invalid ISBN" },
        { status: 400 }
      );
    }

    const key = process.env.GOOGLE_BOOKS_API_KEY || null;

    // 1) search by ISBN (multi-fallback)
    const item = await gbSearch(isbn, key);
    if (!item) {
      return NextResponse.json({ found: false }, { status: 404 });
    }

    // 2) detail by id (lebih lengkap); kalau gagal, pakai data dari search
    const detail = item.id ? await gbDetailById(item.id, key) : null;
    const vi = (detail?.volumeInfo ?? item.volumeInfo) || {};
    const sale = detail?.saleInfo || {};
    const access = detail?.accessInfo || {};

    const cover =
      httpsify(vi.imageLinks?.thumbnail) ||
      httpsify(vi.imageLinks?.smallThumbnail) ||
      null;

    const book = {
      // identifiers
      id: detail?.id ?? item.id ?? null,
      isbn,

      // core
      title: vi.title || "",
      subtitle: vi.subtitle || "",
      authors: vi.authors || [],
      publisher: vi.publisher || "",
      publishedDate: vi.publishedDate || "",
      description: vi.description || "",

      // pages & dims
      pageCount: vi.pageCount ?? null,
      printedPageCount: vi.printedPageCount ?? null,
      dimensions: vi.dimensions ?? null,

      // categories & ratings
      categories: vi.categories || [],
      averageRating: vi.averageRating ?? null,
      ratingsCount: vi.ratingsCount ?? null,

      // links
      imageLinks: vi.imageLinks || null,
      cover,
      language: vi.language || "",
      previewLink: vi.previewLink || access.webReaderLink || "",
      infoLink: vi.infoLink || "",
      canonicalVolumeLink: vi.canonicalVolumeLink || "",

      // sale/access
      saleInfo: {
        country: sale.country ?? null,
        saleability: sale.saleability ?? null,
        isEbook: sale.isEbook ?? null,
        retailPrice: sale.retailPrice ?? null,
      },
      accessInfo: {
        webReaderLink: access.webReaderLink ?? "",
      },
    };

    return NextResponse.json({ found: true, book });
  } catch {
    return NextResponse.json({ found: false, code: "UNEXPECTED" }, { status: 500 });
  }
}
