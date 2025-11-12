"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/** ---- tipe JSON aman (tanpa any) ---- */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }

/** ---- helpers ---- */
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
/** Inflate key "a.b.c" -> obj.a.b.c */
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
    } else {
      out[k] = v as JsonValue;
    }
  }
  return out;
}

type Store = {
  slug: string; name: string; address: string; city: string;
  lat: number | null; lng: number | null;
  image_url?: string; hours?: string; phone?: string;
  mall?: string | null; category?: string | null;
};
const guessCity = (address?: string, region?: string | null) => {
  if (region) return region;
  if (!address) return "";
  const parts = address.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.at(-1)! : parts[0] || "";
};
function normalizeRow(anyRow: JsonObject): Store {
  const r = inflateDotKeys(anyRow) as JsonObject;

  const latRaw = (r["lat"] as JsonPrimitive) ?? null;
  const lngRaw = (r["lng"] as JsonPrimitive) ?? null;
  const lat = typeof latRaw === "string" ? parseFloat(latRaw) : (typeof latRaw === "number" ? latRaw : null);
  const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : (typeof lngRaw === "number" ? lngRaw : null);

  // hours
  let hoursToday: string | undefined;
  const hoursField = r["hours"];
  if (typeof hoursField === "string") hoursToday = hoursField;
  else if (hoursField && typeof hoursField === "object" && !Array.isArray(hoursField)) {
    const v = (hoursField as JsonObject)[todayKey()];
    hoursToday = Array.isArray(v) ? (typeof v[0] === "string" ? v[0] : undefined) : (typeof v === "string" ? v : undefined);
  }

  // image
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
    phone: typeof r["phone"] === "string" ? r["phone"] : undefined,
    mall: (r["mall"] as string | null) ?? null,
    category: typeof r["category"] === "string" ? r["category"] : "store",
  };
}

export default function StoresPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[] | null>(null);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    fetch("/data/stores.json")
      .then((r) => r.json())
      .then((list: JsonObject[]) => setStores(list.map(normalizeRow)))
      .catch(() => setStores([]));
  }, []);
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMe(null),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  const data = useMemo(() => {
    if (!stores) return [];
    return stores
      .map((s) => ({
        ...s,
        distanceKm: s.lat != null && s.lng != null ? haversineKm(me, { lat: s.lat, lng: s.lng }) : null,
      }))
      .sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
  }, [stores, me]);

  if (stores === null) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
        <h1 className="text-xl font-bold">🏬 Stores</h1>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border shadow-soft">
              <div className="w-full h-36 skeleton" />
              <div className="p-3">
                <div className="h-4 w-40 rounded skeleton" />
                <div className="mt-2 h-3 w-48 rounded skeleton" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">🏬 Stores</h1>
      <div className="grid gap-4">
        {data.map((s) => {
          const isOpen = parseIsOpen(s.hours);
          const hasCoord = typeof s.lat === "number" && typeof s.lng === "number";
          const dist = (s as Store & { distanceKm?: number | null }).distanceKm ?? null;
          const maps = hasCoord ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}` : undefined;

          return (
            <div
              key={s.slug}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/stores/${s.slug}`)}
              onKeyDown={(e) => { if (e.key === "Enter") router.push(`/stores/${s.slug}`); }}
              className="rounded-2xl overflow-hidden border shadow-soft block cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              <div className="relative w-full h-36">
                {s.image_url ? <Image src={s.image_url} alt={s.name} fill className="object-cover" /> : null}
                {isOpen !== null && (
                  <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${isOpen ? "bg-emerald-600" : "bg-gray-700"} text-white`}>
                    {isOpen ? "Buka sekarang" : "Tutup"}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.address}{s.city ? `, ${s.city}` : ""}</div>
                <div className="mt-1 text-sm">
                  {maps ? (
                    <a href={maps} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-brand">
                      Open in Maps →
                    </a>
                  ) : null}
                  {dist !== null && (
                    <span className="text-xs text-muted-foreground ml-2">
                      • ~{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
