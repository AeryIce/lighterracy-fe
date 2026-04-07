"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
const AUTH_NEXT_STORAGE_KEY = "lighterracy_auth_next_path";

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

function normalizeNextPath(rawValue: string | null): string | null {
  if (!rawValue) {
    return null;
  }

  if (rawValue === "/staff" || rawValue.startsWith("/staff/")) {
    return rawValue;
  }

  return null;
}

function readStoredNextPath(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeNextPath(window.localStorage.getItem(AUTH_NEXT_STORAGE_KEY));
}

function writeStoredNextPath(nextPath: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (nextPath) {
    window.localStorage.setItem(AUTH_NEXT_STORAGE_KEY, nextPath);
    return;
  }

  window.localStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
}

function clearStoredNextPath(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
}

function buildStaffLoginUrl(nextPath: string | null): string {
  if (!nextPath) {
    return "/staff/login";
  }

  return `/staff/login?next=${encodeURIComponent(nextPath)}`;
}

function SecurityShieldIcon() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-lg backdrop-blur">
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
      <div className="absolute -right-1 -top-1 rounded-full bg-[#fda50f] px-1.5 py-0.5 text-[10px] font-semibold text-[#111111] shadow">
        secure
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="inline-flex items-center gap-1">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f] [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#fda50f] [animation-delay:300ms]" />
    </div>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "error") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] text-red-700">
        <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
        <span>Verification failed</span>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        <span>Verification success</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] text-white/90 backdrop-blur">
      <span className="inline-block h-2 w-2 rounded-full bg-[#fda50f]" />
      <span>Secure magic link verification</span>
    </div>
  );
}

interface StatusShellProps {
  status: Status;
  title: string;
  subtitle: string;
  message: string;
  nextPath: string | null;
  error: string | null;
  onBackToLogin: () => void;
}

function StatusShell({
  status,
  title,
  subtitle,
  message,
  nextPath,
  error,
  onBackToLogin,
}: StatusShellProps) {
  const isError = status === "error";
  const heroClass = isError
    ? "from-[#5c1616] via-[#7a1f1f] to-[#0e2a47]"
    : "from-[#fda50f] via-[#f28c18] to-[#0e2a47]";

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-2xl space-y-4">
        <div
          className={`overflow-hidden rounded-3xl bg-gradient-to-r ${heroClass} text-white shadow-2xl`}
        >
          <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">
                Lighterracy secure login flow
              </p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm leading-6 text-white/80">{subtitle}</p>
              <div className="mt-4">
                <StatusBadge status={status} />
              </div>
            </div>

            <SecurityShieldIcon />
          </div>
        </div>

        <Card className="overflow-hidden border-[#eadfce] shadow-sm">
          <CardHeader className="bg-[#fff7eb]">
            <CardTitle className="text-base">Verification status</CardTitle>
            <CardDescription className="text-xs leading-5">
              Halaman ini mengurus verifikasi magic link dan pengalihan aman ke route yang sesuai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {nextPath && (
              <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                  Target route
                </p>
                <p className="mt-2 text-sm text-amber-900">
                  Setelah verifikasi selesai, kamu akan diarahkan ke{" "}
                  <span className="font-mono font-semibold">{nextPath}</span>.
                </p>
              </div>
            )}

            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Progress
              </p>
              <div className="mt-2 flex items-start gap-3">
                {!isError && status !== "success" && <LoadingDots />}
                <p className="text-sm text-zinc-800">{message}</p>
              </div>
            </div>

            {status === "success" && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-sm text-emerald-700">
                  Login berhasil. Kamu akan diarahkan secara otomatis...
                </p>
              </div>
            )}

            {isError && error && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <Button
                  type="button"
                  className="w-full bg-[#0e2a47] text-white hover:bg-[#163a5f]"
                  onClick={onBackToLogin}
                >
                  Kembali ke halaman login staff
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function MagicLinkCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedNextFromUrl = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>(
    "Menyiapkan verifikasi magic link..."
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const tokenFromUrl = searchParams.get("token");
    const requestedNextPath = requestedNextFromUrl ?? readStoredNextPath();

    if (requestedNextFromUrl) {
      writeStoredNextPath(requestedNextFromUrl);
    }

    async function runVerification() {
      if (!tokenFromUrl) {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage("Gagal memproses magic link.");
        setError("Token login tidak ditemukan di URL.");
        return;
      }

      if (cancelled) {
        return;
      }

      setStatus("verifying");
      setMessage("Memverifikasi tautan login kamu secara aman...");

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

        if (cancelled) {
          return;
        }

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

        if (cancelled) {
          return;
        }

        const role = data.user.role;
        const isStaffLike = STAFF_PANEL_ROLES.has(role);
        const isInternalRole = INTERNAL_PORTAL_ROLES.has(role);

        setStatus("success");

        if (isStaffLike) {
          setMessage("Login berhasil. Mengarahkan kamu kembali ke halaman staff...");
        } else if (isInternalRole) {
          setMessage(
            "Akun internal berhasil diverifikasi. Untuk area kerja internal, gunakan portal internal/backend.",
          );
        } else {
          setMessage("Login berhasil. Mengarahkan ke beranda Lighterracy...");
        }

        const redirectTarget = isStaffLike
          ? requestedNextPath ?? "/staff"
          : "/";

        window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          clearStoredNextPath();
          router.replace(redirectTarget);
        }, 900);
      } catch {
        if (cancelled) {
          return;
        }

        setStatus("error");
        setMessage("Gagal memproses magic link.");
        setError("Terjadi kesalahan jaringan saat menghubungi server.");
      }
    }

    void runVerification();

    return () => {
      cancelled = true;
    };
  }, [requestedNextFromUrl, router, searchParams]);

  const requestedNextPath = requestedNextFromUrl ?? readStoredNextPath();

  return (
    <StatusShell
      status={status}
      title="Memproses Magic Link"
      subtitle="Lightcy sedang memverifikasi tautan login kamu agar proses masuk tetap aman dan rapi."
      message={message}
      nextPath={requestedNextPath}
      error={error}
      onBackToLogin={() => {
        router.push(buildStaffLoginUrl(requestedNextPath));
      }}
    />
  );
}

export default function MagicLinkCallbackPage() {
  return (
    <Suspense
      fallback={
        <StatusShell
          status="idle"
          title="Memproses Magic Link"
          subtitle="Lightcy sedang menyiapkan jalur login kamu."
          message="Memuat parameter dari URL dan menyiapkan verifikasi magic link..."
          nextPath={null}
          error={null}
          onBackToLogin={() => {}}
        />
      }
    >
      <MagicLinkCallbackContent />
    </Suspense>
  );
}