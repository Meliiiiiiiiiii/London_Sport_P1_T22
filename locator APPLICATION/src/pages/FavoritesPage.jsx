import * as Icons from "lucide-react";
import { Heart } from "lucide-react";
import { PrimaryButton } from "../components/Buttons";
import Footer from "../components/Footer";
import { DATA } from "../data";
import { C, FONT_DISPLAY, FONT_BODY, CAT_DOT_COLOR, CAT_ICON } from "../theme";

function CatBadge({ type }) {
  const IconComp = Icons[CAT_ICON[type]] || Icons.Sparkles;
  const color = CAT_DOT_COLOR[type] || "#7A93A8";
  return (
    <div style={{ width: 34, height: 34, borderRadius: 11, flexShrink: 0, background: `${color}22`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IconComp size={16} color={color} />
    </div>
  );
}

export default function FavoritesPage({ goTo, user, favorites, activityCache, toggleFavorite, onOpenDetail }) {
  const favActivities = favorites
    .map((id) => activityCache[id] || DATA.find((d) => d.id === id))
    .filter(Boolean);
  return (
    <div className="page-with-mobile-nav" style={{ background: C.bg, minHeight: 640, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "30px 24px" }}>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 22px" }}>
          Your favorites
        </h1>
        {!user ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.border}` }}>
            <Heart size={26} color={C.green} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Sign in to save favorites</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>Create a free account to keep track of activities you like.</p>
            <PrimaryButton onClick={() => goTo("signin")}>Sign in</PrimaryButton>
          </div>
        ) : favActivities.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.border}` }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Nothing saved yet</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>Tap the heart on any activity to save it here.</p>
            <PrimaryButton onClick={() => goTo("main")}>Find activities</PrimaryButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {favActivities.map((d) => (
              <div
                key={d.id}
                onClick={() => onOpenDetail(d.id)}
                style={{ background: C.surface, borderRadius: 16, padding: "14px 16px", cursor: "pointer", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                  <CatBadge type={d.type} />
                  <div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>{d.name}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>{d.type} · {d.borough}</div>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); toggleFavorite(d.id); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                  <Heart size={17} color={C.green} fill={C.green} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
