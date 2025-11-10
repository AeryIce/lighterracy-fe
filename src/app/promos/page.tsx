"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Promo = {
  id: string; title: string; subtitle: string; banner_url?: string; status: string; description?: string;
};

export default function PromosPage() {
  const [items,setItems]=useState<Promo[]>([]);
  useEffect(()=>{ fetch("/data/promos.json").then(r=>r.json()).then(setItems); },[]);

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold">🔥 Promos</h1>
      <div className="grid gap-4">
        {items.map(p => (
          <Link key={p.id} href={`/promos/${p.id}`} className="rounded-2xl overflow-hidden border shadow-soft">
            <div className="relative w-full h-36">
              {p.banner_url ? <Image src={p.banner_url} alt={p.title} fill className="object-cover" /> : null}
            </div>
            <div className="p-3">
              <div className="font-medium">{p.title}</div>
              <div className="text-xs text-muted-foreground">{p.subtitle}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
