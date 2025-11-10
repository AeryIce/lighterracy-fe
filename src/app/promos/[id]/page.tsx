"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";

type Promo = {
  id: string; title: string; subtitle: string; banner_url?: string; terms?: string; description?: string; stores?: string[];
};

export default function PromoDetailPage() {
  const params = useParams<{ id: string }>();
  const [promo, setPromo] = useState<Promo | null>(null);

  useEffect(() => {
    fetch("/data/promos.json")
      .then(r => r.json())
      .then((list: Promo[]) => setPromo(list.find(p => p.id === params.id) ?? null));
  }, [params.id]);

  if (promo === null) return null;
  if (!promo) return notFound();

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <Link href="/promos" className="text-sm text-brand">← Kembali ke Promos</Link>

      <div className="rounded-2xl overflow-hidden border shadow-soft">
        <div className="relative w-full h-44">
          {promo.banner_url ? <Image src={promo.banner_url} alt={promo.title} fill className="object-cover" /> : null}
        </div>
        <div className="p-4 space-y-2">
          <h1 className="text-lg font-semibold">{promo.title}</h1>
          <div className="text-sm text-muted-foreground">{promo.subtitle}</div>
          {promo.description ? <p className="text-sm leading-relaxed">{promo.description}</p> : null}
          {promo.terms ? <div className="text-xs text-muted-foreground">S&K: {promo.terms}</div> : null}
        </div>
      </div>
    </main>
  );
}
