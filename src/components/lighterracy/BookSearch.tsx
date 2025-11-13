"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as ZX from "@zxing/library";
import ScanModal from "@/components/lighterracy/ScanModal";

type Mode = "type" | "scan";

function cleanIsbn(raw: string) {
  return (raw || "").toUpperCase().replace(/[^0-9X]/g, "");
}

function isIsbnCandidate(s: string) {
  const d = s.replace(/\D/g, "");
  return (
    (d.length === 13 && (d.startsWith("978") || d.startsWith("979"))) ||
    d.length === 10
  );
}

export default function BookSearch() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("type");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detected, setDetected] = useState<string | null>(null);

  // kontrol untuk ScanModal
  const [isScanOpen, setIsScanOpen] = useState(false);

  const submitTyped = () => {
    const code = cleanIsbn(value);
    if (!code) {
      setError("Masukkan ISBN-10/13 (angka & X).");
      return;
    }
    setError(null);
    router.push(`/isbn/${encodeURIComponent(code)}`);
  };

  /* ---------- ZXing helper utk gambar (upload) ---------- */

  async function decodeImageData(imageData: ImageData): Promise<string | null> {
    const reader = new ZX.MultiFormatReader();
    const hints = new Map<ZX.DecodeHintType, unknown>();
    hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [
      ZX.BarcodeFormat.EAN_13,
      ZX.BarcodeFormat.EAN_8,
      ZX.BarcodeFormat.CODE_128,
    ]);
    hints.set(ZX.DecodeHintType.TRY_HARDER, true);
    reader.setHints(hints);

    const tryDecode = () => {
      const luminance = new ZX.RGBLuminanceSource(
        imageData.data,
        imageData.width,
        imageData.height,
      );
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      return res.getText?.() as string;
    };

    // 1) langsung coba
    try {
      const txt = tryDecode();
      if (txt) return txt;
    } catch {
      // ignore, lanjut boosting
    }

    // 2) boost contrast + brightness
    const boosted = boostContrast(imageData, 0.35, 10);
    try {
      const luminance = new ZX.RGBLuminanceSource(
        boosted.data,
        boosted.width,
        boosted.height,
      );
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      if (res?.getText()) return res.getText();
    } catch {
      // lanjut rotasi
    }

    // 3) coba rotasi 90 derajat
    try {
      const rotated = rotateImageData(boosted, 90);
      const luminance = new ZX.RGBLuminanceSource(
        rotated.data,
        rotated.width,
        rotated.height,
      );
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      if (res?.getText()) return res.getText();
    } catch {
      // bener-bener gagal
    }

    return null;
  }

  function boostContrast(
    src: ImageData,
    contrast = 0.3,
    brightness = 0,
  ): ImageData {
    const out = new ImageData(
      new Uint8ClampedArray(src.data),
      src.width,
      src.height,
    );
    const c = Math.max(-1, Math.min(1, contrast));
    const f = (259 * (c * 255 + 255)) / (255 * (259 - c * 255));
    const b = brightness;
    for (let i = 0; i < out.data.length; i += 4) {
      out.data[i] = clamp(f * (out.data[i] - 128) + 128 + b);
      out.data[i + 1] = clamp(f * (out.data[i + 1] - 128) + 128 + b);
      out.data[i + 2] = clamp(f * (out.data[i + 2] - 128) + 128 + b);
    }
    return out;
  }

  function rotateImageData(src: ImageData, deg: 90 | 180 | 270): ImageData {
    const rad = (deg * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = src.width;
    const h = src.height;
    const newW = Math.floor(w * cos + h * sin);
    const newH = Math.floor(w * sin + h * cos);

    const cvs = document.createElement("canvas");
    cvs.width = newW;
    cvs.height = newH;
    const ctx = cvs.getContext("2d");
    if (!ctx) return src;

    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d");
    if (!tctx) return src;

    tctx.putImageData(src, 0, 0);
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(tmp, -w / 2, -h / 2);
    return ctx.getImageData(0, 0, newW, newH);
  }

  function clamp(v: number) {
   
    return Math.max(0, Math.min(255, v | 0));
  }

  async function decodeFromFile(file: File) {
    setError(null);
    setDetected(null);

    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("Cannot load image"));
      img.src = url;
    });

    const maxW = 1400;
    const ratio = Math.min(1, maxW / img.width);
    const w = Math.floor(img.width * ratio);
    const h = Math.floor(img.height * ratio);

    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      setError("Gagal membaca gambar.");
      return;
    }

    ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    URL.revokeObjectURL(url);

    const text = await decodeImageData(id);
    if (text) {
      const digits = text.replace(/\D/g, "");
      if (isIsbnCandidate(digits)) {
        setDetected(digits);
        setError(null);
        return;
      }
    }

    setError(
      "Gagal membaca gambar terpilih. Coba gambar lain atau cropping barcode.",
    );
  }

  /* ----------------------------- UI ----------------------------- */

  return (
    <>
      <div className="w-full max-w-xl rounded-2xl bg-white/80 p-4 shadow">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">Cari Buku</h2>
          <div className="flex rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setMode("type")}
              aria-pressed={mode === "type"}
              className={`px-3 py-1 text-sm rounded-full ${
                mode === "type" ? "bg-white shadow" : "opacity-70"
              }`}
            >
              Ketik
            </button>
            <button
              type="button"
              onClick={() => setMode("scan")}
              aria-pressed={mode === "scan"}
              className={`px-3 py-1 text-sm rounded-full ${
                mode === "scan" ? "bg-white shadow" : "opacity-70"
              }`}
            >
              Scan
            </button>
          </div>
        </div>

        {/* MODE KETIK */}
        {mode === "type" && (
          <>
            <div className="mt-3 flex gap-2">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitTyped()}
                placeholder="Ketik ISBN (contoh: 9780140280197)"
                className="flex-1 px-3 py-2 rounded-lg border"
                inputMode="text"
                autoComplete="off"
                aria-label="Input ISBN"
              />
              <button
                type="button"
                onClick={submitTyped}
                className="px-4 py-2 rounded-lg bg-black text-white"
              >
                Cari
              </button>
            </div>

            <div className="mt-3">
              <label className="text-xs opacity-60 mr-2">
                Atau unggah foto barcode:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] && decodeFromFile(e.target.files[0])
                }
              />
            </div>
          </>
        )}

        {/* MODE SCAN → cuma buka ScanModal */}
        {mode === "scan" && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm opacity-70">
                Aktifkan kamera untuk memindai barcode ISBN.
              </p>
              <button
                type="button"
                onClick={() => setIsScanOpen(true)}
                className="px-3 py-2 rounded-lg bg-black text-white text-sm"
              >
                Mulai Scan
              </button>
            </div>
            <p className="mt-1 text-xs opacity-60">
              Jika kamera tidak tersedia/ditolak, gunakan mode <b>Ketik</b> atau
              unggah foto barcode.
            </p>
          </div>
        )}

        {/* HASIL DETEKSI (dari gambar upload) */}
        {detected && (
          <div className="mt-3 rounded-xl border bg-white p-3">
            <div className="text-sm">ISBN terdeteksi:</div>
            <div className="text-lg font-semibold tracking-wider">
              {detected}
            </div>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => router.push(`/isbn/${detected}`)}
                className="px-3 py-2 rounded-lg bg-black text-white text-sm"
              >
                Buka detail
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetected(null);
                  setMode("scan");
                  setIsScanOpen(true);
                }}
                className="px-3 py-2 rounded-lg bg-gray-200 text-sm"
              >
                Scan lagi
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600">
            {error}
          </div>
        )}
      </div>

      {/* Modal kamera baru */}
      <ScanModal open={isScanOpen} onOpenChange={setIsScanOpen} />
    </>
  );
}
