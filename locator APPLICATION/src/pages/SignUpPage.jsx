import { useState } from "react";
import { Mail, Lock, User, KeyRound, AlertCircle } from "lucide-react";
import { CognitoUserAttribute, CognitoUser } from "amazon-cognito-identity-js";
import Logo from "../components/Logo";
import Field from "../components/Field";
import { PrimaryButton } from "../components/Buttons";
import AuthShell from "../components/AuthShell";
import { isValidEmail } from "../utils";
import { C, FONT_DISPLAY, FONT_BODY } from "../theme";
import { userPool } from "../cognitoConfig";

export default function SignUpPage({ goTo, onSignIn }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");
  const [verifyError, setVerifyError] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [resent, setResent] = useState(false);

  const emailError = touched && email.length > 0 && !isValidEmail(email)
    ? "Enter a valid email address (e.g. you@example.com)"
    : null;

  const passwordError = touched && password.length > 0 && password.length < 8
    ? "Password must be at least 8 characters"
    : null;

  const canSubmit = email.length > 0 && isValidEmail(email) && password.length >= 8;

  const handleSubmit = () => {
    setTouched(true);
    setServerError(null);
    if (!isValidEmail(email) || password.length < 8) return;

    setLoading(true);
    const attributeList = [new CognitoUserAttribute({ Name: "email", Value: email })];

    userPool.signUp(email, password, attributeList, null, (err) => {
      setLoading(false);
      if (err) {
        setServerError(err.message || "Something went wrong. Please try again.");
        return;
      }
      setAwaitingCode(true);
    });
  };

  const handleVerify = () => {
    setVerifyError(null);
    if (code.trim().length === 0) {
      setVerifyError("Enter the code we emailed you.");
      return;
    }
    setVerifying(true);
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.confirmRegistration(code.trim(), true, (err) => {
      setVerifying(false);
      if (err) {
        setVerifyError(err.message || "Invalid or expired code.");
        return;
      }
      goTo("signin");
    });
  };

  const handleResend = () => {
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool });
    cognitoUser.resendConfirmationCode(() => setResent(true));
  };

  if (awaitingCode) {
    return (
      <AuthShell>
        <div style={{ marginBottom: 30 }}><Logo /></div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 24, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
          Check your email
        </h1>
        <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 26px" }}>
          We sent a verification code to <strong style={{ color: C.textPrimary }}>{email}</strong>.
        </p>
        <Field icon={KeyRound} label="Verification code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" error={verifyError} />
        <PrimaryButton full onClick={handleVerify} disabled={verifying} style={{ marginTop: 4 }}>
          {verifying ? "Verifying..." : "Verify email"}
        </PrimaryButton>
        <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.textSecondary, textAlign: "center", marginTop: 18 }}>
          {resent ? "Code resent — check your inbox." : (
            <>Didn't get it?{" "}
              <button onClick={handleResend} style={{ color: C.green, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13 }}>
                Resend code
              </button>
            </>
          )}
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div style={{ marginBottom: 30 }}><Logo /></div>
      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: C.textPrimary, margin: "0 0 6px" }}>
        Create your account
      </h1>
      <p style={{ fontFamily: FONT_BODY, fontSize: 14, color: C.textSecondary, margin: "0 0 26px" }}>
        Free to join. Save activities and build your routine.
      </p>
      <Field icon={User} label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      <Field icon={Mail} label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setTouched(true); }} placeholder="you@example.com" error={emailError} />
      <Field icon={Lock} label="Password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setTouched(true); }} placeholder="At least 8 characters" error={passwordError} />
      {serverError && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14 }}>
          <AlertCircle size={14} color={C.danger} />
          <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.danger }}>{serverError}</span>
        </div>
      )}
      <PrimaryButton full onClick={handleSubmit} disabled={loading || (touched && !canSubmit)} style={{ marginTop: 4 }}>
        {loading ? "Creating account..." : "Create account"}
      </PrimaryButton>
      <p style={{ fontFamily: FONT_BODY, fontSize: 13.5, color: C.textSecondary, textAlign: "center", marginTop: 22 }}>
        Already have an account?{" "}
        <button onClick={() => goTo("signin")} style={{ color: C.green, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: FONT_BODY, fontSize: 13.5 }}>
          Sign in
        </button>
      </p>
    </AuthShell>
  );
}