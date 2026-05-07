"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AuthMeUser } from "@/lib/auth-client";
import {
  apiFetchWithAuth,
  clearSessionTokenFromBrowser,
  fetchAuthMe,
  fetchReadingDna,
  logoutCurrentSession,
} from "@/lib/auth-client";
import { haversineKm } from "@/lib/geo";

type LoadState = "loading" | "ready" | "error";
type DataState = "idle" | "loading" | "ready" | "error";
type GeoPoint = { lat: number; lng: number };

interface ReadingDnaStatus {
  hasProfile: boolean;
  readerTypeLabel: string | null;
  favoriteGenres: string[];
  favoriteGenresCount: number;
  personalizationEnabled: boolean | null;
}

interface RecommendedBook {
  id: number;
  isbn: string;
  title: string;
  author: string;
  genre: string;
  coverUrl: string | null;
  reason: string;
  sourceLabel: string;
  purchaseChannels: string[];
}

interface InternalRecommendationResponse {
  ok: boolean;
  source: "internal";
  source_label: string;
  strategy: string;
  has_profile: boolean;
  reader_type_label: string | null;
  favorite_genres: string[];
  books: Array<Record<string, unknown>>;
  empty_state: { title: string; message: string } | null;
}

interface RecommendationStateData {
  books: RecommendedBook[];
  sourceLabel: string;
  strategy: string;
  emptyTitle: string;
  emptyMessage: string;
}

interface BookshelfItemData {
  id: number;
  isbn: string;
  title: string;
  authorText: string;
  coverUrl: string | null;
  shelfStatus: string;
  savedAt: string | null;
}

interface BookshelfResponse {
  ok: boolean;
  total: number;
  items: Array<Record<string, unknown>>;
}

interface BookshelfStateData {
  total: number;
  items: BookshelfItemData[];
}

interface ReadingTrailItemData {
  id: number;
  eventType: string;
  eventLabel: string;
  isbn: string | null;
  title: string;
  authorText: string;
  coverUrl: string | null;
  sourcePage: string | null;
  occurredAt: string | null;
}

interface ReadingEventsResponse {
  ok: boolean;
  total: number;
  items: Array<Record<string, unknown>>;
}

interface ReadingTrailStateData {
  total: number;
  items: ReadingTrailItemData[];
}

interface PromoCardData {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  bannerUrl: string;
  endAt: string | null;
}

interface StoreCardData {
  id: string;
  name: string;
  slug: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mapsUrl: string | null;
  photoUrl: string | null;
}

interface StoreWithDistance extends StoreCardData {
  distanceKm: number | null;
}

const GENRE_LABELS: Record<string, string> = {
  self_help: "Self-help",
  psychology: "Psychology",
  faith_spiritual: "Faith / Spiritual",
  fiction: "Fiction",
  business: "Business",
  children_books: "Children Books",
  manga_comic: "Manga / Comic",
  history: "History",
  language_learning: "Language Learning",
  travel: "Travel",
  hobby: "Hobby",
  gift_ideas: "Gift ideas",
};

