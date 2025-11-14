"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** JSON types */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }

/** helpers */
const toRad = (v: number) => (v * Math.PI) / 180;
function haversineKm(a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const todayKey = () => days[new Date().getDay()];
function parseIsOpen(hours?: string) {
  if (!hours) return null;
  const [os, cs] = hours.split(/–|-/).map((s) => s.trim());
  if (!os || !cs) return null;
  const [oh, om] = os.split(":").map(Number), [ch, cm] = cs.split(":").map(Number);
  const now = new Date(), open = new Date(now), close = new Date(now);
  open.setHours(oh, om || 0, 0, 0); close.setHours(ch, cm || 0, 0, 0);
  return now >= open && now <= close;
}
function inflateDotKeys(row: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [k, v] of Object.entries(row)) {
    if (k.includes(".")) {
      const parts = k.split(".");
      let cur: JsonObject = out;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        cur[p] = (typeof cur[p] === "object" && cur[p] !== null ? (cur[p] as JsonObject) : {}) as JsonObject;
        cur = cur[p] as JsonObject;
      }
      cur[parts.at(-1)!] = v as JsonValue;
    } else out[k] = v as JsonValue;
  }
  return out;
}

type Store = {
  slug: string; name: string; address: string; city: string;
  lat: number | null; lng: number | null;
  image_url?: string; hours?: string;
  mall?: string | null; category?: string | null;
  distanceKm?: number | null;
};

const guessCity = (address?: string, region?: string | null) => {
  if (region) return region;
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.at(-1)! : parts[0] || "";
};

function normalizeRow(anyRow: JsonObject): Store {
  const r = inflateDotKeys(anyRow);

  const latRaw = (r["lat"] as JsonPrimitive) ?? null;
  const lngRaw = (r["lng"] as JsonPrimitive) ?? null;
  const lat = typeof latRaw === "string" ? parseFloat(latRaw) : (typeof latRaw === "number" ? latRaw : null);
  const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : (typeof lngRaw === "number" ? lngRaw : null);

  let hoursToday: string | undefined;
  const hoursField = r["hours"];
  if (typeof hoursField === "string") hoursToday = hoursField;
  else if (hoursField && typeof hoursField === "object" && !Array.isArray(hoursField)) {
    const v = (hoursField as JsonObject)[todayKey()];
    hoursToday = Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : undefined) : (typeof v === "string" ? v : undefined);
  }

  let image_url: string | undefined;
  const photo = r["photo"];
  if (photo && typeof photo === "object" && !Array.isArray(photo)) {
    const url = (photo as JsonObject)["url"];
    if (typeof url === "string") image_url = url;
  }
  const imagesField = r["images"];
  if (!image_url && Array.isArray(imagesField) && imagesField.length) {
    const first = imagesField[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const furl = (first as JsonObject)["url"];
      image_url = typeof furl === "string" ? furl : undefined;
    }
  }

  return {
    slug: String(r["slug"] ?? ""),
    name: String(r["name"] ?? ""),
    address: String(r["address"] ?? ""),
    city: guessCity(r["address"] as string | undefined, (r["region"] as string | null) ?? null),
    lat, lng,
    image_url,
    hours: hoursToday,
    mall: (r["mall"] as string | null) ?? null,
    category: typeof r["category"] === "string" ? r["category"] : "store",
  };
}

export default function StoreGrid() {
  const router = useRouter();
  const [raw, setRaw] = useState<Store[]>([]);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch("/data/stores.json")
      .then((r) => r.json())
      .then((list: JsonObject[]) => setRaw(list.map(normalizeRow)))
      .catch(() => setRaw([]));
  }, []);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMe(null),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  const stores = useMemo(() => {
    const withDist = raw.map((s) => ({
      ...s,
      distanceKm: s.lat != null && s.lng != null ? haversineKm(me, { lat: s.lat, lng: s.lng }) : null,
    }));
    return withDist
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return (a.distanceKm! - b.distanceKm!);
      })
      .slice(0, 5);
  }, [raw, me]);

  if (!stores.length) return null;

  return (
    <section className="mx-auto max-w-screen-md px-4 space-y-2">
      <h3 className="font-semibold">Toko terdekat</h3>
      <div className="grid gap-3">
        {stores.map((s) => {
          const maps = s.lat != null && s.lng != null
            ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`
            : undefined;
          const isOpen = parseIsOpen(s.hours);

          return (
            <div
              key={s.slug}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/stores/${s.slug}`)}
              onKeyDown={(e) => { if (e.key === "Enter") router.push(`/stores/${s.slug}`); }}
              className="rounded-2xl border p-3 shadow-soft block cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {/* banner promo di atas card */}
              <div className="w-full h-20 sm:h-24 rounded-xl bg-gradient-to-b from-gray-100 to-gray-200 mb-2 overflow-hidden">
                {s.image_url ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.image_url})` }}
                  />
                ) : null}
              </div>

              <div className="font-medium">{s.name}</div>

              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 border border-amber-200">
                  {(s.category ?? "store").toLowerCase() === "airport" ? "Bandara" : "Toko"}
                </span>
                {s.mall ? (
                  <span className="rounded-full bg-sky-50 text-sky-800 px-2 py-0.5 border border-sky-200">
                    Mall: {s.mall}
                  </span>
                ) : null}
                {s.distanceKm != null ? (
                  <span className="rounded-full bg-gray-50 text-gray-700 px-2 py-0.5 border border-gray-200">
                    ~{s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} m` : `${s.distanceKm.toFixed(1)} km`}
                  </span>
                ) : null}
                {isOpen !== null ? (
                  <span className={`rounded-full px-2 py-0.5 border ${isOpen ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-600 border-gray-200"}`}>
                    {isOpen ? "Buka sekarang" : "Tutup"}
                  </span>
                ) : null}
              </div>

              <div className="text-xs text-muted-foreground">
                {s.address}{s.city ? `, ${s.city}` : ""}
              </div>

              {/* Link Maps terpisah — tidak ikut push ke detail */}
              {maps ? (
                <a
                  href={maps}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-brand mt-1 inline-block"
                >
                  Open in Maps →
                </a>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
