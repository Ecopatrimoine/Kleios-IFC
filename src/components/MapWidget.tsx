// src/components/MapWidget.tsx — Leaflet + OpenStreetMap
import { useEffect, useRef } from "react";
import type { ContactRecord } from "../types/crm";

interface MapWidgetProps {
  contacts: ContactRecord[];
  onOpenMapView: () => void;
  colorNavy: string;
  colorGold: string;
}

const STATUS_COLORS: Record<string, string> = {
  vip: "#C9A84C", client: "#2E8B6E", prospect: "#5B82A6", inactif: "#9CA3AF",
};

export function MapWidget({ contacts, onOpenMapView, colorNavy, colorGold: _cg }: MapWidgetProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const withCoords = contacts.filter(c => (c.payload as any)?.coords?.lat);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then(L => {
      import("leaflet/dist/leaflet.css");

      const map = L.map(mapContainerRef.current!, {
        center: [46.8, 2.35],
        zoom: 5,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
      }).addTo(map);

      mapRef.current = { map, L };

      // Marqueurs
      const markers: any[] = [];
      withCoords.forEach(contact => {
        const coords = (contact.payload as any)?.coords;
        if (!coords?.lat) return;
        const color = STATUS_COLORS[contact.status] ?? STATUS_COLORS.inactif;
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.3);"></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        markers.push(L.marker([coords.lat, coords.lng], { icon }).addTo(map));
      });

      // Ajuster le zoom
      if (withCoords.length > 0) {
        const group = L.featureGroup(markers);
        if (markers.length > 0) map.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 10 });
      }
    });

    return () => {
      if (mapRef.current?.map) { mapRef.current.map.remove(); mapRef.current = null; }
    };
  }, []); // eslint-disable-line

  return (
    <div style={{ background: "#fff", border: "1px solid rgba(11,48,64,0.09)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(11,48,64,0.07)" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: colorNavy }}>Carte clients</div>
          <div style={{ fontSize: 11, color: "#8FAAB6" }}>{withCoords.length} géolocalisé{withCoords.length > 1 ? "s" : ""} / {contacts.length}</div>
        </div>
        <button onClick={onOpenMapView} style={{ padding: "4px 12px", borderRadius: 6, border: `1px solid rgba(11,48,64,0.15)`, background: "#F8F9FB", fontSize: 11, color: colorNavy, cursor: "pointer", fontFamily: "inherit" }}>
          Vue complète →
        </button>
      </div>

      <div style={{ position: "relative", height: 220 }}>
        <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        <div onClick={onOpenMapView} style={{ position: "absolute", inset: 0, cursor: "pointer", background: "transparent" }} title="Ouvrir la carte complète" />
        {withCoords.length === 0 && (
          <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", fontSize: 11, color: "#9CA3AF", pointerEvents: "none" }}>
            Cliquez sur « Vue complète » pour géolocaliser vos clients
          </div>
        )}
      </div>

      <div style={{ padding: "8px 14px", display: "flex", gap: 12, borderTop: "1px solid rgba(11,48,64,0.07)", background: "#FAFAFA" }}>
        {Object.entries({ vip: "VIP", client: "Client", prospect: "Prospect" }).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_COLORS[key] }} />
            <span style={{ fontSize: 10, color: "#9CA3AF" }}>{label} ({contacts.filter(c => c.status === key && (c.payload as any)?.coords?.lat).length})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