function toReadableGenreLabel(value: string): string {
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getPreferredGenreLabels(genres?: string[] | null): string[] {
  if (!Array.isArray(genres)) {
    return [];
  }

  return genres
    .map((genre) => genre.trim())
    .filter(Boolean)
    .map((genre) => GENRE_LABELS[genre] ?? toReadableGenreLabel(genre))
    .slice(0, 4);
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return "teman baca";
  }

  return trimmed.split(" ")[0] ?? "teman baca";
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) {
    return "periode berjalan";
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "periode berjalan";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function prettifyStoreName(name: string): string {
  if (!name.includes("-")) {
    return name;
  }

  return name
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizePromo(raw: Record<string, unknown>): PromoCardData | null {
  const id = readString(raw.id);
  const title = readString(raw.title);

  if (!id || !title) {
    return null;
  }

  return {
    id,
    title,
    subtitle: readString(raw.subtitle, "Promo pilihan untuk teman baca Lighterracy."),
    status: readString(raw.status, "active"),
    bannerUrl: readString(raw.banner_url),
    endAt: readString(raw.end_at, "") || null,
  };
}

function normalizeStore(raw: Record<string, unknown>): StoreCardData | null {
  const id = readString(raw.id);
  const slug = readString(raw.slug, id);
  const rawName = readString(raw.name, id);
  const lat = readNumber(raw.lat);
  const lng = readNumber(raw.lng);

  if (!id || !slug || !rawName) {
    return null;
  }

  return {
    id,
    slug,
    name: prettifyStoreName(rawName),
    address: readString(raw.address, "Alamat toko akan dilengkapi."),
    lat,
    lng,
    mapsUrl: readString(raw["links.maps"], readString(raw.google_maps_url)) || null,
    photoUrl: readString(raw["photo.url"]) || null,
  };
}

function normalizeRecommendedBook(raw: Record<string, unknown>): RecommendedBook | null {
  const isbn = readString(raw.isbn_13);
  const title = readString(raw.title);

  if (!isbn || !title) {
    return null;
  }

  const authorsRaw = raw.authors;
  const authors = Array.isArray(authorsRaw)
    ? authorsRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const categoriesRaw = raw.categories;
  const categories = Array.isArray(categoriesRaw)
    ? categoriesRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  const channelsRaw = raw.purchase_channels;
  const purchaseChannels = Array.isArray(channelsRaw)
    ? channelsRaw.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];

  return {
    id: readNumber(raw.id) ?? 0,
    isbn,
    title,
    author: readString(raw.author_label, authors[0] ?? "Penulis belum tersedia"),
    genre: readString(raw.category_internal, categories[0] ?? "Data internal"),
    coverUrl: readString(raw.cover_url) || null,
    reason: readString(raw.reason, "Buku ini muncul dari data internal Lighterracy yang cocok dengan Reading DNA kamu."),
    sourceLabel: readString(raw.source_label, "Data Lighterracy"),
    purchaseChannels,
  };
}

async function fetchInternalRecommendations(): Promise<RecommendationStateData> {
  const response = await apiFetchWithAuth("/api/me/recommendations?limit=8", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Rekomendasi internal belum bisa dimuat.");
  }

  const data = (await response.json()) as InternalRecommendationResponse;
  const books = Array.isArray(data.books)
    ? data.books
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeRecommendedBook)
        .filter((item): item is RecommendedBook => item !== null)
    : [];

  return {
    books,
    sourceLabel: data.source_label || "Data Lighterracy",
    strategy: data.strategy,
    emptyTitle: data.empty_state?.title ?? "Belum ada rekomendasi internal yang cocok.",
    emptyMessage:
      data.empty_state?.message ??
      "Lightcy tidak akan mengisi ruang ini dengan buku random. Rekomendasi akan muncul setelah data internal yang cocok tersedia.",
  };
}

function getRecommendationIntro(readingDnaStatus: ReadingDnaStatus | null): string {
  if (!readingDnaStatus?.hasProfile) {
    return "Isi Reading DNA dulu supaya Lightcy bisa memilih dari data buku internal Lighterracy, bukan dari daftar random.";
  }

  const genreLabels = getPreferredGenreLabels(readingDnaStatus.favoriteGenres);

  if (genreLabels.length === 0) {
    return "Lightcy sudah mulai mengenalmu, tapi genre favorit belum cukup jelas untuk memilih buku dari data internal.";
  }

  return `Dipilih hanya dari data internal Lighterracy berdasarkan Reading DNA kamu: ${genreLabels.slice(0, 3).join(", ")}.`;
}

function getRecommendationBadge(readingDnaStatus: ReadingDnaStatus | null): string {
  if (!readingDnaStatus?.hasProfile) {
    return "Menunggu Reading DNA";
  }

  return readingDnaStatus.readerTypeLabel ?? "Data internal";
}

function getShelfStatusLabel(status: string): string {
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

function normalizeBookshelfItem(raw: Record<string, unknown>): BookshelfItemData | null {
  const isbn = readString(raw.isbn_13);

  if (!isbn) {
    return null;
  }

  const title = readString(raw.title, `Buku ISBN ${isbn}`);

  return {
    id: readNumber(raw.id) ?? 0,
    isbn,
    title,
    authorText: readString(raw.author_text, "Penulis belum tersedia"),
    coverUrl: readString(raw.cover_url) || null,
    shelfStatus: readString(raw.shelf_status, "want_to_read"),
    savedAt: readString(raw.saved_at, "") || null,
  };
}

async function fetchBookshelf(): Promise<BookshelfStateData> {
  const response = await apiFetchWithAuth("/api/me/bookshelf", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Rak Saya belum bisa dimuat.");
  }

  const data = (await response.json()) as BookshelfResponse;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeBookshelfItem)
        .filter((item): item is BookshelfItemData => item !== null)
    : [];

  return {
    total: typeof data.total === "number" ? data.total : items.length,
    items,
  };
}

