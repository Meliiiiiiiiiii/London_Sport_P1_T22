import { useState } from "react";
import { ArrowLeft, Mail, KeyRound, Lock, AlertCircle } from "lucide-react";
import { CognitoUser } from "amazon-cognito-identity-js";
import Logo from "../components/Logo";
import Field from "../components/Field";
import { PrimaryButton } from "../components/Buttons";
import AuthShell from "../components/AuthShell";
import { isValidEmail } from "../utils";
import { C, FONT_DISPLAY, FONT_BODY, GRADIENT } from "../theme";
import { userPool } from "../cognitoConfig";

export default function ForgotPasswordPage({ goTo }) {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState(false);
  const [resetError, setResetError] = useState(null);
  const [resetting, setResetting] = useState(false);

  const emailError = touched && email.length > 0 && !isValidEmail(email)
    ? "Enter a valid email address (e.g. you@example.com)"
    : null;

  const canSubmit = email.length > 0 && isValidEmail(email);

  const handleSubmit = () => {
    setTouched(true);
    setServerError(null);
    if (!isValidEmail(email)) return;

    setLoading(true);
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.forgotPassword({
      onSuccess: () => { setLoading(false); setSent(true); },
      onFailure: (err) => { setLoading(false); setServerError(err.message || "Something went wrong. Please try again."); },
    });
  };

  const handleReset = () => {
    setResetError(null);
    if (code.trim().length === 0) return setResetError("Enter the code we emailed you.");
    if (newPassword.length < 8) return setResetError("New password must be at least 8 characters.");

    setResetting(true);
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmPassword(code.trim(), newPassword, {
      onSuccess: () => { setResetting(false); setResetDone(true); },
      onFailure: (err) => { setResetting(false); setResetError(err.message || "Invalid or expired code."); },
    });
  };

  return (
    <AuthShell>
      <div style={{ marginBottom: 30 }}><Logo /></div>

      {resetDone ? (
        <div style={{ textAlign: "center", padding: "12px 0" }}>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Lock size={24} color={C.white} />
          </div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 19, color: C.textPrimary, margin: "0 0 8px" }}>Password updated</h2>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 18px" }}>
            You can now sign in with your new password.
          </p>
          <PrimaryButton full onClick={() => goTo("signin")}>Back to sign in</PrimaryButton>
        </div>
      ) : sent ? (
        <>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
            Enter your code
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 26px" }}>
            We emailed a reset code to <strong style={{ color: C.textPrimary }}>{email}</strong>.
          </p>
          <Field icon={KeyRound} label="Reset code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" />
          <Field icon={Lock} label="New password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
          {resetError && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <AlertCircle size={14} color={C.danger} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.danger }}>{resetError}</span>
            </div>
          )}
          <PrimaryButton full onClick={handleReset} disabled={resetting}>
            {resetting ? "Updating..." : "Update password"}
          </PrimaryButton>
        </>
      ) : (
        <>
          <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
            Reset your password
          </h1>
          <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 26px" }}>
            Enter your email and we'll send a code to reset it.
          </p>
          <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setTouched(true); }} placeholder="you@example.com" error={emailError} />
          {serverError && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
              <AlertCircle size={14} color={C.danger} />
              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.danger }}>{serverError}</span>
            </div>
          )}
          <PrimaryButton full onClick={handleSubmit} disabled={loading || (touched && !canSubmit)}>
            {loading ? "Sending..." : "Send reset code"}
          </PrimaryButton>
        </>
      )}

      <button onClick={() => goTo("signin")} style={{ display: "flex", alignItems: "center", gap: 6, margin: "22px auto 0", fontFamily: FONT_BODY, fontSize: 13.5, color: C.green, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
        <ArrowLeft size={15} /> Back to sign in
      </button>
    </AuthShell>
  );
}