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

function SecurityShieldIcon() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-lg backdrop-blur">
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8 text-white"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
        <path d="m9.5 12 1.7 1.7 3.8-4.2" />
      </svg>
      <div className="absolute -right-1 -top-1 rounded-full bg-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold text-black shadow">
        secure
      </div>
    </div>
  );
}

interface SecurityBlockedCardProps {
  variant: "expired" | "forbidden";
  title: string;
  description: string;
  detail?: string | null;
  user?: AuthMeUser | null;
  isLoggingOut?: boolean;
  onLogin: () => void;
  onHome: () => void;
  onLogout?: () => void;
}

function SecurityBlockedCard({
  variant,
  title,
  description,
  detail,
  user,
  isLoggingOut = false,
  onLogin,
  onHome,
  onLogout,
}: SecurityBlockedCardProps) {
  const accentClass =
    variant === "forbidden"
      ? "from-[#171717] via-[#111827] to-[#1f2937]"
      : "from-[#2b0b0b] via-[#451313] to-[#6b1f1f]";

  const badgeText =
    variant === "forbidden"
      ? "Protected Staff Realm"
      : "Session Protection Active";

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto flex max-w-2xl flex-col gap-4">
        <div
          className={`overflow-hidden rounded-3xl bg-gradient-to-r ${accentClass} text-white shadow-2xl`}
        >
          <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">
                Staff route security gate
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/80">{description}</p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] text-white/85 backdrop-blur">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span>{badgeText}</span>
              </div>
            </div>

            <SecurityShieldIcon />
          </div>
        </div>

        <Card className="overflow-hidden border-zinc-200 shadow-sm">
          <CardHeader className="bg-[#fff9f3]">
            <CardTitle className="text-base">Access policy</CardTitle>
            <CardDescription className="text-xs leading-5">
              Route ini dilindungi oleh kebijakan akses yang disejajarkan dengan prinsip
              OWASP ASVS, sehingga sesi tidak valid atau role yang tidak sesuai akan
              ditolak otomatis oleh flow keamanan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Security detail
              </p>
              <p className="mt-2 text-sm text-zinc-800">
                {detail ??
                  "Akses ke halaman staff membutuhkan sesi aktif dan role yang sesuai dengan kontrak backend."}
              </p>
            </div>

            {user && (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                  Session snapshot
                </p>
                <div className="space-y-1 text-zinc-800">
                  <p>
                    <span className="font-medium">Nama:</span> {user.name}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {user.email}
                  </p>
                  <p>
                    <span className="font-medium">Role:</span> {user.role}
                  </p>
                  <p>
                    <span className="font-medium">store_id:</span>{" "}
                    {user.store_id ?? "-"}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Button type="button" className="w-full" onClick={onLogin}>
                Kembali ke login staff
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={onHome}>
                Ke beranda publik
              </Button>
            </div>

            {onLogout && (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-zinc-600 hover:text-zinc-900"
                onClick={onLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? "Logging out..." : "Logout dari sesi ini"}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
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
      <SecurityBlockedCard
        variant="expired"
        title="Sesi login berakhir"
        description="Kamu mencoba membuka route staff yang dilindungi, tapi sesi aktif tidak ditemukan atau sudah kedaluwarsa."
        detail={error}
        onLogin={() => {
          clearSessionTokenFromBrowser();
          router.push("/staff/login");
        }}
        onHome={() => router.push("/")}
      />
    );
  }

  if (state === "forbidden") {
    return (
      <SecurityBlockedCard
        variant="forbidden"
        title="Akses staff panel ditolak"
        description="Akun ini berhasil login, tetapi role-nya tidak cocok untuk memasuki protected staff realm di Lighterracy FE."
        detail={error}
        user={user}
        isLoggingOut={isLoggingOut}
        onLogin={() => router.push("/staff/login")}
        onHome={() => router.push("/")}
        onLogout={() => {
          void handleLogout();
        }}
      />
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
            Panel ini sengaja dibuat jujur dulu: fokus ke identitas login, konteks akun, dan
            pintasan kerja ringan. Insight toko yang lebih dalam menyusul setelah kontrak data
            store di backend dirapikan. 📚
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
                <span className="font-medium">Session state:</span> {authPayload.auth.state}
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
                <span className="font-medium">store_id:</span> {user.store_id ?? "-"}
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