"use client";

import { useEffect, useMemo, useState } from "react";
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
import type {
  AuthMeUser,
  ReadingDnaOption,
  ReadingDnaOptions,
  ReadingDnaProfile,
} from "@/lib/auth-client";
import {
  clearSessionTokenFromBrowser,
  fetchAuthMe,
  fetchReadingDna,
  updateReadingDna,
} from "@/lib/auth-client";

type PageState = "loading" | "ready" | "error";
type SaveState = "idle" | "saving" | "success" | "error";

const FALLBACK_OPTIONS: ReadingDnaOptions = {
  reading_purposes: [
    { value: "entertainment", label: "Hiburan" },
    { value: "learning", label: "Belajar" },
    { value: "healing", label: "Menenangkan pikiran" },
    { value: "career", label: "Kerja / karier" },
    { value: "parenting", label: "Parenting" },
    { value: "gift", label: "Cari hadiah" },
    { value: "faith_spiritual", label: "Iman / spiritual" },
    { value: "children", label: "Untuk anak" },
  ],
  favorite_genres: [
    { value: "fiction", label: "Fiction" },
    { value: "self_help", label: "Self-help" },
    { value: "business", label: "Business" },
    { value: "children_books", label: "Children Books" },
    { value: "faith_spiritual", label: "Faith / Spiritual" },
    { value: "manga_comic", label: "Manga / Comic" },
    { value: "history", label: "History" },
    { value: "psychology", label: "Psychology" },
    { value: "language_learning", label: "Language Learning" },
    { value: "travel", label: "Travel" },
    { value: "hobby", label: "Hobby" },
    { value: "gift_ideas", label: "Gift ideas" },
  ],
  preferred_languages: [
    { value: "id", label: "Bahasa Indonesia" },
    { value: "en", label: "English" },
    { value: "both", label: "Dua-duanya" },
  ],
  reading_depth: [
    { value: "light", label: "Ringan" },
    { value: "balanced", label: "Sedang" },
    { value: "deep", label: "Dalam / reflektif" },
  ],
};

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();

  if (trimmed.length === 0) {
    return "teman baca";
  }

  return trimmed.split(" ")[0] ?? "teman baca";
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function LoadingView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-10">
      <section className="mx-auto max-w-4xl">
        <Card className="border-[#eadfce] shadow-sm">
          <CardHeader>
            <CardTitle>Lightcy sedang membuka kompas bacaanmu...</CardTitle>
            <CardDescription>
              Sebentar ya, kita cek dulu ruang bacaan dan pilihanmu.
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
            <CardTitle>Reading DNA belum bisa dibuka</CardTitle>
            <CardDescription className="text-red-700">
              Sesi kamu mungkin sudah berakhir. Kirim link masuk lagi sebentar ya.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/register">Kirim link masuk</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/me">Kembali ke ruang baca</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

interface HeroProps {
  user: AuthMeUser;
  profile: ReadingDnaProfile | null;
}

function ReadingDnaHero({ user, profile }: HeroProps) {
  const firstName = getFirstName(user.name);
  const readerType = profile?.reader_type_label ?? "kompas baru";

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#fda50f] via-[#f59a23] to-[#0e2a47] text-white shadow-2xl">
      <div className="px-6 py-8 sm:px-8">
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
          Reading DNA
        </p>
        <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_260px] lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              Yuk kenalan sedikit, {firstName}.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80">
              Bukan tes serius kok. Ini cuma beberapa pilihan kecil supaya Lightcy bisa
              mulai memahami bacaan yang cocok dengan mood, minat, dan fase hidupmu.
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-lg backdrop-blur">
            <p className="text-white/70">Tipe pembaca</p>
            <p className="mt-1 font-semibold">{readerType}</p>
            <p className="mt-2 text-xs leading-5 text-white/70">
              Bisa berubah kapan saja saat kamu mengatur ulang pilihanmu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface OptionPillProps {
  option: ReadingDnaOption;
  selected: boolean;
  onClick: () => void;
}

