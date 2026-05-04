"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getBackendUrl } from "@/lib/env";

type SubmitState = "idle" | "loading" | "success" | "error";

interface PublicRegisterSuccessResponse {
  message: string;
  status?: string;
  debug_link?: string | null;
  user?: {
    id: number;
    name: string;
    email: string;
    role?: string;
  };
}

interface PublicRegisterErrorResponse {
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

function getFriendlyError(data: PublicRegisterErrorResponse | null): string {
  if (!data) {
    return "Lightcy belum berhasil mengirim link masuk. Coba lagi sebentar ya.";
  }

  if (data.message && data.message.trim().length > 0) {
    return data.message;
  }

  const firstError = Object.values(data.errors ?? {})[0]?.[0];

  if (firstError) {
    return firstError;
  }

  return "Lightcy belum berhasil mengirim link masuk. Coba lagi sebentar ya.";
}

function getStatusLabel(status: string | undefined): string {
  if (status === "created") {
    return "Akun baru siap";
  }

  if (status === "existing") {
    return "Akunmu sudah ada";
  }

  return "Link masuk dikirim";
}

export function PublicRegisterForm() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState<boolean>(false);
  const [state, setState] = useState<SubmitState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugLink, setDebugLink] = useState<string | null>(null);
  const [resultStatus, setResultStatus] = useState<string | undefined>(undefined);

  const emailDomainHint = useMemo(() => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail.includes("@")) {
      return null;
    }

    if (trimmedEmail.endsWith("@periplus.co.id")) {
      return "Untuk akun kantor Periplus, pintu masuknya lewat jalur internal ya. Di sini khusus ruang pembaca umum.";
    }

    return null;
  }, [email]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage(null);
    setError(null);
    setDebugLink(null);
    setResultStatus(undefined);

    if (!privacyAcknowledged) {
      setState("error");
      setError("Centang dulu ya, supaya Lightcy bisa menemani kamu dengan izin yang jelas.");
      return;
    }

    try {
      const backendUrl = getBackendUrl();
      const response = await fetch(`${backendUrl}/api/public/register`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          privacy_acknowledged: privacyAcknowledged,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | PublicRegisterSuccessResponse
        | PublicRegisterErrorResponse
        | null;

      if (!response.ok) {
        setState("error");
        setError(getFriendlyError(data as PublicRegisterErrorResponse | null));
        return;
      }

      const successData = data as PublicRegisterSuccessResponse;
      setState("success");
      setMessage(
        successData.message ||
          "Akun Lighterracy sudah siap. Silakan cek email kamu untuk masuk.",
      );
      setDebugLink(successData.debug_link ?? null);
      setResultStatus(successData.status);
    } catch {
      setState("error");
      setError("Jaringan lagi kurang bersahabat. Coba kirim lagi sebentar ya.");
    }
  }

  const isLoading = state === "loading";
  const isSuccess = state === "success";

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row lg:items-stretch">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fda50f] via-[#f49a1e] to-[#0e2a47] p-6 text-white shadow-2xl lg:w-[46%] lg:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
            Lightcy reading companion
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Halo, aku Lightcy. Yuk mulai rak bacaanmu.
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/80">
            Aku bantu kamu menemukan buku yang lebih cocok dengan mood, minat, dan fase hidupmu.
            Pelan-pelan saja—kamu yang memilih apa yang mau dibagikan.
          </p>

          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="font-medium">✨ Teman cari buku</p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                Lagi butuh bacaan yang menenangkan, seru, atau buat hadiah? Nanti aku bantu pilihkan.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="font-medium">🌱 Makin kenal seleramu</p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                Dari pilihan yang kamu izinkan, rekomendasi bisa terasa lebih dekat dengan kamu.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="font-medium">🔐 Masuk tanpa ribet</p>
              <p className="mt-1 text-xs leading-5 text-white/75">
                Cukup pakai email. Aku kirim link masuk, kamu klik, selesai.
              </p>
            </div>
          </div>
        </div>

        <Card className="flex-1 border-[#eadfce] shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Daftar / Masuk</CardTitle>
            <CardDescription className="leading-6">
              Masukkan nama panggilan dan emailmu. Kalau akunmu sudah ada, Lightcy akan
              kirim link masuk baru—nggak perlu ingat password.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-zinc-800">
                  Nama panggilan
                </label>
                <Input
                  id="name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Misal: Aga"
                  required
                  minLength={2}
                  disabled={isLoading || isSuccess}
                />
                <p className="text-xs text-zinc-500">
                  Biar nanti Lightcy bisa menyapa kamu dengan lebih hangat.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-800">
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  required
                  disabled={isLoading || isSuccess}
                />
                {emailDomainHint ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    {emailDomainHint}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Pakai email pribadi ya. Akun kantor/internal punya jalurnya sendiri.
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
                <input
                  type="checkbox"
                  checked={privacyAcknowledged}
                  onChange={(event) => setPrivacyAcknowledged(event.target.checked)}
                  disabled={isLoading || isSuccess}
                  className="mt-1 h-4 w-4 rounded border-amber-400"
                />
                <span className="text-xs leading-5 text-amber-950">
                  Saya setuju Lightcy memakai data yang saya pilih—seperti nama, email, dan minat
                  bacaan—untuk membantu memberi rekomendasi yang lebih pas. Bisa diatur bertahap nanti.
                </span>
              </label>

              {state === "error" && error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {isSuccess && message && (
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <div className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-medium text-emerald-700">
                    {getStatusLabel(resultStatus)}
                  </div>
                  <p className="text-sm leading-6 text-emerald-800">{message}</p>
                  <p className="text-xs leading-5 text-emerald-700">
                    Cek inbox email kamu ya. Link masuk ini hanya berlaku sebentar dan cuma bisa dipakai sekali.
                  </p>
                </div>
              )}

              {debugLink && (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3">
                  <p className="text-xs font-medium text-zinc-700">Dev helper:</p>
                  <a
                    href={debugLink}
                    className="mt-1 block break-all text-xs text-blue-700 underline"
                  >
                    {debugLink}
                  </a>
                  <p className="mt-2 text-[11px] text-zinc-500">
                    Di production, link ini dikirim lewat email dan tidak ditampilkan di UI.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || isSuccess}
                className="w-full rounded-full bg-[#0e2a47] text-white hover:bg-[#163a5f]"
              >
                {isLoading ? "Mengirim link masuk..." : "Kirim link masuk"}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
                <Link href="/" className="underline-offset-4 hover:underline">
                  ← Kembali ke beranda
                </Link>
                <Link href="/staff/login" className="underline-offset-4 hover:underline">
                  Staff login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
