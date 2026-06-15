"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as MLMap, type Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { DARK_BASEMAP } from "@/lib/map/basemapStyle";
import { useUIStore } from "@/stores/uiStore";

/**
 * Mock climate stations scattered across India. Used to demonstrate
 * map interactivity without any backend connection.
 */
const MOCK_STATIONS: ReadonlyArray<{ lon: number; lat: number; label: string }> = [
  { lon: 77.1025, lat: 28.7041, label: "Delhi" },
  { lon: 72.8777, lat: 19.076, label: "Mumbai" },
  { lon: 77.5946, lat: 12.9716, label: "Bengaluru" },
  { lon: 88.3639, lat: 22.5726, label: "Kolkata" },
  { lon: 80.2707, lat: 13.0827, label: "Chennai" },
  { lon: 78.4867, lat: 17.385, label: "Hyderabad" },
  { lon: 75.8577, lat: 22.7196, label: "Bhopal" },
  { lon: 85.8245, lat: 20.2961, label: "Bhubaneswar" },
  { lon: 76.7794, lat: 30.7333, label: "Chandigarh" },
  { lon: 73.8567, lat: 18.5204, label: "Pune" },
];

/**
 * Full-screen MapLibre canvas.
 *
 * Responsibilities:
 *   - Initialize the map once (lazy ref pattern).
 *   - Render mock station markers and a pulse-ring marker at the
 *     user-selected point.
 *   - Propagate map clicks into the UI store.
 *   - Tear everything down on unmount.
 */
export function MapCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const [ready, setReady] = useState(false);

  const setPoint = useUIStore((s) => s.setPoint);
  const selectedPoint = useUIStore((s) => s.selectedPoint);

  // Initialize the map exactly once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_BASEMAP,
      center: [78.9629, 22.5937],
      zoom: 3.4,
      pitch: 0,
      bearing: 0,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "bottom-right",
    );
    map.addControl(
      new maplibregl.ScaleControl({ unit: "metric" }),
      "bottom-left",
    );

    map.on("load", () => setReady(true));
    map.on("click", (e) => {
      setPoint({ lat: e.lngLat.lat, lon: e.lngLat.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [setPoint]);

  // Mock station markers, rendered after the map style loads.
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const map = mapRef.current;
    const markers: Marker[] = [];

    for (const p of MOCK_STATIONS) {
      const el = document.createElement("div");
      el.className =
        "h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full " +
        "bg-accent ring-2 ring-accent/30 transition cursor-pointer " +
        "hover:scale-150";
      el.title = p.label;
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setPoint({ lat: p.lat, lon: p.lon });
      });
      markers.push(
        new maplibregl.Marker({ element: el })
          .setLngLat([p.lon, p.lat])
          .addTo(map),
      );
    }

    return () => {
      for (const m of markers) m.remove();
    };
  }, [ready, setPoint]);

  // Highlight the user-selected point with a pulse-ring marker.
  // The marker is held in a ref so the same MapLibre marker
  // instance is reused across renders — clicking elsewhere only
  // moves it, never removes it from the screen.
  const selectedMarkerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Dispose of the previous marker instance and DOM node, if any.
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    if (!selectedPoint) return;

    const el = document.createElement("div");
    el.className =
      "pointer-events-none h-4 w-4 -translate-x-1/2 -translate-y-1/2 " +
      "rounded-full border-2 border-amber-500 bg-black " +
      "shadow-[0_0_0_4px_rgba(255,165,0,0.25)] animate-pulse-ring";

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([selectedPoint.lon, selectedPoint.lat])
      .addTo(map);

    selectedMarkerRef.current = marker;
  }, [selectedPoint]);

  // On unmount, dispose the marker so we never leak DOM nodes.
  useEffect(() => {
    return () => {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full bg-ink-950">
      <div ref={containerRef} className="absolute inset-0" />
      {/* Vignette to deepen the dark, premium feel. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(7,10,16,0.55)_100%)]" />
    </div>
  );
}
