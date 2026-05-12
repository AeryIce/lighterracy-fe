"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetchWithAuth, clearSessionTokenFromBrowser } from "@/lib/auth-client";

type LoadState = "loading" | "ready" | "error" | "unauthenticated";

interface ReadingEventItem {
  id: number;
  event_type: string;
  event_label: string;
  isbn_13: string | null;
  title: string | null;
  author_text: string | null;
  occurred_at: string | null;
}

interface ReadingEventsResponse {
  ok: boolean;
  total: number;
  items: ReadingEventItem[];
}

interface PurchaseClickItem {
  id: number;
  isbn_13: string | null;
  title: string | null;
  author_text: string | null;
  cover_url: string | null;
  channel: string;
  channel_label: string;
  source_page: string | null;
  clicked_at: string | null;
}

interface PurchaseClicksResponse {
  ok: boolean;
  total: number;
  items: PurchaseClickItem[];
}


interface ReadingDnaProfile {
  id: number;
  reading_purposes: string[];
  favorite_genres: string[];
  preferred_languages: string[];
  reading_depth: string | null;
  reader_type_label: string | null;
  personalization_enabled: boolean;
  onboarding_completed_at: string | null;
  updated_at: string | null;
}

interface ReadingDnaResponse {
  ok: boolean;
  has_profile: boolean;
  profile: ReadingDnaProfile | null;
}

const userDataRows = [
  ["Profil akun", "Nama panggilan dan email untuk login magic link."],
  ["Reading DNA", "Preferensi yang kamu isi sendiri agar rekomendasi makin relevan."],
  ["Rak Saya", "Buku yang kamu simpan, status bacaan, dan buku favorit."],
  ["Jejak Bacaan", "Aktivitas sadar seperti scan, cari, buka detail, dan simpan buku."],
  ["Lokasi", "Dipakai hanya saat kamu meminta toko/promo terdekat, bukan background tracking."],
  ["Klik pembelian", "Channel resmi yang kamu pilih saat keluar menuju Periplus/Tokopedia/Shopee."],
];

function formatDateTime(value: string | null): string {
  if (!value) {
    return "baru saja";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "baru saja";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeEvents(raw: unknown): ReadingEventItem[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [];
  }

  const payload = raw as Partial<ReadingEventsResponse>;

  if (!Array.isArray(payload.items)) {
    return [];
  }

  return payload.items
    .map((item): ReadingEventItem | null => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return null;
      }

      const row = item as Partial<ReadingEventItem>;
      const id = typeof row.id === "number" ? row.id : 0;
      const eventType = typeof row.event_type === "string" ? row.event_type : "unknown";
      const eventLabel =
        typeof row.event_label === "string" && row.event_label.trim() !== ""
          ? row.event_label
          : "Aktivitas bacaan";

      return {
        id,
        event_type: eventType,
        event_label: eventLabel,
        isbn_13: typeof row.isbn_13 === "string" ? row.isbn_13 : null,
        title: typeof row.title === "string" ? row.title : null,
        author_text: typeof row.author_text === "string" ? row.author_text : null,
        occurred_at: typeof row.occurred_at === "string" ? row.occurred_at : null,
      };
    })
    .filter((item): item is ReadingEventItem => item !== null && item.id > 0);
}


function normalizePurchaseClicks(raw: unknown): PurchaseClickItem[] {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return [];
  }

  const payload = raw as Partial<PurchaseClicksResponse>;

  if (!Array.isArray(payload.items)) {
    return [];
  }

  return payload.items
    .map((item): PurchaseClickItem | null => {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        return null;
      }

      const row = item as Partial<PurchaseClickItem>;
      const id = typeof row.id === "number" ? row.id : 0;

      return {
        id,
        isbn_13: typeof row.isbn_13 === "string" ? row.isbn_13 : null,
        title: typeof row.title === "string" ? row.title : null,
        author_text: typeof row.author_text === "string" ? row.author_text : null,
        cover_url: typeof row.cover_url === "string" ? row.cover_url : null,
        channel: typeof row.channel === "string" ? row.channel : "unknown",
        channel_label:
          typeof row.channel_label === "string" && row.channel_label.trim() !== ""
            ? row.channel_label
            : "Channel pembelian",
        source_page: typeof row.source_page === "string" ? row.source_page : null,
        clicked_at: typeof row.clicked_at === "string" ? row.clicked_at : null,
      };
    })
    .filter((item): item is PurchaseClickItem => item !== null && item.id > 0);
}


