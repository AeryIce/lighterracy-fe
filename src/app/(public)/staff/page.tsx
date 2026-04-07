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
  AuthMeResponse,
  AuthMeUser,
  clearSessionTokenFromBrowser,
  fetchAuthMe,
  logoutCurrentSession,
} from "@/lib/auth-client";

type LoadState = "idle" | "loading" | "success" | "error" | "forbidden";

interface QuoteOfTheDay {
  text: string;
  author: string;
}

const STAFF_PANEL_ROLES = new Set([
  "staff",
  "store_staff",
  "store_manager",
  "area_manager",
]);

const DEFAULT_QUOTE: QuoteOfTheDay = {
  text: "The only way to do great work is to love what you do.",
  author: "Steve Jobs",
};

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

function getRoleLabel(role: string): string {
  switch (role) {
    case "staff":
      return "Staff";
    case "store_staff":
      return "Store Staff";
    case "store_manager":
      return "Store Manager";
    case "area_manager":
      return "Area Manager";
    default:
      return role;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StaffHomePage() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [authPayload, setAuthPayload] = useState<AuthMeResponse | null>(null);
  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const [quote, setQuote] = useState<QuoteOfTheDay | null>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setState("loading");
      setError(null);

      try {
        const payload = await fetchAuthMe();

        if (!isMounted) {
          return;
        }

        if (!payload?.user) {
          setState("error");
          setError("Sesi login kamu sudah berakhir. Yuk login lagi sebentar.");
          return;
        }

        if (!STAFF_PANEL_ROLES.has(payload.user.role)) {
          setAuthPayload(payload);
          setUser(payload.user);
          setState("forbidden");
          setError(
            "Akun ini berhasil login, tapi belum punya akses ke staff panel Lighterracy.",
          );
          return;
        }

        setAuthPayload(payload);
        setUser(payload.user);
        setState("success");
      } catch {
        if (!isMounted) {
          return;
        }

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
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { q: string; a: string }[];
        if (!Array.isArray(data) || data.length === 0) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setQuote({
          text: data[0]?.q ?? DEFAULT_QUOTE.text,
          author: data[0]?.a ?? DEFAULT_QUOTE.author,
        });
      } catch {
        // fallback ke default
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

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      setIsLoggingOut(false);
      router.push("/staff/login");
    }
  }

  if (state === "loading" || state === "idle") {
    return (
      <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
        <section className="mx-auto max-w-screen-md space-y-4">
          <div className="h-24 animate-pulse rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-28 animate-pulse rounded-xl bg-[#f0ece6]" />
            <div className="h-28 animate-pulse rounded-xl bg-[#f0ece6]" />
          </div>
          <div className="h-40 animate-pulse rounded-xl bg-[#f0ece6]" />
        </section>
      </main>
    );
  }

  if (state === "error") {
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

  if (state === "forbidden") {
    return (
      <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
        <section className="mx-auto flex max-w-md flex-col gap-4">
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-base">Akses staff panel ditolak</CardTitle>
              <CardDescription className="text-xs">
                {error ??
                  "Akun ini berhasil login, tapi belum punya akses ke panel staff/store di Lighterracy FE."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {user && (
                <div className="rounded-lg border border-amber-200 bg-white/70 p-3 text-xs text-zinc-700">
                  <p>
                    <span className="font-medium">Nama:</span> {user.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span> {user.role}
                  </p>
                </div>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={() => router.push("/")}
              >
                Kembali ke beranda publik
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout dari sesi ini"}
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    );
  }

  if (!user || !authPayload) {
    return null;
  }

  const greetingInfo = getGreetingInfo();
  const today = new Date();
  const formattedDate = today.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const displayRole = getRoleLabel(user.role || "staff");
  const effectiveQuote = quote ?? DEFAULT_QUOTE;

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-screen-md space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-6 py-4 text-white shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-amber-100/90">
                Lighterracy Staff Panel · v1
              </p>
              <h1 className="text-lg font-semibold sm:text-xl">
                {greetingInfo.title}, {user.name}! {greetingInfo.emoji}
              </h1>
              <p className="mt-1 text-xs text-amber-100/95">{formattedDate}</p>
              <p className="mt-2 text-sm text-amber-50/95">{greetingInfo.supportText}</p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/25 px-3 py-1 text-xs sm:text-[13px]">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                <span>Online sebagai</span>
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

        <div className="rounded-xl border border-dashed border-amber-200 bg-[#fff6ea] px-4 py-3 text-xs text-amber-900 shadow-sm">
          <p>
            Panel ini sengaja dibuat jujur dulu: fokus ke identitas login, konteks akun, dan pintasan kerja ringan.
            Insight toko yang lebih dalam menyusul setelah kontrak data store di backend dirapikan. 📚
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Identitas sesi</CardTitle>
              <CardDescription className="text-xs">
                Siapa yang sedang login dan status session aktif saat ini.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Nama:</span> {user.name}
              </p>
              <p>
                <span className="font-medium">Email:</span> {user.email}
              </p>
              <p>
                <span className="font-medium">Role:</span> {displayRole}
              </p>
              <p>
                <span className="font-medium">Session state:</span>{" "}
                {authPayload.auth.state}
              </p>
              <p>
                <span className="font-medium">Device ID:</span>{" "}
                {authPayload.session?.device_id ?? "-"}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Konteks akun toko</CardTitle>
              <CardDescription className="text-xs">
                Jembatan awal sampai mapping user ↔ store di backend dibuat lebih rapi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">store_id:</span>{" "}
                {user.store_id ?? "-"}
              </p>
              <p>
                <span className="font-medium">Session dibuat:</span>{" "}
                {formatDateTime(authPayload.session?.created_at)}
              </p>
              <p>
                <span className="font-medium">Terakhir aktif:</span>{" "}
                {formatDateTime(authPayload.session?.last_seen)}
              </p>
              <p className="pt-1 text-[11px] text-zinc-500">
                Detail nama toko, alamat, jam buka, dan maps belum ditarik otomatis di FE
                supaya kita tidak memaksa kontrak backend induk sebelum waktunya.
              </p>
            </CardContent>
          </Card>
        </div>

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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick action</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => router.push("/stores")}
              >
                Lihat daftar toko
                <span className="text-[11px] text-zinc-500">/stores</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick action</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => router.push("/promos")}
              >
                Cek promo aktif
                <span className="text-[11px] text-zinc-500">/promos</span>
              </Button>
            </CardContent>
          </Card>

          <Card className="border border-zinc-200 bg-[#fff9f3] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Quick action</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={isLoggingOut}
              >
                Logout dari sesi ini
                <span className="text-[11px] text-zinc-500">secure</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="border border-dashed border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Promo toko</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700">
                Promo spesifik toko akan tampil di sini setelah mapping account-store diperjelas.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-dashed border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Insight scan ISBN</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700">
                Statistik ISBN yang paling sering dilihat pelanggan akan hadir di card ini.
              </p>
            </CardContent>
          </Card>

          <Card className="border border-dashed border-zinc-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Mood pelanggan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-700">
                Segmentasi genre dan minat pelanggan toko akan ditampilkan di sini nanti.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-800"
          >
            &larr; Kembali ke beranda publik
          </Link>
        </div>
      </section>
    </main>
  );
}