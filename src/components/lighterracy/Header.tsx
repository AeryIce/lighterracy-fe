import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-screen-md px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold">
          <span className="text-brand">Lighterracy</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/promos"
            className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50"
          >
            <span>🔥</span><span>Promos</span>
          </Link>
          <Link
            href="/stores"
            className="inline-flex items-center gap-1 text-sm border px-3 py-1.5 rounded-full shadow-soft hover:bg-gray-50"
          >
            <span>🏬</span><span>Stores</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
