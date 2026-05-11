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
import type { AuthMeUser, ReadingDnaProfile } from "@/lib/auth-client";
import {
  apiFetchWithAuth,
  fetchAuthMe,
  fetchReadingDna,
} from "@/lib/auth-client";

type LoadState = "loading" | "ready" | "error";

type ShelfItem = {
  id: number;
  isbn_13: string;
  title: string;
  author_text: string | null;
  cover_url: string | null;
  shelf_status: string;
  saved_at: string | null;
  last_interaction_at: string | null;
};

type ReadingEvent = {
  id: number;
  event_type: string;
  event_label: string;
  isbn_13: string | null;
  title: string | null;
  author_text: string | null;
  cover_url: string | null;
  source_page: string | null;
  occurred_at: string | null;
};

type BookshelfResponse = {
  ok: boolean;
  total: number;
  items: Array<Record<string, unknown>>;
};

type ReadingEventsResponse = {
  ok: boolean;
  total: number;
  items: Array<Record<string, unknown>>;
};

type PrivacyData = {
  user: AuthMeUser;
  readingDna: ReadingDnaProfile | null;
  shelfItems: ShelfItem[];
  readingEvents: ReadingEvent[];
  errors: string[];
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "waktu belum tercatat";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "waktu belum tercatat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shelfStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    want_to_read: "Ingin Dibaca",
    considering: "Sedang Dipertimbangkan",
    reading: "Sedang Dibaca",
    read: "Sudah Dibaca",
    favorite: "Favorit",
    gift: "Untuk Hadiah",
  };

  return labels[status] ?? status;
}

function normalizeShelfItem(raw: Record<string, unknown>): ShelfItem | null {
  const isbn = readString(raw.isbn_13);
  if (!isbn) {
    return null;
  }

  return {
    id: readNumber(raw.id),
    isbn_13: isbn,
    title: readString(raw.title, `Buku ISBN ${isbn}`),
    author_text: readNullableString(raw.author_text),
    cover_url: readNullableString(raw.cover_url),
    shelf_status: readString(raw.shelf_status, "want_to_read"),
    saved_at: readNullableString(raw.saved_at),
    last_interaction_at: readNullableString(raw.last_interaction_at),
  };
}

function normalizeReadingEvent(raw: Record<string, unknown>): ReadingEvent | null {
  const id = readNumber(raw.id);
  const eventType = readString(raw.event_type);
  const title = readNullableString(raw.title);
  const isbn = readNullableString(raw.isbn_13);

  if (!id || !eventType) {
    return null;
  }

  return {
    id,
    event_type: eventType,
    event_label: readString(raw.event_label, "Aktivitas bacaan"),
    isbn_13: isbn,
    title: title ?? (isbn ? `Buku ISBN ${isbn}` : "Aktivitas bacaan"),
    author_text: readNullableString(raw.author_text),
    cover_url: readNullableString(raw.cover_url),
    source_page: readNullableString(raw.source_page),
    occurred_at: readNullableString(raw.occurred_at),
  };
}

async function fetchBookshelf(): Promise<ShelfItem[]> {
  const response = await apiFetchWithAuth("/api/me/bookshelf", { method: "GET" });

  if (!response.ok) {
    throw new Error("Rak Saya belum bisa dimuat.");
  }

  const data = (await response.json()) as BookshelfResponse;

  return Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeShelfItem)
        .filter((item): item is ShelfItem => item !== null)
    : [];
}

async function fetchReadingEvents(): Promise<ReadingEvent[]> {
  const response = await apiFetchWithAuth("/api/me/reading-events?limit=20", {
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Jejak Bacaan belum bisa dimuat.");
  }

  const data = (await response.json()) as ReadingEventsResponse;

  return Array.isArray(data.items)
    ? data.items
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeReadingEvent)
        .filter((item): item is ReadingEvent => item !== null)
    : [];
}

function SmallMetric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-amber-100 bg-[#fffaf2] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-600">{note}</p>
    </div>
  );
}

function LoadingView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <Card className="border-[#eadfce] shadow-sm">
          <CardHeader>
            <CardTitle>Menyiapkan Data Saya...</CardTitle>
            <CardDescription>
              Lightcy sedang membaca data yang kamu izinkan di Lighterracy.
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
            <CardTitle>Data Saya belum bisa dibuka</CardTitle>
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

