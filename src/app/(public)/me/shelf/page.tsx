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
import { Textarea } from "@/components/ui/textarea";
import {
  apiFetchWithAuth,
  clearSessionTokenFromBrowser,
} from "@/lib/auth-client";

type LoadState = "loading" | "ready" | "error";

type ShelfStatus =
  | "all"
  | "want_to_read"
  | "considering"
  | "reading"
  | "read"
  | "favorite"
  | "gift";

interface ShelfStatusOption {
  value: Exclude<ShelfStatus, "all">;
  label: string;
}

interface ShelfItem {
  id: number;
  bookId: number | null;
  isbn: string;
  title: string;
  authorText: string;
  coverUrl: string | null;
  shelfStatus: Exclude<ShelfStatus, "all">;
  sourcePage: string | null;
  notes: string;
  savedAt: string | null;
  lastInteractionAt: string | null;
}

interface BookshelfResponse {
  ok: boolean;
  total: number;
  items: unknown[];
  options?: {
    statuses?: unknown[];
  };
}

const FALLBACK_STATUS_OPTIONS: ShelfStatusOption[] = [
  { value: "want_to_read", label: "Ingin Dibaca" },
  { value: "considering", label: "Sedang Dipertimbangkan" },
  { value: "reading", label: "Sedang Dibaca" },
  { value: "read", label: "Sudah Dibaca" },
  { value: "favorite", label: "Favorit" },
  { value: "gift", label: "Untuk Hadiah" },
];

const STATUS_STYLE: Record<Exclude<ShelfStatus, "all">, string> = {
  want_to_read: "border-amber-200 bg-amber-50 text-amber-800",
  considering: "border-blue-200 bg-blue-50 text-blue-800",
  reading: "border-violet-200 bg-violet-50 text-violet-800",
  read: "border-emerald-200 bg-emerald-50 text-emerald-800",
  favorite: "border-rose-200 bg-rose-50 text-rose-800",
  gift: "border-pink-200 bg-pink-50 text-pink-800",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isShelfStatus(value: string): value is Exclude<ShelfStatus, "all"> {
  return FALLBACK_STATUS_OPTIONS.some((option) => option.value === value);
}

function normalizeStatus(value: unknown): Exclude<ShelfStatus, "all"> {
  const raw = readString(value, "want_to_read");
  return isShelfStatus(raw) ? raw : "want_to_read";
}

function normalizeStatusOptions(rawOptions: unknown): ShelfStatusOption[] {
  if (!Array.isArray(rawOptions)) {
    return FALLBACK_STATUS_OPTIONS;
  }

  const parsed = rawOptions
    .filter(isRecord)
    .map((option) => {
      const rawValue = readString(option.value);
      const label = readString(option.label);

      if (!isShelfStatus(rawValue) || !label) {
        return null;
      }

      return { value: rawValue, label } satisfies ShelfStatusOption;
    })
    .filter((option): option is ShelfStatusOption => option !== null);

  return parsed.length > 0 ? parsed : FALLBACK_STATUS_OPTIONS;
}

function normalizeShelfItem(raw: unknown): ShelfItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const isbn = readString(raw.isbn_13);

  if (!isbn) {
    return null;
  }

  return {
    id: readNumber(raw.id) ?? 0,
    bookId: readNumber(raw.book_id),
    isbn,
    title: readString(raw.title, `Buku ISBN ${isbn}`),
    authorText: readString(raw.author_text, "Penulis belum tersedia"),
    coverUrl: readNullableString(raw.cover_url),
    shelfStatus: normalizeStatus(raw.shelf_status),
    sourcePage: readNullableString(raw.source_page),
    notes: readString(raw.notes),
    savedAt: readNullableString(raw.saved_at),
    lastInteractionAt: readNullableString(raw.last_interaction_at),
  };
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "belum tercatat";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "belum tercatat";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusLabel(status: Exclude<ShelfStatus, "all">, options: ShelfStatusOption[]): string {
  return options.find((option) => option.value === status)?.label ?? status;
}

function LoadingView() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Menyiapkan Rak Saya...</CardTitle>
            <CardDescription>
              Lightcy sedang mengambil buku yang pernah kamu simpan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="h-44 animate-pulse rounded-3xl bg-zinc-100" />
              <div className="h-44 animate-pulse rounded-3xl bg-zinc-100" />
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function ErrorView({ message }: { message: string }) {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-5xl">
        <Card className="border-red-200 bg-red-50 shadow-sm">
          <CardHeader>
            <CardTitle>Rak Saya belum bisa dibuka</CardTitle>
            <CardDescription className="text-red-700">{message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
              <Link href="/register">Masuk ulang</Link>
            </Button>
            <Button asChild variant="outline" className="border-red-200 bg-white hover:bg-red-100">
              <Link href="/me">Kembali ke ruang baca</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

interface ShelfStatsProps {
  items: ShelfItem[];
  statusOptions: ShelfStatusOption[];
}

function ShelfStats({ items, statusOptions }: ShelfStatsProps) {
  const stats = statusOptions.map((option) => ({
    ...option,
    count: items.filter((item) => item.shelfStatus === option.value).length,
  }));

  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <button
          key={stat.value}
          type="button"
          className={`rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 ${STATUS_STYLE[stat.value]}`}
        >
          <p className="text-2xl font-semibold">{stat.count}</p>
          <p className="mt-1 text-xs font-medium leading-4">{stat.label}</p>
        </button>
      ))}
    </div>
  );
}

