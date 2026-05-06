"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, ShoppingBag, Store, Tags } from "lucide-react";
import { getBackendUrl } from "@/lib/env";

type PurchaseChannel = "periplus" | "tokopedia" | "shopee" | string;

type PurchaseLink = {
  id: number | null;
  book_id: number | null;
  isbn_13: string;
  channel: PurchaseChannel;
  label: string;
  priority_order: number;
  redirect_url: string;
};

type PurchaseLinksResponse = {
  ok: boolean;
  isbn: string;
  links: PurchaseLink[];
};

type Props = {
  isbn?: string | null;
  sourcePage?: "book_detail" | "scan_result" | "recommendation" | "lightcy_chat";
};

type ChannelMeta = {
  name: string;
  badge: string;
  helper: string;
  shellClassName: string;
  badgeClassName: string;
  ctaClassName: string;
  brand: "periplus" | "tokopedia" | "shopee" | "generic";
};

const CHANNEL_ORDER: Record<string, number> = {
  periplus: 10,
  tokopedia: 20,
  shopee: 30,
};

const CHANNEL_META: Record<string, ChannelMeta> = {
  periplus: {
    name: "Periplus.com",
    badge: "Official",
    helper: "Langsung ke halaman buku di Periplus.com.",
    shellClassName:
      "border-red-200 bg-gradient-to-br from-red-50 via-white to-orange-50 text-neutral-950",
    badgeClassName: "bg-red-600 text-white",
    ctaClassName: "bg-red-600 text-white hover:bg-red-700",
    brand: "periplus",
  },
  tokopedia: {
    name: "Tokopedia",
    badge: "Marketplace",
    helper: "Link produk yang sudah dipetakan dari data internal.",
    shellClassName:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-lime-50 text-neutral-950",
    badgeClassName: "bg-emerald-600 text-white",
    ctaClassName: "bg-emerald-600 text-white hover:bg-emerald-700",
    brand: "tokopedia",
  },
  shopee: {
    name: "Shopee",
    badge: "Marketplace",
    helper: "Link produk dari data toko resmi yang sudah diimpor.",
    shellClassName:
      "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 text-neutral-950",
    badgeClassName: "bg-orange-600 text-white",
    ctaClassName: "bg-orange-600 text-white hover:bg-orange-700",
    brand: "shopee",
  },
};

function getOrCreateVisitorToken(): string {
  if (typeof window === "undefined") return "";

  const key = "lighterracy_visitor_token";
  const existing = window.localStorage.getItem(key);
  if (existing && existing.trim().length > 0) return existing;

  const generated =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(key, generated);
  return generated;
}

function appendTrackingParams(
  rawUrl: string,
  visitorToken: string,
  sourcePage: string,
): string {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("source_page", sourcePage);

    if (visitorToken) {
      url.searchParams.set("visitor_token", visitorToken);
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

function channelLabel(link: PurchaseLink): string {
  if (link.label?.trim()) return link.label;

  if (link.channel === "periplus") return "Beli di Periplus";
  if (link.channel === "tokopedia") return "Beli di Tokopedia";
  if (link.channel === "shopee") return "Beli di Shopee";

  return `Beli via ${link.channel}`;
}

function getGridClassName(count: number): string {
  if (count <= 1) return "grid gap-3";
  if (count === 2) return "grid gap-3 md:grid-cols-2";
  return "grid gap-3 md:grid-cols-3";
}

function getAvailabilityLabel(count: number): string {
  if (count === 0) return "Belum tersedia";
  if (count === 1) return "1 kanal tersedia";
  return `${count} kanal tersedia`;
}

function BrandMark({ meta }: { meta: ChannelMeta }) {
  if (meta.brand === "periplus") {
    return (
      <div className="inline-flex min-w-[152px] flex-col rounded-md bg-red-600 px-3 py-2 text-white shadow-sm">
        <span className="text-[20px] font-black uppercase leading-none tracking-[0.08em]">
          PERIPLUS.COM
        </span>
        <span className="mt-0.5 text-[11px] font-semibold leading-none text-white/95">
          Indonesia&apos;s largest bookstore
        </span>
      </div>
    );
  }

  if (meta.brand === "tokopedia") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-2 text-sm font-black text-white shadow-sm">
        <Store className="h-4 w-4" aria-hidden="true" />
        <span>Tokopedia</span>
      </div>
    );
  }

  if (meta.brand === "shopee") {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-3 py-2 text-sm font-black text-white shadow-sm">
        <ShoppingBag className="h-4 w-4" aria-hidden="true" />
        <span>Shopee</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-3 py-2 text-sm font-black text-white shadow-sm">
      <Tags className="h-4 w-4" aria-hidden="true" />
      <span>{meta.name}</span>
    </div>
  );
}

