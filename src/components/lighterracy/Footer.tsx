import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mx-auto max-w-screen-md px-4 py-8 text-xs text-muted-foreground">
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        <span>© {new Date().getFullYear()} Lighterracy</span>
        <span>•</span>
        <Link href="/privacy" className="underline-offset-4 hover:underline">
          Info & Izin Data
        </Link>
        <span>•</span>
        <span>Program keluarga baca</span>
      </div>
    </footer>
  );
}