export default function PrivacyTrustCenterPage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<PrivacyData | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrivacyData() {
      setState("loading");

      try {
        const auth = await fetchAuthMe();

        if (!auth?.user) {
          router.replace("/register");
          return;
        }

        const errors: string[] = [];
        const [dnaResult, shelfResult, eventsResult] = await Promise.allSettled([
          fetchReadingDna(),
          fetchBookshelf(),
          fetchReadingEvents(),
        ]);

        const readingDna =
          dnaResult.status === "fulfilled" ? dnaResult.value.profile : null;
        if (dnaResult.status === "rejected") {
          errors.push("Reading DNA belum bisa dimuat.");
        }

        const shelfItems = shelfResult.status === "fulfilled" ? shelfResult.value : [];
        if (shelfResult.status === "rejected") {
          errors.push("Rak Saya belum bisa dimuat.");
        }

        const readingEvents = eventsResult.status === "fulfilled" ? eventsResult.value : [];
        if (eventsResult.status === "rejected") {
          errors.push("Jejak Bacaan belum bisa dimuat.");
        }

        if (!cancelled) {
          setData({
            user: auth.user,
            readingDna,
            shelfItems,
            readingEvents,
            errors,
          });
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setState("error");
        }
      }
    }

    void loadPrivacyData();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const readingDnaGenres = useMemo(() => {
    if (!data?.readingDna) {
      return [];
    }

    return readStringArray(data.readingDna.favorite_genres).slice(0, 6);
  }, [data]);

  if (state === "loading") {
    return <LoadingView />;
  }

  if (state === "error" || !data) {
    return <ErrorView />;
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8 text-zinc-950">
      <section className="mx-auto flex max-w-5xl flex-col gap-5">
        <div className="rounded-3xl bg-gradient-to-br from-[#0e2a47] via-[#14385d] to-[#fda50f] p-6 text-white shadow-xl sm:p-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
            Data Saya · Privacy Trust Center
          </p>
          <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Semua jejak bacaan yang kamu izinkan, kelihatan di sini.
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Lighterracy tidak dibuat untuk mengikuti kamu diam-diam. Halaman ini adalah langkah awal supaya kamu bisa melihat data bacaan yang dipakai untuk membantu personalisasi.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-lg backdrop-blur">
              <p className="text-white/70">Akun</p>
              <p className="mt-1 break-all font-semibold">{data.user.email}</p>
              <p className="mt-2 inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] text-white/80">
                Kontrol data tahap awal
              </p>
            </div>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="p-4 text-sm leading-6 text-amber-900">
              <p className="font-semibold text-amber-950">Sebagian data belum bisa dimuat.</p>
              <ul className="mt-2 list-disc pl-5">
                {data.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid gap-3 md:grid-cols-3">
          <SmallMetric
            label="Reading DNA"
            value={data.readingDna ? "Aktif" : "Belum"}
            note={data.readingDna?.reader_type_label ?? "Isi minat bacaan agar rekomendasi makin relevan."}
          />
          <SmallMetric
            label="Rak Saya"
            value={`${data.shelfItems.length}`}
            note="Buku yang kamu simpan secara sadar untuk dibaca, dipertimbangkan, atau dijadikan hadiah."
          />
          <SmallMetric
            label="Jejak Bacaan"
            value={`${data.readingEvents.length}`}
            note="Aktivitas terakhir seperti buka detail, scan ISBN, dan simpan buku."
          />
        </div>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Apa yang Lighterracy simpan?</CardTitle>
            <CardDescription className="leading-6">
              Data di bawah ini dipakai untuk membuat pengalaman membaca terasa lebih personal, bukan untuk menampilkan identitasmu ke staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-100 bg-[#fffaf2] p-4">
              <p className="font-semibold text-zinc-950">Preferensi bacaan</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Reading DNA, genre favorit, bahasa pilihan, dan kedalaman bacaan yang kamu pilih sendiri.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-[#fffaf2] p-4">
              <p className="font-semibold text-zinc-950">Aktivitas bacaan</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Scan ISBN, buka detail buku, simpan ke Rak Saya, dan perubahan status rak.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-[#fffaf2] p-4">
              <p className="font-semibold text-zinc-950">Data toko & promo</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Lokasi hanya dipakai saat kamu meminta fitur terkait toko terdekat atau aksi yang memang membutuhkan konteks toko.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-100 bg-[#fffaf2] p-4">
              <p className="font-semibold text-zinc-950">Data agregat untuk staff</p>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Staff cukup melihat insight umum seperti buku yang sering discan dan mood genre, bukan identitas personal user.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle>Reading DNA</CardTitle>
              <CardDescription className="leading-6">
                Profil bacaan yang kamu set sendiri. Ini fondasi rekomendasi personal.
              </CardDescription>
            </div>
            <Button asChild variant="outline" className="w-fit border-amber-200 bg-white hover:bg-amber-50">
              <Link href="/me/reading-dna">Atur Reading DNA</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.readingDna ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-6 text-emerald-950">
                <p className="font-semibold">{data.readingDna.reader_type_label}</p>
                <p className="mt-1">
                  Personalisasi: {data.readingDna.personalization_enabled ? "aktif" : "nonaktif"}
                </p>
                {readingDnaGenres.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {readingDnaGenres.map((genre) => (
                      <span key={genre} className="rounded-full bg-white px-3 py-1 text-xs text-emerald-700 ring-1 ring-emerald-100">
                        {genre}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                Reading DNA belum diisi. Rekomendasi tetap bisa jalan secara umum, tapi belum terasa personal.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Rak Saya</CardTitle>
            <CardDescription className="leading-6">
              Buku yang kamu simpan sendiri. Ini sinyal personalisasi yang paling jelas dan paling sehat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.shelfItems.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.shelfItems.slice(0, 6).map((item) => (
                  <Link
                    key={`${item.isbn_13}-${item.id}`}
                    href={`/isbn/${item.isbn_13}`}
                    className="rounded-2xl border border-zinc-100 bg-[#fffaf2] p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <p className="line-clamp-2 font-semibold text-zinc-950">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">ISBN {item.isbn_13}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-[#0e2a47] ring-1 ring-zinc-200">
                        {shelfStatusLabel(item.shelf_status)}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatDateTime(item.last_interaction_at ?? item.saved_at)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                Rak Saya masih kosong. Buka detail buku lalu klik “Simpan ke Rak Saya”.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Jejak Bacaan</CardTitle>
            <CardDescription className="leading-6">
              Aktivitas terakhir yang terjadi karena aksi sadar kamu di Lighterracy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.readingEvents.length > 0 ? (
              <div className="space-y-3">
                {data.readingEvents.slice(0, 10).map((event) => (
                  <Link
                    key={event.id}
                    href={event.isbn_13 ? `/isbn/${event.isbn_13}` : "/me"}
                    className="flex gap-3 rounded-2xl border border-zinc-100 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-lg">
                      {event.event_type === "book_saved" ? "📌" : event.event_type === "isbn_scanned" ? "📷" : "📖"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-100">
                          {event.event_label}
                        </span>
                        <span className="text-xs text-zinc-500">{formatDateTime(event.occurred_at)}</span>
                      </div>
                      <p className="mt-2 line-clamp-1 font-semibold text-zinc-950">
                        {event.title ?? "Aktivitas bacaan"}
                      </p>
                      {event.isbn_13 ? (
                        <p className="mt-1 text-xs text-zinc-500">ISBN {event.isbn_13}</p>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/70 p-4 text-sm leading-6 text-amber-900">
                Jejak Bacaan belum ada. Coba cari buku, buka detail, atau simpan buku ke Rak Saya.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kontrol berikutnya</CardTitle>
            <CardDescription className="leading-6">
              Ini belum tombol aktif. Tapi inilah janji produk berikutnya supaya user benar-benar pegang kendali.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
              <p className="font-semibold text-zinc-900">Reset personalisasi</p>
              <p className="mt-1">Mengulang Reading DNA dan sinyal rekomendasi dari awal.</p>
            </div>
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
              <p className="font-semibold text-zinc-900">Hapus Jejak Bacaan</p>
              <p className="mt-1">Menghapus riwayat aktivitas bacaan dari akunmu.</p>
            </div>
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600">
              <p className="font-semibold text-zinc-900">Export data</p>
              <p className="mt-1">Mengunduh ringkasan data bacaan yang tersimpan.</p>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 pb-4">
          <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
            <Link href="/me">← Kembali ke ruang baca</Link>
          </Button>
          <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
            <Link href="/">Cari buku lagi</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