interface FilterBarProps {
  activeStatus: ShelfStatus;
  statusOptions: ShelfStatusOption[];
  onChange: (status: ShelfStatus) => void;
}

function FilterBar({ activeStatus, statusOptions, onChange }: FilterBarProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
      <Button
        type="button"
        size="sm"
        className={
          activeStatus === "all"
            ? "shrink-0 bg-[#0e2a47] text-white hover:bg-[#163a5f]"
            : "shrink-0 border-amber-200 bg-white hover:bg-amber-50"
        }
        variant={activeStatus === "all" ? "default" : "outline"}
        onClick={() => onChange("all")}
      >
        Semua
      </Button>
      {statusOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          className={
            activeStatus === option.value
              ? "shrink-0 bg-[#0e2a47] text-white hover:bg-[#163a5f]"
              : "shrink-0 border-amber-200 bg-white hover:bg-amber-50"
          }
          variant={activeStatus === option.value ? "default" : "outline"}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

interface ShelfItemCardProps {
  item: ShelfItem;
  statusOptions: ShelfStatusOption[];
  editedNote: string;
  isBusy: boolean;
  onNoteChange: (isbn: string, note: string) => void;
  onUpdate: (item: ShelfItem, payload: { shelf_status?: Exclude<ShelfStatus, "all">; notes?: string }) => void;
  onRemove: (item: ShelfItem) => void;
}

function ShelfItemCard({
  item,
  statusOptions,
  editedNote,
  isBusy,
  onNoteChange,
  onUpdate,
  onRemove,
}: ShelfItemCardProps) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[#eadfce] bg-white shadow-sm">
      <div className="grid gap-4 p-4 sm:grid-cols-[120px_1fr]">
        <Link
          href={`/isbn/${item.isbn}`}
          className="block overflow-hidden rounded-2xl bg-[#fffaf2] shadow-inner"
        >
          {item.coverUrl ? (
            <div
              className="aspect-[3/4] bg-cover bg-center"
              style={{ backgroundImage: `url(${item.coverUrl})` }}
              aria-label={`Cover ${item.title}`}
            />
          ) : (
            <div className="flex aspect-[3/4] items-center justify-center px-3 text-center text-xs font-semibold leading-5 text-amber-800">
              Cover belum tersedia
            </div>
          )}
        </Link>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <Link href={`/isbn/${item.isbn}`} className="group">
                <h2 className="line-clamp-2 text-lg font-semibold text-zinc-950 group-hover:text-[#0e2a47]">
                  {item.title}
                </h2>
              </Link>
              <p className="mt-1 line-clamp-1 text-sm text-zinc-500">{item.authorText}</p>
              <p className="mt-2 text-xs text-zinc-500">ISBN {item.isbn}</p>
            </div>
            <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLE[item.shelfStatus]}`}>
              {getStatusLabel(item.shelfStatus, statusOptions)}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {statusOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={item.shelfStatus === option.value ? "default" : "outline"}
                className={
                  item.shelfStatus === option.value
                    ? "bg-[#0e2a47] text-white hover:bg-[#163a5f]"
                    : "border-amber-200 bg-white hover:bg-amber-50"
                }
                disabled={isBusy || item.shelfStatus === option.value}
                onClick={() => onUpdate(item, { shelf_status: option.value })}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-100 bg-zinc-50 p-3">
            <label htmlFor={`note-${item.isbn}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Catatan pribadi
            </label>
            <Textarea
              id={`note-${item.isbn}`}
              value={editedNote}
              placeholder="Contoh: cocok buat hadiah, cek ulang nanti, atau buku ini mau dibaca bareng anak."
              className="min-h-20 bg-white text-sm"
              onChange={(event) => onNoteChange(item.isbn, event.target.value)}
              disabled={isBusy}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-500">
                Terakhir disentuh: {formatDateTime(item.lastInteractionAt ?? item.savedAt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-amber-200 bg-white hover:bg-amber-50"
                  disabled={isBusy || editedNote === item.notes}
                  onClick={() => onUpdate(item, { notes: editedNote })}
                >
                  Simpan catatan
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
                  disabled={isBusy}
                  onClick={() => onRemove(item)}
                >
                  Keluarkan
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyShelfPage() {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [items, setItems] = useState<ShelfItem[]>([]);
  const [statusOptions, setStatusOptions] = useState<ShelfStatusOption[]>(FALLBACK_STATUS_OPTIONS);
  const [activeStatus, setActiveStatus] = useState<ShelfStatus>("all");
  const [editedNotes, setEditedNotes] = useState<Record<string, string>>({});
  const [busyIsbn, setBusyIsbn] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    if (activeStatus === "all") {
      return items;
    }

    return items.filter((item) => item.shelfStatus === activeStatus);
  }, [activeStatus, items]);

  async function loadShelf(): Promise<void> {
    setLoadState("loading");
    setMessage(null);

    const response = await apiFetchWithAuth("/api/me/bookshelf", {
      method: "GET",
    });

    if (response.status === 401) {
      clearSessionTokenFromBrowser();
      router.replace("/register");
      return;
    }

    if (!response.ok) {
      throw new Error("Rak Saya belum bisa dimuat dari backend.");
    }

    const payload = (await response.json()) as BookshelfResponse;
    const nextItems = Array.isArray(payload.items)
      ? payload.items
          .map(normalizeShelfItem)
          .filter((item): item is ShelfItem => item !== null)
      : [];

    setItems(nextItems);
    setStatusOptions(normalizeStatusOptions(payload.options?.statuses));
    setEditedNotes(
      Object.fromEntries(nextItems.map((item) => [item.isbn, item.notes])),
    );
    setLoadState("ready");
  }

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        await loadShelf();
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Rak Saya belum bisa dimuat.");
          setLoadState("error");
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
    // loadShelf intentionally not included because it mutates page state and is only needed on initial mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleNoteChange(isbn: string, note: string) {
    setEditedNotes((current) => ({ ...current, [isbn]: note }));
  }

  async function handleUpdate(
    item: ShelfItem,
    payload: { shelf_status?: Exclude<ShelfStatus, "all">; notes?: string },
  ) {
    setBusyIsbn(item.isbn);
    setMessage(null);

    try {
      const response = await apiFetchWithAuth(`/api/me/bookshelf/${encodeURIComponent(item.isbn)}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        clearSessionTokenFromBrowser();
        router.replace("/register");
        return;
      }

      if (!response.ok) {
        throw new Error("Rak Saya belum bisa diperbarui.");
      }

      const raw = (await response.json()) as { item?: unknown; message?: unknown };
      const updatedItem = normalizeShelfItem(raw.item);

      if (updatedItem) {
        setItems((current) =>
          current.map((currentItem) => (currentItem.isbn === updatedItem.isbn ? updatedItem : currentItem)),
        );
        setEditedNotes((current) => ({ ...current, [updatedItem.isbn]: updatedItem.notes }));
      }

      setMessage(readString(raw.message, "Rak Saya sudah diperbarui."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rak Saya belum bisa diperbarui.");
    } finally {
      setBusyIsbn(null);
    }
  }

  async function handleRemove(item: ShelfItem) {
    const confirmed = window.confirm(`Keluarkan "${item.title}" dari Rak Saya?`);

    if (!confirmed) {
      return;
    }

    setBusyIsbn(item.isbn);
    setMessage(null);

    try {
      const response = await apiFetchWithAuth(`/api/me/bookshelf/${encodeURIComponent(item.isbn)}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        clearSessionTokenFromBrowser();
        router.replace("/register");
        return;
      }

      if (!response.ok) {
        throw new Error("Buku belum bisa dikeluarkan dari Rak Saya.");
      }

      const raw = (await response.json()) as { message?: unknown };
      setItems((current) => current.filter((currentItem) => currentItem.isbn !== item.isbn));
      setEditedNotes((current) => {
        const next = { ...current };
        delete next[item.isbn];
        return next;
      });
      setMessage(readString(raw.message, "Buku sudah dikeluarkan dari Rak Saya."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Buku belum bisa dikeluarkan dari Rak Saya.");
    } finally {
      setBusyIsbn(null);
    }
  }

  if (loadState === "loading") {
    return <LoadingView />;
  }

  if (loadState === "error") {
    return <ErrorView message={message ?? "Rak Saya belum bisa dimuat."} />;
  }

  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-5xl space-y-5">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e2a47] via-[#163a5f] to-[#fda50f] text-white shadow-2xl">
          <div className="px-6 py-8 sm:px-8">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
              Lighterracy personal shelf
            </p>
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Rak Saya
                </h1>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Kelola buku yang kamu simpan: ubah status, tandai sudah dibaca, jadikan favorit,
                  atau tulis catatan kecil yang hanya menjadi ruang pribadimu.
                </p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm shadow-lg backdrop-blur">
                <p className="text-white/70">Total buku tersimpan</p>
                <p className="mt-1 text-3xl font-semibold">{items.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-[#0e2a47] text-white hover:bg-[#163a5f]">
            <Link href="/me">← Ruang baca</Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
            <Link href="/">Cari buku lagi</Link>
          </Button>
          <Button asChild variant="outline" className="border-amber-200 bg-white hover:bg-amber-50">
            <Link href="/me/privacy">Data Saya</Link>
          </Button>
        </div>

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            {message}
          </div>
        ) : null}

        <ShelfStats items={items} statusOptions={statusOptions} />

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kelola buku tersimpan</CardTitle>
            <CardDescription>
              Filter berdasarkan status. Data ini adalah sinyal yang kamu berikan sendiri, jadi personalisasi tetap transparan dan tidak terasa mengintai.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FilterBar activeStatus={activeStatus} statusOptions={statusOptions} onChange={setActiveStatus} />

            {visibleItems.length > 0 ? (
              <div className="space-y-4">
                {visibleItems.map((item) => (
                  <ShelfItemCard
                    key={item.isbn}
                    item={item}
                    statusOptions={statusOptions}
                    editedNote={editedNotes[item.isbn] ?? ""}
                    isBusy={busyIsbn === item.isbn}
                    onNoteChange={handleNoteChange}
                    onUpdate={(nextItem, payload) => {
                      void handleUpdate(nextItem, payload);
                    }}
                    onRemove={(nextItem) => {
                      void handleRemove(nextItem);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-amber-200 bg-amber-50/70 p-6 text-sm leading-6 text-amber-900">
                <p className="font-semibold text-amber-950">
                  {items.length === 0 ? "Rak Saya masih kosong." : "Tidak ada buku di filter ini."}
                </p>
                <p className="mt-1">
                  {items.length === 0
                    ? "Cari atau scan buku dulu, lalu klik Simpan ke Rak Saya dari detail buku."
                    : "Coba pilih filter lain atau ubah status buku dari daftar utama."}
                </p>
                <Button asChild size="sm" className="mt-3 bg-[#0e2a47] text-white hover:bg-[#163a5f]">
                  <Link href="/">Cari buku</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
