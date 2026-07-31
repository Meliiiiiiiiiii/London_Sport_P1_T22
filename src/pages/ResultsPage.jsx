import { useState, useMemo, useEffect } from "react";
import * as Icons from "lucide-react";
import { ArrowLeft, AlertCircle, Heart, ChevronRight, Loader2, MapPin, CloudRain, Sun } from "lucide-react";
import SchematicMap from "../components/SchematicMap";
import { PrimaryButton } from "../components/Buttons";
import Footer from "../components/Footer";
import { fetchActivities } from "../api";
import { haversine, timeSlotOf } from "../utils";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO, CAT_DOT_COLOR, CAT_ICON } from "../theme";

const LONDON_CENTER = { lat: 51.5074, lng: -0.1278, label: "Central London" };

function CatBadge({ type, size = 34 }) {
  const IconComp = Icons[CAT_ICON[type]] || Icons.Sparkles;
  const color = CAT_DOT_COLOR[type] || "#7A93A8";
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.32, flexShrink: 0, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IconComp size={size * 0.5} color={color} />
    </div>
  );
}

// Same free weather lookup used on the Search page - repeated here so the
// Results page (where people actually browse) also reflects real conditions
// for wherever they searched, not just the initial search screen.
function useLondonWeather(userLoc) {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!userLoc) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${userLoc.lat}&longitude=${userLoc.lng}&current=temperature_2m,weather_code&timezone=auto`;
    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.current) return;
        const code = data.current.weather_code;
        const isRainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
        const isSunny = [0, 1].includes(code);
        setWeather({ tempC: Math.round(data.current.temperature_2m), isRainy, isSunny });
      })
      .catch(() => setWeather(null));
  }, [userLoc]);
  return weather;
}

export default function ResultsPage({ goTo, userLoc, setUserLoc, filters, setFilters, favorites, toggleFavorite, onOpenDetail, hoveredId, setHoveredId }) {
  const [effectiveDistance, setEffectiveDistance] = useState(filters.distance);
  const [rawData, setRawData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const weather = useLondonWeather(userLoc);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    fetchActivities({ category: filters.category, price: filters.price })
      .then(setRawData)
      .catch(() => setLoadError("Couldn't load activities right now. Please try again."))
      .finally(() => setLoading(false));
  }, [filters.category, filters.price]);

  useEffect(() => setEffectiveDistance(filters.distance), [filters.distance]);

  const scored = useMemo(() => {
    return rawData
      .map((d) => ({ ...d, distance: haversine(userLoc.lat, userLoc.lng, d.lat, d.lng) }))
      .sort((a, b) => a.distance - b.distance);
  }, [rawData, userLoc]);

  const filtered = useMemo(() => {
    return scored.filter((d) => {
      if (filters.timeSlot !== "Any" && timeSlotOf(d.time) !== filters.timeSlot) return false;
      if (d.distance > effectiveDistance) return false;
      return true;
    });
  }, [scored, filters.timeSlot, effectiveDistance]);

  const distanceToLondon = useMemo(
    () => haversine(userLoc.lat, userLoc.lng, LONDON_CENTER.lat, LONDON_CENTER.lng),
    [userLoc]
  );
  const isOutsideCoverage = distanceToLondon > 25;

  const widen = () => setEffectiveDistance((d) => Math.min(d * 3, 25));
  const useLondonInstead = () => {
    setUserLoc(LONDON_CENTER);
    setEffectiveDistance(filters.distance);
  };

  const applyIndoorFilter = () => {
    if (setFilters) setFilters((f) => ({ ...f, category: "Gym / Fitness" }));
  };

  return (
    <div className="page-with-mobile-nav" style={{ background: C.bg, minHeight: 640, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "26px 24px 10px" }}>
        <button onClick={() => goTo("main")} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", marginBottom: 16, fontWeight: 600 }}>
          <ArrowLeft size={15} /> Edit search
        </button>

        {weather && (weather.isRainy || weather.isSunny) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 12, padding: "13px 16px",
            borderRadius: 14, marginBottom: 16,
            background: weather.isRainy ? C.blueSoft : C.goldSoft,
            border: `1px solid ${weather.isRainy ? C.border : C.goldSoft}`,
          }}>
            {weather.isRainy ? <CloudRain size={17} color={C.blue} /> : <Sun size={17} color={C.gold} />}
            <div style={{ flex: 1 }}>
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textPrimary }}>
                {weather.isRainy
                  ? `It's ${weather.tempC}°C and rainy in ${userLoc.label} right now — want indoor activities only?`
                  : `It's ${weather.tempC}°C and clear in ${userLoc.label} — good day for something outdoors!`}
              </span>
            </div>
            {weather.isRainy && (
              <button
                onClick={applyIndoorFilter}
                style={{ fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 999, background: "none", border: `1px solid ${C.blue}`, color: C.blue, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Show indoor
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "70px 20px" }}>
            <Loader2 size={26} color={C.green} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
            <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary }}>Finding activities near you…</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.danger}` }}>
            <AlertCircle size={26} color={C.danger} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>{loadError}</p>
            <PrimaryButton onClick={() => window.location.reload()}>Try again</PrimaryButton>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 18 }}>
              <SchematicMap points={filtered} userPoint={userLoc} selectedId={hoveredId} onSelect={(id) => onOpenDetail(filtered.find((x) => x.id === id))} showRecommendedSites={true} showAccessibilityHeatmap={false} showUncertainty={true} showBoroughProfiles={true} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
                {filtered.length} {filtered.length === 1 ? "activity" : "activities"} found
              </h2>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.textMuted }}>within {effectiveDistance} mi</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.border}` }}>
                <AlertCircle size={26} color={C.gold} style={{ marginBottom: 12 }} />

                {isOutsideCoverage ? (
                  <>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                      Outside our coverage area
                    </p>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>
                      You're about {Math.round(distanceToLondon)} miles from Greater London, which is the only area we currently cover. Want to see activities there instead?
                    </p>
                    <PrimaryButton onClick={useLondonInstead}>
                      <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <MapPin size={15} /> Show activities in London instead
                      </span>
                    </PrimaryButton>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>
                      {effectiveDistance === filters.distance ? "Nothing found nearby" : "Still nothing nearby"}
                    </p>
                    <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>
                      {effectiveDistance >= 25
                        ? "This app currently covers Greater London only — no activities exist within range of your location."
                        : "Try widening your search radius to see the closest available options."}
                    </p>
                    {effectiveDistance < 25 && (
                      <PrimaryButton onClick={widen}>Show closest options anyway</PrimaryButton>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 30 }}>
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => onOpenDetail(d)}
                    onMouseEnter={() => setHoveredId(d.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ background: C.surface, borderRadius: 16, padding: "14px 16px", cursor: "pointer", border: `1px solid ${hoveredId === d.id ? C.green : C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, transition: "border-color 0.12s" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                      <CatBadge type={d.type} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 700, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {d.name}
                        </div>
                        <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>
                          {d.type} · {d.borough}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, color: C.textMuted }}>{d.distance.toFixed(1)} mi</span>
                      <span style={{ fontFamily: FONT_MONO, fontSize: 12.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: d.free ? C.goldSoft : C.surfaceAlt, color: d.free ? C.gold : C.textPrimary }}>
                        {d.free ? "FREE" : `£${d.price.toFixed(2)}`}
                      </span>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorite(d); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <Heart size={17} color={favorites.includes(d.id) ? C.green : C.textMuted} fill={favorites.includes(d.id) ? C.green : "none"} />
                      </button>
                      <ChevronRight size={16} color={C.textMuted} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}