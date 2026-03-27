// src/components/MapView.tsx — Leaflet + OpenStreetMap
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ContactRecord } from "../types/crm";
import { buildAddress } from "../lib/geocode";

interface MapViewProps {
  contacts: ContactRecord[];
  onSaveContact: (record: ContactRecord) => void;
  onOpenContact: (record: ContactRecord) => void;
  onOpenMarketing?: (contactIds: string[]) => void;
  colorNavy: string;
  colorGold: string;
}

const STATUS_COLORS: Record<string, string> = {
  vip: "#C9A84C", client: "#2E8B6E", prospect: "#5B82A6", inactif: "#9CA3AF",
};
const STATUS_LABELS: Record<string, string> = {
  vip: "VIP", client: "Client", prospect: "Prospect", inactif: "Inactif",
};

function formatEncours(contacts: ContactRecord[], id: string): string {
  const c = contacts.find(x => x.id === id);
  if (!c) return "";
  const total = (c.payload?.contracts ?? []).filter(ct => ct.status === "actif")
    .reduce((s, ct) => s + (parseFloat((ct.currentValue ?? "0").replace(/[^0-9.]/g, "")) || 0), 0);
  if (!total) return "";
  return total >= 1_000_000 ? `${(total/1_000_000).toFixed(1)}M€` : total >= 1_000 ? `${(total/1_000).toFixed(0)}k€` : `${total}€`;
}

