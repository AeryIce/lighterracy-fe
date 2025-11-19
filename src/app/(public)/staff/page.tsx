"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetchWithAuth, clearSessionTokenFromBrowser, logoutCurrentSession } from "@/lib/auth-client";

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

export default function StaffHomePage() {
  const router = useRouter();

  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<StaffPingUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setState("loading");
      setError(null);

      try {
        const response = await apiFetchWithAuth("/api/staff/ping", {
          method: "GET",
        });

        if (response.status === 401 || response.status === 403) {
          // Token invalid / sesi mati / role salah → bersihkan & lempar ke login
          clearSessionTokenFromBrowser();
          setState("error");
          setError("Sesi login berakhir atau tidak valid. Mengarahkan kembali ke halaman login...");

          window.setTimeout(() => {
            router.push("/staff/login");
          }, 1500);

          return;
        }

        if (!response.ok) {
          setState("error");
          setError("Gagal memuat data staff dari server.");
          return;
        }

        const data = (await response.json()) as StaffPingResponse;

        setUser(data.user);
        setMessage(data.message);
        setState("success");
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setState("error");
        setError("Terjadi kesalahan saat menghubungi server.");
      }
    }

    void load();
  }, [router]);

  const isLoading = state === "loading" || state === "idle";
  const displayName = user?.name ?? "Staff";
  const displayRole = user?.role ?? "staff";
  const displayMessage = message ?? "Akses endpoint staff-only berhasil.";

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      setIsLoggingOut(false);
      router.push("/staff/login");
    }
  }

  // Kalau error berat → tampilkan kartu error sederhana
  if (state === "error" && error) {
    return (
      <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border border-red-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-red-700">Staff Session</CardTitle>
            <CardDescription className="text-sm text-red-600">
              Terjadi masalah dengan sesi login staff.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button
              type="button"
              className="w-full"
              onClick={() => router.push("/staff/login")}
            >
              Kembali ke login staff
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-screen-md space-y-6">
        {/* Banner atas: penanda login staff */}
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4 text-white shadow-lg">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-amber-100/90">
                Lighterracy Staff Panel
              </p>
              <h1 className="text-lg sm:text-xl font-semibold">
                {isLoading ? "Memuat data staff..." : `Halo, ${displayName}.`}
              </h1>
              {!isLoading && (
                <p className="text-sm text-amber-100/95 mt-1">
                  {displayMessage}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs sm:text-[13px]">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" />
                <span>Login sebagai&nbsp;</span>
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

        {/* Konten utama staff: quick actions + info internal */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Quick actions */}
          <Card className="shadow-sm border border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Aksi cepat</CardTitle>
              <CardDescription className="text-xs">
                Beberapa pintasan yang sering dipakai tim lapangan.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between text-sm"
                onClick={() => router.push("/")}
              >
                Buka halaman scan & beranda
                <span className="text-[11px] text-zinc-500">/</span>
              </Button>
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
                Ke depan, panel ini bisa diisi task harian, checklist visit toko, atau laporan singkat.
              </p>
            </CardContent>
          </Card>

          {/* Info internal + product knowledge placeholder */}
          <Card className="shadow-sm border border-zinc-200">
            <CardHeader>
              <CardTitle className="text-base">Info internal & product knowledge</CardTitle>
              <CardDescription className="text-xs">
                Ringkasan singkat buat mengingatkan fokus utama Lighterracy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-zinc-800">
              <ul className="list-disc pl-4 space-y-1">
                <li>
                  Lighterracy membantu staff menemukan{" "}
                  <span className="font-medium">buku yang tepat di toko terdekat</span> untuk customer.
                </li>
                <li>
                  Gunakan fitur <span className="font-medium">scan ISBN</span> untuk cek detail buku
                  sebelum direkomendasikan ke pengunjung.
                </li>
                <li>
                  Panel ini disiapkan sebagai{" "}
                  <span className="font-medium">ruang internal</span>:
                  catatan kunjungan toko, promo berjalan, dan update produk.
                </li>
                <li>
                  Kalau ada ide perbaikan atau kebutuhan di lapangan, catat dulu;
                  nanti kita bisa jadikan modul khusus di Lighterracy.
                </li>
              </ul>

              <p className="text-[11px] text-zinc-500 mt-2">
                Catatan di atas masih placeholder. Nanti bisa diganti dengan konten resmi dari tim
                training / product knowledge Periplus.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Link kecil kembali ke home publik */}
        <div className="flex justify-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-4"
          >
            &larr; Kembali ke beranda publik
          </Link>
        </div>
      </section>
    </main>
  );
}