function normalizeReadingTrailItem(raw: Record<string, unknown>): ReadingTrailItemData | null {
  const id = readNumber(raw.id) ?? 0;
  const eventType = readString(raw.event_type, "activity");
  const eventLabel = readString(raw.event_label, "Aktivitas bacaan");
  const isbn = readString(raw.isbn_13) || null;
  const title = readString(raw.title, isbn ? `Buku ISBN ${isbn}` : "Buku belum berjudul");

  if (id <= 0) {
    return null;
  }

  return {
    id,
    eventType,
    eventLabel,
    isbn,
    title,
    authorText: readString(raw.author_text, "Penulis belum tersedia"),
    coverUrl: readString(raw.cover_url) || null,
    sourcePage: readString(raw.source_page) || null,
    occurredAt: readString(raw.occurred_at) || null,
  };
}

async function fetchReadingTrail(): Promise<ReadingTrailStateData> {
  const response = await apiFetchWithAuth("/api/me/reading-events?limit=8", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Jejak Bacaan belum bisa dimuat.");
  }

  const data = (await response.json()) as ReadingEventsResponse;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeReadingTrailItem)
        .filter((item): item is ReadingTrailItemData => item !== null)
    : [];

  return {
    total: typeof data.total === "number" ? data.total : items.length,
    items,
  };
}

