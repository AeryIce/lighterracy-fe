"use client";

import { type MouseEvent, useEffect, useMemo, useState } from "react";
import { getBackendUrl } from "@/lib/env";
import { apiFetchWithAuth, getSessionTokenFromBrowser } from "@/lib/auth-client";

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

type UserPurchaseClickResponse = {
  ok?: boolean;
  target_url?: string;
};

type Props = {
  isbn?: string | null;
  sourcePage?: "book_detail" | "scan_result" | "recommendation" | "lightcy_chat";
};

const CHANNEL_ORDER: Record<string, number> = {
  periplus: 10,
  tokopedia: 20,
  shopee: 30,
};

const CHANNEL_META: Record<
  string,
  {
    badge: string;
    brand: string;
    helper: string;
    icon: string;
    cardClassName: string;
    buttonClassName: string;
  }
> = {
  periplus: {
    badge: "Official",
    brand: "PERIPLUS.COM",
    icon: "📚",
    helper: "Langsung ke halaman buku di Periplus.com.",
    cardClassName:
      "border-red-200 bg-gradient-to-br from-red-50 via-white to-rose-50",
    buttonClassName: "bg-red-700 text-white hover:bg-red-800",
  },
  tokopedia: {
    badge: "Marketplace",
    brand: "Tokopedia",
    icon: "🛒",
    helper: "Link produk Tokopedia yang sudah dipetakan dari data internal.",
    cardClassName:
      "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-green-50",
    buttonClassName: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  shopee: {
    badge: "Marketplace",
    brand: "Shopee",
    icon: "🛍️",
    helper: "Link produk Shopee dari data toko resmi yang sudah diimpor.",
    cardClassName:
      "border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50",
    buttonClassName: "bg-orange-600 text-white hover:bg-orange-700",
  },
};

function getOrCreateVisitorToken(): string {
  if (typeof window === "undefined") return "";

  const key = "lighterracy_visitor_token";
  const existing = window.localStorage.getItem(key);

  if (existing && existing.trim().length > 0) {
    return existing;
  }

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
  if (count <= 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 md:grid-cols-2";
  return "grid-cols-1 md:grid-cols-3";
}

export default function PurchaseLinksPanel({
  isbn,
  sourcePage = "book_detail",
}: Props) {
  const [links, setLinks] = useState<PurchaseLink[]>([]);
  const [visitorToken, setVisitorToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openingChannel, setOpeningChannel] = useState<string | null>(null);

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
        if (!cancelled) {
          setLoading(false);
        }
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

  async function handlePurchaseClick(
    event: MouseEvent<HTMLAnchorElement>,
    link: PurchaseLink,
    fallbackHref: string,
  ): Promise<void> {
    const token = getSessionTokenFromBrowser();

    if (!token) {
      return;
    }

    event.preventDefault();

    const popup = window.open("about:blank", "_blank");
    setOpeningChannel(link.channel);

    try {
      const response = await apiFetchWithAuth("/api/me/purchase-clicks", {
        method: "POST",
        body: JSON.stringify({
          isbn: link.isbn_13 || safeIsbn,
          channel: link.channel,
          source_page: safeSourcePage,
          visitor_token: visitorToken || null,
        }),
      });

      const raw = (await response.json().catch(() => null)) as UserPurchaseClickResponse | null;
      const targetUrl = typeof raw?.target_url === "string" ? raw.target_url : fallbackHref;

      if (popup) {
        popup.location.href = targetUrl;
      } else {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      if (popup) {
        popup.location.href = fallbackHref;
      } else {
        window.open(fallbackHref, "_blank", "noopener,noreferrer");
      }
    } finally {
      setOpeningChannel(null);
    }
  }

  if (!safeIsbn) return null;

  const availableCount = sortedLinks.length;

  return (
    <section className="mt-5 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 shadow-sm md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
            Mau lanjut beli?
          </p>
          <h3 className="mt-1 text-lg font-semibold text-neutral-950">
            Pilih pintu belanja yang nyaman buat kamu
          </h3>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-600">
            Link pembelian hanya ditampilkan dari data internal Lighterracy atau
            pola resmi yang sudah kita pegang. Kalau belum ada, Lightcy akan
            bilang apa adanya.
          </p>
        </div>

        <div className="w-fit rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-800 shadow-sm">
          {availableCount > 0
            ? `${availableCount} kanal tersedia`
            : "Belum tersedia"}
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-100 bg-white px-3 py-3 text-sm text-neutral-600 shadow-sm">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-500" />
          Lightcy lagi cek link pembelian...
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {!loading && !error && availableCount === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-amber-200 bg-white/80 px-4 py-4">
          <p className="text-sm font-semibold text-neutral-900">
            Link pembelian untuk ISBN ini belum tersedia.
          </p>
          <p className="mt-1 text-sm leading-6 text-neutral-600">
            Buku ini boleh tetap kamu lihat sebagai informasi, tapi Lighterracy
            belum punya kanal pembelian yang cocok untuk ISBN ini.
          </p>
        </div>
      ) : null}

      {availableCount > 0 ? (
        <div className={`mt-4 grid gap-3 ${getGridClassName(availableCount)}`}>
          {sortedLinks.map((link) => {
            const meta = CHANNEL_META[link.channel] ?? {
              badge: "Link",
              brand: link.channel,
              icon: "🔗",
              helper: "Link pembelian yang tersedia untuk buku ini.",
              cardClassName:
                "border-neutral-200 bg-gradient-to-br from-neutral-50 via-white to-neutral-100",
              buttonClassName: "bg-neutral-900 text-white hover:bg-neutral-800",
            };

            const href = appendTrackingParams(
              link.redirect_url,
              visitorToken,
              safeSourcePage,
            );

            return (
              <article
                key={`${link.channel}-${link.id ?? link.redirect_url}`}
                className={`flex h-full flex-col justify-between rounded-3xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${meta.cardClassName}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex rounded-full border border-white/80 bg-white/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-700 shadow-sm">
                        {meta.badge}
                      </span>

                      <div className="mt-3 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl shadow-sm">
                          {meta.icon}
                        </span>

                        <div>
                          {link.channel === "periplus" ? (
                            <div className="inline-flex rounded-xl bg-red-700 px-3 py-1.5 text-sm font-black tracking-wide text-white shadow-sm">
                              PERIPLUS.COM
                            </div>
                          ) : (
                            <h4 className="text-base font-bold text-neutral-950">
                              {meta.brand}
                            </h4>
                          )}

                          {link.channel === "periplus" ? (
                            <p className="mt-1 text-[11px] font-medium text-red-800">
                              Indonesia&apos;s largest bookstore
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-neutral-900">
                    {channelLabel(link)}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-neutral-600">
                    {meta.helper}
                  </p>
                </div>

                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(event) => {
                    void handlePurchaseClick(event, link, href);
                  }}
                  className={`mt-4 inline-flex items-center justify-center rounded-2xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${meta.buttonClassName}`}
                >
                  {openingChannel === link.channel ? "Membuka..." : "Buka link →"}
                </a>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}