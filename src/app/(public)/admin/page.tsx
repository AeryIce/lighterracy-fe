"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetchWithAuth, clearSessionTokenFromBrowser, logoutCurrentSession } from "@/lib/auth-client";

type LoadState = "idle" | "loading" | "success" | "error";

interface AdminPingUser {
  id: number;
  name: string;
  role: string;
}

interface AdminPingResponse {
  message: string;
  user: AdminPingUser;
}

export default function AdminHomePage() {
  const router = useRouter();
  const [state, setState] = useState<LoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminPingUser | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    async function load() {
      setState("loading");
      setError(null);

      try {
        const response = await apiFetchWithAuth("/api/admin/ping", {
          method: "GET",
        });

        if (response.status === 401 || response.status === 403) {
          clearSessionTokenFromBrowser();
          setState("error");
          setError("Sesi login berakhir atau tidak valid. Silakan login kembali.");

          window.setTimeout(() => {
            router.push("/admin/login");
          }, 1500);

          return;
        }

        const data = (await response.json()) as AdminPingResponse;

        if (!response.ok) {
          setState("error");
          setError(data?.message ?? "Gagal memuat data admin.");
          return;
        }

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

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);
    try {
      await logoutCurrentSession();
    } finally {
      setIsLoggingOut(false);
      router.push("/admin/login");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Admin Home</CardTitle>
          <CardDescription>
            Halaman ini hanya bisa diakses oleh admin dengan sesi aktif.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <p className="text-sm text-zinc-700">Memuat data admin dari server...</p>
          )}

          {state === "success" && user && (
            <div className="space-y-2">
              <p className="text-sm text-emerald-700">
                {message ?? "Akses endpoint admin berhasil."}
              </p>
              <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 space-y-1">
                <p>
                  <span className="font-medium">Nama:</span> {user.name}
                </p>
                <p>
                  <span className="font-medium">Role:</span> {user.role}
                </p>
              </div>
            </div>
          )}

          {state === "error" && error && (
            <p className="text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="pt-2 flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/")}
            >
              Kembali ke beranda
            </Button>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/admin/login")}
            >
              Halaman login admin
            </Button>

            <Button
              type="button"
              className="w-full"
              onClick={() => {
                void handleLogout();
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Logging out..." : "Logout dari sesi ini"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
