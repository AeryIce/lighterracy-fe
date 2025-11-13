"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// type-only imports (tidak ikut dibundle)
import type { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import type { Result } from "@zxing/library";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

function isIsbn13(text: string) {
  const s = text.replace(/\D/g, "");
  if (s.length !== 13) return false;
  const digits = s.split("").map(Number);
  const sum = digits
    .slice(0, 12)
    .reduce((acc, d, i) => acc + d * (i % 2 ? 3 : 1), 0);
  const check = (10 - (sum % 10)) % 10;
  return check === digits[12];
}

/** ---- Typed BarcodeDetector (no any) ---- */
interface BarcodeDetection {
  rawValue?: string;
  raw?: string;
}
interface BarcodeDetectorInstance {
  detect: (source: ImageBitmapSource) => Promise<BarcodeDetection[]>;
}
interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}
/** --------------------------------------- */


const scanLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV === "development") {
    console.log("[ScanModal]", ...args);
  }
};
/* eslint-enable no-console */

export default function ScanModal({ open, onOpenChange }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const zxingControlsRef = useRef<IScannerControls | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [manualIsbn, setManualIsbn] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  // simpan requestAnimationFrame untuk BarcodeDetector
  const bdRafRef = useRef<number | null>(null);

  // retry timer kalau videoRef belum mounted saat open
  const waitTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // animasi garis scan
    const style = document.createElement("style");
    style.innerHTML = `
      @keyframes scanlineY { 0% { top: 16% } 100% { top: 84% } }
      .scanline { animation: scanlineY 2.2s ease-in-out infinite alternate; will-change: top; }
    `;
    document.head.appendChild(style);
    return () => {
      try {
        document.head.removeChild(style);
      } catch {
        // ignore
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      cleanupAll();
      return;
    }

    scanLog("Effect open=true, mulai setup scanner");
    setError(null);
    setResult(null);
    setUsingFallback(false);

    // tunggu sampai <video> benar2 ada (portal Sheet kadang mount belakangan)
    const waitForVideo = () => {
      const v = videoRef.current;
      if (!v) {
        waitTimerRef.current = window.setTimeout(waitForVideo, 50);
        return;
      }
      scanLog("videoRef sudah siap, panggil startScanner()");
      startScanner(v).catch((e) => {
        const msg = e instanceof Error ? e.message : "Gagal memulai kamera.";
        scanLog("startScanner() error", msg);
        setError(msg);
      });
    };
    waitForVideo();

    return () => {
      if (waitTimerRef.current) {
        window.clearTimeout(waitTimerRef.current);
      }
      cleanupAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function startScanner(v: HTMLVideoElement) {
    scanLog("startScanner() dipanggil", {
      hasNavigator: typeof navigator !== "undefined",
      hasMediaDevices: typeof navigator !== "undefined" && !!navigator.mediaDevices,
      hasGetUserMedia:
        typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia,
    });

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      scanLog("navigator.mediaDevices.getUserMedia TIDAK tersedia");
      setError(
        "Perangkat tidak mendukung kamera atau koneksi tidak aman (harus HTTPS).",
      );
      return;
    }

    // set atribut sebelum play (iOS/Chrome mobile)
    v.muted = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute("muted", "");
    v.setAttribute("autoplay", "");
    v.setAttribute("playsinline", "");

    // buka kamera
    try {
      // minta kamera belakang kalau ada
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      scanLog("Meminta getUserMedia dengan constraints", constraints);
      streamRef.current = await navigator.mediaDevices.getUserMedia(constraints);
      scanLog("getUserMedia BERHASIL", {
        videoTracks: streamRef.current
          ?.getVideoTracks()
          .map((track) => ({
            label: track.label,
            facingMode: track.getSettings().facingMode,
          })),
      });
    } catch (e) {
      const msg = parseGumError(e);
      scanLog("getUserMedia ERROR", msg);
      throw new Error(msg);
    }

    v.srcObject = streamRef.current;

    // pastikan metadata siap dulu baru play (fix iOS)
    await new Promise<void>((resolve) => {
      if (v.readyState >= 1) {
        resolve();
        return;
      }
      const onMeta = () => {
        v.removeEventListener("loadedmetadata", onMeta);
        resolve();
      };
      v.addEventListener("loadedmetadata", onMeta);
    });

    try {
      await v.play();
      scanLog("video.play() BERHASIL");
    } catch (e) {
      const err = e as DOMException;
      scanLog("video.play() GAGAL", {
        name: err?.name,
        message: err?.message,
      });
    }

    // coba native BarcodeDetector
    const g = globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor };
    const BD = g.BarcodeDetector;

    if (BD && typeof BD === "function") {
      scanLog("BarcodeDetector tersedia, coba pakai native");
      try {
        const formats = (await BD.getSupportedFormats?.()) ?? [];
        const want = ["ean_13", "ean_8", "code_128"];
        const supported = formats.length ? want.filter((f) => formats.includes(f)) : want;
        scanLog("BarcodeDetector supported formats", { formats, used: supported });

        const detector = new BD({ formats: supported });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const loop = async () => {
          const video = videoRef.current;
          if (!video || video.readyState < 2) {
            bdRafRef.current = window.requestAnimationFrame(loop);
            return;
          }

          const w = 480;
          const h = Math.floor((video.videoHeight / video.videoWidth) * w);
          canvas.width = w;
          canvas.height = h;
          ctx?.drawImage(video, 0, 0, w, h);

          try {
            const bmp = await createImageBitmap(canvas);
            const codes = await detector.detect(bmp);
            if (codes && codes.length) {
              const text = (codes[0].rawValue || codes[0].raw || "").toString();
              const digits = text.replace(/\D/g, "");
              scanLog("BarcodeDetector.detect() hasil", {
                raw: text,
                digits,
                count: codes.length,
              });

              if (isIsbn13(digits)) {
                scanLog("ISBN valid terdeteksi (BarcodeDetector)", digits);
                setResult(digits);
                navigator.vibrate?.(50);
                cleanupAll();
                return;
              }
            }
          } catch (error) {
            const err = error as Error;
            // jangan spam log kalau cuma minor
            scanLog("BarcodeDetector.detect() error", {
              name: err.name,
              message: err.message,
            });
          }

          bdRafRef.current = window.requestAnimationFrame(loop);
        };

        bdRafRef.current = window.requestAnimationFrame(loop);
        return;
      } catch (error) {
        const err = error as Error;
        scanLog("BarcodeDetector setup gagal, jatuh ke fallback ZXing", {
          name: err.name,
          message: err.message,
        });
        // jatuh ke fallback
      }
    } else {
      scanLog("BarcodeDetector TIDAK tersedia, langsung pakai ZXing fallback");
    }

    // Fallback: ZXing (tanpa hints biar simple dan aman ke typing)
    setUsingFallback(true);
    scanLog("Menggunakan ZXing fallback");
    try {
      const [{ BrowserMultiFormatReader }, ZX] = await Promise.all([
        import("@zxing/browser"),
        import("@zxing/library"),
      ]);
      const { BarcodeFormat } = ZX;

      zxingReaderRef.current = new BrowserMultiFormatReader();
      zxingControlsRef.current =
        await zxingReaderRef.current.decodeFromVideoDevice(
          undefined,
          v,
          (res?: Result) => {
            if (!res) return;
            const text = res.getText();
            const digits = text.replace(/\D/g, "");
            scanLog("ZXing RESULT", {
              raw: text,
              digits,
              format: res.getBarcodeFormat(),
            });

            // kita tetap filter manual pakai isIsbn13 supaya hanya ISBN
            if (isIsbn13(digits)) {
              scanLog("ISBN valid terdeteksi (ZXing)", digits, {
                format:
                  res.getBarcodeFormat() === BarcodeFormat.EAN_13
                    ? "EAN_13"
                    : "OTHER",
              });
              setResult(digits);
              navigator.vibrate?.(50);
              cleanupAll();
            }
          },
        );
    } catch (error) {
      const err = error as Error;
      scanLog("ZXing fallback gagal dimuat", {
        name: err.name,
        message: err.message,
      });
      throw new Error("Scanner fallback gagal dimuat.");
    }
  }

  function cleanupAll() {
    scanLog("cleanupAll() dipanggil");

    // hentikan loop BarcodeDetector
    if (bdRafRef.current !== null) {
      window.cancelAnimationFrame(bdRafRef.current);
      bdRafRef.current = null;
    }

    // hentikan zxing
    if (zxingControlsRef.current) {
      scanLog("Menghentikan ZXing controls");
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }

    if (zxingReaderRef.current) {
      scanLog("Null-kan ZXing reader");
      zxingReaderRef.current = null;
    }

    // hentikan stream
    if (streamRef.current) {
      scanLog("Menghentikan MediaStream tracks");
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // putuskan video
    const v = videoRef.current as (HTMLVideoElement & {
      srcObject?: MediaStream | null;
    }) | null;
    if (v) {
      try {
        v.pause();
      } catch {
        // ignore
      }
      v.srcObject = null;
      v.removeAttribute("src");
    }
  }

  function parseGumError(e: unknown): string {
    if (typeof window === "undefined") return "Kamera tidak tersedia.";
    const err = e as DOMException;
    switch (err?.name) {
      case "NotAllowedError":
        return "Izin kamera ditolak. Cek settings browser dan izinkan kamera.";
      case "NotFoundError":
        return "Kamera tidak ditemukan di perangkat ini.";
      case "NotReadableError":
        return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi kamera lalu coba lagi.";
      case "OverconstrainedError":
        return "Kamera tidak mendukung resolusi yang diminta.";
      case "SecurityError":
        return "Akses kamera diblokir oleh kebijakan keamanan.";
      default:
        return "Tidak bisa memulai kamera.";
    }
  }

  const handleManual = () => {
    const s = manualIsbn.replace(/\D/g, "");
    if (isIsbn13(s)) {
      setResult(s);
      setError(null);
    } else {
      setError(
        "ISBN tidak valid. Pastikan 13 digit (978/979) dengan checksum benar.",
      );
    }
  };

  const handleSheetOpenChange = (v: boolean) => {
    if (!v) {
      cleanupAll();
    }
    onOpenChange(v);
  };

  /* ======================= UI HASIL ======================= */

  if (open && result) {
    return (
      <Sheet open={open} onOpenChange={handleSheetOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[52vh] max-h-[420px] rounded-t-3xl border-t bg-background px-4 pb-4 pt-3 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold flex items-center gap-1">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                ISBN Terdeteksi
              </p>
              <h2 className="mt-1 text-base font-semibold">Siap buka detail buku</h2>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-[3px] text-[11px] font-medium text-emerald-700">
              Scan selesai
            </span>
          </div>

          <div className="mt-1 rounded-2xl border bg-muted/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Kode ISBN</p>
            <p className="mt-1 text-xl font-mono font-semibold tracking-[0.18em]">
              {result}
            </p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              (Mockup) Lighterracy akan membuka halaman detail untuk ISBN ini.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2 sm:flex-row">
            <Link
              href={`/isbn/${result}`}
              className="inline-flex flex-1 items-center justify-center h-10 rounded-xl bg-brand text-sm font-medium text-black shadow-sm hover:brightness-110 transition"
            >
              Buka detail buku
            </Link>
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-10 rounded-xl text-sm"
              onClick={() => {
                setResult(null);
                setError(null);
                onOpenChange(false);
              }}
            >
              Tutup
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  /* ======================= UI SCAN ======================= */

  return (
    <Sheet open={open} onOpenChange={handleSheetOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[88vh] max-h-[640px] rounded-t-3xl p-0 flex flex-col overflow-hidden bg-background/95 backdrop-blur"
      >
        {/* header */}
        <div className="px-4 pt-3 pb-2 border-b flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-emerald-600 font-semibold flex items-center gap-1">
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Kamera aktif
            </p>
            <h2 className="mt-1 text-base font-semibold">Scan ISBN</h2>
          </div>
          <span
            className={`rounded-full px-3 py-[3px] text-[11px] font-medium ${
              usingFallback
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {usingFallback ? "Mode fallback" : "Mode cepat"}
          </span>
        </div>

        {/* body */}
        <div className="flex-1 px-4 pb-4 pt-3 flex flex-col gap-3">
          {/* kamera */}
          <div className="relative w-full flex-1 rounded-2xl overflow-hidden bg-black shadow-md">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              autoPlay
            />
            {/* overlay vignette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/45" />
            {/* frame kotak */}
            <div className="pointer-events-none absolute inset-[14%] rounded-2xl border border-white/70 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
            {/* scanline */}
            <div className="pointer-events-none absolute left-[16%] right-[16%] top-[18%] h-[3px] rounded-full scanline"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,220,120,0.98), transparent)",
                boxShadow: "0 0 14px rgba(255,220,120,0.7)",
              }}
            />
            {/* label bawah */}
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
              <div className="rounded-full bg-black/60 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
                Arahkan area barcode ke dalam kotak
              </div>
            </div>
          </div>

          {/* error message */}
          {error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[11px] text-red-700">
              {error}
            </div>
          ) : null}

          {/* panel input manual */}
          <div className="mt-auto rounded-2xl border bg-slate-50/80 px-3 py-3 space-y-2">
            <p className="text-[11px] font-medium text-slate-600">
              Kamera sulit membaca? Masukkan ISBN manual:
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="Contoh: 9786020321234"
                value={manualIsbn}
                onChange={(e) => setManualIsbn(e.target.value)}
                inputMode="numeric"
                className="h-9 rounded-xl text-sm"
              />
              <Button
                type="button"
                onClick={handleManual}
                className="h-9 rounded-xl bg-brand text-black text-sm font-medium px-4"
              >
                OK
              </Button>
            </div>
            <p className="text-[10px] text-slate-500">
              Lighterracy hanya akan menggunakan kode ini untuk mencari detail
              buku. Tidak ada data lain yang disimpan.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
