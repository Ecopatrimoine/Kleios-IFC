// src/lib/geocode.ts
// Géocodage via Nominatim (OpenStreetMap) — gratuit, sans clé API
// Filtre sur la précision : on n'accepte que les résultats de niveau rue/maison
// ─────────────────────────────────────────────────────────────────────────────

export interface GeoCoords {
  lat: number;
  lng: number;
  precision?: "exact" | "street" | "city"; // qualité du géocodage
}

// Types Nominatim considérés comme suffisamment précis
const PRECISE_TYPES = ["house", "building", "residential", "street", "road", "path", "footway", "cycleway", "motorway", "trunk", "primary", "secondary", "tertiary", "unclassified"];
const STREET_TYPES  = ["suburb", "quarter", "neighbourhood", "postcode"];
// city, administrative, county → trop imprécis, on les rejette

export async function geocodeAddress(address: string): Promise<GeoCoords | null> {
  if (!address?.trim()) return null;
  try {
    const encoded = encodeURIComponent(address.trim());
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=3&countrycodes=fr&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Kleios-CRM/1.0 (contact@ploutos-cgp.fr)" },
    });
    if (!res.ok) return null;
    const data: any[] = await res.json();
    if (!data.length) return null;

    // Chercher le meilleur résultat dans les 3 premiers
    for (const result of data) {
      const type = result.type ?? result.class ?? "";
      const cls  = result.class ?? "";
      
      if (PRECISE_TYPES.includes(type) || PRECISE_TYPES.includes(cls)) {
        return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), precision: "exact" };
      }
      if (STREET_TYPES.includes(type) || STREET_TYPES.includes(cls)) {
        return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), precision: "street" };
      }
    }

    // Aucun résultat précis — on prend quand même le premier mais on marque "city"
    // (le marqueur sera visible mais moins précis)
    const first = data[0];
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon), precision: "city" };
  } catch {
    return null;
  }
}

export function buildAddress(contact: {
  address?: string;
  postalCode?: string;
  city?: string;
}): string {
  return [contact.address, contact.postalCode, contact.city].filter(Boolean).join(" ").trim();
}
