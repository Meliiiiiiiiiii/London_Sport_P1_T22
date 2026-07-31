import { useState, useEffect } from "react";
import { MapPin, Search, Filter, Navigation, AlertCircle, Sparkles, CloudRain, Sun, Cloud } from "lucide-react";
import SchematicMap from "../components/SchematicMap";
import { PrimaryButton, GhostButton } from "../components/Buttons";
import Footer from "../components/Footer";
import { DATA, CATEGORIES, BOROUGH_CENTROIDS } from "../data";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO, GRADIENT, GRADIENT_SOFT } from "../theme";
import { parseSearchQuery } from "../nlSearch";

// Indoor-friendly categories, used for the rain suggestion below.
const INDOOR_CATEGORIES = new Set([
  "Swimming", "Gym / Fitness", "Yoga, Pilates & Studio", "Group Exercise",
  "Racquet Sports", "Martial Arts", "Personal Training", "Wellness & Facility Access",
]);

// Free weather lookup (Open-Meteo - no API key, no cost, no signup).
// WMO weather codes: https://open-meteo.com/en/docs
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

export default function MainPage({ goTo, userLoc, setUserLoc, filters, setFilters, onSearch }) {
  const [manualOpen, setManualOpen] = useState(false);
  const [geoError, setGeoError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);

  const [nlQuery, setNlQuery] = useState("");
  const [nlMatches, setNlMatches] = useState([]);

  const weather = useLondonWeather(userLoc);

  const runNlSearch = () => {
    const parsed = parseSearchQuery(nlQuery, BOROUGH_CENTROIDS);
    setNlMatches(parsed.matchedTerms);
    setFilters((f) => ({
      ...f,
      category: parsed.category || f.category,
      price: parsed.price || f.price,
      timeSlot: parsed.timeSlot || f.timeSlot,
    }));
    if (parsed.borough) {
      setUserLoc({ label: parsed.borough.name, lat: parsed.borough.lat, lng: parsed.borough.lng });
    }
  };

  const applyIndoorFilter = () => {
    // No single "indoor" category exists in the filter schema, so this
    // nudges toward the closest reasonable proxy: Gym/Fitness, a
    // consistently-indoor category most users would expect from "indoor".
    setFilters((f) => ({ ...f, category: "Gym / Fitness" }));
  };

  const useMyLocation = () => {
    setGeoError("");
    setGeoLoading(true);
    if (!navigator.geolocation) {
      setGeoError("Location isn't available in this browser. Pick a starting point manually instead.");
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ label: "Your current location", lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Location permission denied. Pick a starting point manually instead.");
        setGeoLoading(false);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="page-with-mobile-nav" style={{ background: C.bg, minHeight: 640, fontFamily: FONT_BODY, position: "relative", overflow: "hidden" }}>
      {/* ambient decorative glow */}
      <div style={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", background: GRADIENT_SOFT, filter: "blur(100px)", top: -220, right: -160, pointerEvents: "none" }} />

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 20px", position: "relative" }}>
        <h1 className="hero-title" style={{ fontFamily: FONT_DISPLAY, fontWeight: 800, color: C.textPrimary, margin: "0 0 10px", letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Find something active,{" "}
          <span style={{
            background: GRADIENT,
            WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
          }}>near you.</span>
        </h1>
        <p style={{ fontSize: 15, color: C.textSecondary, margin: "0 0 20px", maxWidth: 480 }}>
          Real sessions across London — free and paid, sorted by distance from wherever you are.
        </p>

        {/* Weather-aware suggestion banner - only shows once we have a location + weather reading */}
        {userLoc && weather && (weather.isRainy || weather.isSunny) && (
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

        {/* Natural language quick search */}
        <div style={{ background: C.surface, borderRadius: 18, padding: 18, marginBottom: 18, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Sparkles size={15} color={C.green} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick search</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={nlQuery}
              onChange={(e) => setNlQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") runNlSearch(); }}
              placeholder="Try: free yoga near Camden"
              style={{ flex: 1, fontFamily: FONT_BODY, fontSize: 14, padding: "11px 13px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.textPrimary }}
            />
            <PrimaryButton onClick={runNlSearch}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Search size={14} /> Search
              </span>
            </PrimaryButton>
          </div>
          {nlMatches.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              <span style={{ fontSize: 11.5, color: C.textMuted }}>Understood:</span>
              {nlMatches.map((m) => (
                <span key={m} style={{ fontSize: 11.5, fontWeight: 600, padding: "3px 9px", borderRadius: 999, background: C.greenSoft, color: C.green }}>
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Location entry */}
        <div style={{ background: C.surface, borderRadius: 18, padding: 22, marginBottom: 18, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: userLoc ? 14 : 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: C.greenSoft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={16} color={C.green} />
            </div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>
              {userLoc ? userLoc.label : "Where are you starting from?"}
            </span>
          </div>
          {!userLoc && (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <PrimaryButton onClick={useMyLocation} disabled={geoLoading}>
                <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Navigation size={15} /> {geoLoading ? "Locating…" : "Use my location"}
                </span>
              </PrimaryButton>
              <GhostButton onClick={() => setManualOpen((v) => !v)}>Choose manually</GhostButton>
            </div>
          )}
          {geoError && (
            <p style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: C.danger, marginTop: 10 }}>
              <AlertCircle size={14} /> {geoError}
            </p>
          )}
          {manualOpen && !userLoc && (
            <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8, maxHeight: 190, overflowY: "auto" }}>
              {BOROUGH_CENTROIDS.map((b) => (
                <button
                  key={b.name}
                  onClick={() => setUserLoc({ label: b.name, lat: b.lat, lng: b.lng })}
                  style={{ fontFamily: FONT_BODY, fontSize: 13, textAlign: "left", padding: "9px 11px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, cursor: "pointer", color: C.textPrimary }}
                >
                  {b.name}
                </button>
              ))}
            </div>
          )}
          {userLoc && (
            <>
              <div style={{ marginTop: 4, marginBottom: 14 }}>
                <SchematicMap points={DATA} userPoint={userLoc} height={200} />
              </div>
              <button
                onClick={() => setUserLoc(null)}
                style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                Change location
              </button>
            </>
          )}
        </div>

        {/* Filters */}
        <div style={{ background: C.surface, borderRadius: 18, padding: 22, border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <Filter size={15} color={C.green} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: C.textPrimary, textTransform: "uppercase", letterSpacing: "0.06em" }}>Filters</span>
          </div>

          <div className="filter-grid" style={{ marginBottom: 4 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7 }}>Category</label>
              <select
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 14, padding: "11px 11px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.textPrimary }}
              >
                <option value="All">All activities</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 7 }}>Price</label>
              <select
                value={filters.price}
                onChange={(e) => setFilters((f) => ({ ...f, price: e.target.value }))}
                style={{ width: "100%", fontFamily: FONT_BODY, fontSize: 14, padding: "11px 11px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.surfaceAlt, color: C.textPrimary }}
              >
                <option value="All">Free & paid</option>
                <option value="Free">Free only</option>
                <option value="Paid">Paid only</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", justifyContent: "space-between" }}>
              <span>Distance</span>
              <span style={{ fontFamily: FONT_MONO, color: C.green }}>{filters.distance} mi</span>
            </label>
            <input
              type="range" min="0.5" max="10" step="0.5" value={filters.distance}
              onChange={(e) => setFilters((f) => ({ ...f, distance: parseFloat(e.target.value) }))}
              style={{ width: "100%", marginTop: 10 }}
            />
          </div>

          <div style={{ marginTop: 20, marginBottom: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 9 }}>Time of day</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Any", "Morning", "Afternoon", "Evening"].map((slot) => {
                const active = filters.timeSlot === slot;
                return (
                  <button
                    key={slot}
                    onClick={() => setFilters((f) => ({ ...f, timeSlot: slot }))}
                    style={{
                      fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, padding: "8px 15px", borderRadius: 999,
                      border: active ? "none" : `1px solid ${C.border}`,
                      background: active ? GRADIENT : "transparent",
                      color: active ? C.white : C.textSecondary, cursor: "pointer",
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <PrimaryButton full style={{ marginTop: 22, padding: "16px 22px", fontSize: 16 }} onClick={onSearch} disabled={!userLoc}>
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Search size={17} /> {userLoc ? "Find activities" : "Set your location to search"}
          </span>
        </PrimaryButton>
      </div>
      <Footer />
    </div>
  );
}