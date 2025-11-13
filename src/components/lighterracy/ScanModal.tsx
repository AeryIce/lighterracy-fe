"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// ⬇️ type-only imports agar tidak ikut dibundle saat runtime
import type { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function isIsbn13(text: string) {
  const s = text.replace(/\D/g, "");
  if (s.length !== 13) return false;
  const digits = s.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[12];
}

/** ----------------- Typed BarcodeDetector (no any) ------------------ */
interface BarcodeDetection { rawValue?: string; raw?: string }
interface BarcodeDetectorInstance { detect: (source: ImageBitmapSource) => Promise<BarcodeDetection[]> }
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}
/** ------------------------------------------------------------------- */

export default function ScanModal({ open, onOpenChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [manualIsbn, setManualIsbn] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    // animasi garis scan
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes scanlineY { 0% { top: 12% } 100% { top: 78% } }
      .scanline { animation: scanlineY 2.2s ease-in-out infinite alternate; will-change: top; }
    `;
    document.head.appendChild(style);
    return () => { try { document.head.removeChild(style); } catch {} };
  }, []);

  useEffect(() => {
    // ❄️ Freeze ref untuk cleanup (hindari warning "ref value will likely have changed")
    const videoAtMount = videoRef.current as (HTMLVideoElement & { srcObject?: MediaStream | null }) | null;

    let cancelled = false;
    let raf = 0;

    async function start() {
      setError(null);
      setResult(null);
      setUsingFallback(false);

      const v = videoRef.current;
      if (!v) return;

      // Kunci atribut utk iOS/Chrome mobile sebelum play()
      v.muted = true;
      v.autoplay = true;
      v.playsInline = true as boolean;
      v.setAttribute("muted", "");
      v.setAttribute("autoplay", "");
      v.setAttribute("playsinline", "");

      try {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          } as MediaTrackConstraints,
          audio: false,
        });
        v.srcObject = streamRef.current;
        try { await v.play(); } catch {}
      } catch {
        setError("Kamera tidak diizinkan / tidak tersedia.");
        return;
      }

      // ====== BarcodeDetector → fallback ZXing ======
      const g = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
      const BD = g.BarcodeDetector;

      if (BD && typeof BD === "function") {
        try {
          const formats = (await BD.getSupportedFormats?.()) ?? [];
          const want = ["ean_13", "ean_8", "code_128"];
          const supported = formats.length ? want.filter((f) => formats.includes(f)) : want;
          const detector = new BD({ formats: supported });

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          const loop = async () => {
            if (cancelled) return;
            const vv = videoRef.current!;
            if (!vv || vv.readyState < 2) { raf = requestAnimationFrame(loop); return; }

            const w = 480;
            const h = Math.floor((vv.videoHeight / vv.videoWidth) * w);
            canvas.width = w; canvas.height = h;
            ctx?.drawImage(vv, 0, 0, w, h);

            let bmp: ImageBitmap | null = null;
            try {
              bmp = await createImageBitmap(canvas);
              const codes = await detector.detect(bmp);
              if (codes && codes.length) {
                const text = (codes[0].rawValue || codes[0].raw || "").toString();
                const digits = text.replace(/\D/g, "");
                if (isIsbn13(digits)) {
                  setResult(digits);
                  navigator.vibrate?.(50);
                  stopAll();
                  return;
                }
              }
            } catch { /* ignore */ }
            finally { try { bmp?.close(); } catch {} }

            raf = requestAnimationFrame(loop);
          };

          raf = requestAnimationFrame(loop);
          return;
        } catch {
          // lanjut ke fallback
        }
      }

      // Fallback: ZXing (@zxing/browser + @zxing/library)
      setUsingFallback(true);
      try {
        const [{ BrowserMultiFormatReader }, ZX] = await Promise.all([
          import("@zxing/browser"),
          import("@zxing/library"),
        ]);
        const { BarcodeFormat, DecodeHintType } = ZX;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.CODE_128,
        ]);

        zxingReaderRef.current = new BrowserMultiFormatReader(hints);
        const vv = videoRef.current!;
        zxingControlsRef.current = await zxingReaderRef.current.decodeFromVideoDevice(
          undefined,
          vv,
          (res?: Result) => {
            if (!res) return;
            const digits = res.getText().replace(/\D/g, "");
            if (isIsbn13(digits)) {
              setResult(digits);
              navigator.vibrate?.(50);
              stopAll();
            }
          }
        );
      } catch {
        setError("Scanner fallback gagal dimuat.");
      }
    }

    function stopAll() {
      // stop ZXing
      zxingControlsRef.current?.stop();
      zxingControlsRef.current = null;

      // stop stream
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      // hentikan raf dari detector native
      if (raf) cancelAnimationFrame(raf);
      raf = 0;

      // pakai ref yang “dibekukan”
      const v = videoAtMount;
      if (v) {
        try { v.pause(); } catch {}
        v.srcObject = null;
        v.removeAttribute("src");
      }
    }

    if (open) start();
    return () => { cancelled = true; stopAll(); };
  }, [open]);

  const handleManual = () => {
    const s = manualIsbn.replace(/\D/g, "");
    if (isIsbn13(s)) setResult(s);
    else setError("ISBN tidak valid. Pastikan 13 digit (978/979) dengan checksum benar.");
  };

  // UI hasil
  if (open && result) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[55vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>ISBN Terdeteksi</SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            <div className="text-sm">Kode: <b>{result}</b></div>
            <div className="text-xs text-muted-foreground">(Mockup) Kita akan membuka halaman detail ISBN ini.</div>
            <div className="flex gap-2">
              <Link href={`/isbn/${result}`} className="inline-flex items-center px-3 h-9 rounded-md bg-brand text-black">
                Buka detail
              </Link>
              <Button
                variant="outline"
                onClick={() => { setResult(null); setError(null); onOpenChange(false); }}
              >
                Tutup
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Scan ISBN {usingFallback ? "(fallback)" : ""}</SheetTitle>
        </SheetHeader>

        <div className="mt-3 grid gap-3">
          <div className="relative w-full aspect-[3/4] bg-black rounded-xl overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <div className="absolute inset-4 border-2 border-white/50 rounded-xl pointer-events-none" />
            <div className="absolute left-6 right-6 top-6 h-[3px] bg-brand/90 rounded scanline pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/40 px-2 py-1 rounded">
              Arahkan barcode ke dalam kotak
            </div>
          </div>

          {error ? <div className="text-xs text-red-600">{error}</div> : null}

          <div className="text-xs text-muted-foreground">Kamera sulit membaca? Masukkan ISBN manual:</div>
          <div className="flex gap-2">
            <Input
              placeholder="Contoh: 9786020321234"
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              inputMode="numeric"
            />
            <Button onClick={handleManual} className="bg-brand text-black">OK</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
