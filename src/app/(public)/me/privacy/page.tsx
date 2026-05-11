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

export default function MyPrivacyPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [events, setEvents] = useState<ReadingEventItem[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const readingTrailCountLabel = useMemo(() => {
    if (events.length === 0) {
      return "Belum ada jejak terbaru";
    }

    return `${events.length} buku/aktivitas terbaru`;
  }, [events.length]);

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
        return;
      }

      const raw = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error("Data Saya belum bisa dimuat. Coba lagi sebentar ya.");
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
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Nonaktifkan rekomendasi personal</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Hapus Rak Saya</span>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