export function MapView({ contacts, onSaveContact, onOpenContact, onOpenMarketing, colorNavy, colorGold: _cg1 }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodedCount, setGeocodedCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [circle, setCircle] = useState<{ lat: number; lng: number; radiusKm: number } | null>(null);
  const circleRef = useRef<any>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; lat: number; lng: number } | null>(null);
  const leafletRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);

  const withCoords = contacts.filter(c => (c.payload as any)?.coords?.lat);
  const withAddress = contacts.filter(c => {
    if ((c.payload as any)?.coords?.lat) return false;
    const p1 = c.payload?.contact?.person1;
    return buildAddress({ address: p1?.address, postalCode: p1?.postalCode, city: p1?.city }).length > 0;
  });

  const selectedContacts = useMemo(() => {
    if (!circle) return [];
    return withCoords.filter(c => {
      const coords = (c.payload as any)?.coords;
      if (!coords) return false;
      const R = 6371;
      const dLat = (coords.lat - circle.lat) * Math.PI / 180;
      const dLng = (coords.lng - circle.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 + Math.cos(circle.lat*Math.PI/180) * Math.cos(coords.lat*Math.PI/180) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= circle.radiusKm;
    });
  }, [circle, withCoords]);

  // Init carte
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    import("leaflet").then(L => {
      import("leaflet/dist/leaflet.css");
      leafletRef.current = L;
      setLeafletReady(true);

      const map = L.map(mapContainerRef.current!, { center: [46.8, 2.35], zoom: 5, zoomControl: true, attributionControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, attribution: "© OpenStreetMap",
      }).addTo(map);

      mapRef.current = map;
    });

    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, []);

  // Marqueurs — déclenché quand Leaflet est prêt
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !leafletReady) return;

    const timer = setTimeout(() => {
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const selectedIds = new Set(selectedContacts.map(c => c.id));
      const filtered = filterStatus === "all" ? withCoords : withCoords.filter(c => c.status === filterStatus);

      filtered.forEach(contact => {
        const coords = (contact.payload as any)?.coords;
        if (!coords?.lat) return;
        const color = STATUS_COLORS[contact.status] ?? STATUS_COLORS.inactif;
        const isSelected = selectedIds.has(contact.id);
        const size = isSelected ? 24 : 18;
        const precision = (contact.payload as any)?.coords?.precision;
        const border = isSelected ? `3px solid #fff` : precision === "city" ? `2px dashed rgba(255,255,255,0.8)` : `2px solid #fff`;
        const opacity = precision === "city" ? "0.7" : "1";
        const icon = L.divIcon({
          className: "",
          html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:${border};box-shadow:${isSelected ? `0 0 0 3px ${color}60,` : ""}0 2px 6px rgba(0,0,0,0.3);cursor:pointer;opacity:${opacity};"></div>`,
          iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2],
        });
        const marker = L.marker([coords.lat, coords.lng], { icon })
          .addTo(map)
          .on("click", () => { if (!selectionMode) setSelectedContact(contact); });
        markersRef.current.push(marker);
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [withCoords, filterStatus, selectedContacts, selectionMode, leafletReady]);

  // Mode sélection cercle
  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L || !leafletReady) return;

    if (!selectionMode) {
      map.dragging.enable();
      map.getContainer().style.cursor = "";
      if (circleRef.current) { circleRef.current.remove(); circleRef.current = null; }
      setCircle(null);
      return;
    }

    map.dragging.disable();
    map.getContainer().style.cursor = "crosshair";

    const onMouseDown = (e: any) => {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.originalEvent.clientX, y: e.originalEvent.clientY, lat: e.latlng.lat, lng: e.latlng.lng };
    };
    const onMouseMove = (e: any) => {
      if (!isDraggingRef.current || !dragStartRef.current) return;
      const dx = e.originalEvent.clientX - dragStartRef.current.x;
      const dy = e.originalEvent.clientY - dragStartRef.current.y;
      const pxDist = Math.sqrt(dx*dx + dy*dy);
      const zoom = map.getZoom();
      const metersPerPx = 156543.03392 * Math.cos(dragStartRef.current.lat * Math.PI / 180) / Math.pow(2, zoom);
      const radiusKm = Math.max(0.1, pxDist * metersPerPx / 1000);
      const c = { lat: dragStartRef.current.lat, lng: dragStartRef.current.lng, radiusKm };
      setCircle(c);
      if (circleRef.current) circleRef.current.remove();
      circleRef.current = L.circle([c.lat, c.lng], {
        radius: radiusKm * 1000, color: colorNavy, fillColor: colorNavy, fillOpacity: 0.10, weight: 2, dashArray: "6 4",
      }).addTo(map);
    };
    const onMouseUp = () => { isDraggingRef.current = false; };

    map.on("mousedown", onMouseDown);
    map.on("mousemove", onMouseMove);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mousemove", onMouseMove);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
      map.getContainer().style.cursor = "";
    };
  }, [selectionMode, colorNavy, leafletReady]);

  const handleGeocode = useCallback(async () => {
    setGeocoding(true);
    let count = 0;
    const { geocodeAddress, buildAddress: ba } = await import("../lib/geocode");
    for (const contact of withAddress) {
      const p1 = contact.payload?.contact?.person1;
      const address = ba({ address: p1?.address, postalCode: p1?.postalCode, city: p1?.city });
      if (!address) continue;
      await new Promise(r => setTimeout(r, 1100));
      const coords = await geocodeAddress(address);
      if (coords) {
        onSaveContact({ ...contact, payload: { ...contact.payload, coords } as any });
        count++;
        setGeocodedCount(count);
      }
    }
    setGeocoding(false);
  }, [withAddress, onSaveContact]);

  const flyTo = useCallback((contact: ContactRecord) => {
    const coords = (contact.payload as any)?.coords;
    if (!coords || !mapRef.current) return;
    mapRef.current.flyTo([coords.lat, coords.lng], 13, { duration: 0.8 });
    setSelectedContact(contact);
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", gap: 12 }}>

      {/* En-tête */}
      <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(11,48,64,0.09)", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colorNavy }}>Carte clients</div>
          <div style={{ fontSize: 11, color: "#8FAAB6" }}>{withCoords.length} géolocalisé{withCoords.length > 1 ? "s" : ""}{withAddress.length > 0 && ` · ${withAddress.length} en attente`}</div>
        </div>

        {/* Filtres statut */}
        <div style={{ display: "flex", gap: 6 }}>
          {["all", "vip", "client", "prospect", "inactif"].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: "4px 12px", borderRadius: 10, fontSize: 11, cursor: "pointer", fontFamily: "inherit", border: filterStatus === s ? "none" : "1px solid rgba(11,48,64,0.12)", background: filterStatus === s ? (s === "all" ? colorNavy : STATUS_COLORS[s]) : "#fff", color: filterStatus === s ? (s === "vip" ? "#101B3B" : "#fff") : "#6B7280", fontWeight: filterStatus === s ? 600 : 400 }}>
              {s === "all" ? "Tous" : STATUS_LABELS[s]}
              {s !== "all" && ` (${contacts.filter(c => c.status === s && (c.payload as any)?.coords?.lat).length})`}
            </button>
          ))}
        </div>

        {/* Sélection cercle */}
        <button onClick={() => { setSelectionMode(m => !m); if (selectionMode) setCircle(null); }} style={{ padding: "6px 14px", borderRadius: 6, fontSize: 12, cursor: "pointer", fontFamily: "inherit", border: selectionMode ? "none" : `1px solid ${colorNavy}`, background: selectionMode ? colorNavy : "#fff", color: selectionMode ? "#fff" : colorNavy, fontWeight: selectionMode ? 600 : 400, display: "flex", alignItems: "center", gap: 6 }}>
          {selectionMode ? "⬤ Mode sélection actif" : "○ Sélectionner une zone"}
        </button>

        {withAddress.length > 0 && (
          <button onClick={handleGeocode} disabled={geocoding} style={{ marginLeft: "auto", padding: "6px 14px", borderRadius: 6, border: "none", background: geocoding ? "#D1D5DB" : colorNavy, color: "#fff", fontSize: 12, cursor: geocoding ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {geocoding ? `Géolocalisation... ${geocodedCount}/${withAddress.length}` : `📍 Géolocaliser ${withAddress.length} client${withAddress.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {/* Corps */}
      <div style={{ display: "flex", gap: 12, flex: 1, minHeight: 0 }}>
        {/* Carte */}
        <div style={{ flex: 1, borderRadius: 10, overflow: "hidden", border: "1px solid rgba(11,48,64,0.09)" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />
        </div>

        {/* Panneau latéral */}
        <div style={{ width: 260, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(11,48,64,0.09)", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 14px", borderBottom: "1px solid rgba(11,48,64,0.07)", fontSize: 12, fontWeight: 600, color: colorNavy }}>
            {selectionMode && circle && selectedContacts.length > 0 ? `${selectedContacts.length} client${selectedContacts.length > 1 ? "s" : ""} sélectionné${selectedContacts.length > 1 ? "s" : ""}` : selectedContact ? "Fiche client" : "Liste des clients"}
          </div>

          {/* Panneau sélection cercle */}
          {selectionMode && circle && selectedContacts.length > 0 ? (
            <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
              <div style={{ fontSize: 11, color: "#8FAAB6", marginBottom: 12 }}>Zone : rayon {circle.radiusKm.toFixed(1)} km</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14, maxHeight: 280, overflowY: "auto" }}>
                {selectedContacts.map(c => {
                  const col = STATUS_COLORS[c.status] ?? STATUS_COLORS.inactif;
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: col + "18", borderRadius: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: "50%", background: col, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: c.status === "vip" ? "#101B3B" : "#fff", flexShrink: 0 }}>{c.displayName.slice(0,2).toUpperCase()}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: "#0B3040", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.displayName}</div>
                        <div style={{ fontSize: 10, color: "#8FAAB6" }}>{c.payload?.contact?.person1?.city ?? ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {onOpenMarketing && <button onClick={() => onOpenMarketing(selectedContacts.map(c => c.id))} style={{ padding: "8px", borderRadius: 6, border: "none", background: colorNavy, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>✉ Campagne marketing →</button>}
                <button onClick={() => {
                  const nl = "\n";
                  const lines = selectedContacts.map(c => [c.displayName, c.payload?.contact?.person1?.city ?? "", c.payload?.contact?.person1?.email || "", STATUS_LABELS[c.status]].join(";")).join(nl);
                  const blob = new Blob(["Nom;Ville;Email;Statut" + nl + lines], { type: "text/csv" });
                  const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "selection_clients.csv"; a.click(); URL.revokeObjectURL(url);
                }} style={{ padding: "8px", borderRadius: 6, border: "1px solid rgba(11,48,64,0.12)", background: "#fff", color: "#374151", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>⬇ Exporter CSV</button>
                <button onClick={() => { setCircle(null); setSelectionMode(false); }} style={{ padding: "6px", borderRadius: 6, border: "1px solid rgba(11,48,64,0.12)", background: "#fff", color: "#8FAAB6", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>Effacer la sélection</button>
              </div>
            </div>
          ) : selectionMode ? (
            <div style={{ padding: 14, textAlign: "center", color: "#8FAAB6", fontSize: 12, marginTop: 30 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>○</div>
              Cliquez et glissez sur la carte pour sélectionner une zone
            </div>
          ) : selectedContact ? (
            <div style={{ padding: 14, flex: 1, overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: STATUS_COLORS[selectedContact.status] ?? "#9CA3AF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: selectedContact.status === "vip" ? "#101B3B" : "#fff" }}>{selectedContact.displayName.slice(0,2).toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#0B3040" }}>{selectedContact.displayName}</div>
                  <span style={{ padding: "1px 8px", borderRadius: 8, fontSize: 10, fontWeight: 500, background: (STATUS_COLORS[selectedContact.status] ?? "#9CA3AF") + "20", color: STATUS_COLORS[selectedContact.status] ?? "#9CA3AF" }}>{STATUS_LABELS[selectedContact.status]}</span>
                </div>
              </div>
              {(() => {
                const p1 = selectedContact.payload?.contact?.person1;
                const address = buildAddress({ address: p1?.address, postalCode: p1?.postalCode, city: p1?.city });
                const actifs = (selectedContact.payload?.contracts ?? []).filter(c => c.status === "actif");
                const encours = formatEncours([selectedContact], selectedContact.id);
                return (
                  <div style={{ fontSize: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                    {address && <div style={{ color: "#5E7A88" }}><div style={{ fontSize: 10, color: "#8FAAB6", marginBottom: 2 }}>ADRESSE</div>{address}</div>}
                    {p1?.phone && <div style={{ color: "#5E7A88" }}><div style={{ fontSize: 10, color: "#8FAAB6", marginBottom: 2 }}>TÉLÉPHONE</div>{p1.phone}</div>}
                    {actifs.length > 0 && <div><div style={{ fontSize: 10, color: "#8FAAB6", marginBottom: 4 }}>CONTRATS ACTIFS</div>{actifs.slice(0,3).map(c => <div key={c.id} style={{ fontSize: 11, color: "#374151", padding: "2px 0" }}>· {c.productName || c.type}{c.insurer && <span style={{ color: "#8FAAB6" }}> — {c.insurer}</span>}</div>)}</div>}
                    {encours && <div><div style={{ fontSize: 10, color: "#8FAAB6", marginBottom: 2 }}>ENCOURS TOTAL</div><div style={{ fontSize: 16, fontWeight: 700, color: colorNavy }}>{encours}</div></div>}
                  </div>
                );
              })()}
              <div style={{ display: "flex", gap: 6, marginTop: 16 }}>
                <button onClick={() => onOpenContact(selectedContact)} style={{ flex: 1, padding: "8px", borderRadius: 6, border: "none", background: colorNavy, color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Ouvrir la fiche →</button>
                <button onClick={() => setSelectedContact(null)} style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid rgba(11,48,64,0.12)", background: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit", color: "#5E7A88" }}>←</button>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(filterStatus === "all" ? withCoords : withCoords.filter(c => c.status === filterStatus)).map(contact => {
                const color = STATUS_COLORS[contact.status] ?? STATUS_COLORS.inactif;
                const encours = formatEncours(contacts, contact.id);
                return (
                  <div key={contact.id} onClick={() => flyTo(contact)} style={{ padding: "10px 14px", borderBottom: "1px solid rgba(11,48,64,0.05)", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#F8F9FB")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: contact.status === "vip" ? "#101B3B" : "#fff" }}>{contact.displayName.slice(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "#0B3040", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.displayName}</div>
                      <div style={{ fontSize: 10, color: "#8FAAB6" }}>{contact.payload?.contact?.person1?.city ?? ""}{encours && <span style={{ color: colorNavy, fontWeight: 500 }}> · {encours}</span>}</div>
                    </div>
                    <div style={{ fontSize: 14, color: "#8FAAB6" }}>›</div>
                  </div>
                );
              })}
              {withCoords.length === 0 && <div style={{ padding: "30px 14px", textAlign: "center", color: "#8FAAB6", fontSize: 12 }}>Aucun client géolocalisé.{withAddress.length > 0 && " Cliquez sur « Géolocaliser »."}</div>}
            </div>
          )}
        </div>
      </div>

      {/* Légende */}
      <div style={{ display: "flex", gap: 16, padding: "8px 14px", background: "rgba(255,255,255,0.92)", borderRadius: 8, border: "1px solid rgba(11,48,64,0.09)", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: "#8FAAB6", fontWeight: 500 }}>LÉGENDE</span>
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: STATUS_COLORS[key], border: "2px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
            <span style={{ fontSize: 11, color: "#5E7A88" }}>{label}</span>
          </div>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 10, color: "#8FAAB6" }}>{withCoords.length}/{contacts.length} clients géolocalisés</span>
      </div>
    </div>
  );
}