function PurchaseLinkCard({
  link,
  visitorToken,
  sourcePage,
}: {
  link: PurchaseLink;
  visitorToken: string;
  sourcePage: string;
}) {
  const meta = CHANNEL_META[link.channel] ?? {
    name: link.channel,
    badge: "Link",
    helper: "Link pembelian yang tersedia untuk buku ini.",
    shellClassName:
      "border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-neutral-100 text-neutral-950",
    badgeClassName: "bg-neutral-900 text-white",
    ctaClassName: "bg-neutral-900 text-white hover:bg-neutral-800",
    brand: "generic" as const,
  };

  const href = appendTrackingParams(link.redirect_url, visitorToken, sourcePage);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex min-h-[190px] flex-col justify-between rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${meta.shellClassName}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <BrandMark meta={meta} />
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${meta.badgeClassName}`}
          >
            {meta.badge}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-base font-black leading-snug">{channelLabel(link)}</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">{meta.helper}</p>
        </div>
      </div>

      <span
        className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-xs font-black transition group-hover:translate-x-0.5 ${meta.ctaClassName}`}
      >
        Buka link <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </a>
  );
}

export default function PurchaseLinksPanel({
  isbn,
  sourcePage = "book_detail",
}: Props) {
  const [links, setLinks] = useState<PurchaseLink[]>([]);
  const [visitorToken, setVisitorToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeIsbn = typeof isbn === "string" ? isbn.trim() : "";
  const safeSourcePage = sourcePage ?? "book_detail";

  useEffect(() => {
    setVisitorToken(getOrCreateVisitorToken());
  }, []);

  useEffect(() => {
    if (!safeIsbn) {
      setLinks([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadLinks() {
      try {
        setLoading(true);
        setError(null);

        const backend = getBackendUrl();
        const res = await fetch(
          `${backend}/api/books/${encodeURIComponent(
            safeIsbn,
          )}/purchase-links?source_page=${encodeURIComponent(safeSourcePage)}`,
          {
            headers: {
              Accept: "application/json",
            },
            cache: "no-store",
          },
        );

        if (!res.ok) {
          if (!cancelled) {
            setLinks([]);
            setError("Link pembelian belum bisa dimuat.");
          }
          return;
        }

        const data = (await res.json()) as PurchaseLinksResponse;

        if (!cancelled) {
          setLinks(Array.isArray(data.links) ? data.links : []);
        }
      } catch {
        if (!cancelled) {
          setLinks([]);
          setError("Jaringan lagi kurang bersahabat. Coba cek lagi sebentar ya.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadLinks();

    return () => {
      cancelled = true;
    };
  }, [safeIsbn, safeSourcePage]);

  const sortedLinks = useMemo(
    () =>
      [...links].sort((a, b) => {
        const byOrder =
          (CHANNEL_ORDER[a.channel] ?? 99) - (CHANNEL_ORDER[b.channel] ?? 99);

        if (byOrder !== 0) return byOrder;

        return a.priority_order - b.priority_order;
      }),
    [links],
  );

  if (!safeIsbn) return null;

  return (
    <section className="mt-4 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-700">
            Mau lanjut beli?
          </p>
          <h3 className="mt-1 text-lg font-black leading-tight text-neutral-950">
            Pilih pintu belanja yang nyaman buat kamu
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Link pembelian diambil dari data internal Lighterracy berdasarkan ISBN
            yang kamu scan atau ketik. Google Books hanya membantu memperkaya info
            buku, bukan menentukan link belinya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-bold text-amber-800 shadow-sm">
            ISBN {safeIsbn}
          </span>
          <span className="rounded-full bg-neutral-950 px-3 py-1 text-xs font-bold text-white shadow-sm">
            {getAvailabilityLabel(sortedLinks.length)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-white px-3 py-3 text-sm text-neutral-600">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
          Lightcy lagi cek link pembelian...
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && sortedLinks.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-amber-300 bg-white/80 px-4 py-4">
          <p className="text-sm font-black text-neutral-950">
            Belum ada link pembelian yang cocok
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Buku ini sudah dikenali, tapi Lighterracy belum punya data link
            pembelian untuk ISBN ini. Kamu tetap bisa copy ISBN atau cari toko
            terdekat dulu ya.
          </p>
        </div>
      ) : null}

      {sortedLinks.length > 0 ? (
        <div className={`mt-4 ${getGridClassName(sortedLinks.length)}`}>
          {sortedLinks.map((link) => (
            <PurchaseLinkCard
              key={`${link.channel}-${link.id ?? link.redirect_url}`}
              link={link}
              visitorToken={visitorToken}
              sourcePage={safeSourcePage}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
