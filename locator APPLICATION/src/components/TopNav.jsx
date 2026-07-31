import { LogIn, LogOut } from "lucide-react";
import Logo from "./Logo";
import { C, FONT_BODY } from "../theme";

export default function TopNav({ goTo, user, onSignOut, current }) {
  const linkStyle = (active) => ({
    fontFamily: FONT_BODY, fontSize: 14, fontWeight: 600,
    color: active ? C.textPrimary : C.textMuted, background: "none",
    border: "none", cursor: "pointer", padding: "6px 2px",
    borderBottom: active ? `2px solid ${C.green}` : "2px solid transparent",
  });
  return (
    <div style={{
      background: "rgba(7,11,16,0.85)", backdropFilter: "blur(10px)",
      borderBottom: `1px solid ${C.border}`, padding: "16px 24px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34 }}>
        <Logo />
        {/* nav links hidden on mobile - handled by MobileNav bottom bar instead */}
        <div className="desktop-nav-links" style={{ display: "flex", gap: 22 }}>
          <button style={linkStyle(current === "main" || current === "results")} onClick={() => goTo("main")}>Search</button>
          <button style={linkStyle(current === "favorites")} onClick={() => goTo("favorites")}>Favorites</button>
          <button style={linkStyle(current === "history")} onClick={() => goTo("history")}>History</button>
        </div>
      </div>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="user-email" style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary }}>
            {user.name || user.email}
          </span>
          <button
            onClick={onSignOut}
            style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 600, color: C.textPrimary, background: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: 999, padding: "8px 14px", cursor: "pointer" }}
          >
            <LogOut size={14} /> <span className="signout-label">Sign out</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => goTo("signin")}
          style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: FONT_BODY, fontSize: 13, fontWeight: 700, color: C.white, background: C.green, border: "none", borderRadius: 999, padding: "9px 16px", cursor: "pointer" }}
        >
          <LogIn size={14} /> Sign in
        </button>
      )}
    </div>
  );
}
