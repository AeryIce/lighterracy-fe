"use client";

import Image from "next/image";

type Props = {
  href?: string;
  imageSrc?: string;
  badge?: string;
  headline?: string;
  subhead?: string;
  /** tinggi card, contoh: "h-44 md:h-56" */
  heightClass?: string;
  /** cara fit gambar di tengah: "contain" (default) atau "cover" */
  fit?: "contain" | "cover";
  /** buka link di tab baru; default: true */
  newTab?: boolean;
};

export default function BlogBanner({
  href = "https://blog.periplus.com",
  imageSrc = "/Logo Blog.png",
  badge = "Featured",
  headline = "Kunjungi PERIPLUS BLOG",
  subhead = "Artikel buku & rekomendasi tiap minggu",
  heightClass = "h-44 md:h-56",
  fit = "contain",
  newTab = true,
}: Props) {
  const isExternal = /^https?:\/\//i.test(href || "");

  return (
    <section className="mx-auto max-w-screen-md px-4 my-3">
      <a
        href={href}
        {...(newTab || isExternal
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        className="group block p-[1.5px] rounded-3xl bg-gradient-to-r from-[#FF6A3D] via-[#C04CFD] to-[#4F8CFF] shadow-[0_8px_24px_rgba(0,0,0,.08)]"
      >
        <div
          className={`relative rounded-[calc(theme(borderRadius.3xl)-1.5px)] overflow-hidden bg-white ${heightClass}`}
        >
          {/* badge kanan-atas */}
          {badge ? (
            <div className="absolute right-3 top-3 z-10">
              <span className="text-[10px] leading-5 px-2 rounded-full bg-white/85 backdrop-blur ring-1 ring-white/60 text-amber-700">
                {badge}
              </span>
            </div>
          ) : null}

          {/* callout kiri-atas */}
          <div className="absolute left-3 top-3">
            <div className="rounded-2xl bg-white/85 backdrop-blur px-3 py-2 ring-1 ring-black/5">
              <div className="text-[13px] font-semibold leading-tight">
                {headline}
              </div>
              <div className="text-xs text-neutral-600">{subhead}</div>
            </div>
          </div>

          {/* logo tengah */}
          <div className="absolute inset-0 grid place-items-center">
            <Image
              src={imageSrc}
              alt={headline || "PERIPLUS BLOG"}
              fill
              priority
              sizes="(max-width: 768px) 90vw, 700px"
              className={`opacity-95 transition-transform duration-300 group-hover:scale-[1.03] ${
                fit === "cover" ? "object-cover" : "object-contain"
              }`}
            />
          </div>
        </div>
      </a>
    </section>
  );
}