function normalizeReadingDnaProfile(raw: unknown): ReadingDnaProfile | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }

  const row = raw as Partial<ReadingDnaProfile>;

  return {
    id: typeof row.id === "number" ? row.id : 0,
    reading_purposes: Array.isArray(row.reading_purposes)
      ? row.reading_purposes.filter((item): item is string => typeof item === "string")
      : [],
    favorite_genres: Array.isArray(row.favorite_genres)
      ? row.favorite_genres.filter((item): item is string => typeof item === "string")
      : [],
    preferred_languages: Array.isArray(row.preferred_languages)
      ? row.preferred_languages.filter((item): item is string => typeof item === "string")
      : [],
    reading_depth: typeof row.reading_depth === "string" ? row.reading_depth : null,
    reader_type_label: typeof row.reader_type_label === "string" ? row.reader_type_label : null,
    personalization_enabled: typeof row.personalization_enabled === "boolean" ? row.personalization_enabled : true,
    onboarding_completed_at:
      typeof row.onboarding_completed_at === "string" ? row.onboarding_completed_at : null,
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

function normalizeReadingDnaResponse(raw: unknown): ReadingDnaProfile | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return null;
  }

  const payload = raw as Partial<ReadingDnaResponse>;

  return normalizeReadingDnaProfile(payload.profile);
}

