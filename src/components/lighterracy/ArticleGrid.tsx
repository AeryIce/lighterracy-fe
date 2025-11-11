import Image from "next/image";

export type ArticleItem = {
  title: string;
  src: string;   // path gambar (contoh: /banners/economy.jpg)
  href: string;  // url artikel
  alt?: string;
  /** set false kalau TIDAK mau buka tab baru; default: true */
  newTab?: boolean;
};

type Props = {
  items: ArticleItem[];
};

export default function ArticleGrid({ items }: Props) {
  if (!items?.length) return null;

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Artikel pilihan</h3>
      <div className="grid grid-cols-2 gap-4">
        {items.map((it) => {
          const openNewTab = it.newTab !== false; // default buka tab baru
          return (
            <a
              key={it.href}
              href={it.href}
              {...(openNewTab
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              className="group block rounded-2xl p-[1.5px] bg-gradient-to-r from-[#FF6A3D] via-[#C04CFD] to-[#4F8CFF] shadow-[0_8px_24px_rgba(0,0,0,.08)]"
            >
              <div className="relative aspect-square rounded-[calc(theme(borderRadius.2xl)-1.5px)] overflow-hidden bg-white">
                <Image
                  src={it.src}
                  alt={it.alt ?? it.title}
                  fill
                  sizes="(max-width: 768px) 45vw, 320px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3">
                  <div className="text-white text-sm font-medium line-clamp-2 drop-shadow">
                    {it.title}
                  </div>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
