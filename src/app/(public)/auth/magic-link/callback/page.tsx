"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "@/lib/env";
import { setSessionTokenInBrowser } from "@/lib/auth-client";

type Status = "idle" | "verifying" | "success" | "error";

interface VerifySuccessResponse {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    store_id: number | null;
  };
  session: {
    id: number;
    device_id: string | null;
    last_seen: string;
    created_at: string;
  };
}

const DEVICE_ID_KEY = "lighterracy_device_id";
const STAFF_PANEL_ROLES = new Set([
  "staff",
  "store_staff",
  "store_manager",
  "area_manager",
]);
const INTERNAL_PORTAL_ROLES = new Set([
  "admin",
  "superadmin",
  "ppic",
  "si",
  "ecomm_staff",
  "ecomm_head",
]);

function MagicLinkCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>(
    "Memproses magic link, mohon tunggu sebentar...",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tokenFromUrl = searchParams.get("token");

    async function runVerification() {
      if (!tokenFromUrl) {
        if (cancelled) return;

        setStatus("error");
        setMessage("Gagal memproses magic link.");
        setError("Token login tidak ditemukan di URL.");
        return;
      }

      if (cancelled) return;

      setStatus("verifying");
      setMessage("Memverifikasi magic link ke server...");

      const backendUrl = getBackendUrl();

      let deviceId: string | undefined;

      if (typeof window !== "undefined") {
        const existing = window.localStorage.getItem(DEVICE_ID_KEY);

        if (existing && existing.length > 0) {
          deviceId = existing;
        } else {
          const newId = `dev-${Math.random().toString(36).slice(2, 10)}`;
          window.localStorage.setItem(DEVICE_ID_KEY, newId);
          deviceId = newId;
        }
      }

      try {
        const response = await fetch(`${backendUrl}/api/auth/magic-link/verify`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: tokenFromUrl,
            device_id: deviceId,
          }),
        });

        if (cancelled) return;

        if (!response.ok) {
          const data: unknown = await response.json().catch(() => null as unknown);

          let errorMessage = "Gagal memverifikasi magic link.";

          if (
            data &&
            typeof data === "object" &&
            "message" in data &&
            typeof (data as { message: unknown }).message === "string"
          ) {
            errorMessage = (data as { message: string }).message;
          }

          setStatus("error");
          setMessage("Gagal memproses magic link.");
          setError(errorMessage);
          return;
        }

        const data = (await response.json()) as VerifySuccessResponse;
        setSessionTokenInBrowser(data.token);

        if (cancelled) return;

        const role = data.user.role;

        setStatus("success");

        if (STAFF_PANEL_ROLES.has(role)) {
          setMessage("Login berhasil. Mengarahkan ke staff panel...");
        } else if (INTERNAL_PORTAL_ROLES.has(role)) {
          setMessage(
            "Akun internal berhasil diverifikasi. Untuk area kerja internal, gunakan portal internal/backend.",
          );
        } else {
          setMessage("Login berhasil. Mengarahkan ke beranda Lighterracy...");
        }

        window.setTimeout(() => {
          if (cancelled) return;

          if (STAFF_PANEL_ROLES.has(role)) {
            router.replace("/staff");
            return;
          }

          router.replace("/");
        }, 800);
      } catch {
        if (cancelled) return;

        setStatus("error");
        setMessage("Gagal memproses magic link.");
        setError("Terjadi kesalahan jaringan saat menghubungi server.");
      }
    }

    void runVerification();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const isVerifying = status === "idle" || status === "verifying";

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
      <Card className="w-full max-w-md border border-zinc-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Memproses Magic Link
          </CardTitle>
          <CardDescription>
            Lightcy sedang memverifikasi tautan login kamu. Jangan tutup halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-800">{message}</p>

          {isVerifying && (
            <p className="text-xs text-zinc-500">
              Jika proses terlalu lama, kamu dapat menutup tab ini dan meminta magic
              link baru dari halaman login.
            </p>
          )}

          {status === "error" && error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  router.push("/staff/login");
                }}
              >
                Kembali ke halaman login staff
              </Button>
            </div>
          )}

          {status === "success" && (
            <p className="text-xs text-emerald-700">
              Login berhasil. Kamu akan diarahkan secara otomatis...
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
          <Card className="w-full max-w-md border border-zinc-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                Memproses Magic Link
              </CardTitle>
              <CardDescription>
                Lightcy sedang menyiapkan halaman login kamu...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-800">
                Memuat parameter dari URL dan menyiapkan verifikasi magic link...
              </p>
            </CardContent>
          </Card>
        </main>
      }
    >
      <MagicLinkCallbackContent />
    </Suspense>
  );
}