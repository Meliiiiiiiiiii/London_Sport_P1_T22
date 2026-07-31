import { AlertCircle } from "lucide-react";
import { C, FONT_BODY } from "../theme";

export default function Field({ icon: Icon, label, type = "text", value, onChange, placeholder, error }) {
  const borderColor = error ? C.danger : C.border;
  return (
    <label style={{ display: "block", marginBottom: error ? 6 : 16 }}>
      <span
        style={{
          fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, color: C.textSecondary,
          textTransform: "uppercase", letterSpacing: "0.06em", display: "block",
          marginBottom: 7,
        }}
      >
        {label}
      </span>
      <div style={{ position: "relative" }}>
        {Icon && (
          <Icon
            size={17}
            color={error ? C.danger : C.textMuted}
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%", fontFamily: FONT_BODY, fontSize: 15, color: C.textPrimary,
            background: C.surfaceAlt, border: `1.5px solid ${borderColor}`, borderRadius: 12,
            padding: Icon ? "13px 14px 13px 42px" : "13px 14px", boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = error ? C.danger : C.green)}
          onBlur={(e) => (e.target.style.borderColor = borderColor)}
        />
      </div>
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
          <AlertCircle size={13} color={C.danger} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 12.5, color: C.danger }}>{error}</span>
        </div>
      )}
    </label>
  );
}
