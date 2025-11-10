import Header from "@/components/lighterracy/Header";
import Hero from "@/components/lighterracy/Hero";
import NYTCarousel from "@/components/lighterracy/NYTCarousel";
import PromoTicker from "@/components/lighterracy/PromoTicker";
import PromoGrid from "@/components/lighterracy/PromoGrid";
import StoreGrid from "@/components/lighterracy/StoreGrid";
import ChatDock from "@/components/lighterracy/ChatDock";
import Footer from "@/components/lighterracy/Footer";

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[#f7f7f7] pb-24">
      <Header />
      <Hero />
      <section className="mx-auto max-w-screen-md px-4 space-y-6">
        <NYTCarousel />
        <PromoTicker />
        <PromoGrid />
        <StoreGrid />
      </section>
      <Footer />
      <ChatDock />
    </main>
  );
}
