// src/lib/env.ts
// Helper untuk baca environment variable di FE/BE secara aman.

const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "";

export function getBackendUrl(): string {
  if (!rawBackendUrl) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL belum diset. Tambahkan di .env.local, misal: NEXT_PUBLIC_BACKEND_URL=http://localhost:8000",
    );
  }

  // Hilangkan "/" di akhir biar konsisten
  return rawBackendUrl.replace(/\/+$/, "");
}
