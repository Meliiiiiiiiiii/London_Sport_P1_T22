import { C, FONT_BODY } from "../theme";

export default function Row({ icon: Icon, label, children }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: C.surfaceAlt, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={15} color={C.green} />
      </div>
      <div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 11.5, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textPrimary, marginTop: 3, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  );
}
