import { useEffect, useRef } from "react";
import maplibregl, {
  Map,
  Marker,
  StyleSpecification,
  LngLatLike,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useAppStore } from "../../stores/useAppStore";



const lightBasemapStyle: StyleSpecification = {
  version: 8,
  sources: {
    cartoLight: {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
  },
  layers: [
    {
      id: "carto-light-layer",
      type: "raster",
      source: "cartoLight",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};

function createMarkerElement() {
  const markerElement = document.createElement("div");

  markerElement.style.width = "18px";
  markerElement.style.height = "18px";
  markerElement.style.borderRadius = "9999px";
  markerElement.style.background =
    "radial-gradient(circle at 30% 30%, #ecfeff 0%, #67e8f9 35%, #06b6d4 100%)";
  markerElement.style.border = "2px solid rgba(255, 255, 255, 0.95)";
  markerElement.style.boxShadow =
    "0 0 0 6px rgba(34, 211, 238, 0.18), 0 12px 28px rgba(8, 145, 178, 0.35)";
  
  // Add drop animation
  markerElement.style.animation = "markerDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)";

  // Add the animation style to the document if not already there
  if (!document.getElementById("marker-drop-animation")) {
    const style = document.createElement("style");
    style.id = "marker-drop-animation";
    style.textContent = `
      @keyframes markerDrop {
        0% {
          transform: translateY(-40px) scale(0.6);
          opacity: 0;
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  return markerElement;
}

function HydraMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const selectedPoint = useAppStore((state) => state.selectedPoint);
  const setSelectedPoint = useAppStore((state) => state.setSelectedPoint);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: lightBasemapStyle,
      // Remove fixed bounds so user can pan outside India after load
      minZoom: 3.2,
      maxZoom: 12,
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      renderWorldCopies: false,
    });

    mapRef.current = map;

    map.on("load", () => {
      map.resize();
      // Fit map to India bounds with padding on load
      map.fitBounds(
        [
          [67.5, 6], // SW
          [97.5, 37.5], // NE
        ],
        {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 0,
        }
      );
    });

    map.on("click", (event) => {
      markerRef.current?.remove();

      markerRef.current = new maplibregl.Marker({
        element: createMarkerElement(),
        anchor: "center",
      })
        .setLngLat(event.lngLat)
        .addTo(map);

      setSelectedPoint({ lat: event.lngLat.lat, lng: event.lngLat.lng });

      map.flyTo({
        center: event.lngLat,
        duration: 900,
        essential: true,
      });
    });

    return () => {
      markerRef.current?.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [setSelectedPoint]);

  // Update marker if selectedPoint changes externally
  useEffect(() => {
    if (!mapRef.current) return;

    if (selectedPoint) {
      const lngLat: LngLatLike = [selectedPoint.lng, selectedPoint.lat];
      markerRef.current?.remove();
      markerRef.current = new maplibregl.Marker({
        element: createMarkerElement(),
        anchor: "center",
      })
        .setLngLat(lngLat)
        .addTo(mapRef.current);
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, [selectedPoint]);

  // return (
  //   <div className="absolute inset-0 z-0 overflow-hidden">
  //     <div ref={mapContainerRef} className="h-full w-full" />
  //   </div>
  // );
  return (
  <div className="absolute inset-0 z-0 overflow-hidden">
    <div
      ref={mapContainerRef}
      className="h-full w-full"
    />
  </div>
);
}

export default HydraMap;
