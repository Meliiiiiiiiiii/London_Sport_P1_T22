import { C, FONT_MONO } from "../theme";

export default function Footer() {
  return (
    <div style={{ textAlign: "center", padding: "24px 16px 30px", fontFamily: FONT_MONO, fontSize: 11, color: C.textMuted, letterSpacing: "0.04em" }}>
      ACTIVITY DATA REFRESHED WEEKLY · SOURCE: OPENACTIVE
    </div>
  );
}
