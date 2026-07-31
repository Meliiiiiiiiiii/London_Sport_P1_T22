/* ---------- Dark, gradient-driven design system ---------- */
export const C = {
  bg: "#070B10",
  surface: "#111922",
  surfaceAlt: "#161F2A",
  surfaceHover: "#1B2530",
  border: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",

  blue: "#2E7BB0",
  blueSoft: "rgba(46,123,176,0.16)",
  green: "#22A06B",
  greenSoft: "rgba(34,160,107,0.16)",
  gold: "#F4B740",
  goldSoft: "rgba(244,183,64,0.16)",
  danger: "#FF6B5B",

  textPrimary: "#F5F7FA",
  textSecondary: "rgba(245,247,250,0.64)",
  textMuted: "rgba(245,247,250,0.40)",
  white: "#FFFFFF",
};

export const GRADIENT = "linear-gradient(135deg, #2E7BB0 0%, #22A06B 100%)";
export const GRADIENT_SOFT = "linear-gradient(135deg, rgba(46,123,176,0.14) 0%, rgba(34,160,107,0.14) 100%)";
export const GLOW = "0 8px 30px rgba(34,160,107,0.25), 0 4px 14px rgba(46,123,176,0.18)";

export const FONT_DISPLAY = "'Bricolage Grotesque', 'Space Grotesk', sans-serif";
export const FONT_BODY = "'Public Sans', 'Inter', sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

// cycling palette for category accents (no orange, per brand rule)
const CAT_PALETTE = [C.blue, C.green, C.gold, "#7A93A8"];
const CAT_ORDER = [
  "Swimming", "Gym / Fitness", "Yoga, Pilates & Studio", "Group Exercise", "Dance",
  "Racquet Sports", "Team Sports", "Martial Arts", "Bootcamp & Outdoor Fitness",
  "Walking / Running", "Cycling", "Personal Training", "Other / Unspecified",
  "Wellness & Facility Access",
];
export const CAT_DOT_COLOR = Object.fromEntries(
  CAT_ORDER.map((name, i) => [name, CAT_PALETTE[i % CAT_PALETTE.length]])
);

export const CAT_ICON = {
  "Swimming": "Waves",
  "Gym / Fitness": "Dumbbell",
  "Yoga, Pilates & Studio": "Flower2",
  "Group Exercise": "Users",
  "Dance": "Music2",
  "Racquet Sports": "CircleDot",
  "Team Sports": "Trophy",
  "Martial Arts": "Swords",
  "Bootcamp & Outdoor Fitness": "Flame",
  "Walking / Running": "Footprints",
  "Cycling": "Bike",
  "Personal Training": "UserCheck",
  "Other / Unspecified": "Sparkles",
  "Wellness & Facility Access": "HeartPulse",
};

// London bounding box, for projecting lat/lng into the schematic SVG map
export const BOUNDS = { latMin: 51.30, latMax: 51.70, lngMin: -0.52, lngMax: 0.32 };

export function project(lat, lng, w, h) {
  const x = ((lng - BOUNDS.lngMin) / (BOUNDS.lngMax - BOUNDS.lngMin)) * w;
  const y = h - ((lat - BOUNDS.latMin) / (BOUNDS.latMax - BOUNDS.latMin)) * h;
  return { x, y };
}

export function clampCoord(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
