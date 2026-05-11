import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const userDataRows = [
  ["Profil akun", "Nama panggilan dan email untuk login magic link."],
  ["Reading DNA", "Preferensi yang kamu isi sendiri agar rekomendasi makin relevan."],
  ["Rak Saya", "Buku yang kamu simpan, status bacaan, dan buku favorit."],
  ["Jejak Bacaan", "Aktivitas di Lighterracy seperti scan, cari, buka detail, dan simpan buku."],
  ["Lokasi", "Dipakai hanya saat kamu meminta toko/promo terdekat."],
  ["Klik pembelian", "Channel yang kamu pilih saat keluar menuju link resmi pembelian."],
];

export default function MyPrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] px-4 py-8">
      <section className="mx-auto max-w-4xl space-y-5">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e2a47] via-[#163a5f] to-[#fda50f] p-6 text-white shadow-2xl sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
            Data Saya
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Kamu tetap pegang kendali atas data bacaanmu.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            Di sini Lighterracy menjelaskan data apa yang dipakai, kapan data itu muncul, dan
            untuk apa manfaatnya. Fitur kontrol seperti hapus jejak, reset personalisasi, dan export data
            disiapkan bertahap setelah fondasi event dan Rak Saya stabil.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-white text-[#0e2a47] hover:bg-amber-50">
              <Link href="/me">← Kembali ke ruang baca</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/15">
              <Link href="/privacy">Lihat versi publik</Link>
            </Button>
          </div>
        </div>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Data yang Lighterracy pakai</CardTitle>
            <CardDescription className="leading-6">
              Semua ini dipakai untuk membantu pengalaman membaca, bukan untuk membuka identitas personalmu ke staff toko.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {userDataRows.map(([title, description]) => (
              <div key={title} className="rounded-2xl border border-zinc-100 bg-[#fffaf2] px-4 py-3">
                <p className="font-semibold text-zinc-950">{title}</p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">{description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Izin yang diminta bertahap</CardTitle>
            <CardDescription className="leading-6">
              Lighterracy tidak meminta semua hal sekaligus. Izin muncul sesuai fitur yang kamu pakai.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              <p className="font-semibold text-amber-950">Saat daftar</p>
              <p className="mt-1">Nama, email, dan persetujuan bahwa data bacaan boleh dipakai untuk personalisasi.</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
              <p className="font-semibold text-blue-950">Saat pakai fitur</p>
              <p className="mt-1">Lokasi hanya diminta ketika kamu mencari toko/promo terdekat.</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
              <p className="font-semibold text-emerald-950">Saat personalisasi</p>
              <p className="mt-1">Reading DNA dan Rak Saya berasal dari pilihan yang kamu isi dan simpan sendiri.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-zinc-300 bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kontrol berikutnya</CardTitle>
            <CardDescription className="leading-6">
              Belum semua tombol kontrol diaktifkan hari ini. Ini roadmap agar user makin percaya.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Reset personalisasi</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Hapus Jejak Bacaan</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Export Data Saya</span>
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-zinc-600">Nonaktifkan rekomendasi personal</span>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
