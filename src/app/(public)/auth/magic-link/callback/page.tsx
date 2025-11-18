"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "@/lib/env";

type VerifyState = "idle" | "verifying" | "success" | "error";

interface VerifyResponseUser {
  id: number;
  name: string;
  email: string;
  role: string;
  store_id: number | null;
}

interface VerifyResponseSession {
  id: number;
  device_id: string | null;
  last_seen: string;
  created_at: string;
}

interface VerifyResponse {
  message: string;
  token: string;
  user: VerifyResponseUser;
  session: VerifyResponseSession;
}

interface ErrorResponse {
  message?: string;
}

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "unknown-device";
  }

  const storageKey = "lighterracy_device_id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing && existing.length > 0) {
    return existing;
  }

  const newId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `device-${Math.random().toString(36).slice(2, 18)}`;

  window.localStorage.setItem(storageKey, newId);
  return newId;
}

function saveSessionToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem("lighterracy_session_token", token);
}

export default function MagicLinkCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState("error");
      setError("Token login tidak ditemukan. Silakan minta magic link baru.");
      return;
    }

    async function verify() {
      setState("verifying");
      setError(null);

      try {
        const backendUrl = getBackendUrl();
        const deviceId = getOrCreateDeviceId();

        const response = await fetch(`${backendUrl}/api/auth/magic-link/verify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            device_id: deviceId,
          }),
        });

        const data = (await response.json()) as VerifyResponse | ErrorResponse;

        if (!response.ok) {
          const message =
            "message" in data && data.message ? data.message : "Gagal memverifikasi magic link.";
          setState("error");
          setError(message);
          return;
        }

        const okData = data as VerifyResponse;

        saveSessionToken(okData.token);
        setState("success");

        let targetPath = "/";

        if (okData.user.role === "staff") {
          targetPath = "/staff";
        } else if (okData.user.role === "admin") {
          targetPath = "/admin";
        }

        window.setTimeout(() => {
          router.push(targetPath);
        }, 800);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(err);
        setState("error");
        setError("Terjadi kesalahan saat menghubungi server.");
      }
    }

    void verify();
  }, [router, token]);

  const isLoading = state === "verifying" || state === "idle";

  return (
    <main className="min-h-dvh bg-[#f7f7f7] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Memverifikasi Magic Link</CardTitle>
          <CardDescription>
            Mohon tunggu sebentar, kami sedang memverifikasi tautan login Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <p className="text-sm text-zinc-700">Menghubungkan ke server dan memverifikasi sesi...</p>
          )}

          {state === "success" && (
            <p className="text-sm text-emerald-700">
              Login berhasil. Anda akan diarahkan ke halaman yang sesuai.
            </p>
          )}

          {state === "error" && error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{error}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/staff/login")}
              >
                Kembali ke halaman login staff
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
