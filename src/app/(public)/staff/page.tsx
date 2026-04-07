"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchAuthMe } from "@/lib/auth-client";
import { getBackendUrl } from "@/lib/env";

type RequestState =
  | "checking_session"
  | "idle"
  | "loading"
  | "success"
  | "error";

interface MagicLinkResponse {
  message: string;
  debug_link?: string | null;
}

const AUTH_NEXT_STORAGE_KEY = "lighterracy_auth_next_path";

const STAFF_PANEL_ROLES = new Set([
  "staff",
  "store_staff",
  "store_manager",
  "area_manager",
]);

function normalizeNextPath(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  if (rawValue === "/staff" || rawValue.startsWith("/staff/")) {
    return rawValue;
  }

  return null;
}

function persistNextPath(nextPath: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (nextPath) {
    window.localStorage.setItem(AUTH_NEXT_STORAGE_KEY, nextPath);
    return;
  }

  window.localStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
}

function appendNextToDebugLink(
  debugLink: string | null | undefined,
  nextPath: string | null,
): string | null {
  if (!debugLink) {
    return null;
  }

  if (!nextPath) {
    return debugLink;
  }

  try {
    const url = new URL(debugLink);
    url.searchParams.set("next", nextPath);
    return url.toString();
  } catch {
    const separator = debugLink.includes("?") ? "&" : "?";
    return `${debugLink}${separator}next=${encodeURIComponent(nextPath)}`;
  }
}

function StaffLoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedNextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [email, setEmail] = useState<string>("staff@lighterracy.test");
  const [state, setState] = useState<RequestState>("checking_session");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkExistingSession() {
      persistNextPath(requestedNextPath);

      try {
        const payload = await fetchAuthMe();

        if (cancelled) {
          return;
        }

        if (!payload?.user) {
          setState("idle");
          return;
        }

        if (STAFF_PANEL_ROLES.has(payload.user.role)) {
          const redirectTarget = requestedNextPath ?? "/staff";
          router.replace(redirectTarget);
          return;
        }

        router.replace("/");
      } catch {
        if (cancelled) {
          return;
        }

        setState("idle");
      }
    }

    void checkExistingSession();

    return () => {
      cancelled = true;
    };
  }, [requestedNextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);
    setSuccessMessage(null);
    setDebugLink(null);

    persistNextPath(requestedNextPath);

    try {
      const backendUrl = getBackendUrl();

      const response = await fetch(`${backendUrl}/api/auth/magic-link/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as MagicLinkResponse;

      if (!response.ok) {
        setState("error");
        setError(data?.message ?? "Gagal meminta magic link.");
        return;
      }

      setState("success");
      setSuccessMessage(data.message);
      setDebugLink(appendNextToDebugLink(data.debug_link ?? null, requestedNextPath));
    } catch {
      setState("error");
      setError("Terjadi kesalahan saat menghubungi server.");
    }
  }

  const isCheckingSession = state === "checking_session";
  const isLoading = state === "loading";

  if (isCheckingSession) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
        <Card className="w-full max-w-md border border-zinc-200 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Staff Login</CardTitle>
            <CardDescription>
              Mengecek session aktif terlebih dahulu...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-zinc-700">
              Kalau kamu masih login dan session backend masih aktif, kamu akan langsung diarahkan
              ke staff panel.
            </p>
            {requestedNextPath && (
              <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-900">
                  Target setelah lolos pengecekan:{" "}
                  <span className="font-mono font-semibold">{requestedNextPath}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
      <Card className="w-full max-w-md border border-zinc-200 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Staff Login</CardTitle>
          <CardDescription>
            Masukkan email staff yang terdaftar untuk menerima magic link login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {requestedNextPath && (
              <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-900">
                  Setelah login berhasil, kamu akan diarahkan kembali ke{" "}
                  <span className="font-mono font-semibold">{requestedNextPath}</span>.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-800">
                Email Staff
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                placeholder="nama.staff@contoh.com"
              />
              <p className="text-xs text-zinc-500">
                Untuk dev: gunakan <span className="font-mono">staff@lighterracy.test</span> dari
                seeder.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Mengirim magic link..." : "Kirim magic link"}
            </Button>

            {successMessage && <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>}

            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

            {debugLink && (
              <div className="mt-4 space-y-1 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2">
                <p className="text-xs font-medium text-zinc-700">Dev helper (local env):</p>
                <a href={debugLink} className="break-all text-xs text-blue-700 underline">
                  {debugLink}
                </a>
                <p className="text-[11px] text-zinc-500">
                  Di production, link ini akan dikirim via email ke staff.
                </p>
              </div>
            )}

            <button
              type="button"
              className="mt-4 w-full text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-800"
              onClick={() => router.push("/")}
            >
              &larr; Kembali ke beranda
            </button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-dvh flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
          <Card className="w-full max-w-md border border-zinc-200 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Staff Login</CardTitle>
              <CardDescription>
                Menyiapkan jalur login staff...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-800">
                Memuat konteks route yang ingin kamu buka...
              </p>
            </CardContent>
          </Card>
        </main>
      }
    >
      <StaffLoginPageContent />
    </Suspense>
  );
}