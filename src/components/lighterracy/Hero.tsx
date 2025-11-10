"use client";

import BookSearch from "@/components/lighterracy/BookSearch";
import { COPY } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="mx-auto max-w-screen-md px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold leading-tight">{COPY.tagline}</h1>
      <BookSearch />
    </section>
  );
}
