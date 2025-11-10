"use client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Image from "next/image";

type Item = { isbn: string; title: string; author: string; rank: number; cover: string };

export default function BookModal({
  open, onOpenChange, book,
}: { open: boolean; onOpenChange: (v: boolean) => void; book?: Item | null }) {
  if (!book) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>{book.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden shadow-soft col-span-1">
            <Image src={book.cover} alt={book.title} fill className="object-cover" />
          </div>
          <div className="col-span-2 space-y-2">
            <div className="text-sm text-muted-foreground">Penulis: {book.author}</div>
            <div className="text-sm">Peringkat NYT: #{book.rank}</div>
            <p className="text-sm leading-relaxed">
              (Mockup) Sinopsis singkat buku akan tampil di sini. Klik Scan ISBN di atas untuk cek ketersediaan.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
