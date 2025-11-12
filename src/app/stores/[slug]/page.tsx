"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

/** JSON types */
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
interface JsonObject { [key: string]: JsonValue }

/** helpers */
const CLOUD_NAME = "dmwstlk3b";
const toRad = (v: number) => (v * Math.PI) / 180;
function haversineKm(a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null) {
  if (!a || !b) return null;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
function parseIsOpen(hours?: string) {
  if (!hours) return null;
  const [os, cs] = hours.split(/–|-/).map((s) => s.trim());
  if (!os || !cs) return null;
  const [oh, om] = os.split(":").map(Number), [ch, cm] = cs.split(":").map(Number);
  const now = new Date(); const open = new Date(now); const close = new Date(now);
  open.setHours(oh, om || 0, 0, 0); close.setHours(ch, cm || 0, 0, 0);
  return now >= open && now <= close;
}
function cloudUrl(id: string, ar = "16:9") {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,w_1600,ar_${ar},c_fill/${id.replace(/\.(jpg|jpeg|png|webp|gif)$/i, "")}`;
}
const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
const todayKey = () => days[new Date().getDay()];
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
  image_url?: string; hours?: string; phone?: string | null;
  category?: string | null; mall?: string | null;
  links?: { maps?: string; wa?: string; tel?: string } | null;
  images?: { url?: string }[];
};

function normalizeRow(anyRow: JsonObject): Store {
  const r = inflateDotKeys(anyRow);

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
    const prov = (photo as JsonObject)["provider"];
    const pid = (photo as JsonObject)["id"];
    if (typeof url === "string") image_url = url;
    else if (prov === "cloudinary" && typeof pid === "string") image_url = cloudUrl(pid);
  }
  const imagesField = r["images"];
  if (!image_url && Array.isArray(imagesField) && imagesField.length) {
    const first = imagesField[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      const furl = (first as JsonObject)["url"];
      const fprov = (first as JsonObject)["provider"];
      const fid = (first as JsonObject)["id"];
      image_url = typeof furl === "string" ? furl : (fprov === "cloudinary" && typeof fid === "string" ? cloudUrl(fid) : undefined);
    }
  }

  return {
    slug: String(r["slug"] ?? ""),
    name: String(r["name"] ?? ""),
    address: String(r["address"] ?? ""),
    city: String((r["region"] as string | null) ?? ""),
    lat, lng,
    image_url,
    hours: hoursToday,
    phone: typeof r["phone"] === "string" ? r["phone"] : null,
    category: typeof r["category"] === "string" ? r["category"] : "store",
    mall: (r["mall"] as string | null) ?? null,
    links: (r["links"] && typeof r["links"] === "object" && !Array.isArray(r["links"])) ? {
      maps: typeof (r["links"] as JsonObject)["maps"] === "string" ? String((r["links"] as JsonObject)["maps"]) : undefined,
      wa: typeof (r["links"] as JsonObject)["wa"] === "string" ? String((r["links"] as JsonObject)["wa"]) : undefined,
      tel: typeof (r["links"] as JsonObject)["tel"] === "string" ? String((r["links"] as JsonObject)["tel"]) : undefined,
    } : null,
    images: Array.isArray(imagesField)
      ? imagesField.map((it) => (it && typeof it === "object" && !Array.isArray(it) ? { url: (it as JsonObject)["url"] as string | undefined } : { url: undefined }))
      : [],
  };
}

export default function StoreDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (p) => setMe({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setMe(null),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let raf: number | null = null;

    raf = requestAnimationFrame(() => { if (!cancelled) setLoaded(false); });

    fetch("/data/stores.json")
      .then((r) => r.json())
      .then((list: JsonObject[]) => {
        if (cancelled) return;
        const found = list.map(normalizeRow).find((s) => s.slug === slug) ?? null;
        setStore(found);
        setLoaded(true);
      })
      .catch(() => { if (!cancelled) setLoaded(true); });

    return () => { cancelled = true; if (raf !== null) cancelAnimationFrame(raf); };
  }, [slug]);

  if (!loaded) return null;
  if (loaded && !store) return notFound();

  const maps = store!.lat != null && store!.lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${store!.lat},${store!.lng}`
    : undefined;
  const isOpen = parseIsOpen(store!.hours);
  const dist = haversineKm(me, store!.lat != null && store!.lng != null ? { lat: store!.lat, lng: store!.lng } : null);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <Link href="/stores" className="text-sm text-brand">← Kembali ke Stores</Link>

      <div className="rounded-2xl overflow-hidden border shadow-soft">
        <div className="relative w-full h-44">
          {store!.image_url ? <Image src={store!.image_url} alt={store!.name} fill className="object-cover" /> : null}
          {isOpen !== null && (
            <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${isOpen ? "bg-emerald-600" : "bg-gray-700"} text-white`}>
              {isOpen ? "Buka sekarang" : "Tutup"}
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h1 className="text-lg font-semibold">{store!.name}</h1>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 border border-amber-200">
              {(store!.category ?? "store").toLowerCase() === "airport" ? "Bandara" : "Toko"}
            </span>
            {store!.mall ? <span className="rounded-full bg-sky-50 text-sky-800 px-2 py-0.5 border border-sky-200">Mall: {store!.mall}</span> : null}
            {dist != null ? <span className="rounded-full bg-gray-50 text-gray-700 px-2 py-0.5 border border-gray-200">~{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}</span> : null}
          </div>

          <div className="text-sm text-muted-foreground">{store!.address}{store!.city ? `, ${store!.city}` : ""}</div>
          {store!.hours ? <div className="text-sm">Jam buka: {store!.hours}</div> : null}
          {store!.phone ? <div className="text-sm">Telp: {store!.phone}</div> : null}

          <div className="flex flex-wrap gap-3 pt-1">
            {maps ? <a href={maps} target="_blank" rel="noopener noreferrer" className="text-brand text-sm">Buka di Maps →</a> : null}
            {store!.links?.wa ? <a href={store!.links.wa} target="_blank" rel="noopener noreferrer" className="text-brand text-sm">WhatsApp</a> : null}
            {store!.links?.tel ? <a href={store!.links.tel} className="text-brand text-sm">Telepon</a> : null}
          </div>

          {store!.images && store!.images.length > 1 && (
            <div className="pt-2 flex gap-2 overflow-x-auto">
              {store!.images.slice(0, 5).map((img, idx) => (
                <div key={idx} className="relative w-40 h-24 rounded-lg overflow-hidden border">
                  {img?.url ? <Image src={img.url} alt={store!.name} fill className="object-cover" /> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
