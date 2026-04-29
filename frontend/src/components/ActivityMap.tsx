"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { LatLng } from "@/hooks/useActivity";

export default function ActivityMap({ points }: { points: LatLng[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return;

    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const map = L.map(containerRef.current).setView(points[0], 13);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
      }).addTo(map);

      const polyline = L.polyline(points, {
        color: "#f97316",
        weight: 4,
      }).addTo(map);
      map.fitBounds(polyline.getBounds());
    })();

    return () => {
      cancelled = true;
      const map = mapRef.current as { remove?: () => void } | null;
      if (map?.remove) map.remove();
      mapRef.current = null;
    };
  }, [points]);

  return <div ref={containerRef} className="h-96 w-full rounded-lg" />;
}
