"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Promo = {
  id: string;
  title: string;
  subtitle: string;
  banner_url?: string;
  status: string;
  start_at?: string;
  end_at?: string;
};

function leftText(end?: string) {
  if (!end) return "";
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return "Berakhir";
  const m = Math.floor(diff / 60000);
  const d = Math.floor(m / (60 * 24));
  const h = Math.floor((m % (60 * 24)) / 60);
  const mm = m % 60;
  if (d > 0) return `${d}h ${h}j`;
  if (h > 0) return `${h}j ${mm}m`;
  return `${mm}m`;
}
function progress(start?: string, end?: string) {
  if (!start || !end) return 0;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  const n = Date.now();
  if (n <= s) return 0;
  if (n >= e) return 1;
  return (n - s) / (e - s);
}
function badges(start?: string, end?: string) {
  const out: string[] = [];
  if (start) {
    const ageH = (Date.now() - new Date(start).getTime()) / 36e5;
    if (ageH < 48) out.push("Baru");
  }
  if (end) {
    const leftH = (new Date(end).getTime() - Date.now()) / 36e5;
    if (leftH < 48 && leftH > 0) out.push("Segera berakhir");
  }
  return out;
}

export default function PromoGrid() {
  const [items, setItems] = useState<Promo[] | null>(null);
  useEffect(() => {
    fetch("/data/promos.json").then((r) => r.json()).then(setItems).catch(() => setItems([]));
  }, []);

  if (items === null) {
    return (
      <section className="mx-auto max-w-screen-md px-4 space-y-2">
        <h3 className="font-semibold">Promo pilihan</h3>
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border shadow-soft">
              <div className="w-full h-28 skeleton" />
              <div className="p-3">
                <div className="h-4 w-32 rounded skeleton" />
                <div className="mt-2 h-3 w-40 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-screen-md px-4 space-y-2">
      <h3 className="font-semibold">Promo pilihan</h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((p) => {
          const left = leftText(p.end_at);
          const pct = progress(p.start_at, p.end_at);
          const labs = badges(p.start_at, p.end_at);
          return (
            <Link key={p.id} href={`/promos/${p.id}`} className="rounded-2xl overflow-hidden border shadow-soft">
              <div className="relative w-full h-28">
                {p.banner_url ? <Image src={p.banner_url} alt={p.title} fill className="object-cover" /> : null}

                {/* badges kanan-atas */}
                <div className="absolute top-2 right-2 flex gap-2">
                  {labs.map((b) => (
                    <span
                      key={b}
                      className={[
                        "text-[11px] px-2 py-1 rounded-full text-white",
                        b === "Baru" ? "bg-emerald-600" : "bg-amber-600",
                      ].join(" ")}
                    >
                      {b}
                    </span>
                  ))}
                  {left ? <span className="text-[11px] px-2 py-1 rounded-full bg-black/70 text-white">⏳ {left}</span> : null}
                </div>

                {/* progress bar bawah */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20">
                  <div
                    className="h-full bg-brand"
                    style={{ width: `${Math.min(100, Math.max(0, Math.round(pct * 100)))}%` }}
                  />
                </div>
              </div>
              <div className="p-3">
                <div className="font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.subtitle}</div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
