"use client";

import { useEffect, useState } from "react";
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
import {
  apiFetchWithAuth,
  clearSessionTokenFromBrowser,
  logoutCurrentSession,
} from "@/lib/auth-client";

type LoadState = "idle" | "loading" | "success" | "error";

interface StaffPingUser {
  id: number;
  name: string;
  role: string;
}

interface StaffPingResponse {
  message: string;
  user: StaffPingUser;
}

interface QuoteOfTheDay {
  text: string;
  author: string;
}

interface DailyVisitorStat {
  dayLabel: string;
  count: number;
}

interface TopScannedBook {
  id: string;
  title: string;
  author: string;
  scanCount: number;
}

interface WeeklyBundle {
  id: string;
  name: string;
  description: string;
  books: string[];
}

interface MoodBreakdownItem {
  label: string;
  percent: number;
  suggestion: string;
}

const DEFAULT_QUOTE: QuoteOfTheDay = {
  text: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
};

const MOCK_DAILY_VISITORS: DailyVisitorStat[] = [
  { dayLabel: "Min", count: 18 },
  { dayLabel: "Sen", count: 22 },
  { dayLabel: "Sel", count: 25 },
  { dayLabel: "Rab", count: 19 },
  { dayLabel: "Kam", count: 28 },
  { dayLabel: "Jum", count: 31 },
  { dayLabel: "Sab", count: 24 },
];

const MOCK_TOP_SCANNED_BOOKS: TopScannedBook[] = [
  {
    id: "1",
    title: "Atomic Habits",
    author: "James Clear",
    scanCount: 34,
  },
  {
    id: "2",
    title: "The Psychology of Money",
    author: "Morgan Housel",
    scanCount: 27,
  },
  {
    id: "3",
    title: "Ikigai",
    author: "Héctor García & Francesc Miralles",
    scanCount: 19,
  },
];

const MOCK_WEEKLY_BUNDLES: WeeklyBundle[] = [
  {
    id: "prod-morning",
    name: "Paket Produktif Pagi",
    description: "Buat pelanggan yang lagi pengin upgrade hidup dan fokus kerja.",
    books: ["Atomic Habits", "Deep Work"],
  },
  {
    id: "healing-jujur",
    name: "Paket Healing Jujur",
    description:
      "Untuk yang lagi cari makna hidup dan butuh bacaan yang menenangkan pikiran.",
    books: ["Man's Search for Meaning", "The Mountain Is You"],
  },
];

const MOCK_MOOD_BREAKDOWN: MoodBreakdownItem[] = [
  {
    label: "Anak & parenting",
    percent: 42,
    suggestion: "Cocok tawarin buku parenting ringan atau picture book yang fun.",
  },
  {
    label: "Self-help / non-fiction",
    percent: 33,
    suggestion:
      "Bisa rekomendasikan bacaan pengembangan diri yang gampang dicerna.",
  },
  {
    label: "Fiction",
    percent: 25,
    suggestion: "Novel ringan yang menghibur bisa jadi pelarian yang pas.",
  },
];

function getGreetingInfo(): { title: string; emoji: string; supportText: string } {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 4 && hour < 11) {
    return {
      title: "Selamat pagi",
      emoji: "☀️",
      supportText: "Semangat jaga toko hari ini, bikin pelanggan betah mampir ✨",
    };
  }

  if (hour >= 11 && hour < 15) {
    return {
      title: "Selamat siang",
      emoji: "🌤️",
      supportText: "Siang-siang gini senyum kamu bisa jadi alasan pelanggan balik lagi 😊",
    };
  }

  if (hour >= 15 && hour < 18) {
    return {
      title: "Selamat sore",
      emoji: "🌇",
      supportText: "Dikit lagi tutup, tapi service tetap on point sampai akhir 🙌",
    };
  }

  return {
    title: "Selamat malam",
    emoji: "🌙",
    supportText: "Terima kasih sudah jadi penjaga terakhir hari ini. You’re awesome 💛",
  };
}

