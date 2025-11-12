"use client";
import { useEffect, useState } from "react";

export type GeoPoint = { lat: number; lng: number };
type GeoState = { loading: boolean; error: string | null; coords: GeoPoint | null };

export default function useUserLocation(options?: PositionOptions): GeoState {
  const hasGeo = typeof window !== "undefined" && "geolocation" in navigator;

  // Init state di luar effect → tidak ada setState sync di body effect
  const [state, setState] = useState<GeoState>({
    loading: hasGeo,
    error: hasGeo ? null : "Geolocation not supported",
    coords: null,
  });

  useEffect(() => {
    if (!hasGeo) return;

    let cancelled = false;

    const onSuccess = (p: GeolocationPosition) => {
      if (cancelled) return;
      setState({
        loading: false,
        error: null,
        coords: { lat: p.coords.latitude, lng: p.coords.longitude },
      });
    };

    const onError = (err: GeolocationPositionError) => {
      if (cancelled) return;
      setState({
        loading: false,
        error: err?.message ?? "Location error",
        coords: null,
      });
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      timeout: 7000,
      ...(options ?? {}),
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGeo]);

  return state;
}
