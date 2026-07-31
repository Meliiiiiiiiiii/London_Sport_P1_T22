import { Search, Heart, Clock, User } from "lucide-react";
import { C, FONT_BODY, GRADIENT } from "../theme";

export default function MobileNav({ goTo, current, user }) {
  const items = [
    { key: "main", label: "Search", icon: Search, matches: ["main", "results"] },
    { key: "favorites", label: "Favorites", icon: Heart, matches: ["favorites"] },
    { key: "history", label: "History", icon: Clock, matches: ["history"] },
    { key: user ? "favorites" : "signin", label: user ? "Account" : "Sign in", icon: User, matches: [] },
  ];

  return (
    <div
      className="mobile-tab-bar"
      style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30,
        background: "rgba(10,15,20,0.92)", backdropFilter: "blur(14px)",
        borderTop: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-around", padding: "10px 6px 12px",
      }}
    >
      {items.map((item) => {
        const active = item.matches.includes(current);
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            onClick={() => goTo(item.key)}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer", padding: "4px 10px",
            }}
          >
            <div style={{
              width: 30, height: 30, borderRadius: 10, display: "flex",
              alignItems: "center", justifyContent: "center",
              background: active ? GRADIENT : "transparent",
            }}>
              <Icon size={16} color={active ? C.white : C.textMuted} />
            </div>
            <span style={{ fontFamily: FONT_BODY, fontSize: 10.5, fontWeight: 600, color: active ? C.textPrimary : C.textMuted }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
