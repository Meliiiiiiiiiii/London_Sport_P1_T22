import { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import { ArrowLeft, Heart, MapPin, Clock, Calendar, Navigation, ExternalLink, CalendarPlus, ChevronRight, CloudRain, Sun } from "lucide-react";
import SchematicMap from "../components/SchematicMap";
import Footer from "../components/Footer";
import Row from "../components/Row";
import { fetchActivities } from "../api";
import { haversine } from "../utils";
import { C, FONT_DISPLAY, FONT_BODY, FONT_MONO, CAT_DOT_COLOR, CAT_ICON, GRADIENT, GLOW } from "../theme";

// Builds a downloadable .ics calendar file for the activity's next
// occurrence, using its start time. Since sessions are typically weekly
// recurring slots without a specific booked date, this schedules the
// NEXT upcoming occurrence of that time (today if the time hasn't
// passed yet, otherwise tomorrow) - a reasonable, clearly-labelled
// approximation rather than guessing a specific date we don't have.
function downloadIcsFile(activity) {
  const now = new Date();
  let eventDate = new Date(now);

  if (activity.time) {
    const [hh, mm] = activity.time.split(":").map(Number);
    eventDate.setHours(hh || 9, mm || 0, 0, 0);
    if (eventDate < now) {
      eventDate.setDate(eventDate.getDate() + 1); // push to tomorrow if today's slot already passed
    }
  } else {
    eventDate.setDate(eventDate.getDate() + 1);
    eventDate.setHours(9, 0, 0, 0);
  }

  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // assume 1hr duration

  const formatIcsDate = (d) =>
    d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MoveLondon//Activity//EN",
    "BEGIN:VEVENT",
    `UID:${activity.id}-${Date.now()}@movelondon`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(eventDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${activity.name}`,
    `LOCATION:${activity.locationName || activity.borough || "London"}`,
    `DESCRIPTION:${activity.type} activity via MoveLondon. Next occurrence - please confirm exact date with the venue.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${activity.name.replace(/[^a-z0-9]/gi, "-")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Same free weather lookup used on Search/Results pages, repeated here so
// the Detail page (where a decision actually gets made) also reflects
// real conditions for the searched location.
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

function SimilarActivities({ activity, userLoc, onOpenDetail }) {
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchActivities({ category: activity.type })
      .then((results) => {
        if (cancelled) return;
        const withDistance = results
          .filter((a) => a.id !== activity.id)
          .map((a) => ({
            ...a,
            distance: userLoc ? haversine(userLoc.lat, userLoc.lng, a.lat, a.lng) : 0,
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 3);
        setSimilar(withDistance);
      })
      .catch(() => setSimilar([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [activity.id, activity.type, userLoc]);

  if (loading || similar.length === 0) return null;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.textSecondary, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
        Similar activities nearby
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {similar.map((a) => {
          const IconComp = Icons[CAT_ICON[a.type]] || Icons.Sparkles;
          const catColor = CAT_DOT_COLOR[a.type] || "#7A93A8";
          return (
            <div
              key={a.id}
              onClick={() => onOpenDetail(a)}
              style={{ background: C.surface, borderRadius: 14, padding: "12px 14px", cursor: "pointer", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: `${catColor}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <IconComp size={14} color={catColor} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 13.5, fontWeight: 700, color: C.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {a.name}
                  </div>
                  <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, color: C.textSecondary, marginTop: 1 }}>
                    {a.borough} {userLoc ? `· ${a.distance.toFixed(1)} mi` : ""}
                  </div>
                </div>
              </div>
              <ChevronRight size={15} color={C.textMuted} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DetailPage({ goTo, activity, favorites, toggleFavorite, userLoc, onOpenDetail }) {
  if (!activity) return null;
  const distance = userLoc ? haversine(userLoc.lat, userLoc.lng, activity.lat, activity.lng).toFixed(1) : null;
  const isFav = favorites.includes(activity.id);
  const IconComp = Icons[CAT_ICON[activity.type]] || Icons.Sparkles;
  const catColor = CAT_DOT_COLOR[activity.type] || "#7A93A8";
  const weather = useLondonWeather(userLoc);

  return (
    <div className="page-with-mobile-nav" style={{ background: C.bg, minHeight: 640, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "26px 24px 10px" }}>
        <button onClick={() => goTo("results")} style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", marginBottom: 16, fontWeight: 600 }}>
          <ArrowLeft size={15} /> Back to results
        </button>

        {weather && (weather.isRainy || weather.isSunny) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "11px 14px",
            borderRadius: 12, marginBottom: 14,
            background: weather.isRainy ? C.blueSoft : C.goldSoft,
          }}>
            {weather.isRainy ? <CloudRain size={15} color={C.blue} /> : <Sun size={15} color={C.gold} />}
            <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textPrimary }}>
              {weather.isRainy
                ? `${weather.tempC}°C and rainy in ${userLoc.label} right now`
                : `${weather.tempC}°C and clear in ${userLoc.label} right now`}
            </span>
          </div>
        )}

        <SchematicMap points={[activity]} userPoint={userLoc} selectedId={activity.id} height={220} />

        <div style={{ background: C.surface, borderRadius: 18, padding: 26, marginTop: -18, position: "relative", border: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                background: `${catColor}22`, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconComp size={22} color={catColor} />
              </div>
              <div>
                <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {activity.type}
                </span>
                <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 800, color: C.textPrimary, margin: "5px 0 0" }}>
                  {activity.name}
                </h1>
              </div>
            </div>
            <button onClick={() => toggleFavorite(activity)} style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 12, padding: 10, cursor: "pointer", flexShrink: 0 }}>
              <Heart size={19} color={isFav ? C.green : C.textMuted} fill={isFav ? C.green : "none"} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 18, marginBottom: 24, flexWrap: "wrap" }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, padding: "6px 13px", borderRadius: 999, background: activity.free ? C.goldSoft : C.surfaceAlt, color: activity.free ? C.gold : C.textPrimary }}>
              {activity.free ? "FREE" : `£${activity.price.toFixed(2)}`}
            </span>
            {distance && (
              <span style={{ fontFamily: FONT_MONO, fontSize: 13, color: C.textSecondary, display: "flex", alignItems: "center", gap: 5 }}>
                <Navigation size={13} /> {distance} mi away
              </span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
            <Row icon={MapPin} label="Location">
              {activity.venue}{activity.address ? `, ${activity.address}` : ""}<br />
              {activity.postcode} · {activity.borough}
            </Row>
            {activity.time && (
              <Row icon={Clock} label="Start time">{activity.time}</Row>
            )}
            {activity.days && (
              <Row icon={Calendar} label="Runs on">{activity.days}</Row>
            )}
          </div>

          {activity.url ? (
            <a
              href={activity.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                marginTop: 26, fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15,
                background: GRADIENT, color: C.white, borderRadius: 999, padding: "15px 22px",
                textDecoration: "none", boxShadow: GLOW,
              }}
            >
              Book this activity <ExternalLink size={15} />
            </a>
          ) : (
            <div style={{ marginTop: 24, textAlign: "center", fontFamily: FONT_BODY, fontSize: 13.5, color: C.textMuted, padding: "12px 0" }}>
              No booking link available for this session — contact the venue directly.
            </div>
          )}

          <button
            onClick={() => downloadIcsFile(activity)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 10, width: "100%", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5,
              background: "transparent", color: C.textSecondary, border: `1px solid ${C.border}`,
              borderRadius: 999, padding: "12px 22px", cursor: "pointer",
            }}
          >
            <CalendarPlus size={15} /> Add to calendar
          </button>
        </div>

        <SimilarActivities activity={activity} userLoc={userLoc} onOpenDetail={onOpenDetail} />
      </div>
      <Footer />
    </div>
  );
}