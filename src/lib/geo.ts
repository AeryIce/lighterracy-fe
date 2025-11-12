// src/lib/geo.ts
import type { Store } from "@/types/store";

export type LatLng = { lat: number; lng: number };

const R_KM = 6371; // radius bumi (km)

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return +(R_KM * c).toFixed(2); // bulatkan 2 desimal
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
export function sortStoresByDistance(
  stores: Store[],
  userPos: LatLng | null
) {
  if (!userPos) return stores;
  const withDist = stores.map((s) => {
    const hasCoord = typeof s.lat === "number" && typeof s.lng === "number";
    return {
      ...s,
      distanceKm: hasCoord ? haversineKm(userPos, { lat: s.lat!, lng: s.lng! }) : null,
    };
  });
  return withDist.sort((a, b) => {
    if (a.distanceKm == null && b.distanceKm == null) return 0;
    if (a.distanceKm == null) return 1;
    if (b.distanceKm == null) return -1;
    return a.distanceKm - b.distanceKm;
  });
}