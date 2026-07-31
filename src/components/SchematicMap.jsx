import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Polyline, GeoJSON, useMap } from "react-leaflet";
import { Maximize2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { C, CAT_DOT_COLOR } from "../theme";

function FitBounds({ points, userPoint }) {
  const map = useMap();
  useEffect(() => {
    const coords = [];
    if (userPoint) coords.push([userPoint.lat, userPoint.lng]);
    points.forEach((p) => coords.push([p.lat, p.lng]));
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.setView(coords[0], 14);
    } else {
      map.fitBounds(coords, { padding: [30, 30], maxZoom: 15 });
    }
  }, [points, userPoint, map]);
  return null;
}

function InvalidateSizeOnChange({ trigger }) {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
}

function useRecommendedSites() {
  const [sites, setSites] = useState([]);
  useEffect(() => {
    fetch("/recommended_sites.json")
      .then((res) => (res.ok ? res.json() : []))
      .then(setSites)
      .catch(() => setSites([]));
  }, []);
  return sites;
}

function useAccessibilityGrid() {
  const [grid, setGrid] = useState([]);
  useEffect(() => {
    fetch("/accessibility_grid.json")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrid)
      .catch(() => setGrid([]));
  }, []);
  return grid;
}

function useUncertaintyGrid() {
  const [grid, setGrid] = useState([]);
  useEffect(() => {
    fetch("/uncertainty_grid.json")
      .then((res) => (res.ok ? res.json() : []))
      .then(setGrid)
      .catch(() => setGrid([]));
  }, []);
  return grid;
}

// NEW: borough boundaries + gap score / priority profiles
function useBoroughData() {
  const [geo, setGeo] = useState(null);
  const [profiles, setProfiles] = useState({});
  useEffect(() => {
    fetch("/london_boroughs_simplified.geojson")
      .then((res) => (res.ok ? res.json() : null))
      .then(setGeo)
      .catch(() => setGeo(null));
    fetch("/map_profiles.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        const byName = {};
        (list || []).forEach((p) => { byName[p.borough] = p; });
        setProfiles(byName);
      })
      .catch(() => setProfiles({}));
  }, []);
  return { geo, profiles };
}

function accessibilityColor(normalized) {
  if (normalized < 0.5) {
    const t = normalized / 0.5;
    const r = 255;
    const g = Math.round(107 + t * (183 - 107));
    const b = Math.round(91 + t * (64 - 91));
    return `rgb(${r},${g},${b})`;
  } else {
    const t = (normalized - 0.5) / 0.5;
    const r = Math.round(244 - t * (244 - 34));
    const g = Math.round(183 - t * (183 - 160));
    const b = Math.round(64 + t * (107 - 64));
    return `rgb(${r},${g},${b})`;
  }
}

function uncertaintyColor(normalizedUncertainty) {
  const t = normalizedUncertainty;
  const r = Math.round(46 + t * (168 - 46));
  const g = Math.round(123 + t * (48 - 123));
  const b = Math.round(176 + t * (211 - 176));
  return `rgb(${r},${g},${b})`;
}

