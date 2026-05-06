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
import type { AuthMeUser } from "@/lib/auth-client";
import {
  clearSessionTokenFromBrowser,
  fetchAuthMe,
  logoutCurrentSession,
} from "@/lib/auth-client";

type LoadState = "loading" | "ready" | "error";

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return "teman baca";
  }

  return trimmed.split(" ")[0] ?? "teman baca";
}

function LoadingView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-4xl">
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
      <section className="mx-auto max-w-4xl">
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

interface ReadingSpaceProps {
  user: AuthMeUser;
  onLogout: () => void;
  isLoggingOut: boolean;
}

function ReadingSpace({ user, onLogout, isLoggingOut }: ReadingSpaceProps) {
  const firstName = getFirstName(user.name);

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fda50f] via-[#f59a23] to-[#0e2a47] text-white shadow-2xl">
          <div className="px-6 py-8 sm:px-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
              Lightcy reading space
            </p>
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Halo, {firstName}. Ini ruang bacaanmu.
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Dari sini nanti Lightcy akan bantu mengingat buku yang kamu simpan,
                  memahami minat bacaanmu, dan pelan-pelan memberi rekomendasi yang lebih pas.
                </p>
              </div>

              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-lg backdrop-blur">
                <p className="text-white/70">Masuk sebagai</p>
                <p className="mt-1 font-semibold">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-[#eadfce] bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">🌱 Reading DNA</CardTitle>
              <CardDescription className="leading-6">
                Nanti kamu bisa jawab beberapa pertanyaan ringan supaya rekomendasi terasa lebih dekat.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
                Segera dibuka
              </span>
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

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Mulai dari langkah kecil</CardTitle>
            <CardDescription className="leading-6">
              Sambil ruang bacaan ini kami lengkapi, kamu sudah bisa cari buku lewat ISBN, lihat toko,
              dan jelajahi rekomendasi yang tersedia di beranda.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/">Cari buku sekarang</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/stores">Lihat toko terdekat</Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-zinc-500 hover:text-red-700 sm:ml-auto"
              onClick={onLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Keluar..." : "Keluar dari akun"}
            </Button>
          </CardContent>
        </Card>
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
