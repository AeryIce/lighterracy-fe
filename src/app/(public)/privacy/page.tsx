import Link from "next/link";
import Header from "@/components/lighterracy/Header";
import Footer from "@/components/lighterracy/Footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const consentItems = [
  {
    title: "Nama panggilan & email",
    when: "Saat daftar / masuk.",
    purpose:
      "Dipakai untuk membuat akun, mengirim magic link, dan menyapa kamu dengan lebih manusiawi.",
    control: "Kamu bisa keluar dari sesi kapan saja. Email tidak dipakai untuk membuka data personal ke staff toko.",
  },
  {
    title: "Reading DNA / minat bacaan",
    when: "Saat kamu mengisi atau mengubah preferensi.",
    purpose:
      "Dipakai untuk memilih rekomendasi dari data buku internal Lighterracy agar tidak asal random.",
    control: "Bisa diubah dan dimatikan bertahap dari ruang baca kamu.",
  },
  {
    title: "Rak Saya",
    when: "Saat kamu menekan tombol Simpan ke Rak Saya.",
    purpose:
      "Dipakai agar kamu tidak kehilangan buku yang menarik dan agar Lightcy tahu sinyal minat yang kamu pilih sendiri.",
    control: "Nanti item bisa dihapus / diubah statusnya seperti ingin dibaca, favorit, atau sudah dibaca.",
  },
  {
    title: "Jejak Bacaan",
    when: "Saat kamu mencari, scan, membuka detail buku, atau mengubah Rak Saya.",
    purpose:
      "Dipakai untuk membantu personalisasi dan memperlihatkan kembali aktivitas bacaan yang kamu lakukan di Lighterracy.",
    control: "Jejak ini akan ditampilkan ke kamu. Staff dan toko tidak melihat identitas personalmu.",
  },
  {
    title: "Lokasi perangkat",
    when: "Hanya saat kamu menekan fitur toko terdekat / promo dekat saya dan memberi izin browser.",
    purpose:
      "Dipakai untuk mengurutkan toko terdekat atau memahami aktivitas toko secara agregat.",
    control: "Bukan background tracking. Kalau izin lokasi ditolak, fitur dasar tetap berjalan.",
  },
  {
    title: "Klik link pembelian",
    when: "Saat kamu menekan tombol beli ke Periplus, Tokopedia, atau Shopee.",
    purpose:
      "Dipakai untuk memahami channel yang paling membantu pembaca, tanpa membaca aktivitasmu setelah keluar dari Lighterracy.",
    control: "Yang dicatat adalah klik keluar dari Lighterracy, bukan transaksi di marketplace.",
  },
];

const trustPoints = [
  "Fitur dasar tetap bisa dipakai tanpa personalisasi penuh.",
  "Google Books hanya dipakai untuk lookup/enrichment saat data buku belum lengkap, bukan untuk rekomendasi personal utama.",
  "Rekomendasi personal hanya boleh tumbuh dari data internal dan aktivitas yang relevan dengan membaca.",
  "Staff dan management melihat insight agregat, bukan daftar orang per orang.",
];

export default function PublicPrivacyPage() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] pb-16">
      <Header />

      <section className="mx-auto max-w-screen-md space-y-6 px-4 py-8">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#0e2a47] via-[#163a5f] to-[#fda50f] p-6 text-white shadow-2xl sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
            Info & Izin Data
          </p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight sm:text-4xl">
            Lighterracy tidak dibuat untuk memata-matai kamu.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80">
            Kami memakai data yang kamu berikan dan aktivitas membaca yang kamu lakukan di aplikasi
            agar Lightcy bisa membantu menemukan buku yang lebih cocok. Prinsipnya sederhana:
            diberi tahu dulu, diminta izin, manfaatnya jelas, dan tetap bisa dikontrol.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="rounded-full bg-white text-[#0e2a47] hover:bg-amber-50">
              <Link href="/register">Mulai dengan izin yang jelas</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full border-white/30 bg-white/10 text-white hover:bg-white/15">
              <Link href="/">Kembali ke beranda</Link>
            </Button>
          </div>
        </div>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Kalimat jujurnya begini</CardTitle>
            <CardDescription className="leading-6">
              Ini bisa dibaca user sebelum mendaftar, dan bisa juga jadi jawaban saat management bertanya soal rasa “diikuti”.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
              “Kami tidak melacakmu diam-diam. Lighterracy hanya menyimpan aktivitas membaca yang
              kamu izinkan, seperti buku yang kamu scan, buku yang kamu simpan, dan genre yang kamu
              pilih, agar rekomendasi bacaan bisa lebih cocok. Kamu tetap bisa memakai fitur dasar
              meskipun tidak mengaktifkan personalisasi penuh.”
            </div>
          </CardContent>
        </Card>

        <section className="grid gap-4">
          {consentItems.map((item) => (
            <Card key={item.title} className="border-[#eadfce] bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">{item.title}</CardTitle>
                <CardDescription>{item.when}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm leading-6 text-zinc-700 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#fffaf2] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Untuk apa?</p>
                  <p className="mt-2">{item.purpose}</p>
                </div>
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Kontrol user</p>
                  <p className="mt-2">{item.control}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card className="border-[#eadfce] bg-white shadow-sm">
          <CardHeader>
            <CardTitle>Yang staff dan management lihat</CardTitle>
            <CardDescription className="leading-6">
              Untuk toko dan management, data personal tidak dibuka satu per satu. Yang dipakai adalah pola besar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  ✓ {point}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <Footer />
    </main>
  );
}
