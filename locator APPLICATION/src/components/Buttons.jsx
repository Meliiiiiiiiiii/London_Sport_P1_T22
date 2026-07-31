import { C, FONT_BODY, GRADIENT, GLOW } from "../theme";

export function PrimaryButton({ children, onClick, full, style, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15,
        background: disabled ? C.surfaceAlt : GRADIENT,
        color: disabled ? C.textMuted : C.white,
        border: "none", borderRadius: 999, padding: "13px 24px",
        cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : "auto",
        boxShadow: disabled ? "none" : GLOW,
        transition: "transform 0.15s, opacity 0.15s", ...style,
      }}
      onMouseOver={(e) => !disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, onClick, style }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: FONT_BODY, fontWeight: 600, fontSize: 14,
        background: "transparent", color: C.textPrimary, border: `1.5px solid ${C.border}`,
        borderRadius: 999, padding: "10px 18px", cursor: "pointer", ...style,
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = C.borderStrong)}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = C.border)}
    >
      {children}
    </button>
  );
}
