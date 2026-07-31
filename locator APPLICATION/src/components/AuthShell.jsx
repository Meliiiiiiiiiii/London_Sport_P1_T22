import { C, GRADIENT_SOFT } from "../theme";

export default function AuthShell({ children }) {
  return (
    <div
      style={{
        minHeight: 640, background: C.bg, display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: "'Public Sans', sans-serif",
        padding: 24, position: "relative", overflow: "hidden",
      }}
    >
      {/* ambient gradient glow, purely decorative */}
      <div style={{
        position: "absolute", width: 480, height: 480, borderRadius: "50%",
        background: GRADIENT_SOFT, filter: "blur(80px)", top: -140, left: -100,
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", width: 380, height: 380, borderRadius: "50%",
        background: GRADIENT_SOFT, filter: "blur(90px)", bottom: -120, right: -80,
        pointerEvents: "none",
      }} />
      <div
        style={{
          background: C.surface, border: `1px solid ${C.border}`, borderRadius: 22, padding: "42px 36px",
          width: "100%", maxWidth: 400, boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          position: "relative", zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
