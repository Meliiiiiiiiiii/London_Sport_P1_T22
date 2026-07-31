import { useState } from "react";
import { Mail, Lock, AlertCircle } from "lucide-react";
import { AuthenticationDetails, CognitoUser } from "amazon-cognito-identity-js";
import Logo from "../components/Logo";
import Field from "../components/Field";
import { PrimaryButton, GhostButton } from "../components/Buttons";
import AuthShell from "../components/AuthShell";
import { isValidEmail } from "../utils";
import { C, FONT_DISPLAY, FONT_BODY } from "../theme";
import { userPool } from "../cognitoConfig";

export default function SignInPage({ goTo, onSignIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const emailError = touched && email.length > 0 && !isValidEmail(email)
    ? "Enter a valid email address (e.g. you@example.com)"
    : null;

  const canSubmit = email.length > 0 && isValidEmail(email) && password.length > 0;

  const handleSubmit = () => {
    setTouched(true);
    setServerError(null);
    if (!isValidEmail(email) || password.length === 0) return;

    setLoading(true);
    const authDetails = new AuthenticationDetails({ Username: email, Password: password });
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: () => {
        setLoading(false);
        onSignIn(email);
      },
      onFailure: (err) => {
        setLoading(false);
        setServerError(
          err.code === "UserNotConfirmedException"
            ? "Please verify your email before signing in."
            : err.message || "Incorrect email or password."
        );
      },
    });
  };

  return (
    <AuthShell>
      <div style={{ marginBottom: 30 }}><Logo /></div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
        Welcome back
      </h1>
      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 26px" }}>
        Sign in to save activities and pick up where you left off.
      </p>
      <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setTouched(true); }} placeholder="you@example.com" error={emailError} />
      <Field icon={Lock} label="Password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setTouched(true); }} placeholder="••••••••" />
      <div style={{ textAlign: "right", marginTop: -8, marginBottom: 20 }}>
        <button onClick={() => goTo("forgot")} style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.green, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
          Forgot password?
        </button>
      </div>
      {serverError && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <AlertCircle size={14} color={C.danger} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.danger }}>{serverError}</span>
        </div>
      )}
      <PrimaryButton full onClick={handleSubmit} disabled={loading || (touched && !canSubmit)}>
        {loading ? "Signing in..." : "Sign in"}
      </PrimaryButton>
      <GhostButton full style={{ marginTop: 10, width: "100%", boxSizing: "border-box" }} onClick={() => goTo("main")}>
        Continue without an account
      </GhostButton>
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, textAlign: "center", marginTop: 22 }}>
        New here?{" "}
        <button onClick={() => goTo("signup")} style={{ color: C.green, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13.5 }}>
          Create an account
        </button>
      </p>
    </AuthShell>
  );
}