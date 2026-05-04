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
  favoriteGenresCount: number;
  personalizationEnabled: boolean | null;
}

interface RecommendedBook {
  isbn: string;
  title: string;
  author: string;
  genre: string;
  coverUrl: string;
  reason: string;
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

const FEATURED_BOOKS: RecommendedBook[] = [
  {
    isbn: "9780735211292",
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Self-growth",
    coverUrl:
      "https://storage.googleapis.com/du-prd/books/images/9780735211292.jpg",
    reason: "Cocok kalau kamu ingin mulai membangun kebiasaan kecil yang lebih rapi.",
  },
  {
    isbn: "9780062457714",
    title: "The Subtle Art of Not Giving a F*ck",
    author: "Mark Manson",
    genre: "Reflective non-fiction",
    coverUrl:
      "https://storage.googleapis.com/du-prd/books/images/9780062457714.jpg",
    reason: "Untuk hari ketika kamu butuh bacaan yang jujur, santai, tapi tetap menampar lembut.",
  },
  {
    isbn: "9781524763138",
    title: "The Mountain Is You",
    author: "Brianna Wiest",
    genre: "Healing",
    coverUrl:
      "https://storage.googleapis.com/du-prd/books/images/9781524763138.jpg",
    reason: "Pilihan awal untuk pembaca yang sedang ingin memahami diri pelan-pelan.",
  },
  {
    isbn: "9780143127741",
    title: "Deep Work",
    author: "Cal Newport",
    genre: "Productivity",
    coverUrl:
      "https://storage.googleapis.com/du-prd/books/images/9781455586691.jpg",
    reason: "Pas untuk kamu yang ingin kembali fokus di tengah dunia yang rame banget.",
  },
];

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
    <div className="grid gap-3 sm:grid-cols-4">
      <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
        <Link href="/">🔎 Cari buku</Link>
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

function BookRecommendationCarousel() {
  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <CardTitle>Untukmu Hari Ini</CardTitle>
          <CardDescription className="leading-6">
            Nanti carousel ini mengikuti genre favoritmu. Untuk sekarang, Lightcy mulai dari kurasi awal dulu.
          </CardDescription>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
          Preview personalisasi
        </span>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {FEATURED_BOOKS.map((book) => (
            <article
              key={book.isbn}
              className="min-w-[190px] max-w-[190px] rounded-2xl border border-zinc-100 bg-[#fffaf2] p-3 shadow-sm"
            >
              <Link href={`/isbn/${book.isbn}`} className="block">
                <div
                  className="aspect-[3/4] rounded-xl bg-zinc-100 bg-cover bg-center shadow-inner"
                  style={{ backgroundImage: `url(${book.coverUrl})` }}
                  aria-label={`Cover ${book.title}`}
                />
                <p className="mt-3 line-clamp-2 text-sm font-semibold text-zinc-950">
                  {book.title}
                </p>
              </Link>
              <p className="mt-1 line-clamp-1 text-xs text-zinc-500">{book.author}</p>
              <span className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] text-[#0e2a47] ring-1 ring-zinc-200">
                {book.genre}
              </span>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600">{book.reason}</p>
            </article>
          ))}
        </div>
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
}

function FeatureCards({ readingDnaStatus }: FeatureCardsProps) {
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
        <CardContent>
          <span className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-600">
            Pondasi berikutnya
          </span>
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

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        const [promosResponse, storesResponse, readingDnaResponse] = await Promise.all([
          fetch("/data/promos.json", { cache: "no-store" }),
          fetch("/data/stores.json", { cache: "no-store" }),
          fetchReadingDna().catch(() => null),
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
                favoriteGenresCount: readingDnaResponse.profile?.favorite_genres.length ?? 0,
                personalizationEnabled: readingDnaResponse.profile?.personalization_enabled ?? null,
              }
            : null,
        );
        setDataState("ready");
      } catch {
        if (cancelled) {
          return;
        }

        setPromos([]);
        setStores([]);
        setReadingDnaStatus(null);
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
        <BookRecommendationCarousel />
        <PromoSection promos={promos} dataState={dataState} />
        <NearbyStoresSection stores={stores} dataState={dataState} />
        <FeatureCards readingDnaStatus={readingDnaStatus} />
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
