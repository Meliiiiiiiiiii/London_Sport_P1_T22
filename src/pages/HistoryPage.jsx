import * as Icons from "lucide-react";
import { Clock, Heart } from "lucide-react";
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

export default function HistoryPage({ goTo, user, history, favorites, toggleFavorite, onOpenDetail, clearHistory }) {
  const items = history
    .map((h) => ({ ...h, activity: DATA.find((d) => d.id === h.id) }))
    .filter((h) => h.activity);

  return (
    <div className="page-with-mobile-nav" style={{ background: C.bg, minHeight: 640, fontFamily: FONT_BODY }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "30px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: 0 }}>
            Places you've viewed
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearHistory}
              style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textSecondary, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear history
            </button>
          )}
        </div>
        {!user ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.border}` }}>
            <Clock size={26} color={C.green} style={{ marginBottom: 12 }} />
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>Sign in to keep your history</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>We'll remember the activities you've looked at once you're signed in.</p>
            <PrimaryButton onClick={() => goTo("signin")}>Sign in</PrimaryButton>
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 20px", background: C.surface, borderRadius: 18, border: `1px dashed ${C.border}` }}>
            <p style={{ fontFamily: FONT_BODY, fontSize: 15, fontWeight: 700, color: C.textPrimary, margin: "0 0 6px" }}>No history yet</p>
            <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, margin: "0 0 18px" }}>Activities you open will show up here.</p>
            <PrimaryButton onClick={() => goTo("main")}>Find activities</PrimaryButton>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((h) => (
              <div
                key={h.id + h.viewedAt}
                onClick={() => onOpenDetail(h.id)}
                style={{ background: C.surface, borderRadius: 16, padding: "14px 16px", cursor: "pointer", border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                  <CatBadge type={h.activity.type} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 14.5, fontWeight: 700, color: C.textPrimary }}>{h.activity.name}</div>
                    <div style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.textSecondary, marginTop: 2 }}>
                      {h.activity.borough} · viewed {new Date(h.viewedAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(h.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <Heart size={17} color={favorites.includes(h.id) ? C.green : C.textMuted} fill={favorites.includes(h.id) ? C.green : "none"} />
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
