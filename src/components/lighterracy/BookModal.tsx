'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

type IsbnPair = { type?: string | null; identifier?: string | null };
type Dimen = { height?: string; width?: string; thickness?: string };
type ImgLinks = {
  smallThumbnail?: string | null;
  thumbnail?: string | null;
  medium?: string | null;
  large?: string | null;
};
type NYTIsbn = { isbn10?: string | null; isbn13?: string | null };

type BookLike = {
  // umum
  title?: string | null;
  subtitle?: string | null;
  authors?: string[] | null; // Google
  author?: string | null; // NYT (single)
  publisher?: string | null;
  publishedDate?: string | null;

  // teks
  textSnippet?: string | null;
  description?: string | null;
  nytDescription?: string | null;

  // gambar
  cover?: string | null;
  book_image?: string | null; // NYT
  imageLinks?: ImgLinks | null;

  // identitas
  isbn?: string | null; // <— DITAMBAH: dari NYTCarousel
  isbn13?: string | null;
  primary_isbn13?: string | null; // NYT
  isbns?: NYTIsbn[] | null; // NYT array
  industryIdentifiers?: IsbnPair[] | null; // Google

  // meta
  categories?: string[] | null;
  pageCount?: number | null;
  printedPageCount?: number | null;
  dimensions?: Dimen | null;
  averageRating?: number | null;
  ratingsCount?: number | null;
  rank?: number | null; // NYT rank
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  book: BookLike | null;
};

// ---------- utils ----------
function httpsify(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http://') ? url.replace('http://', 'https://') : url;
}
function decodeHtmlEntities(s = '') {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}
function stripTagsKeepBreaks(html = '') {
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  return withBreaks.replace(/<\/?[^>]+>/g, '');
}
function sanitize(htmlOrText = '') {
  return decodeHtmlEntities(stripTagsKeepBreaks(htmlOrText)).trim();
}
function mmOrCm(v?: string | null) {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  if (t.endsWith('mm')) {
    const n = parseFloat(t.replace(/mm$/, '').trim());
    if (!Number.isNaN(n)) return `${(n / 10).toFixed(1)} cm`;
  }
  if (t.endsWith('cm')) return t;
  return v;
}
function pickCover(b: BookLike): string {
  return (
    httpsify(b.cover) ||
    httpsify(b.book_image) ||
    httpsify(b.imageLinks?.large) ||
    httpsify(b.imageLinks?.medium) ||
    httpsify(b.imageLinks?.thumbnail) ||
    httpsify(b.imageLinks?.smallThumbnail) ||
    '/og/og-from-upload.png'
  )!;
}
function pickAuthors(b: BookLike) {
  if (b.authors && b.authors.length) return b.authors.join(', ');
  if (b.author) return b.author;
  return '';
}
function extractIsbn13(b?: BookLike | null): string | null {
  const cands: Array<string | null | undefined> = [
    b?.isbn, // <— PRIORITASKAN: dari NYTCarousel (sudah 13 digit)
    b?.isbn13,
    b?.primary_isbn13,
    b?.industryIdentifiers?.find((x) => x?.type === 'ISBN_13')?.identifier,
    b?.isbns?.find((x) => x?.isbn13)?.isbn13,
  ];
  for (const c of cands) {
    if (typeof c === 'string' && /^\d{13}$/.test(c)) return c;
  }
  return null;
}

export default function BookModal({ open, onOpenChange, book }: Props) {
  const router = useRouter();
  if (!open) return null;

  const title = book?.title ?? '—';
  const author = pickAuthors(book ?? ({} as BookLike));
  const rank = typeof book?.rank === 'number' ? book.rank : null;
  const cover = pickCover(book ?? ({} as BookLike));

  const isbn13 = extractIsbn13(book);
  const pages = book?.printedPageCount ?? book?.pageCount ?? null;
  const dims = book?.dimensions
    ? {
        h: mmOrCm(book.dimensions.height ?? null),
        w: mmOrCm(book.dimensions.width ?? null),
        t: mmOrCm(book.dimensions.thickness ?? null),
      }
    : null;
  const categories = Array.isArray(book?.categories) ? book?.categories : [];

  const rawSnippet =
    book?.textSnippet ?? book?.nytDescription ?? book?.description ?? '';
  const snippet = sanitize(rawSnippet);
  const desc = sanitize(book?.description ?? '');

  const onDetail = () => {
    if (!isbn13) return;
    onOpenChange(false);
    router.push(`/isbn/${isbn13}`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl">
        {/* header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <h3 className="text-xl font-semibold leading-snug">{title}</h3>
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Tutup"
            className="rounded-full px-3 py-1 text-sm hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        {/* content */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          {/* cover */}
          <div className="justify-self-center md:justify-self-start">
            <div className="relative h-[320px] w-[220px] overflow-hidden rounded-xl bg-neutral-100">
              <Image src={cover} alt={title} fill className="object-cover" />
            </div>
            {rank != null && (
              <div className="mt-2 inline-block rounded-full bg-black px-2 py-1 text-xs text-white">
                NYT #{rank}
              </div>
            )}
          </div>

          {/* info */}
          <div className="space-y-3">
            {author && (
              <div className="text-sm">
                <span className="opacity-60">Penulis: </span>
                <span className="font-medium">{author}</span>
              </div>
            )}
            {book?.publisher && (
              <div className="text-sm">
                <span className="opacity-60">Penerbit: </span>
                <span className="font-medium">{book.publisher}</span>
              </div>
            )}
            {isbn13 && (
              <div className="text-sm">
                <span className="opacity-60">ISBN-13: </span>
                <span className="font-medium">{isbn13}</span>
              </div>
            )}
            {pages && (
              <div className="text-sm">
                <span className="opacity-60">Halaman: </span>
                <span className="font-medium">{pages}</span>
              </div>
            )}
            {dims && (dims.h || dims.w || dims.t) && (
              <div className="text-sm">
                <span className="opacity-60">Dimensi: </span>
                <span className="font-medium">
                  {[
                    dims.h ? `H ${dims.h}` : null,
                    dims.w ? `W ${dims.w}` : null,
                    dims.t ? `T ${dims.t}` : null,
                  ]
                    .filter(Boolean)
                    .join(' × ')}
                </span>
              </div>
            )}
            {!!categories?.length && (
              <div className="flex flex-wrap gap-2 pt-1">
                {categories.slice(0, 6).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {snippet && (
              <p className="pt-2 text-sm italic text-neutral-700">{snippet}</p>
            )}
            {desc && (
              <p className="text-sm leading-relaxed text-neutral-800">{desc}</p>
            )}
          </div>
        </div>

        {/* actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={onDetail}
            disabled={!isbn13}
            className={`rounded-lg px-4 py-2 text-sm ${
              isbn13
                ? 'bg-black text-white hover:opacity-90'
                : 'cursor-not-allowed bg-neutral-200 text-neutral-500'
            }`}
          >
            Detail Buku
          </button>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-neutral-100 px-4 py-2 text-sm"
          >
            Tutup
          </button>
        </div>

        {!isbn13 && (
          <div className="mt-2 text-xs text-amber-600">
            ISBN-13 tidak terdeteksi dari item ini. Silakan cari manual via menu
            <span className="font-semibold"> Cari Buku</span>.
          </div>
        )}
      </div>
    </div>
  );
}