function OptionPill({ option, selected, onClick }: OptionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        selected
          ? "rounded-full border border-[#fda50f] bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 shadow-sm transition hover:bg-amber-100"
          : "rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 shadow-sm transition hover:border-amber-200 hover:bg-amber-50"
      }
    >
      {selected ? "✓ " : ""}
      {option.label}
    </button>
  );
}

interface MultiSelectCardProps {
  title: string;
  description: string;
  helper: string;
  options: ReadingDnaOption[];
  selectedValues: string[];
  maxSelected: number;
  onChange: (values: string[]) => void;
}

function MultiSelectCard({
  title,
  description,
  helper,
  options,
  selectedValues,
  maxSelected,
  onChange,
}: MultiSelectCardProps) {
  function toggle(value: string) {
    const isSelected = selectedValues.includes(value);

    if (isSelected) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    if (selectedValues.length >= maxSelected) {
      return;
    }

    onChange(uniqueValues([...selectedValues, value]));
  }

  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <OptionPill
              key={option.value}
              option={option}
              selected={selectedValues.includes(option.value)}
              onClick={() => toggle(option.value)}
            />
          ))}
        </div>
        <p className="text-xs leading-5 text-zinc-500">
          {helper} Dipilih {selectedValues.length}/{maxSelected}.
        </p>
      </CardContent>
    </Card>
  );
}

interface SingleSelectCardProps {
  title: string;
  description: string;
  options: ReadingDnaOption[];
  selectedValue: string | null;
  onChange: (value: string | null) => void;
}