export default function StaffHomePage() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<StaffPingUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const [quote, setQuote] = useState<QuoteOfTheDay | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);

  const [isVideoOpen, setIsVideoOpen] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setState("loading");
      setError(null);

      try {
        const response = await apiFetchWithAuth("/api/staff/ping", {
          method: "GET",
        });

        if (response.status === 401) {
          clearSessionTokenFromBrowser();
          if (!isMounted) return;
          setState("error");
          setError("Sesi login kamu sudah berakhir. Yuk login lagi sebentar.");
          return;
        }

        if (!response.ok) {
          if (!isMounted) return;
          setState("error");
          setError("Terjadi kesalahan saat memuat data staff.");
          return;
        }

        const data = (await response.json()) as StaffPingResponse;
        if (!isMounted) return;

        setUser(data.user);
        setMessage(data.message);
        setState("success");
      } catch {
        if (!isMounted) return;
        setState("error");
        setError("Tidak dapat terhubung ke server. Coba beberapa saat lagi, ya.");
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadQuote() {
      try {
        setIsQuoteLoading(true);
        const response = await fetch("https://zenquotes.io/api/random");
        if (!response.ok) return;
        const data = (await response.json()) as { q: string; a: string }[];
        if (!Array.isArray(data) || data.length === 0) return;
        if (!isMounted) return;

        setQuote({
          text: data[0]?.q ?? DEFAULT_QUOTE.text,
          author: data[0]?.a ?? DEFAULT_QUOTE.author,
        });
      } catch {
        // fallback ke DEFAULT_QUOTE
      } finally {
        if (isMounted) {
          setIsQuoteLoading(false);
        }
      }
    }

    void loadQuote();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      setIsLoggingOut(false);
      router.push("/staff/login");
    }
  };

  if (state === "loading" || state === "idle") {
    return (
      <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
        <section className="mx-auto max-w-screen-md space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="h-24 animate-pulse rounded-xl bg-[#f0ece6]" />
            <div className="h-24 animate-pulse rounded-xl bg-[#f0ece6]" />
            <div className="h-24 animate-pulse rounded-xl bg-[#f0ece6]" />
          </div>
        </section>
      </main>
    );
  }

  if (state === "error" || !user) {
    return (
      <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
        <section className="mx-auto flex max-w-md flex-col gap-4">
          <Card className="border-red-100 bg-red-50">
            <CardHeader>
              <CardTitle className="text-base">Sesi login berakhir</CardTitle>
              <CardDescription className="text-xs">
                {error ??
                  "Sesi login kamu sudah tidak valid atau tidak dapat dimuat. Silakan login ulang untuk melanjutkan."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                onClick={() => {
                  clearSessionTokenFromBrowser();
                  router.push("/staff/login");
                }}
              >
                Kembali ke login staff
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Ke beranda publik
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  const greetingInfo = getGreetingInfo();
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayName = user.name || "Staff Lighterracy";
  const displayRole = user.role || "Staff";
  const displayMessage =
    message ??
    "Akses staff-only berhasil. Panel ini masih versi awal dan bakal terus kita upgrade bareng.";

  const effectiveQuote = quote ?? DEFAULT_QUOTE;

  const totalVisitorsThisWeek = MOCK_DAILY_VISITORS.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  const maxVisitorCount = MOCK_DAILY_VISITORS.reduce(
    (max, item) => (item.count > max ? item.count : max),
    1,
  );

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-screen-md space-y-6">
        {/* Banner atas: greeting + info staff */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-6 py-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-amber-100/90">
                Lighterracy Staff Panel · beta
              </p>
              <h1 className="text-lg font-semibold sm:text-xl">
                {greetingInfo.title}, {displayName}! {greetingInfo.emoji}
              </h1>
              <p className="mt-1 text-xs text-amber-100/95">{formattedDate}</p>
              <p className="mt-2 text-sm text-amber-50/95">{greetingInfo.supportText}</p>
              <p className="mt-1 text-[11px] text-amber-100/80">{displayMessage}</p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs sm:text-[13px]">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                <span>Online sebagai&nbsp;</span>
                <span className="font-semibold">{displayRole}</span>
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-white/60 bg-white/10 text-xs text-white hover:bg-white hover:text-amber-700"
                  onClick={() => router.push("/")}
                >
                  Ke beranda publik
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="bg-black/80 text-xs hover:bg-black"
                  onClick={() => {
                    void handleLogout();
                  }}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Mission strip kecil */}
        <div className="rounded-xl border border-dashed border-amber-200 bg-[#fff6ea] px-4 py-3 text-xs text-amber-900 shadow-sm">
          <p>
            Kita nggak cuma jual buku. Kita nemenin orang nemu bacaan yang bisa bantu mereka tetap
            berjuang pelan-pelan. 📚
          </p>
        </div>

        {/* Quote of the day */}
        <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quote of the day</CardTitle>
            <CardDescription className="text-xs">
              Sedikit dorongan buat mulai shift dengan mood yang enak. ✨
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm italic text-zinc-800">
              {isQuoteLoading ? "Memuat quote..." : `“${effectiveQuote.text}”`}
            </p>
            {!isQuoteLoading && (
              <p className="text-xs text-zinc-500">— {effectiveQuote.author}</p>
            )}
            <p className="pt-2 text-[10px] text-zinc-400">Quotes by ZenQuotes.io</p>
          </CardContent>
        </Card>

        {/* Stat ringkas */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Pengunjung digital hari ini 👣</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">27</p>
              <p className="text-[11px] text-zinc-500">
                Perkiraan device unik yang buka Lighterracy dalam radius 50m dari toko kamu.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Scan ISBN hari ini 📚</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">46</p>
              <p className="text-[11px] text-zinc-500">
                Total scan ISBN yang tercatat dari pelanggan hari ini.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Aktivitas minggu ini</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{totalVisitorsThisWeek}</p>
              <p className="text-[11px] text-zinc-500">
                Total pengunjung digital dalam 7 hari terakhir (all day, all shift).
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chart pengunjung 7 hari */}
        <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aktivitas 7 hari terakhir</CardTitle>
            <CardDescription className="text-xs">
              Grafik santai buat lihat seberapa rame Lighterracy dipakai minggu ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-3 flex items-end justify-between gap-2">
              {MOCK_DAILY_VISITORS.map((item) => {
                const normalizedHeight = 16 + (item.count / maxVisitorCount) * 56;
                return (
                  <div
                    key={item.dayLabel}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t-full bg-emerald-500"
                      style={{ height: `${normalizedHeight}px` }}
                    />
                    <span className="text-[10px] text-zinc-500">{item.dayLabel}</span>
                    <span className="text-[10px] font-medium text-zinc-700">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              Angka di atas masih contoh. Nanti diisi dari data kunjungan digital toko kamu,
              tanpa ngurusin stock atau harga.
            </p>
          </CardContent>
        </Card>

        {/* Mood pelanggan hari ini */}
        <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Mood pelanggan hari ini</CardTitle>
            <CardDescription className="text-xs">
              Gambaran genre yang paling sering di-scan, biar kamu punya kompas saat bantu
              pelanggan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {MOCK_MOOD_BREAKDOWN.map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-[11px] text-zinc-600">{item.suggestion}</p>
                </div>
                <p className="text-sm font-semibold text-zinc-800">
                  {item.percent}%
                </p>
              </div>
            ))}
            <p className="mt-2 text-[11px] text-zinc-500">
              Angka ini nantinya diambil dari kombinasi scan ISBN di toko kamu—tanpa sebut nama
              siapa pun.
            </p>
          </CardContent>
        </Card>

        {/* Buku paling sering di-scan */}
        <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              Buku paling sering di-scan (minggu ini)
            </CardTitle>
            <CardDescription className="text-xs">
              Biar gampang tau buku apa yang lagi banyak dilirik pelanggan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_TOP_SCANNED_BOOKS.map((book, index) => (
              <div
                key={book.id}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    #{index + 1} {book.title}
                  </p>
                  <p className="text-xs text-zinc-500">{book.author}</p>
                </div>
                <p className="text-xs text-zinc-600">{book.scanCount}x di-scan</p>
              </div>
            ))}
            <p className="mt-1 text-[11px] text-zinc-500">
              Ke depan, daftar ini bakal langsung diambil dari data scan ISBN di toko kamu
              (tanpa menampilkan stock atau harga).
            </p>
          </CardContent>
        </Card>

        {/* Combo bundle mingguan */}
        <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Combo bundle mingguan</CardTitle>
            <CardDescription className="text-xs">
              Ide paket buku yang bisa kamu tawarkan sebagai rekomendasi lanjutan ke pelanggan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {MOCK_WEEKLY_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="rounded-lg border border-dashed border-zinc-200 bg-[#fff5ea] p-3"
              >
                <p className="text-sm font-semibold">{bundle.name}</p>
                <p className="mt-1 text-xs text-zinc-600">{bundle.description}</p>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Buku terkait: {bundle.books.join(" · ")}
                </p>
              </div>
            ))}
            <p className="mt-1 text-[11px] text-zinc-500">
              Saat ini masih contoh statis. Nanti bisa diisi dari campaign resmi yang dibuat
              tim pusat.
            </p>
          </CardContent>
        </Card>

        {/* Aksi cepat + info internal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Aksi cepat</CardTitle>
              <CardDescription className="text-xs">
                Pintasan yang kepakai banget buat bantu pelanggan dengan cepat.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => router.push("/stores")}
              >
                Lihat daftar toko & lokasi
                <span className="text-[11px] text-zinc-500">/stores</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => router.push("/promos")}
              >
                Cek promo & campaign aktif
                <span className="text-[11px] text-zinc-500">/promos</span>
              </Button>
              <p className="mt-2 text-[11px] text-zinc-500">
                Ke depan, panel ini bisa diisi task harian, checklist visit toko, atau laporan
                singkat yang kamu kirim ke tim pusat.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Info internal & SOP</CardTitle>
              <CardDescription className="text-xs">
                Ruang untuk video SOP, panduan singkat, dan informasi internal lainnya.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-[#fff5ea] p-3">
                <p className="text-sm font-medium">
                  Video SOP berpakaian rapi di toko
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Video internal (tidak publik) yang jelasin standar penampilan rapi di toko,
                  tapi tetap bisa jadi diri sendiri.
                </p>
                <p className="mt-2 text-[11px] text-zinc-600">
                  Di balik SOP ini, kita pengin setiap staff hadir sebagai teman buku—kadang
                  buat beberapa orang, senyum dan rekomendasi kamu bisa jadi lilin kecil di
                  hari yang gelap.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs"
                    onClick={() => setIsVideoOpen(true)}
                  >
                    Tonton video sekarang
                  </Button>
                  <p className="text-[10px] text-zinc-500">
                    Contoh mockup: video diputar di pop-up player.
                  </p>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Kalau ada materi training lain (misal cara menyapa pelanggan, cara menawarkan
                rekomendasi kedua), kita bisa tambah di sini pelan-pelan.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Link kembali ke beranda publik */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-800"
          >
            &larr; Kembali ke beranda publik
          </Link>
        </div>
      </section>

      {/* MODAL VIDEO SOP */}
      {isVideoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto w-full max-w-xl rounded-2xl bg-black shadow-xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-medium text-white">
                Video SOP berpakaian rapi di toko
              </p>
              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                className="text-xs text-zinc-300 hover:text-white"
              >
                Tutup ✕
              </button>
            </div>
            <div className="relative w-full pb-[56.25%]">
              <iframe
                className="absolute inset-0 h-full w-full rounded-b-2xl"
                src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE"
                title="SOP Berpakaian Rapi di Toko"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
