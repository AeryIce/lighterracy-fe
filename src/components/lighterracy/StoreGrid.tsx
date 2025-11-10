"use client";
import { useEffect, useState } from "react";

type Store = { slug:string; name:string; address:string; city:string; lat:number; lng:number };

export default function StoreGrid() {
  const [stores, setStores] = useState<Store[]>([]);
  useEffect(()=>{ fetch("/data/stores.json").then(r=>r.json()).then(setStores); },[]);
  if(!stores.length) return null;

  return (
    <section className="mx-auto max-w-screen-md px-4 space-y-2">
      <h3 className="font-semibold">Toko terdekat</h3>
      <div className="grid gap-3">
        {stores.map(s => {
          const maps = `https://www.google.com/maps?q=${s.lat},${s.lng}`;
          return (
            <a key={s.slug} href={maps} target="_blank" className="rounded-2xl border p-3 shadow-soft">
              <div className="font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.address}, {s.city}</div>
              <div className="text-sm text-brand mt-1">Open in Maps →</div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
