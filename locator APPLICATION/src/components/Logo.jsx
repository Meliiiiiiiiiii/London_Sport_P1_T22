import { Navigation } from "lucide-react";
import { C, FONT_DISPLAY, GRADIENT } from "../theme";

export default function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div
        style={{
          width: 32, height: 32, borderRadius: 10,
          background: GRADIENT, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
          boxShadow: "0 4px 14px rgba(34,160,107,0.35)",
        }}
      >
        <Navigation size={17} color={C.white} strokeWidth={2.5} />
      </div>
      <span
        style={{
          fontFamily: FONT_DISPLAY, fontWeight: 800, fontSize: 19,
          letterSpacing: "-0.02em", color: C.textPrimary,
        }}
      >
        MOVE<span style={{
          background: GRADIENT,
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          display: "inline-block",
        }}>LONDON</span>
      </span>
    </div>
  );
}