function formatReadingEventTime(value: string | null): string {
  if (!value) {
    return "Baru saja";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Baru saja";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function LoadingView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <Card className="border-[#eadfce] shadow-sm">
          <CardHeader>
            <CardTitle>Menyiapkan ruang bacaanmu...</CardTitle>
            <CardDescription>
              Lightcy sedang mengecek sesi masuk kamu sebentar ya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f] [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f] [animation-delay:300ms]" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ErrorView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle>Ruang bacaan belum bisa dibuka</CardTitle>
            <CardDescription className="text-red-700">
              Sesi kamu belum aktif atau sudah berakhir. Masuk ulang sebentar ya.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/register">Kirim link masuk lagi</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

interface HeroProps {
  user: AuthMeUser;
}

function ReadingHero({ user }: HeroProps) {
  const firstName = getFirstName(user.name);

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fda50f] via-[#f59a23] to-[#0e2a47] text-white shadow-2xl">
      <div className="px-6 py-8 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
          Lightcy reading space
        </p>
        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Halo, {firstName}. Mau baca apa hari ini?
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Ini ruang kecilmu bersama Lightcy: tempat mulai mencari buku, menyimpan bacaan,
              melihat promo, dan menemukan toko terdekat tanpa terasa dikejar-kejar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-lg backdrop-blur">
            <p className="text-white/70">Masuk sebagai</p>
            <p className="mt-1 break-all font-semibold">{user.email}</p>
            <p className="mt-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] text-white/80">
              Pembaca aktif ✨
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
        <Link href="/">🔎 Cari buku</Link>
      </Button>
      <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
        <Link href="#rak-saya">📚 Rak Saya</Link>
      </Button>
      <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
        <Link href="#jejak-bacaan">🧭 Jejak Bacaan</Link>
      </Button>
      <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
        <Link href="/promos">🔥 Lihat promo</Link>
      </Button>
      <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
        <Link href="/stores">🏬 Toko terdekat</Link>
      </Button>
      <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
        <Link href="/me/reading-dna">🌱 Atur minat</Link>
      </Button>
    </div>
  );
}

function ReadingProgress() {
  const items = [
    "Pilih genre favorit",
    "Simpan buku pertama",
    "Cek toko terdekat",
  ];

  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-semibold text-zinc-950">Ruang bacaanmu baru mulai terisi ✨</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Pelan-pelan saja. Lightcy akan makin berguna setelah mengenal minat bacaanmu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            >
              ○ {item}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function BookCover({ book }: { book: RecommendedBook }) {
  if (book.coverUrl) {
    return (
      <div
        className="aspect-[3/4] rounded-xl bg-zinc-100 bg-cover bg-center shadow-inner"
        style={{ backgroundImage: `url(${book.coverUrl})` }}
        aria-label={`Cover ${book.title}`}
      />
    );
  }

  return (
    <div className="flex aspect-[3/4] items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-3 text-center text-xs font-semibold leading-5 text-amber-800 shadow-inner">
      Cover internal belum tersedia
    </div>
  );
}

interface BookRecommendationCarouselProps {
  readingDnaStatus: ReadingDnaStatus | null;
  recommendations: RecommendationStateData | null;
  recommendationState: DataState;
}

function BookRecommendationCarousel({
  readingDnaStatus,
  recommendations,
  recommendationState,
}: BookRecommendationCarouselProps) {
  const intro = getRecommendationIntro(readingDnaStatus);
  const badge = getRecommendationBadge(readingDnaStatus);
  const books = recommendations?.books ?? [];

  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Untukmu Hari Ini</CardTitle>
          <CardDescription className="leading-6">{intro}</CardDescription>
        </div>
        <span
          className={
            readingDnaStatus?.hasProfile
              ? "w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
              : "w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
          }
        >
          {badge}
        </span>
      </CardHeader>
      <CardContent>
        {recommendationState === "loading" ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="min-w-[190px] max-w-[190px] rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm"
              >
                <div className="aspect-[3/4] animate-pulse rounded-xl bg-zinc-100" />
                <div className="mt-3 h-4 animate-pulse rounded bg-zinc-100" />
                <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-zinc-100" />
              </div>
            ))}
          </div>
        ) : null}

        {recommendationState !== "loading" && books.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {books.map((book) => (
              <article
                key={book.isbn}
                className="min-w-[190px] max-w-[190px] rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm"
              >
                <Link href={`/isbn/${book.isbn}`} className="block">
                  <BookCover book={book} />
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-950">
                    {book.title}
                  </p>
                </Link>
                <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{book.author}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-full bg-white px-2 py-1 text-[11px] text-[#0e2a47] ring-1 ring-zinc-200">
                    {book.genre}
                  </span>
                  <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 ring-1 ring-emerald-100">
                    {book.sourceLabel}
                  </span>
                </div>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600">{book.reason}</p>
                {book.purchaseChannels.length > 0 ? (
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Kanal: {book.purchaseChannels.join(", ")}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {recommendationState !== "loading" && books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-sm leading-6 text-amber-900">
            <p className="font-semibold text-amber-950">
              {recommendations?.emptyTitle ?? "Belum ada rekomendasi internal yang cocok."}
            </p>
            <p className="mt-1">
              {recommendations?.emptyMessage ??
                "Lightcy tidak akan mengisi ruang ini dengan buku random. Rekomendasi akan muncul setelah data internal yang cocok tersedia."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button asChild size="sm" className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
                <Link href="/me/reading-dna">Atur Reading DNA</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
                <Link href="/">Cari buku manual</Link>
              </Button>
            </div>
          </div>
        ) : null}

        <p className="mt-3 text-xs leading-5 text-zinc-500">
          Rekomendasi di ruang ini hanya boleh berasal dari data internal Lighterracy. Google Books hanya dipakai untuk lookup/enrichment saat user scan ISBN acak.
        </p>
      </CardContent>
    </Card>
  );
}

interface BookshelfSectionProps {
  bookshelf: BookshelfStateData | null;
  bookshelfState: DataState;
}

function BookshelfCover({ item }: { item: BookshelfItemData }) {
  if (item.coverUrl) {
    return (
      <div
        className="h-24 w-16 flex-none rounded-xl bg-zinc-100 bg-cover bg-center shadow-inner"
        style={{ backgroundImage: `url(${item.coverUrl})` }}
        aria-label={`Cover ${item.title}`}
      />
    );
  }

  return (
    <div className="flex h-24 w-16 flex-none items-center justify-center rounded-xl border border-dashed border-amber-200 bg-amber-50 px-2 text-center text-[10px] font-semibold leading-4 text-amber-800">
      Cover
    </div>
  );
}

function BookshelfSection({ bookshelf, bookshelfState }: BookshelfSectionProps) {
  const items = bookshelf?.items ?? [];

  return (
    <Card id="rak-saya" className="border-[#eadfce] bg-white shadow-sm scroll-mt-24">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Rak Saya</CardTitle>
          <CardDescription className="leading-6">
            Buku yang kamu simpan dari halaman detail akan muncul di sini. Ini mulai jadi jejak bacaan yang kamu pilih sendiri.
          </CardDescription>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          {bookshelf?.total ?? 0} buku tersimpan
        </span>
      </CardHeader>
      <CardContent>
        {bookshelfState === "loading" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-32 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        ) : null}

        {bookshelfState !== "loading" && items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.slice(0, 6).map((item) => (
              <Link
                key={`${item.isbn}-${item.id}`}
                href={`/isbn/${item.isbn}`}
                className="group flex gap-3 rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <BookshelfCover item={item} />
                <div className="min-w-0 flex-1">
                  <span className="inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                    {getShelfStatusLabel(item.shelfStatus)}
                  </span>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-zinc-950 group-hover:text-[#0e2a47]">
                    {item.title}
                  </p>
                  <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{item.authorText}</p>
                  <p className="mt-2 text-[11px] text-zinc-500">ISBN {item.isbn}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : null}

        {bookshelfState !== "loading" && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-sm leading-6 text-amber-900">
            <p className="font-semibold text-amber-950">Rak Saya masih kosong.</p>
            <p className="mt-1">
              Buka detail buku dari scan atau rekomendasi, lalu klik “Simpan ke Rak Saya”. Lightcy akan pakai sinyal ini untuk memahami minat bacaanmu dengan lebih jujur.
            </p>
            <Button asChild size="sm" className="mt-3 bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/">Cari buku pertama</Link>
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}


interface ReadingTrailSectionProps {
  readingTrail: ReadingTrailStateData | null;
  readingTrailState: DataState;
}

function ReadingTrailCover({ item }: { item: ReadingTrailItemData }) {
  if (item.coverUrl) {
    return (
      <div
        className="h-16 w-11 flex-none rounded-lg bg-zinc-100 bg-cover bg-center shadow-inner"
        style={{ backgroundImage: `url(${item.coverUrl})` }}
        aria-label={`Cover ${item.title}`}
      />
    );
  }

  return (
    <div className="flex h-16 w-11 flex-none items-center justify-center rounded-lg border border-dashed border-amber-200 bg-amber-50 px-1 text-center text-[9px] font-semibold leading-3 text-amber-800">
      Buku
    </div>
  );
}

function ReadingTrailSection({ readingTrail, readingTrailState }: ReadingTrailSectionProps) {
  const items = readingTrail?.items ?? [];

  return (
    <Card id="jejak-bacaan" className="border-[#eadfce] bg-white shadow-sm scroll-mt-24">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Jejak Bacaan</CardTitle>
          <CardDescription className="leading-6">
            Aktivitas yang kamu lakukan sendiri: buka detail, scan, simpan buku, dan perubahan Rak Saya. Ini cikal bakal “Data Saya”.
          </CardDescription>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
          {readingTrail?.total ?? 0} aktivitas terakhir
        </span>
      </CardHeader>
      <CardContent>
        {readingTrailState === "loading" ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        ) : null}

        {readingTrailState !== "loading" && items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) => {
              const content = (
                <>
                  <ReadingTrailCover item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                        {item.eventLabel}
                      </span>
                      <span className="text-[11px] text-zinc-500">{formatReadingEventTime(item.occurredAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-semibold text-zinc-950 group-hover:text-[#0e2a47]">
                      {item.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{item.authorText}</p>
                    {item.isbn ? <p className="mt-1 text-[11px] text-zinc-500">ISBN {item.isbn}</p> : null}
                  </div>
                </>
              );

              return item.isbn ? (
                <Link
                  key={`${item.id}-${item.eventType}`}
                  href={`/isbn/${item.isbn}`}
                  className="group flex gap-3 rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {content}
                </Link>
              ) : (
                <div
                  key={`${item.id}-${item.eventType}`}
                  className="flex gap-3 rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm"
                >
                  {content}
                </div>
              );
            })}
          </div>
        ) : null}

        {readingTrailState === "error" ? (
          <div className="rounded-2xl border border-dashed border-red-200 bg-red-50/70 p-5 text-sm leading-6 text-red-900">
            <p className="font-semibold text-red-950">Jejak Bacaan belum bisa dimuat.</p>
            <p className="mt-1">
              Cek endpoint <code className="rounded bg-white px-1 py-0.5 text-[11px]">/api/me/reading-events</code> di Network tab. Kalau statusnya 500, biasanya migration tabel event belum jalan di environment itu.
            </p>
          </div>
        ) : null}

        {readingTrailState !== "loading" && readingTrailState !== "error" && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-5 text-sm leading-6 text-amber-900">
            <p className="font-semibold text-amber-950">Jejak Bacaan masih kosong.</p>
            <p className="mt-1">
              Mulai dari scan/buka detail buku. Aktivitas ini hanya tumbuh dari aksi yang kamu lakukan di Lighterracy.
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface PromoSectionProps {
  promos: PromoCardData[];
  dataState: DataState;
}

function PromoSection({ promos, dataState }: PromoSectionProps) {
  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Promo yang Lagi Hangat</CardTitle>
          <CardDescription className="leading-6">
            Sedikit kabar baik kalau kamu sedang ingin menambah bacaan tanpa bikin dompet kaget.
          </CardDescription>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <Link href="/promos">Lihat semua</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {dataState === "loading" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-28 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        ) : promos.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {promos.map((promo) => (
              <Link
                key={promo.id}
                href={`/promos/${promo.id}`}
                className="group overflow-hidden rounded-2xl border border-amber-100 bg-[#fffaf2] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="h-24 bg-gradient-to-br from-[#fda50f] to-[#0e2a47] bg-cover bg-center"
                  style={
                    promo.bannerUrl
                      ? { backgroundImage: `linear-gradient(90deg, rgba(14,42,71,.72), rgba(253,165,15,.2)), url(${promo.bannerUrl})` }
                      : undefined
                  }
                />
                <div className="p-4">
                  <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-medium text-amber-800">
                    {promo.status === "active" ? "Aktif" : "Segera"}
                  </span>
                  <p className="mt-2 font-semibold text-zinc-950 group-hover:text-[#0e2a47]">
                    {promo.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-zinc-600">
                    {promo.subtitle}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">sampai {formatDate(promo.endAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
            Belum ada promo aktif yang bisa Lightcy tampilkan. Nanti kalau sudah ada, ruang ini bakal ikut hidup.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface NearbyStoresSectionProps {
  stores: StoreCardData[];
  dataState: DataState;
}

function NearbyStoresSection({ stores, dataState }: NearbyStoresSectionProps) {
  const [userCoords, setUserCoords] = useState<GeoPoint | null>(null);
  const [locationState, setLocationState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("Lightcy belum memakai lokasi perangkatmu.");

  const storesToShow = useMemo<StoreWithDistance[]>(() => {
    const normalized = stores
      .filter((store) => store.lat !== null && store.lng !== null)
      .map((store) => ({
        ...store,
        distanceKm:
          userCoords && store.lat !== null && store.lng !== null
            ? haversineKm(userCoords, { lat: store.lat, lng: store.lng })
            : null,
      }));

    if (userCoords) {
      return normalized
        .sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return 0;
          if (a.distanceKm === null) return 1;
          if (b.distanceKm === null) return -1;
          return a.distanceKm - b.distanceKm;
        })
        .slice(0, 3);
    }

    return normalized.slice(0, 3);
  }, [stores, userCoords]);

  function requestLocation() {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setLocationState("error");
      setLocationMessage("Browser ini belum mendukung lokasi. Kamu tetap bisa lihat semua toko.");
      return;
    }

    setLocationState("loading");
    setLocationMessage("Minta izin lokasi sebentar ya...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationState("ready");
        setLocationMessage("Lokasi hanya dipakai di perangkat ini untuk mengurutkan toko terdekat.");
      },
      () => {
        setLocationState("error");
        setLocationMessage("Lokasi belum diizinkan. Tidak apa-apa, kamu tetap bisa lihat semua toko.");
      },
      {
        enableHighAccuracy: true,
        timeout: 7000,
      },
    );
  }

  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Toko di Sekitarmu</CardTitle>
          <CardDescription className="leading-6">
            Kalau kamu izinkan lokasi, Lightcy bantu urutkan tiga toko Periplus terdekat.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
            onClick={requestLocation}
            disabled={locationState === "loading"}
          >
            {locationState === "loading" ? "Mencari lokasi..." : "📍 Izinkan lokasi"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/stores">Semua toko</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
          {locationMessage}
        </p>

        {dataState === "loading" ? (
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
            <div className="h-36 animate-pulse rounded-2xl bg-zinc-100" />
          </div>
        ) : storesToShow.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {storesToShow.map((store) => (
              <article
                key={store.id}
                className="overflow-hidden rounded-2xl border border-zinc-100 bg-[#fffaf2] shadow-sm"
              >
                <div
                  className="h-24 bg-gradient-to-br from-[#fda50f] to-[#0e2a47] bg-cover bg-center"
                  style={store.photoUrl ? { backgroundImage: `url(${store.photoUrl})` } : undefined}
                />
                <div className="p-4">
                  <p className="line-clamp-1 font-semibold text-zinc-950">{store.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600">{store.address}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-white px-2 py-1 text-[#0e2a47] ring-1 ring-zinc-200">
                      {store.distanceKm !== null ? `${store.distanceKm} km` : "jarak menunggu lokasi"}
                    </span>
                    <Link
                      href={`/stores/${store.slug}`}
                      className="rounded-full bg-[#0e2a47] px-2 py-1 text-white hover:bg-[#163a5f]"
                    >
                      Detail
                    </Link>
                    {store.mapsUrl && (
                      <a
                        href={store.mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-white px-2 py-1 text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50"
                      >
                        Maps
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-5 text-sm leading-6 text-zinc-600">
            Data toko belum siap ditampilkan di ruang bacaan ini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FeatureCardsProps {
  readingDnaStatus: ReadingDnaStatus | null;
  shelfTotal: number;
}

function FeatureCards({ readingDnaStatus, shelfTotal }: FeatureCardsProps) {
  const hasReadingDna = readingDnaStatus?.hasProfile ?? false;
  const readerType = readingDnaStatus?.readerTypeLabel ?? "Belum diisi";

  return (
    <div id="reading-dna" className="grid gap-4 md:grid-cols-3">
      <Card className="border-[#eadfce] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">🌱 Reading DNA</CardTitle>
          <CardDescription className="leading-6">
            {hasReadingDna
              ? `Lightcy mulai mengenal gaya bacamu sebagai ${readerType}.`
              : "Jawab beberapa pertanyaan ringan supaya rekomendasi terasa lebih dekat."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <span
            className={
              hasReadingDna
                ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            }
          >
            {hasReadingDna ? readerType : "Yuk mulai"}
          </span>
          <div>
            <Button asChild size="sm" className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/me/reading-dna">
                {hasReadingDna ? "Lihat / ubah" : "Isi Reading DNA"}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#eadfce] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">📚 Rak Saya</CardTitle>
          <CardDescription className="leading-6">
            Tempat menyimpan buku yang ingin dibaca, dipertimbangkan, atau ditandai sudah selesai.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <span
            className={
              shelfTotal > 0
                ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700"
                : "inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800"
            }
          >
            {shelfTotal > 0 ? `${shelfTotal} buku tersimpan` : "Siap diisi"}
          </span>
          <div>
            <Button asChild size="sm" variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
              <Link href="#rak-saya">Lihat Rak Saya</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[#eadfce] bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">🔐 Data & Privasi</CardTitle>
          <CardDescription className="leading-6">
            Kamu tetap pegang kendali. Personalisasi akan tumbuh dari data yang kamu izinkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
            Transparan dulu
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

interface LogoutPanelProps {
  onLogout: () => void;
  isLoggingOut: boolean;
}

function LogoutPanel({ onLogout, isLoggingOut }: LogoutPanelProps) {
  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-950">Mau istirahat dulu dari ruang baca?</p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Aman. Nanti kalau balik, cukup kirim link masuk lagi dari emailmu.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
          onClick={onLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "Sedang keluar..." : "🚪 Keluar dulu"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface ReadingSpaceProps {
  user: AuthMeUser;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function ReadingSpace({ user, onLogout, isLoggingOut }: ReadingSpaceProps) {
  const [dataState, setDataState] = useState<DataState>("loading");
  const [promos, setPromos] = useState<PromoCardData[]>([]);
  const [stores, setStores] = useState<StoreCardData[]>([]);
  const [readingDnaStatus, setReadingDnaStatus] = useState<ReadingDnaStatus | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationStateData | null>(null);
  const [recommendationState, setRecommendationState] = useState<DataState>("loading");
  const [bookshelf, setBookshelf] = useState<BookshelfStateData | null>(null);
  const [bookshelfState, setBookshelfState] = useState<DataState>("loading");
  const [readingTrail, setReadingTrail] = useState<ReadingTrailStateData | null>(null);
  const [readingTrailState, setReadingTrailState] = useState<DataState>("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [promosResponse, storesResponse, readingDnaResponse, recommendationsResponse, bookshelfResponse, readingTrailResponse] = await Promise.all([
          fetch("/data/promos.json", { cache: "no-store" }),
          fetch("/data/stores.json", { cache: "no-store" }),
          fetchReadingDna().catch(() => null),
          fetchInternalRecommendations().catch(() => null),
          fetchBookshelf().catch(() => null),
          fetchReadingTrail().catch(() => null),
        ]);

        if (!promosResponse.ok || !storesResponse.ok) {
          throw new Error("Gagal memuat data dashboard.");
        }

        const rawPromos = (await promosResponse.json()) as unknown;
        const rawStores = (await storesResponse.json()) as unknown;

        const nextPromos = Array.isArray(rawPromos)
          ? rawPromos
              .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
              .map(normalizePromo)
              .filter((item): item is PromoCardData => item !== null)
              .filter((promo) => promo.status === "active")
              .slice(0, 2)
          : [];

        const nextStores = Array.isArray(rawStores)
          ? rawStores
              .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
              .map(normalizeStore)
              .filter((item): item is StoreCardData => item !== null)
          : [];

        if (cancelled) {
          return;
        }

        setPromos(nextPromos);
        setStores(nextStores);
        setReadingDnaStatus(
          readingDnaResponse
            ? {
                hasProfile: readingDnaResponse.has_profile,
                readerTypeLabel: readingDnaResponse.profile?.reader_type_label ?? null,
                favoriteGenres: readingDnaResponse.profile?.favorite_genres ?? [],
                favoriteGenresCount: readingDnaResponse.profile?.favorite_genres.length ?? 0,
                personalizationEnabled: readingDnaResponse.profile?.personalization_enabled ?? null,
              }
            : null,
        );
        setRecommendations(recommendationsResponse);
        setRecommendationState(recommendationsResponse ? "ready" : "error");
        setBookshelf(bookshelfResponse);
        setBookshelfState(bookshelfResponse ? "ready" : "error");
        setReadingTrail(readingTrailResponse);
        setReadingTrailState(readingTrailResponse ? "ready" : "error");
        setDataState("ready");
      } catch {
        if (cancelled) {
          return;
        }

        setPromos([]);
        setStores([]);
        setReadingDnaStatus(null);
        setRecommendations(null);
        setRecommendationState("error");
        setBookshelf(null);
        setBookshelfState("error");
        setReadingTrail(null);
        setReadingTrailState("error");
        setDataState("error");
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-5xl space-y-5">
        <ReadingHero user={user} />
        <QuickActions />
        <ReadingProgress />
        <BookRecommendationCarousel readingDnaStatus={readingDnaStatus} recommendations={recommendations} recommendationState={recommendationState} />
        <BookshelfSection bookshelf={bookshelf} bookshelfState={bookshelfState} />
        <ReadingTrailSection readingTrail={readingTrail} readingTrailState={readingTrailState} />
        <PromoSection promos={promos} dataState={dataState} />
        <NearbyStoresSection stores={stores} dataState={dataState} />
        <FeatureCards readingDnaStatus={readingDnaStatus} shelfTotal={bookshelf?.total ?? 0} />
        <LogoutPanel onLogout={onLogout} isLoggingOut={isLoggingOut} />
      </section>
    </main>
  );
}

export default function MyReadingSpacePage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const payload = await fetchAuthMe();

        if (cancelled) {
          return;
        }

        if (!payload?.user) {
          setState("error");
          setUser(null);
          return;
        }

        setUser(payload.user);
        setState("ready");
      } catch {
        if (cancelled) {
          return;
        }

        clearSessionTokenFromBrowser();
        setUser(null);
        setState("error");
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    await logoutCurrentSession();
    router.replace("/register");
  }

  if (state === "loading") {
    return <LoadingView />;
  }

  if (state === "error" || !user) {
    return <ErrorView />;
  }

  return (
    <ReadingSpace
      user={user}
      onLogout={() => {
        void handleLogout();
      }}
      isLoggingOut={isLoggingOut}
    />
  );
}


