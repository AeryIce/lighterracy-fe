"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getBackendUrl } from "@/lib/env";

type RequestState = "idle" | "loading" | "success" | "error";

interface MagicLinkResponse {
  message: string;
  debug_link?: string | null;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>("admin@lighterracy.test");
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);
    setSuccessMessage(null);
    setDebugLink(null);

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
      setDebugLink(data.debug_link ?? null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setState("error");
      setError("Terjadi kesalahan saat menghubungi server.");
    }
  }

  const isLoading = state === "loading";

  return (
    <main className="min-h-dvh bg-[#f7f7f7] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Admin Login</CardTitle>
          <CardDescription>
            Masukkan email admin yang terdaftar untuk menerima magic link login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-zinc-800">
                Email Admin
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isLoading}
                placeholder="nama.admin@contoh.com"
              />
              <p className="text-xs text-zinc-500">
                Untuk dev: gunakan <span className="font-mono">admin@lighterracy.test</span> dari seeder.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Mengirim magic link..." : "Kirim magic link"}
            </Button>

            {successMessage && <p className="mt-2 text-sm text-emerald-700">{successMessage}</p>}

            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}

            {debugLink && (
              <div className="mt-4 space-y-1 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2">
                <p className="text-xs font-medium text-zinc-700">Dev helper (local env):</p>
                <a href={debugLink} className="break-all text-xs text-blue-700 underline">
                  {debugLink}
                </a>
                <p className="text-[11px] text-zinc-500">
                  Di production, link ini akan dikirim via email ke admin.
                </p>
              </div>
            )}

            <button
              type="button"
              className="mt-4 w-full text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-4"
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
