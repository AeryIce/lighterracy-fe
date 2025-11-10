"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function IsbnPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  return (
    <main className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <Link href="/" className="text-sm text-brand">← Kembali</Link>
      <h1 className="text-xl font-bold">Detail ISBN (Mockup)</h1>
      <div className="rounded-2xl border shadow-soft p-4 space-y-2">
        <div>Kode ISBN: <b>{code}</b></div>
        <div className="text-sm text-muted-foreground">
          Nanti di sini kita tampilkan data buku lengkap (judul, cover, penulis, sinopsis) dari Google Books / DB.
        </div>
      </div>
    </main>
  );
}