function SingleSelectCard({
  title,
  description,
  options,
  selectedValue,
  onChange,
}: SingleSelectCardProps) {
  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {options.map((option) => (
          <OptionPill
            key={option.value}
            option={option}
            selected={selectedValue === option.value}
            onClick={() => onChange(selectedValue === option.value ? null : option.value)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

interface PrivacyToggleProps {
  enabled: boolean;
  onChange: (value: boolean) => void;
}

function PrivacyToggle({ enabled, onChange }: PrivacyToggleProps) {
  return (
    <Card className="border-[#eadfce] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-zinc-950">Personalisasi oleh Lightcy</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-600">
            Kalau aktif, Lightcy memakai pilihan ini untuk memberi rekomendasi yang lebih pas.
            Ini bukan tracking diam-diam; ini kompas kecil yang kamu isi sendiri.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          className={
            enabled
              ? "rounded-full bg-[#0e2a47] px-4 py-2 text-sm font-medium text-white shadow-sm"
              : "rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm"
          }
        >
          {enabled ? "Aktif ✨" : "Nonaktif"}
        </button>
      </CardContent>
    </Card>
  );
}

interface ReadingDnaFormProps {
  user: AuthMeUser;
  profile: ReadingDnaProfile | null;
  options: ReadingDnaOptions;
  onSaved: (profile: ReadingDnaProfile) => void;
}

function ReadingDnaForm({ user, profile, options, onSaved }: ReadingDnaFormProps) {
  const router = useRouter();
  const [readingPurposes, setReadingPurposes] = useState<string[]>(
    () => profile?.reading_purposes ?? [],
  );
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>(
    () => profile?.favorite_genres ?? [],
  );
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>(
    () => profile?.preferred_languages ?? [],
  );
  const [readingDepth, setReadingDepth] = useState<string | null>(
    () => profile?.reading_depth ?? null,
  );
  const [personalizationEnabled, setPersonalizationEnabled] = useState(
    () => profile?.personalization_enabled ?? true,
  );
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const selectedCount = useMemo(
    () => readingPurposes.length + favoriteGenres.length + preferredLanguages.length + (readingDepth ? 1 : 0),
    [favoriteGenres.length, preferredLanguages.length, readingDepth, readingPurposes.length],
  );

  async function handleSubmit() {
    setSaveState("saving");
    setMessage(null);

    try {
      const payload = await updateReadingDna({
        reading_purposes: readingPurposes,
        favorite_genres: favoriteGenres,
        preferred_languages: preferredLanguages,
        reading_depth: readingDepth,
        personalization_enabled: personalizationEnabled,
      });

      onSaved(payload.profile);
      setSaveState("success");
      setMessage(payload.message);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Reading DNA belum bisa disimpan.");
    }
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <ReadingDnaHero user={user} profile={profile} />

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
            <Link href="/me">← Kembali ke ruang baca</Link>
          </Button>
          <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
            {selectedCount > 0 ? `${selectedCount} pilihan aktif` : "Belum ada pilihan"}
          </span>
        </div>

        <MultiSelectCard
          title="Kamu biasanya membaca untuk apa?"
          description="Pilih alasan yang paling sering muncul. Tidak harus sempurna; bisa diubah kapan saja."
          helper="Pilih sampai 5 tujuan."
          options={options.reading_purposes}
          selectedValues={readingPurposes}
          maxSelected={5}
          onChange={setReadingPurposes}
        />

        <MultiSelectCard
          title="Genre atau tema yang kamu suka"
          description="Ini jadi sinyal awal supaya rekomendasi tidak asal lempar buku."
          helper="Pilih sampai 8 genre atau tema."
          options={options.favorite_genres}
          selectedValues={favoriteGenres}
          maxSelected={8}
          onChange={setFavoriteGenres}
        />

        <MultiSelectCard
          title="Bahasa bacaan yang nyaman"
          description="Biar Lightcy tahu kapan perlu merekomendasikan buku Indonesia, English, atau dua-duanya."
          helper="Boleh pilih lebih dari satu."
          options={options.preferred_languages}
          selectedValues={preferredLanguages}
          maxSelected={3}
          onChange={setPreferredLanguages}
        />

        <SingleSelectCard
          title="Kedalaman bacaan favoritmu"
          description="Kadang kita butuh bacaan ringan, kadang butuh yang dalam. Pilih gaya yang paling sering kamu cari."
          options={options.reading_depth}
          selectedValue={readingDepth}
          onChange={setReadingDepth}
        />

        <PrivacyToggle
          enabled={personalizationEnabled}
          onChange={setPersonalizationEnabled}
        />

        {message && (
          <div
            className={
              saveState === "error"
                ? "rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700"
                : "rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-700"
            }
          >
            {message}
          </div>
        )}

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-zinc-950">Sudah cukup untuk langkah pertama.</p>
              <p className="mt-1 text-sm leading-6 text-zinc-600">
                Simpan dulu. Nanti Lightcy pelan-pelan pakai kompas ini untuk membuat rekomendasi lebih cocok.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="bg-[#0e2a47] text-white hover:bg-[#163a5f]"
                onClick={handleSubmit}
                disabled={saveState === "saving"}
              >
                {saveState === "saving" ? "Menyimpan..." : "Simpan Reading DNA"}
              </Button>
              {saveState === "success" && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/me")}
                >
                  Lihat ruang baca
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

export default function ReadingDnaPage() {
  const [pageState, setPageState] = useState<PageState>("loading");
  const [user, setUser] = useState<AuthMeUser | null>(null);
  const [profile, setProfile] = useState<ReadingDnaProfile | null>(null);
  const [options, setOptions] = useState<ReadingDnaOptions>(FALLBACK_OPTIONS);

  useEffect(() => {
    let cancelled = false;

    async function loadPage() {
      try {
        const authPayload = await fetchAuthMe();

        if (cancelled) {
          return;
        }

        if (!authPayload?.user) {
          setPageState("error");
          setUser(null);
          return;
        }

        const readingDnaPayload = await fetchReadingDna();

        if (cancelled) {
          return;
        }

        setUser(authPayload.user);
        setProfile(readingDnaPayload.profile);
        setOptions(readingDnaPayload.options ?? FALLBACK_OPTIONS);
        setPageState("ready");
      } catch {
        if (cancelled) {
          return;
        }

        clearSessionTokenFromBrowser();
        setUser(null);
        setPageState("error");
      }
    }

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, []);

  if (pageState === "loading") {
    return <LoadingView />;
  }

  if (pageState === "error" || !user) {
    return <ErrorView />;
  }

  return (
    <ReadingDnaForm
      user={user}
      profile={profile}
      options={options}
      onSaved={setProfile}
    />
  );
}
