"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as ZX from "@zxing/library";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";

declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; raw?: string }>>;
    };
  }
}

type Mode = "type" | "scan";

function cleanIsbn(raw: string) {
  return (raw || "").toUpperCase().replace(/[^0-9X]/g, "");
}
function isIsbnCandidate(s: string) {
  const d = s.replace(/\D/g, "");
  return (d.length === 13 && (d.startsWith("978") || d.startsWith("979"))) || d.length === 10;
}
function errMsg(e: unknown) {
  return e instanceof Error ? e.message : typeof e === "string" ? e : "Unknown error";
}
function hasProp<T extends string>(obj: unknown, prop: T): obj is Record<T, unknown> {
  return !!obj && typeof obj === "object" && prop in obj;
}

type ZoomCaps = number | { min?: number; max?: number; step?: number };
type TrackCaps = Partial<{ torch: boolean; zoom: ZoomCaps }>;

export default function BookSearch() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("type");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);

  const [detected, setDetected] = useState<string | null>(null);

  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomAvailable, setZoomAvailable] = useState(false);
  const [zoom, setZoom] = useState<number>(1);
  // <- pakai state untuk dipakai di render (hindari akses ref di JSX)
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number }>({
    min: 1,
    max: 1,
    step: 0.1,
  });
  // ref tetap disimpan jika dibutuhkan non-render usage
  const zoomRangeRef = useRef<{ min: number; max: number; step: number }>({ min: 1, max: 1, step: 0.1 });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const stopZxingRef = useRef<null | (() => void)>(null);

  const submitTyped = () => {
    const code = cleanIsbn(value);
    if (!code) return setError("Masukkan ISBN-10/13 (angka & X).");
    setError(null);
    router.push(`/isbn/${encodeURIComponent(code)}`);
  };

  function getTrack(): MediaStreamTrack | null {
    return streamRef.current?.getVideoTracks?.()[0] ?? null;
  }

  async function applyTorch(on: boolean) {
    const track = getTrack();
    if (!track) return;
    const getCaps = (track as { getCapabilities?: () => MediaTrackCapabilities } | null)?.getCapabilities;
    const caps = typeof getCaps === "function" ? (getCaps.call(track) as unknown as TrackCaps) : undefined;
    if (!caps || !hasProp(caps, "torch")) return;
    const constraints = { advanced: [{ torch: on }] } as unknown as MediaTrackConstraints;
    await track.applyConstraints(constraints);
    setTorchOn(on);
  }

  async function applyZoom(z: number) {
    const track = getTrack();
    if (!track) return;
    const getCaps = (track as { getCapabilities?: () => MediaTrackCapabilities } | null)?.getCapabilities;
    const caps = typeof getCaps === "function" ? (getCaps.call(track) as unknown as TrackCaps) : undefined;
    if (!caps || !hasProp(caps, "zoom")) return;
    const constraints = { advanced: [{ zoom: z }] } as unknown as MediaTrackConstraints;
    await track.applyConstraints(constraints);
    setZoom(z);
  }

  async function startScan() {
    setError(null);
    setDetected(null);

    if (!window.isSecureContext && location.hostname !== "localhost") {
      setError("Kamera butuh HTTPS atau localhost.");
      return;
    }

    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true });
      tmp.getTracks().forEach((t) => t.stop());
    } catch (e) {
      setError(errMsg(e));
      return;
    }

    const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
    setCams(all);
    const best = all.find((d) => /rear|back|environment|usb/i.test(d.label))?.deviceId || all[0]?.deviceId;
    setDeviceId(best);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(best ? { deviceId: { exact: best } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        } as MediaTrackConstraints,
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
      }
    } catch (e) {
      setError(errMsg(e));
      return;
    }
    setScanning(true);

    // cek torch/zoom capability → sinkron ke state (untuk render)
    try {
      const track = getTrack();
      const getCaps = (track as { getCapabilities?: () => MediaTrackCapabilities } | null)?.getCapabilities;
      const caps = typeof getCaps === "function" ? (getCaps.call(track) as unknown as TrackCaps) : undefined;

      setTorchAvailable(!!caps && !!caps.torch);

      if (caps && hasProp(caps, "zoom")) {
        setZoomAvailable(true);
        const z = caps.zoom as ZoomCaps;

        if (typeof z === "number") {
          const zr = { min: 1, max: z || 1, step: 0.1 };
          zoomRangeRef.current = zr;
          setZoomRange(zr);
          setZoom(1);
          await applyZoom(1);
        } else {
          const min = Number(z.min ?? 1);
          const max = Number(z.max ?? 1);
          const step = Number(z.step ?? 0.1);
          const zr = { min, max, step };
          zoomRangeRef.current = zr;
          setZoomRange(zr);
          setZoom(min);
          await applyZoom(min);
        }
      } else {
        setZoomAvailable(false);
      }
    } catch {
      setTorchAvailable(false);
      setZoomAvailable(false);
    }

    // A) BarcodeDetector
    if (window.BarcodeDetector) {
      try {
        const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "code_128"] });
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const loop = async () => {
          const v = videoRef.current!;
          if (!v || v.readyState < 2) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }
          const w = 640;
          const h = Math.floor((v.videoHeight / v.videoWidth) * w);
          canvas.width = w;
          canvas.height = h;
          ctx?.drawImage(v, 0, 0, w, h);
          const bmp = await createImageBitmap(canvas);
          try {
            const codes = await detector.detect(bmp);
            if (codes?.length) {
              const text = (codes[0].rawValue || codes[0].raw || "").toString();
              const digits = text.replace(/\D/g, "");
              if (isIsbnCandidate(digits)) {
                lockResult(digits);
                return;
              }
            }
          } catch {
            // continue
          }
          rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return; // selesai path A
      } catch {
        // fallback ke ZXing
      }
    }

    // B) ZXing fallback
    try {
      const hints = new Map<ZX.DecodeHintType, unknown>();
      hints.set(ZX.DecodeHintType.POSSIBLE_FORMATS, [
        ZX.BarcodeFormat.EAN_13,
        ZX.BarcodeFormat.EAN_8,
        ZX.BarcodeFormat.CODE_128,
      ]);
      const reader = new BrowserMultiFormatReader(hints);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const controls: IScannerControls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current!,
        (res?: ZX.Result) => {
          if (!res) return;
          const digits = res.getText().replace(/\D/g, "");
          if (isIsbnCandidate(digits)) {
            lockResult(digits);
          }
        }
      );
      stopZxingRef.current = () => controls.stop();
    } catch (e) {
      setError(errMsg(e));
      stopScan();
    }
  }

  function lockResult(isbn: string) {
    try {
      navigator.vibrate?.(40);
    } catch {
      /* noop */
    }
    setDetected(isbn);
    stopScan();
  }

  function stopScan() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (stopZxingRef.current) {
      try {
        stopZxingRef.current();
      } catch {
        /* noop */
      }
      stopZxingRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current as (HTMLVideoElement & { srcObject?: MediaStream | null }) | null;
    if (v) {
      v.pause();
      v.srcObject = null;
      v.removeAttribute("src");
    }
    setTorchOn(false);
    setScanning(false);
  }

  useEffect(() => () => stopScan(), []);
  useEffect(() => {
    if (mode === "type" && scanning) stopScan();
  }, [mode, scanning]);

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
      const luminance = new ZX.RGBLuminanceSource(imageData.data, imageData.width, imageData.height);
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      return res.getText?.() as string;
    };

    try {
      const txt = tryDecode();
      if (txt) return txt;
    } catch {
      /* try next */
    }

    const boosted = boostContrast(imageData, 0.35, 10);
    try {
      const luminance = new ZX.RGBLuminanceSource(boosted.data, boosted.width, boosted.height);
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      if (res?.getText()) return res.getText();
    } catch {
      /* try next */
    }

    try {
      const rotated = rotateImageData(boosted, 90);
      const luminance = new ZX.RGBLuminanceSource(rotated.data, rotated.width, rotated.height);
      const binary = new ZX.HybridBinarizer(luminance);
      const bitmap = new ZX.BinaryBitmap(binary);
      const res = reader.decode(bitmap);
      if (res?.getText()) return res.getText();
    } catch {
      /* give up */
    }

    return null;
  }

  function boostContrast(src: ImageData, contrast = 0.3, brightness = 0): ImageData {
    const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
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
    const w = src.width,
      h = src.height;
    const newW = Math.floor(w * cos + h * sin);
    const newH = Math.floor(w * sin + h * cos);
    const cvs = document.createElement("canvas");
    cvs.width = newW;
    cvs.height = newH;
    const ctx = cvs.getContext("2d")!;
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d")!;
    tctx.putImageData(src, 0, 0);
    ctx.translate(newW / 2, newH / 2);
    ctx.rotate(rad);
    ctx.drawImage(tmp, -w / 2, -h / 2);
    return ctx.getImageData(0, 0, newW, newH);
  }
  function clamp(v: number) {
    return Math.max(0, Math.min(255, v | 0));
  }

  async function captureAndDecode() {
    setError(null);
    if (!videoRef.current) return;
    const v = videoRef.current;
    const scale = 1000 / Math.max(v.videoWidth, v.videoHeight);
    const w = Math.max(600, Math.floor(v.videoWidth * (scale || 1)));
    const h = Math.max(400, Math.floor(v.videoHeight * (scale || 1)));
    const cvs = document.createElement("canvas");
    cvs.width = w;
    cvs.height = h;
    const ctx = cvs.getContext("2d")!;
    ctx.drawImage(v, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);

    const text = await decodeImageData(id);
    if (text) {
      const digits = text.replace(/\D/g, "");
      if (isIsbnCandidate(digits)) {
        lockResult(digits);
        return;
      }
    }
    setError("Gagal membaca dari foto. Coba dekatkan / nyalakan flash / ubah sudut.");
  }

  async function decodeFromFile(file: File) {
    setError(null);
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
    const ctx = cvs.getContext("2d")!;
    ctx.drawImage(img, 0, 0, w, h);
    const id = ctx.getImageData(0, 0, w, h);
    URL.revokeObjectURL(url);

    const text = await decodeImageData(id);
    if (text) {
      const digits = text.replace(/\D/g, "");
      if (isIsbnCandidate(digits)) {
        lockResult(digits);
        return;
      }
    }
    setError("Gagal membaca gambar terpilih. Coba gambar lain / cropping barcode.");
  }

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white/80 p-4 shadow">
      <style jsx global>{`
        @keyframes scanlineY {
          0% {
            top: 12%;
          }
          100% {
            top: 78%;
          }
        }
        .scanline {
          animation: scanlineY 2.2s ease-in-out infinite alternate;
          will-change: top;
        }
      `}</style>

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">Cari Buku</h2>
        <div className="flex rounded-full bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode("type")}
            aria-pressed={mode === "type"}
            className={`px-3 py-1 text-sm rounded-full ${mode === "type" ? "bg-white shadow" : "opacity-70"}`}
          >
            Ketik
          </button>
          <button
            type="button"
            onClick={() => setMode("scan")}
            aria-pressed={mode === "scan"}
            className={`px-3 py-1 text-sm rounded-full ${mode === "scan" ? "bg-white shadow" : "opacity-70"}`}
          >
            Scan
          </button>
        </div>
      </div>

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
            <button onClick={submitTyped} className="px-4 py-2 rounded-lg bg-black text-white">
              Cari
            </button>
          </div>
          <div className="mt-3">
            <label className="text-xs opacity-60 mr-2">Atau unggah foto barcode:</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && decodeFromFile(e.target.files[0])}
            />
          </div>
        </>
      )}

      {mode === "scan" && (
        <div className="mt-3">
          {!scanning ? (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm opacity-70">Aktifkan kamera untuk memindai barcode ISBN.</p>
                {cams.length > 1 && (
                  <select
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value)}
                    className="text-xs border rounded px-2 py-1"
                    title="Pilih kamera"
                  >
                    {cams.map((c) => (
                      <option key={c.deviceId} value={c.deviceId}>
                        {c.label || "Camera"}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <button onClick={startScan} className="px-3 py-2 rounded-lg bg-black text-white text-sm">
                Mulai Scan
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "3 / 2" }}>
                <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="w-[70%] max-w-[520px] aspect-[3/1] rounded-xl border-2 border-white/80 relative">
                    <div
                      className="absolute left-2 right-2 h-[3px] rounded scanline"
                      style={{
                        background: "linear-gradient(90deg, transparent, rgba(255,200,0,.9), transparent)",
                        boxShadow: "0 0 12px rgba(255,200,0,.55)",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {torchAvailable && (
                    <button onClick={() => applyTorch(!torchOn)} className="px-3 py-2 rounded-lg bg-gray-200 text-sm">
                      {torchOn ? "Matikan Flash" : "Nyalakan Flash"}
                    </button>
                  )}
                  {zoomAvailable && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs opacity-60">Zoom</span>
                      <input
                        type="range"
                        min={zoomRange.min}
                        max={zoomRange.max}
                        step={zoomRange.step}
                        value={zoom}
                        onChange={(e) => applyZoom(parseFloat(e.target.value))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={captureAndDecode}
                    className="px-3 py-2 rounded-lg bg-amber-400 text-black text-sm"
                  >
                    Ambil Foto
                  </button>
                  <button onClick={stopScan} className="px-3 py-2 rounded-lg bg-gray-200 text-sm">
                    Stop
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="mt-1 text-xs opacity-60">
            Jika kamera tidak tersedia/ditolak, gunakan mode <b>Ketik</b> atau unggah foto barcode.
          </p>
        </div>
      )}

      {detected && (
        <div className="mt-3 rounded-xl border bg-white p-3">
          <div className="text-sm">ISBN terdeteksi:</div>
          <div className="text-lg font-semibold tracking-wider">{detected}</div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => router.push(`/isbn/${detected}`)}
              className="px-3 py-2 rounded-lg bg-black text-white text-sm"
            >
              Buka detail
            </button>
            <button
              onClick={() => {
                setDetected(null);
                setMode("scan");
                startScan();
              }}
              className="px-3 py-2 rounded-lg bg-gray-200 text-sm"
            >
              Scan lagi
            </button>
          </div>
        </div>
      )}

      {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
    </div>
  );
}
