"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Store = {
  slug: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  image_url?: string;
  hours?: string; // format contoh: "10:00–22:00" atau "10:00-22:00"
  phone?: string;
};

type Pos = { lat: number; lng: number } | null;

function haversineKm(a: Pos, b: Pos) {
  if (!a || !b) return null;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(s1), Math.sqrt(1 - s1));
  return R * c;
}

function parseIsOpen(hours?: string) {
  if (!hours) return null;
  // dukung "10:00–22:00" (en-dash) atau "10:00-22:00" (minus)
  const [openStr, closeStr] = hours.split(/–|-/).map((s) => s.trim());
  if (!openStr || !closeStr) return null;
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const now = new Date();
  const open = new Date(now); open.setHours(oh, om || 0, 0, 0);
  const close = new Date(now); close.setHours(ch, cm || 0, 0, 0);
  // asumsi jam tutup di hari yang sama
  return now >= open && now <= close;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[] | null>(null);
  const [me, setMe] = useState<Pos>(null);

  // fetch data
  useEffect(() => {
    fetch("/data/stores.json")
      .then((r) => r.json())
      .then((list: Store[]) => setStores(list))
      .catch(() => setStores([]));
  }, []);

  // geolokasi (opsional)
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMe(null),
      { enableHighAccuracy: true, timeout: 5000 }
    );
  }, []);

  // skeleton saat loading
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
        {stores.map((s) => {
          const isOpen = parseIsOpen(s.hours);
          const dist = haversineKm(me, { lat: s.lat, lng: s.lng });
          const maps = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
          return (
            <Link
              key={s.slug}
              href={`/stores/${s.slug}`}
              className="rounded-2xl overflow-hidden border shadow-soft block"
            >
              <div className="relative w-full h-36">
                {s.image_url ? (
                  <Image src={s.image_url} alt={s.name} fill className="object-cover" />
                ) : null}
                {isOpen !== null ? (
                  <div
                    className={[
                      "absolute top-2 right-2 text-xs px-2 py-1 rounded-full",
                      isOpen ? "bg-emerald-600 text-white" : "bg-gray-700 text-white",
                    ].join(" ")}
                  >
                    {isOpen ? "Buka sekarang" : "Tutup"}
                  </div>
                ) : null}
              </div>
              <div className="p-3">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.address}, {s.city}
                </div>
                <div className="mt-1 text-sm text-brand">
                  <span>Open in Maps →</span>
                  {dist !== null ? (
                    <span className="text-xs text-muted-foreground ml-2">
                      • ~{dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
