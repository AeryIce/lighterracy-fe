"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import ScanModal from "./ScanModal";
import { COPY } from "@/lib/constants";
import { Scan } from "lucide-react";

export default function Hero() {
  const [open, setOpen] = useState(false);

  return (
    <section className="mx-auto max-w-screen-md px-4 py-6 space-y-3">
      <h1 className="text-xl font-bold leading-tight">{COPY.tagline}</h1>

      <div className="flex gap-3">
        <Button
          onClick={() => setOpen(true)}
          className={[
            "relative overflow-hidden group",
            "rounded-2xl px-5 h-11 font-medium",
            "bg-[linear-gradient(135deg,#FDA50F,rgba(253,165,15,0.85))]",
            "text-black ring-1 ring-brand/40",
            "shadow-[0_6px_24px_rgba(253,165,15,.25)]",
            "transition-transform duration-300 hover:scale-[1.02] active:scale-[0.99]"
          ].join(" ")}
        >
          {/* shine purely CSS so no hydration mismatch */}
          <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: "radial-gradient(500px circle at 50% 50%, rgba(255,255,255,.22), transparent 40%)" }} />
          <Scan className="mr-2 h-5 w-5" />
          Scan ISBN
        </Button>
      </div>

      <ScanModal open={open} onOpenChange={setOpen} />
    </section>
  );
}
