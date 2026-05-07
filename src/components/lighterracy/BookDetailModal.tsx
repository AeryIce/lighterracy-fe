"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Bot, BookmarkCheck, BookmarkPlus, Copy, Database, Loader2, Sparkles, X } from "lucide-react";
import { getBackendUrl } from "@/lib/env";
import { apiFetchWithAuth, getSessionTokenFromBrowser } from "@/lib/auth-client";
import PurchaseLinksPanel from "./PurchaseLinksPanel";

export type Dim =
  | { height?: string; width?: string; thickness?: string }
  | null;

export type BookFull = {
  title: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  descriptionSourceLabel?: string;
  textSnippet?: string;
  categories?: string[];
  publisher?: string;
  publishedDate?: string;
  isbn13?: string | null;
  pageCount?: number | null;
  dimensions?: Dim;
  averageRating?: number | null;
  ratingsCount?: number | null;
  imageLinks?: {
    thumbnail?: string;
    smallThumbnail?: string;
    medium?: string;
    large?: string;
  } | null;
  dataSource?: "internal" | "google";
};

type LightcyChatBookResponse = {
  mode: string;
  isbn: string;
  answer: string;
};

type BookshelfItemPayload = {
  shelf_status?: string | null;
};

type BookshelfLookupResponse = {
  ok?: boolean;
  found?: boolean;
  item?: BookshelfItemPayload | null;
  message?: unknown;
};

type BookshelfStoreResponse = {
  ok?: boolean;
  message?: string;
  item?: BookshelfItemPayload | null;
};

type ShelfState = "idle" | "checking" | "not_saved" | "saving" | "saved" | "logged_out" | "error";

function statusLabel(status?: string | null): string {
  switch (status) {
    case "want_to_read":
      return "Ingin Dibaca";
    case "considering":
      return "Sedang Dipertimbangkan";
    case "reading":
      return "Sedang Dibaca";
    case "read":
      return "Sudah Dibaca";
    case "favorite":
      return "Favorit";
    case "gift":
      return "Untuk Hadiah";
    default:
      return "Tersimpan";
  }
}

function pickUrlForPayload(url: string): string | null {
  return /^https?:\/\//i.test(url) ? url : null;
}


type Props = {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  book: BookFull | null;
  purchaseIsbn?: string | null;
  showPurchaseLinks?: boolean;
};

function decodeEntities(input = ""): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([\da-fA-F]+);/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, num) =>
      String.fromCharCode(parseInt(num, 10)),
    );
}

function sanitizeHtml(raw = ""): string {
  let s = raw.replace(
    /<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "");
  s = s.replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, ` $1="#"`);
  return s;
}