export default function MyPrivacyPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [events, setEvents] = useState<ReadingEventItem[]>([]);
  const [purchaseClicks, setPurchaseClicks] = useState<PurchaseClickItem[]>([]);
  const [profile, setProfile] = useState<ReadingDnaProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [isTogglingPersonalization, setIsTogglingPersonalization] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const readingTrailCountLabel = useMemo(() => {
    if (events.length === 0) {
      return "Belum ada jejak terbaru";
    }

    return `${events.length} buku/aktivitas terbaru`;
  }, [events.length]);

  const purchaseClickCountLabel = useMemo(() => {
    if (purchaseClicks.length === 0) {
      return "Belum ada klik pembelian terbaru";
    }

    return `${purchaseClicks.length} channel/buku terbaru`;
  }, [purchaseClicks.length]);

  const personalizationEnabled = profile?.personalization_enabled ?? true;
  const readerTypeLabel = profile?.reader_type_label ?? "Belum membentuk Reading DNA";

  const loadReadingEvents = useCallback(async () => {
    setState("loading");
    setErrorMessage(null);

    try {
      const response = await apiFetchWithAuth("/api/me/reading-events?limit=8", {
        method: "GET",
      });

      if (response.status === 401) {
        clearSessionTokenFromBrowser();
        setState("unauthenticated");
        setEvents([]);
        setPurchaseClicks([]);
        return;
      }

      const raw = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error("Data Saya belum bisa dimuat. Coba lagi sebentar ya.");
      }

      const dnaResponse = await apiFetchWithAuth("/api/me/reading-dna", {
        method: "GET",
      });

      if (dnaResponse.status === 401) {
        clearSessionTokenFromBrowser();
        setState("unauthenticated");
        setEvents([]);
        setProfile(null);
        return;
      }

      if (dnaResponse.ok) {
        const dnaRaw = (await dnaResponse.json().catch(() => null)) as unknown;
        setProfile(normalizeReadingDnaResponse(dnaRaw));
      } else {
        setProfile(null);
      }

      const purchaseResponse = await apiFetchWithAuth("/api/me/purchase-clicks?limit=8", {
        method: "GET",
      });

      if (purchaseResponse.status === 401) {
        clearSessionTokenFromBrowser();
        setState("unauthenticated");
        setEvents([]);
        setPurchaseClicks([]);
        setProfile(null);
        return;
      }

      if (purchaseResponse.ok) {
        const purchaseRaw = (await purchaseResponse.json().catch(() => null)) as unknown;
        setPurchaseClicks(normalizePurchaseClicks(purchaseRaw));
      } else {
        setPurchaseClicks([]);
      }

      setEvents(normalizeEvents(raw));
      setState("ready");
    } catch (error) {
      setState("error");
      setErrorMessage(error instanceof Error ? error.message : "Data Saya belum bisa dimuat.");
    }
  }, []);

  useEffect(() => {
    void loadReadingEvents();
  }, [loadReadingEvents]);

  async function handleClearReadingTrail(): Promise<void> {
    const confirmed = window.confirm(
      "Hapus Jejak Bacaan? Aktivitas scan, cari, dan buka detail buku akan dihapus dari akun ini. Rak Saya tidak ikut terhapus.",
    );

    if (!confirmed) {
      return;
    }

    setIsClearing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetchWithAuth("/api/me/reading-events", {
        method: "DELETE",
      });

      if (response.status === 401) {
        clearSessionTokenFromBrowser();
        setState("unauthenticated");
        setEvents([]);
        return;
      }

      const raw = (await response.json().catch(() => null)) as { deleted?: unknown; message?: unknown } | null;

      if (!response.ok) {
        throw new Error("Jejak Bacaan belum bisa dihapus. Coba lagi sebentar ya.");
      }

      const deleted = typeof raw?.deleted === "number" ? raw.deleted : 0;
      setEvents([]);
      setSuccessMessage(
        deleted > 0
          ? `${deleted} Jejak Bacaan berhasil dihapus dari akun ini.`
          : "Jejak Bacaan sudah kosong.",
      );
      setState("ready");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Jejak Bacaan belum bisa dihapus.");
    } finally {
      setIsClearing(false);
    }
  }


  async function handleTogglePersonalization(): Promise<void> {
    const nextEnabled = !personalizationEnabled;
    const confirmed = window.confirm(
      nextEnabled
        ? "Aktifkan kembali rekomendasi personal? Lighterracy akan memakai Reading DNA dan aktivitas bacaan yang kamu izinkan."
        : "Nonaktifkan rekomendasi personal? Fitur scan, detail buku, Rak Saya, toko, dan promo tetap bisa dipakai.",
    );

    if (!confirmed) {
      return;
    }

    setIsTogglingPersonalization(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await apiFetchWithAuth("/api/me/reading-dna/personalization", {
        method: "PATCH",
        body: JSON.stringify({ personalization_enabled: nextEnabled }),
      });

      if (response.status === 401) {
        clearSessionTokenFromBrowser();
        setState("unauthenticated");
        setEvents([]);
        setProfile(null);
        return;
      }

      const raw = (await response.json().catch(() => null)) as { message?: unknown; profile?: unknown } | null;

      if (!response.ok) {
        throw new Error("Pengaturan personalisasi belum bisa disimpan. Coba lagi sebentar ya.");
      }

      const updatedProfile = normalizeReadingDnaProfile(raw?.profile ?? null);
      setProfile(updatedProfile);
      setSuccessMessage(
        typeof raw?.message === "string"
          ? raw.message
          : nextEnabled
            ? "Rekomendasi personal sudah diaktifkan kembali."
            : "Rekomendasi personal sudah dinonaktifkan.",
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Pengaturan personalisasi belum bisa disimpan.",
      );
    } finally {
      setIsTogglingPersonalization(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e2a47] via-[#163a5f] to-[#fda50f] p-6 text-white shadow-2xl sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
            Data Saya
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Kamu tetap pegang kendali atas data bacaanmu.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            Lighterracy memakai data bacaan yang kamu izinkan untuk membuat pengalaman membaca lebih relevan.
            Di halaman ini, kamu bisa melihat jenis data yang dipakai dan mulai mengatur sebagian data personalmu.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-white text-[#0e2a47] hover:bg-amber-50">
              <Link href="/me">← Kembali ke ruang baca</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/15">
              <Link href="/privacy">Lihat versi publik</Link>
            </Button>
          </div>
        </div>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Data yang Lighterracy pakai</CardTitle>
            <CardDescription className="leading-6">
              Semua ini dipakai untuk membantu pengalaman membaca, bukan untuk membuka identitas personalmu ke staff toko.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {userDataRows.map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-zinc-100 bg-[#fffaf2] px-4 py-3">
                <p className="font-semibold text-zinc-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kontrol data aktif</CardTitle>
            <CardDescription className="leading-6">
              MVP pertama: user bisa menghapus Jejak Bacaan tanpa menghapus Rak Saya.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-sky-950">Rekomendasi personal</p>
                  <p className="mt-1 text-sm leading-6 text-sky-900">
                    Status: <span className="font-semibold">{personalizationEnabled ? "Aktif" : "Nonaktif"}</span>.
                    {" "}Reading DNA: {readerTypeLabel}. Saat nonaktif, Lighterracy tetap bisa dipakai untuk scan, detail buku, Rak Saya, toko, dan promo umum.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isTogglingPersonalization || state === "loading" || state === "unauthenticated"}
                  onClick={() => void handleTogglePersonalization()}
                  className="rounded-full border-sky-300 bg-white text-sky-950 hover:bg-sky-100"
                >
                  {isTogglingPersonalization
                    ? "Menyimpan..."
                    : personalizationEnabled
                      ? "Nonaktifkan"
                      : "Aktifkan"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-amber-950">Jejak Bacaan</p>
                  <p className="mt-1 text-sm leading-6 text-amber-900">
                    {readingTrailCountLabel}. Menghapus ini akan menghapus riwayat aktivitas seperti scan, cari, dan buka detail buku.
                    Buku yang sudah kamu simpan di Rak Saya tetap aman.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isClearing || state === "loading" || state === "unauthenticated"}
                  onClick={() => void handleClearReadingTrail()}
                  className="rounded-full border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
                >
                  {isClearing ? "Menghapus..." : "Hapus Jejak Bacaan"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-semibold text-emerald-950">Klik pembelian</p>
              <p className="mt-1 text-sm leading-6 text-emerald-900">
                {purchaseClickCountLabel}. Data ini mencatat channel yang kamu pilih saat membuka link pembelian resmi,
                supaya kamu bisa melihat jejak keluar dari Lighterracy dengan jelas.
              </p>
            </div>

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorMessage}
              </div>
            ) : null}

            {state === "unauthenticated" ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                Sesi masuk sudah berakhir. Masuk ulang dulu untuk melihat dan mengatur Data Saya.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Preview Jejak Bacaan</CardTitle>
            <CardDescription className="leading-6">
              Ini contoh data yang bisa dilihat user agar personalisasi terasa transparan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {state === "loading" ? (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Memuat Jejak Bacaan...
              </div>
            ) : null}

            {state === "ready" && events.length === 0 ? (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                Jejak Bacaan kamu masih kosong. Coba scan, cari, atau buka detail buku dulu.
              </div>
            ) : null}

            {state === "ready" && events.length > 0
              ? events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-zinc-100 bg-[#fffaf2] px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                          {event.event_label}
                        </p>
                        <p className="mt-1 font-semibold text-zinc-950">
                          {event.title ?? (event.isbn_13 ? `Buku ISBN ${event.isbn_13}` : "Aktivitas buku")}
                        </p>
                        {event.author_text ? (
                          <p className="mt-1 text-sm text-zinc-500">{event.author_text}</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-500">{formatDateTime(event.occurred_at)}</p>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Preview Klik Pembelian</CardTitle>
            <CardDescription className="leading-6">
              User bisa melihat channel pembelian apa saja yang pernah dipilih dari Lighterracy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {state === "loading" ? (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                Memuat klik pembelian...
              </div>
            ) : null}

            {state === "ready" && purchaseClicks.length === 0 ? (
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600">
                Belum ada klik pembelian yang tercatat. Nanti kalau kamu membuka link Periplus/Tokopedia/Shopee dari detail buku, jejaknya muncul di sini.
              </div>
            ) : null}

            {state === "ready" && purchaseClicks.length > 0
              ? purchaseClicks.map((click) => (
                  <div key={click.id} className="rounded-2xl border border-zinc-100 bg-[#f5fff8] px-4 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          {click.channel_label}
                        </p>
                        <p className="mt-1 font-semibold text-zinc-950">
                          {click.title ?? (click.isbn_13 ? `Buku ISBN ${click.isbn_13}` : "Klik pembelian")}
                        </p>
                        {click.author_text ? (
                          <p className="mt-1 text-sm text-zinc-500">{click.author_text}</p>
                        ) : null}
                      </div>
                      <p className="text-xs text-zinc-500">{formatDateTime(click.clicked_at)}</p>
                    </div>
                  </div>
                ))
              : null}
          </CardContent>
        </Card>

        <Card className="border-dashed border-zinc-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kontrol berikutnya</CardTitle>
            <CardDescription className="leading-6">
              Setelah MVP hapus Jejak Bacaan stabil, kontrol berikutnya bisa ditambah bertahap.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Reset personalisasi</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Export Data Saya</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Hapus Rak Saya</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Hapus Klik Pembelian</span>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
