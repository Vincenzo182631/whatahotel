"use client";

import { useEffect, useRef } from "react";

/**
 * City map. Uses Leaflet + free OpenStreetMap tiles (no API key) loaded from a
 * CDN, and drops an Airbnb-style price pin for every hotel with coordinates.
 * Clicking a pin opens a popup linking to the hotel page.
 */

export interface MapHotel {
  id: string;
  name: string;
  priceLabel: string;
  lat: number;
  lng: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L?: any;
  }
}

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

function loadLeaflet(): Promise<typeof window.L> {
  if (window.L) return Promise.resolve(window.L);
  return new Promise((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    let script = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (script) {
      if (window.L) resolve(window.L);
      else script.addEventListener("load", () => resolve(window.L));
      script.addEventListener("error", reject);
      return;
    }
    script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = LEAFLET_JS;
    script.onload = () => resolve(window.L);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

export function CityMap({
  hotels,
  center,
}: {
  hotels: MapHotel[];
  center: [number, number];
}) {
  const elRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then((L) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        const map = L.map(elRef.current, {
          scrollWheelZoom: true,
          zoomControl: true,
        }).setView(center, 12);
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        const pts: [number, number][] = [];
        for (const h of hotels) {
          if (!h.lat || !h.lng) continue;
          const icon = L.divIcon({
            className: "wah-price-pin",
            html: `<span style="display:inline-block;background:#fff;border:1px solid #DDDDDD;border-radius:9999px;padding:3px 9px;font:700 12px/1 -apple-system,system-ui,sans-serif;color:#222;box-shadow:0 1px 5px rgba(0,0,0,.25);white-space:nowrap">${h.priceLabel}</span>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          const marker = L.marker([h.lat, h.lng], { icon }).addTo(map);
          marker.bindPopup(
            `<a href="/hotel/${h.id}" style="font:600 13px/1.3 system-ui;color:#FF385C;text-decoration:none">${h.name}</a>`,
          );
          pts.push([h.lat, h.lng]);
        }
        if (pts.length > 1) map.fitBounds(pts, { padding: [50, 50] });
        else if (pts.length === 1) map.setView(pts[0], 14);

        // Leaflet needs a nudge when its container starts hidden/resized.
        setTimeout(() => map.invalidateSize(), 200);
      })
      .catch(() => {
        /* leaflet CDN unreachable — map simply doesn't render */
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [hotels, center]);

  return <div ref={elRef} className="h-full w-full bg-[#e8e8e8]" />;
}