function MapLayers({ safePoints, userPoint, selectedId, onSelect, showRecommendedSites, showAccessibilityHeatmap, showUncertainty, showBoroughProfiles, expandTrigger }) {
  const recommendedSites = useRecommendedSites();
  const accessibilityGrid = useAccessibilityGrid();
  const uncertaintyGrid = useUncertaintyGrid();
  const { geo, profiles } = useBoroughData();

  const boroughStyle = () => ({
    fillColor: "transparent",
    weight: 1.2,
    color: "rgba(232,204,150,0.35)",
    fillOpacity: 0,
  });

  const onEachBorough = (feature, layer) => {
    const name = feature.properties.name;
    const p = profiles[name];
    layer.on({
      mouseover: (e) => e.target.setStyle({ fillOpacity: 0.12, fillColor: C.green, weight: 2 }),
      mouseout: (e) => e.target.setStyle({ fillOpacity: 0, weight: 1.2 }),
    });
    if (p) {
      const supplyLine = p.no_supply_data
        ? "No OpenActive supply data for this borough"
        : `${p.supply?.n_sessions ?? "?"} sessions · ${p.supply?.n_providers ?? "?"} providers`;
      layer.bindPopup(
        `<div style="font-family:sans-serif;min-width:200px;">
          <div style="font-weight:700;margin-bottom:4px;">${name}</div>
          <div style="font-size:13px;margin-bottom:6px;">${p.pct_inactive}% inactive${p.rank ? ` · Priority rank ${p.rank}` : ""}</div>
          <div style="font-size:12px;color:#8FA3A0;">${supplyLine}</div>
        </div>`
      );
    } else {
      layer.bindPopup(`<div style="font-family:sans-serif;">${name}</div>`);
    }
  };

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FitBounds points={safePoints} userPoint={userPoint} />
      <InvalidateSizeOnChange trigger={expandTrigger} />

      {showBoroughProfiles && geo && (
        <GeoJSON data={geo} style={boroughStyle} onEachFeature={onEachBorough} />
      )}

      {showUncertainty && !showAccessibilityHeatmap && uncertaintyGrid.map((g, i) => (
        <CircleMarker
          key={`unc-${i}`}
          center={[g.lat, g.lng]}
          radius={9}
          pathOptions={{ stroke: false, fillColor: uncertaintyColor(g.normalized_uncertainty), fillOpacity: g.is_observed ? 0.55 : 0.30 }}
          interactive={false}
        />
      ))}

      {showAccessibilityHeatmap && accessibilityGrid.map((g, i) => (
        <CircleMarker
          key={`acc-${i}`}
          center={[g.lat, g.lng]}
          radius={9}
          pathOptions={{ stroke: false, fillColor: accessibilityColor(g.normalized), fillOpacity: 0.35 }}
          interactive={false}
        />
      ))}

      {safePoints.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={p.id === selectedId ? 9 : 6}
          pathOptions={{
            color: p.id === selectedId ? "#FFFFFF" : "transparent",
            weight: p.id === selectedId ? 2 : 0,
            fillColor: CAT_DOT_COLOR[p.type] || "#7A93A8",
            fillOpacity: 0.9,
          }}
          eventHandlers={{ click: () => onSelect && onSelect(p.id) }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>{p.name}</Tooltip>
        </CircleMarker>
      ))}

      {showRecommendedSites && recommendedSites.map((site) => (
        <CircleMarker
          key={`rec-${site.rank}`}
          center={[site.lat, site.lng]}
          radius={11}
          pathOptions={{ color: "#1A1204", weight: 2, fillColor: "#F4B740", fillOpacity: 0.95 }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>Recommended new venue #{site.rank}</Tooltip>
          <Popup>
            <div style={{ fontFamily: "sans-serif", minWidth: 190 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Recommended New Venue #{site.rank}</div>
              <div style={{ fontSize: 13, marginBottom: 6 }}>Near <b>{site.nearest_borough}</b></div>
              <div style={{ fontSize: 13, color: "#8A6528" }}>
                Estimated <b>{Math.round(site.estimated_inactive_residents_served).toLocaleString()}</b>{" "}
                inactive residents would gain a nearby activity option
              </div>
            </div>
          </Popup>
        </CircleMarker>
      ))}

      {userPoint && selectedId && safePoints.find((p) => p.id === selectedId) && (
        <Polyline
          positions={[
            [userPoint.lat, userPoint.lng],
            [safePoints.find((p) => p.id === selectedId).lat, safePoints.find((p) => p.id === selectedId).lng],
          ]}
          pathOptions={{ color: C.green, weight: 2.5, dashArray: "6 6", opacity: 0.8 }}
        />
      )}

      {userPoint && (
        <CircleMarker
          center={[userPoint.lat, userPoint.lng]}
          radius={9}
          pathOptions={{ color: "#FFFFFF", weight: 2, fillColor: C.green, fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent>You are here</Tooltip>
        </CircleMarker>
      )}
    </>
  );
}

export default function RealMap({
  points, userPoint, selectedId, onSelect, height = 260,
  showRecommendedSites = false, showAccessibilityHeatmap = false,
  showUncertainty = false, showBoroughProfiles = false,
}) {
  const [expanded, setExpanded] = useState(false);

  const safePoints = (points || []).filter(
    (p) => p && typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng)
  );
  const fallbackCenter = [51.5074, -0.1278];
  const center = userPoint
    ? [userPoint.lat, userPoint.lng]
    : safePoints.length > 0
    ? [safePoints[0].lat, safePoints[0].lng]
    : fallbackCenter;

  const mapProps = { safePoints, userPoint, selectedId, onSelect, showRecommendedSites, showAccessibilityHeatmap, showUncertainty, showBoroughProfiles };

  return (
    <>
      <div style={{ width: "100%", height, borderRadius: 18, overflow: "hidden", border: `1px solid ${C.border}`, position: "relative" }}>
        <button
          onClick={() => setExpanded(true)}
          aria-label="Expand map"
          style={{
            position: "absolute", top: 10, right: 10, zIndex: 500,
            width: 34, height: 34, borderRadius: 10,
            background: "rgba(28,51,52,0.85)", backdropFilter: "blur(8px)",
            border: `1px solid ${C.border}`, display: "flex",
            alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}
        >
          <Maximize2 size={16} color={C.textPrimary} />
        </button>
        <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%", background: C.surface }} scrollWheelZoom={true}>
          <MapLayers {...mapProps} expandTrigger={expanded} />
        </MapContainer>
      </div>

      {expanded && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(6,10,10,0.92)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 20,
          }}
        >
          <div style={{ width: "100%", height: "100%", maxWidth: 1400, position: "relative", borderRadius: 20, overflow: "hidden", border: `1px solid ${C.borderStrong}` }}>
            <button
              onClick={() => setExpanded(false)}
              aria-label="Close expanded map"
              style={{
                position: "absolute", top: 14, right: 14, zIndex: 500,
                width: 40, height: 40, borderRadius: 12,
                background: "rgba(28,51,52,0.9)", backdropFilter: "blur(8px)",
                border: `1px solid ${C.borderStrong}`, display: "flex",
                alignItems: "center", justifyContent: "center", cursor: "pointer",
              }}
            >
              <X size={18} color={C.textPrimary} />
            </button>
            <MapContainer center={center} zoom={13} style={{ width: "100%", height: "100%", background: C.surface }} scrollWheelZoom={true}>
              <MapLayers {...mapProps} expandTrigger={expanded} />
            </MapContainer>
          </div>
        </div>
      )}
    </>
  );
}