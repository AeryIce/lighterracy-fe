"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Book = {
  title: string;
  subtitle?: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  description: string;
  cover: string | null;
  pageCount: number | null;
  dimensions: { height?: string; width?: string; thickness?: string } | null;
  categories: string[];
  averageRating: number | null;
  ratingsCount: number | null;
} | null;

export default function BookDetailModal({ open = true, book }: { open?: boolean; book: Book }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(open);

  useEffect(() => setIsOpen(open), [open]);

  const onClose = () => {
    setIsOpen(false);
    if (typeof window !== "undefined") {
      if (window.history.length > 1) router.back();
      else router.push("/");
    }
  };

  if (!book) {
    return (
      <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Buku tidak ditemukan</DialogTitle>
            <DialogDescription>Coba ISBN lain atau scan ulang.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-black text-white text-sm"
            >
              Tutup
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const dims = book.dimensions
    ? [book.dimensions.height, book.dimensions.width, book.dimensions.thickness].filter(Boolean).join(" × ")
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-[900px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{book.title}</DialogTitle>
          {book.subtitle ? <DialogDescription className="text-sm">{book.subtitle}</DialogDescription> : null}
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-4">
          {/* Cover 2:3, tidak memanjang */}
          <div className="w-[180px]">
            <div className="w-full rounded-xl overflow-hidden shadow" style={{ aspectRatio: "2 / 3" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={book.cover || "/og/og-from-upload.png"}
                alt={book.title || "Book cover"}
                className="w-full h-full object-cover"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>

          <div>
            <div className="text-sm opacity-80">{book.authors.join(", ")}</div>
            <div className="text-xs opacity-60 mt-1">
              {[book.publisher, book.publishedDate].filter(Boolean).join(" · ")}
            </div>

            <div className="mt-2 space-y-1 text-xs opacity-80">
              {typeof book.averageRating === "number" && (
                <div>Rating: {book.averageRating} {!!book.ratingsCount && `( ${book.ratingsCount} )`}</div>
              )}
              {book.pageCount && <div>Halaman: {book.pageCount}</div>}
              {dims && <div>Dimensi: {dims}</div>}
              {book.categories.length > 0 && <div>Kategori: {book.categories.join(" · ")}</div>}
            </div>

            {book.description && <p className="mt-3 text-sm leading-relaxed">{book.description}</p>}

            <div className="mt-4">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-gray-200 text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
