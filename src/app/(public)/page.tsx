import Header from "@/components/lighterracy/Header";
import Hero from "@/components/lighterracy/Hero";
import NYTCarousel from "@/components/lighterracy/NYTCarousel";
import PromoGrid from "@/components/lighterracy/PromoGrid";
import StoreGrid from "@/components/lighterracy/StoreGrid";
import ChatDock from "@/components/lighterracy/ChatDock";
import Footer from "@/components/lighterracy/Footer";
import BlogBanner from "@/components/lighterracy/BlogBanner";
import ArticleGrid from "@/components/lighterracy/ArticleGrid";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] pb-24">
      <Header />
      <Hero />
      <section className="mx-auto max-w-screen-md px-4 space-y-6">
        <NYTCarousel />
             {/* Banner blog — isi di dalam card, hanya border yang berwarna */}
  <BlogBanner
  href="https://blog.periplus.com"
  imageSrc="/banners/periplus-blog.png"   // samakan dengan file di /public
  badge="Featured"
  headline="Kunjungi PERIPLUS BLOG"
  subhead="Artikel buku & rekomendasi tiap minggu"
  heightClass="h-44 md:h-56"              // tinggi card biar gak kebesaran
  fit="contain"
/>

<ArticleGrid
  items={[
    { title: "Rekomendasi Buku Ekonomi", src: "/banners/economy.jpg", href: "https://blog.periplus.com/2025/10/22/rekomendasi-buku-ekonomi-terbaru/" },
    { title: "Memahami China & Xi Jinping", src: "/banners/china.jpg", href: "https://blog.periplus.com/2025/05/22/buku-untuk-memahami-china-dan-xi-jinping-bacaan-tepat-tentang-politik-dan-ekonomi-china/" },
    { title: "Filsafat Manusia Super", src: "/banners/nietzsche.jpg", href: "https://blog.periplus.com/2025/06/26/membaca-buku-nietzsche-dari-lahirnya-tragedi-yunani-sampai-kehendak-berkuasa/" },
    { title: "Revolusi: Indonesia", src: "/banners/revolusi.jpg", href: "https://blog.periplus.com/2024/08/08/revolusi/" },
  ]}
/>
        <PromoGrid />
        <StoreGrid />
      </section>
      <Footer />
      <ChatDock />
    </main>
  );
}
