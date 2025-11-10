"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

type Store = {
  slug:string; name:string; address:string; city:string; lat:number; lng:number;
  image_url?: string; hours?: string; phone?: string;
};

function parseIsOpen(hours?: string) {
  if (!hours) return null;
  const [openStr, closeStr] = hours.split(/–|-/).map((s) => s.trim());
  if (!openStr || !closeStr) return null;
  const [oh, om] = openStr.split(":").map(Number);
  const [ch, cm] = closeStr.split(":").map(Number);
  const now = new Date();
  const open = new Date(now); open.setHours(oh, om || 0, 0, 0);
  const close = new Date(now); close.setHours(ch, cm || 0, 0, 0);
  return now >= open && now <= close;
}

export default function StoreDetailPage() {
  const params = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    fetch("/data/stores.json")
      .then((r) => r.json())
      .then((list: Store[]) => setStore(list.find((s) => s.slug === params.slug) ?? (null as any)));
  }, [params.slug]);

  if (store === null) return null;
  if (!store) return notFound();

  const maps = `https://www.google.com/maps?q=${store.lat},${store.lng}`;
  const isOpen = parseIsOpen(store.hours);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <Link href="/stores" className="text-sm text-brand">← Kembali ke Stores</Link>

      <div className="rounded-2xl overflow-hidden border shadow-soft">
        <div className="relative w-full h-44">
          {store.image_url ? <Image src={store.image_url} alt={store.name} fill className="object-cover" /> : null}
          {isOpen !== null ? (
            <div className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${isOpen ? "bg-emerald-600" : "bg-gray-700"} text-white`}>
              {isOpen ? "Buka sekarang" : "Tutup"}
            </div>
          ) : null}
        </div>
        <div className="p-4 space-y-2">
          <h1 className="text-lg font-semibold">{store.name}</h1>
          <div className="text-sm text-muted-foreground">{store.address}, {store.city}</div>
          {store.hours ? <div className="text-sm">Jam buka: {store.hours}</div> : null}
          {store.phone ? <div className="text-sm">Telp: {store.phone}</div> : null}
          <a href={maps} target="_blank" className="inline-flex items-center gap-1 text-brand text-sm">
            Buka di Maps →
          </a>
        </div>
      </div>
    </main>
  );
}
