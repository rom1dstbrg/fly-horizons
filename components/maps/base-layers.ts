import L from "leaflet";

// Fonds de carte des outils pilote (27/09) : « Aéro » = carte VFR openflightmaps
// (fond + espaces aériens, aérodromes, fréquences ; données officielles,
// Belgique couverte, sans clé), en premier et par défaut ; « Carte » =
// satellite + noms de lieux. Remplace l'ancienne couche OpenAIP dont le serveur
// de tuiles ne répond plus. Bascule par deux boutons en haut à droite.

export type BaseLayerKey = "carte" | "aero";

const OFM = "https://nwy-tiles-api.prod.newaydata.com/tiles/{z}/{x}/{y}";
const OFM_ATTRIB = '© <a href="https://www.openflightmaps.org" target="_blank" rel="noopener">open flightmaps</a>';

function carteLayer() {
  return L.layerGroup([
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: "Tiles © Esri", maxZoom: 19,
    }),
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO", maxZoom: 19,
    }),
  ]);
}

function aeroLayer() {
  // Tuiles openflightmaps servies jusqu'au zoom 12 : au-delà, Leaflet agrandit.
  return L.layerGroup([
    L.tileLayer(`${OFM}.jpg?path=latest/base/latest`, { attribution: OFM_ATTRIB, maxNativeZoom: 12, maxZoom: 16 }),
    L.tileLayer(`${OFM}.png?path=latest/aero/latest`, { maxNativeZoom: 12, maxZoom: 16 }),
  ]);
}

const BTN =
  "border:0;background:transparent;font:600 12px/1 Poppins,system-ui,sans-serif;padding:7px 11px;border-radius:8px;cursor:pointer;color:#4d5463;";
const BTN_ON = "background:#0b2238;color:#fff;";

/** Ajoute les deux fonds et le sélecteur Aéro / Carte. */
export function addBaseLayers(map: L.Map, initial: BaseLayerKey = "aero") {
  const layers: Record<BaseLayerKey, L.LayerGroup> = { carte: carteLayer(), aero: aeroLayer() };
  let current: BaseLayerKey = initial;
  layers[current].addTo(map);

  const Switch = L.Control.extend({
    onAdd() {
      const box = L.DomUtil.create("div");
      box.setAttribute("role", "group");
      box.setAttribute("aria-label", "Fond de carte");
      box.style.cssText = "display:flex;gap:2px;padding:3px;background:#fff;border-radius:11px;box-shadow:0 2px 10px rgba(11,34,56,.18);";
      const buttons = (["aero", "carte"] as const).map((key) => {
        const b = L.DomUtil.create("button", "", box) as HTMLButtonElement;
        b.type = "button";
        b.textContent = key === "carte" ? "Carte" : "Aéro";
        return { key, b };
      });
      const paint = () =>
        buttons.forEach(({ key, b }) => {
          b.style.cssText = BTN + (key === current ? BTN_ON : "");
          b.setAttribute("aria-pressed", String(key === current));
        });
      buttons.forEach(({ key, b }) =>
        L.DomEvent.on(b, "click", (e) => {
          L.DomEvent.stop(e);
          if (key === current) return;
          map.removeLayer(layers[current]);
          current = key;
          layers[current].addTo(map);
          paint();
        }),
      );
      paint();
      L.DomEvent.disableClickPropagation(box);
      return box;
    },
  });
  new Switch({ position: "topright" }).addTo(map);
}

// Trait de la route sur les cartes pilote : magenta (convention aviation, se
// détache du beige, de l'orange et du bleu de la carte VFR) sur un liseré
// blanc qui le garde lisible dans les CTR roses et sur le satellite.
export const ROUTE_COLOR = "#E0138C";

export function routeLine(pts: L.LatLngExpression[]): L.LayerGroup {
  return L.layerGroup([
    L.polyline(pts, { color: "#fff", weight: 7, opacity: 0.95, lineJoin: "round", lineCap: "round", interactive: false }),
    L.polyline(pts, { color: ROUTE_COLOR, weight: 3.5, opacity: 1, lineJoin: "round", lineCap: "round", interactive: false }),
  ]);
}