function toCm(dim?: Dim): string {
  if (!dim) return "—";
  const take = (v?: string) => (v || "").trim();
  const H = take(dim.height);
  const W = take(dim.width);
  const T = take(dim.thickness);

  const parseOne = (val: string) => {
    if (!val) return null;
    const m = val.toLowerCase().match(/([\d.,]+)/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(",", "."));
    if (!Number.isFinite(num)) return null;
    const isInch = /inch|in\b|["”]/.test(val.toLowerCase());
    const cm = isInch ? num * 2.54 : num;
    return Math.round(cm * 10) / 10;
  };

  const h = parseOne(H);
  const w = parseOne(W);
  const t = parseOne(T);
  const parts: string[] = [];
  if (w != null) parts.push(`${w}cm`);
  if (h != null) parts.push(`${h}cm`);
  if (t != null) parts.push(`${t}cm`);
  return parts.length ? parts.join(" × ") : "—";
}

function sourceBadge(book: BookFull | null) {
  if (book?.dataSource === "internal") {
    return {
      label: "Data internal Lighterracy",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: Database,
    };
  }

  return {
    label: "Info diperkaya Google Books",
    className: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Sparkles,
  };
}

export default function BookDetailModal({
  open,
  onOpenChange,
  book,
  purchaseIsbn,
  showPurchaseLinks = true,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const detailEventRef = useRef<string | null>(null);

  const [lightcyAnswer, setLightcyAnswer] = useState<string | null>(null);
  const [lightcyLoading, setLightcyLoading] = useState(false);
  const [lightcyError, setLightcyError] = useState<string | null>(null);

  const [shelfState, setShelfState] = useState<ShelfState>("idle");
  const [shelfMessage, setShelfMessage] = useState<string | null>(null);
  const [shelfLabel, setShelfLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    setExpanded(false);
    setLightcyAnswer(null);
    setLightcyError(null);
  }, [book?.isbn13, book?.title]);

  useEffect(() => {
    return () => {
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
    };
  }, []);

  const purchaseLookupIsbn =
    typeof purchaseIsbn === "string" && purchaseIsbn.trim()
      ? purchaseIsbn.trim()
      : book?.isbn13 ?? "";

  const cover =
    book?.imageLinks?.large ||
    book?.imageLinks?.medium ||
    book?.imageLinks?.thumbnail ||
    book?.imageLinks?.smallThumbnail ||
    "/og/og-from-upload.png";

  const title = book?.title || "—";
  const subtitle = book?.subtitle || "";
  const authors = book?.authors?.length ? book.authors.join(", ") : "—";
  const publisher = book?.publisher || "—";
  const published = book?.publishedDate || "—";
  const categories = book?.categories ?? [];
  const pages = book?.pageCount ?? null;
  const safeSnippet = book?.textSnippet ? decodeEntities(book.textSnippet) : "";
  const safeDescHtml = book?.description
    ? sanitizeHtml(decodeEntities(book.description))
    : "";
  const source = sourceBadge(book);
  const SourceIcon = source.icon;

  useEffect(() => {
    if (!open || !book || !purchaseLookupIsbn) {
      return;
    }

    const token = getSessionTokenFromBrowser();
    if (!token) {
      return;
    }

    const eventKey = `${purchaseLookupIsbn}:${book.dataSource ?? "unknown"}`;
    if (detailEventRef.current === eventKey) {
      return;
    }

    detailEventRef.current = eventKey;

    void apiFetchWithAuth("/api/me/reading-events", {
      method: "POST",
      body: JSON.stringify({
        event_type: "book_detail_opened",
        isbn_13: purchaseLookupIsbn,
        title: book.title,
        author_text: book.authors?.join(", ") ?? null,
        source_page: "book_detail",
        metadata: {
          data_source: book.dataSource ?? null,
        },
      }),
    }).catch(() => {
      // Reading Trail is useful, but it should never block the detail modal.
    });
  }, [book, open, purchaseLookupIsbn]);

  useEffect(() => {
    if (!open || !book || !purchaseLookupIsbn) {
      setShelfState("idle");
      setShelfMessage(null);
      setShelfLabel(null);
      return;
    }

    const token = getSessionTokenFromBrowser();
    if (!token) {
      setShelfState("logged_out");
      setShelfMessage("Masuk dulu untuk menyimpan buku ini ke Rak Saya.");
      setShelfLabel(null);
      return;
    }

    let cancelled = false;

    async function checkShelf() {
      try {
        setShelfState("checking");
        setShelfMessage(null);
        setShelfLabel(null);

        const response = await apiFetchWithAuth(`/api/me/bookshelf/${encodeURIComponent(purchaseLookupIsbn)}`, {
          method: "GET",
        });

        if (cancelled) return;

        if (response.status === 401) {
          setShelfState("logged_out");
          setShelfMessage("Sesi masuk belum aktif. Masuk dulu untuk menyimpan buku ini.");
          return;
        }

        if (!response.ok) {
          throw new Error("Rak Saya belum bisa dicek.");
        }

        const data = (await response.json()) as BookshelfLookupResponse;

        if (cancelled) return;

        if (data.found && data.item) {
          setShelfState("saved");
          setShelfLabel(statusLabel(data.item.shelf_status));
          setShelfMessage("Buku ini sudah ada di Rak Saya.");
          return;
        }

        setShelfState("not_saved");
        setShelfMessage(null);
      } catch {
        if (!cancelled) {
          setShelfState("error");
          setShelfMessage("Rak Saya belum bisa dicek. Kamu tetap bisa coba simpan manual.");
        }
      }
    }

    void checkShelf();

    return () => {
      cancelled = true;
    };
  }, [book, open, purchaseLookupIsbn]);

  const showReadMore = useMemo(
    () => Boolean(safeDescHtml && safeDescHtml.length > 700),
    [safeDescHtml],
  );

  function handleClose() {
    if (typeof onOpenChange === "function") onOpenChange(false);
    else if (typeof window !== "undefined") {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/";
    }
  }

  async function handleCopy(value?: string | null) {
    const target = value || purchaseLookupIsbn || book?.isbn13;
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target);
      setCopied(true);
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // no-op
    }
  }

  async function handleSaveToShelf() {
    const isbn = purchaseLookupIsbn || book?.isbn13;

    if (!book || !isbn) {
      setShelfState("error");
      setShelfMessage("ISBN buku ini belum terbaca, jadi belum bisa disimpan.");
      return;
    }

    const token = getSessionTokenFromBrowser();
    if (!token) {
      setShelfState("logged_out");
      setShelfMessage("Masuk dulu untuk menyimpan buku ini ke Rak Saya.");
      return;
    }

    try {
      setShelfState("saving");
      setShelfMessage(null);

      const response = await apiFetchWithAuth("/api/me/bookshelf", {
        method: "POST",
        body: JSON.stringify({
          isbn_13: isbn,
          title: book.title,
          author_text: book.authors?.join(", ") ?? null,
          cover_url: pickUrlForPayload(cover),
          shelf_status: "want_to_read",
          source_page: "book_detail",
        }),
      });

      if (response.status === 401) {
        setShelfState("logged_out");
        setShelfMessage("Sesi masuk belum aktif. Masuk dulu untuk menyimpan buku ini.");
        return;
      }

      let message = "Buku sudah masuk ke Rak Saya.";
      let itemStatus: string | null = "want_to_read";

      try {
        const data = (await response.json()) as BookshelfStoreResponse;
        if (typeof data.message === "string" && data.message.trim()) {
          message = data.message;
        }
        itemStatus = data.item?.shelf_status ?? itemStatus;
      } catch {
        // Keep default message.
      }

      if (!response.ok) {
        throw new Error(message || "Rak Saya belum bisa diperbarui.");
      }

      setShelfState("saved");
      setShelfLabel(statusLabel(itemStatus));
      setShelfMessage(message);
    } catch (error) {
      setShelfState("error");
      setShelfMessage(error instanceof Error ? error.message : "Rak Saya belum bisa diperbarui.");
    }
  }

  function handleShelfLogin() {
    if (typeof window !== "undefined") {
      window.location.href = "/register";
    }
  }

  async function handleAskLightcy() {
    const isbn = book?.isbn13 || purchaseLookupIsbn;
    if (!isbn) {
      setLightcyError("ISBN untuk buku ini belum tersedia.");
      setLightcyAnswer(null);
      return;
    }

    try {
      setLightcyLoading(true);
      setLightcyError(null);

      const backend = getBackendUrl();
      const res = await fetch(`${backend}/api/lightcy/chat/book`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isbn,
          question: "Ringkas untukku isi utama buku ini dalam bahasa Indonesia.",
        }),
      });

      if (!res.ok) {
        setLightcyError(`Lightcy belum bisa jawab (status ${res.status}).`);
        setLightcyAnswer(null);
        return;
      }

      const data = (await res.json()) as LightcyChatBookResponse;
      setLightcyAnswer(data.answer);
    } catch {
      setLightcyError("Lightcy lagi kesulitan menjawab. Coba lagi sebentar ya.");
      setLightcyAnswer(null);
    } finally {
      setLightcyLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-black/45"
      onClick={handleClose}
    >
      <div
        className="h-full w-full overflow-y-auto overscroll-contain p-3 md:p-6 [-webkit-overflow-scrolling:touch]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 md:px-6">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#fda50f]">
                Lighterracy book detail
              </p>
              <p className="truncate text-xs text-neutral-500">
                ISBN yang dicek: <span className="font-bold text-neutral-800">{purchaseLookupIsbn || "—"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              aria-label="Tutup detail buku"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {!book ? (
              <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 md:p-7">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
                  Buku belum ditemukan
                </p>
                <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-neutral-950 md:text-3xl">
                  Lightcy belum bisa menampilkan detail buku ini.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-600">
                  Info buku belum tersedia dari Google Books atau data internal. Tapi kalau ISBN ini punya link pembelian di data Lighterracy, pintu belanjanya tetap muncul di bawah.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 lg:grid-cols-[230px_1fr]">
                  <div className="mx-auto w-full max-w-[230px] lg:mx-0">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-neutral-100 shadow-sm ring-1 ring-neutral-100">
                      <Image
                        src={cover}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 220px, 230px"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${source.className}`}>
                        <SourceIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {source.label}
                      </span>
                      {book.descriptionSourceLabel ? (
                        <span className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-bold text-neutral-600">
                          {book.descriptionSourceLabel}
                        </span>
                      ) : null}
                    </div>

                    <p className="mt-4 text-sm font-medium text-neutral-600">{authors}</p>
                    <h2 className="mt-1 text-2xl font-black leading-tight text-neutral-950 md:text-3xl">
                      {title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-2 text-base leading-6 text-neutral-700">{subtitle}</p>
                    ) : null}
                    {safeSnippet ? (
                      <p className="mt-3 rounded-2xl bg-neutral-50 px-4 py-3 text-sm italic leading-6 text-neutral-700">
                        {safeSnippet}
                      </p>
                    ) : null}

                    <div className="mt-4 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
                      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Publisher</span>
                        <span className="font-semibold">{publisher}</span>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Published</span>
                        <span className="font-semibold">{published}</span>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">ISBN-13</span>
                        <span className="font-semibold">{book.isbn13 || purchaseLookupIsbn || "—"}</span>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 px-4 py-3">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Pages</span>
                        <span className="font-semibold">{pages ?? "—"}</span>
                      </div>
                      <div className="rounded-2xl bg-neutral-50 px-4 py-3 sm:col-span-2">
                        <span className="block text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">Dimensions</span>
                        <span className="font-semibold">{toCm(book.dimensions)}</span>
                      </div>
                    </div>

                    {categories.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {categories.slice(0, 8).map((c) => (
                          <span
                            key={c}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <section className="mt-6 rounded-3xl border border-neutral-100 bg-neutral-50/70 p-4 md:p-5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-[#fda50f]" aria-hidden="true" />
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-500">
                        Sinopsis & catatan bacaan
                      </p>
                      <h3 className="text-lg font-black text-neutral-950">
                        Gambaran singkat buku ini
                      </h3>
                    </div>
                  </div>

                  {safeDescHtml ? (
                    <>
                      <div
                        className={[
                          "mt-4 text-sm leading-7 text-neutral-800 [&_a]:font-semibold [&_a]:text-amber-700 [&_b]:font-bold [&_li]:ml-4 [&_ul]:list-disc",
                          expanded ? "" : "max-h-[240px] overflow-hidden",
                        ].join(" ")}
                        dangerouslySetInnerHTML={{ __html: safeDescHtml }}
                      />
                      {!expanded && showReadMore ? (
                        <button
                          type="button"
                          className="mt-3 rounded-full border border-amber-200 bg-white px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50"
                          onClick={() => setExpanded(true)}
                        >
                          Baca selengkapnya →
                        </button>
                      ) : null}
                    </>
                  ) : (
                    <p className="mt-4 text-sm leading-6 text-neutral-600">
                      Sinopsis belum tersedia. Untuk sekarang, Lightcy baru bisa membantu lewat metadata dan link pembelian yang sudah ada.
                    </p>
                  )}
                </section>
              </>
            )}

            {showPurchaseLinks ? (
              <PurchaseLinksPanel isbn={purchaseLookupIsbn} sourcePage="book_detail" />
            ) : (
              <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
                  Link pembelian belum tersedia
                </p>
                <p className="mt-2 leading-6">
                  Info buku ini boleh tampil sebagai hasil scan, tapi Lighterracy belum punya
                  data internal untuk kanal pembelian ISBN ini. Lightcy tidak akan menebak link
                  marketplace agar datanya tetap jujur.
                </p>
              </section>
            )}

            {shelfMessage && shelfState !== "saved" ? (
              <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                {shelfMessage}
              </p>
            ) : null}

            {lightcyError ? (
              <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {lightcyError}
              </p>
            ) : null}

            {lightcyAnswer ? (
              <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
                <div className="mb-2 flex items-center gap-2 font-bold text-emerald-800">
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  Lightcy (demo) · Ringkasan
                </div>
                <p className="whitespace-pre-line leading-7">{lightcyAnswer}</p>
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-neutral-100 bg-white/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-white/90">
            {book ? (
              <button
                type="button"
                className={[
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-70",
                  shelfState === "saved"
                    ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                    : shelfState === "logged_out"
                      ? "bg-[#0e2a47] text-white hover:bg-[#163a5f]"
                      : "bg-amber-100 text-amber-900 hover:bg-amber-200",
                ].join(" ")}
                onClick={shelfState === "logged_out" ? handleShelfLogin : () => void handleSaveToShelf()}
                disabled={shelfState === "checking" || shelfState === "saving" || shelfState === "saved"}
                title={shelfMessage ?? undefined}
              >
                {shelfState === "checking" || shelfState === "saving" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : shelfState === "saved" ? (
                  <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <BookmarkPlus className="h-4 w-4" aria-hidden="true" />
                )}
                {shelfState === "checking"
                  ? "Cek Rak..."
                  : shelfState === "saving"
                    ? "Menyimpan..."
                    : shelfState === "saved"
                      ? shelfLabel ?? "Tersimpan"
                      : shelfState === "logged_out"
                        ? "Masuk untuk simpan"
                        : "Simpan ke Rak Saya"}
              </button>
            ) : null}
            {purchaseLookupIsbn ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-sm font-bold text-neutral-800 hover:bg-neutral-200"
                onClick={() => void handleCopy(purchaseLookupIsbn)}
                aria-live="polite"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? "Tersalin ✓" : "Copy ISBN"}
              </button>
            ) : null}
            {book ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-800 hover:bg-emerald-200 disabled:opacity-60"
                onClick={handleAskLightcy}
                disabled={lightcyLoading}
              >
                <Bot className="h-4 w-4" aria-hidden="true" />
                {lightcyLoading ? "Lightcy berpikir..." : "Tanya Lightcy (demo)"}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-full bg-neutral-950 px-5 py-2 text-sm font-bold text-white hover:bg-neutral-800"
              onClick={handleClose}
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
