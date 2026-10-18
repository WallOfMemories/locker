import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  linkWithCredential,
  sendPasswordResetEmail,
  updatePassword,
} from "firebase/auth";

import { useAuth } from "../../../context/AuthContext";
import { auth } from "../../../services/firebase";
import {
  authErrorMessage,
  hasGoogleLogin,
  hasPasswordLogin,
  reauthenticate,
} from "../../../services/reauthService";

const MIN_PASSWORD = 8;

const EMPTY_FORM = { current: "", next: "", confirm: "" };

function formatDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
}

function SecuritySection() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // linking a password changes currentUser.providerData in place, which
  // React can't see — this just forces a re-render afterwards
  const [, setVersion] = useState(0);

  if (!currentUser) return null;

  const hasPassword = hasPasswordLogin(currentUser);
  const hasGoogle = hasGoogleLogin(currentUser);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  }

  // Same checks for "change" and "add".
  function validateNewPassword() {
    if (form.next.length < MIN_PASSWORD) {
      return `Your new password must be at least ${MIN_PASSWORD} characters.`;
    }

    if (form.next !== form.confirm) {
      return "The new passwords don't match.";
    }

    if (hasPassword && form.next === form.current) {
      return "Your new password must be different from the current one.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (hasPassword && !form.current) {
      setError("Please enter your current password.");
      return;
    }

    const problem = validateNewPassword();

    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError("");
    setSuccess("");

    try {
      if (hasPassword) {
        // CHANGE: prove it's them with the current password, then update
        await reauthenticate(currentUser, form.current);
        await updatePassword(currentUser, form.next);

        setSuccess("Your password has been changed.");
      } else {
        // ADD (Google-only account): confirm via Google, then attach a
        // password so they can also sign in with their email.
        await reauthenticate(currentUser);
        await linkWithCredential(
          currentUser,
          EmailAuthProvider.credential(currentUser.email, form.next)
        );

        setVersion((value) => value + 1);
        setSuccess(
          "Password added. You can now sign in with your email and password too."
        );
      }

      setForm(EMPTY_FORM);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't update your password. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendReset() {
    setBusy(true);
    setError("");
    setSuccess("");

    try {
      await sendPasswordResetEmail(auth, currentUser.email);

      setSuccess(`We sent a password reset link to ${currentUser.email}.`);
    } catch (err) {
      setError(authErrorMessage(err, "Couldn't send the email. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="settings__stack">
      {/* ---------- how you sign in ---------- */}
      <div className="settings__block">
        <h3>How you sign in</h3>

        <ul className="settings__rows">
          <li>
            <span>Email</span>
            <strong>{currentUser.email || "—"}</strong>
          </li>

          <li>
            <span>Sign-in methods</span>
            <strong>
              {[hasPassword && "Email & password", hasGoogle && "Google"]
                .filter(Boolean)
                .join(" · ") || "—"}
            </strong>
          </li>

          <li>
            <span>Account created</span>
            <strong>{formatDate(currentUser.metadata?.creationTime)}</strong>
          </li>

          <li>
            <span>Last sign-in</span>
            <strong>{formatDate(currentUser.metadata?.lastSignInTime)}</strong>
          </li>
        </ul>
      </div>

      {/* ---------- password ---------- */}
      <div className="settings__block">
        <h3>{hasPassword ? "Change password" : "Add a password"}</h3>

        {!hasPassword && (
          <p className="settings__hint">
            You sign in with Google, so there is no password yet. Add one if you
            also want to sign in with your email and password. Your Google
            account&apos;s own security is managed by Google.
          </p>
        )}

        <form className="settings__form" onSubmit={handleSubmit}>
          {hasPassword && (
            <label className="settings__field">
              <span>Current password</span>
              <input
                type="password"
                name="current"
                value={form.current}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </label>
          )}

          <label className="settings__field">
            <span>New password</span>
            <input
              type="password"
              name="next"
              value={form.next}
              onChange={handleChange}
              autoComplete="new-password"
              placeholder={`At least ${MIN_PASSWORD} characters`}
            />
          </label>

          <label className="settings__field">
            <span>Confirm new password</span>
            <input
              type="password"
              name="confirm"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
          </label>

          {error && (
            <p className="settings__msg settings__msg--error" role="alert">
              {error}
            </p>
          )}

          {success && <p className="settings__msg settings__msg--ok">{success}</p>}

          <div className="settings__actions">
            <button type="submit" className="settings__btn" disabled={busy}>
              {busy
                ? "Please wait…"
                : hasPassword
                  ? "Update password"
                  : "Add password"}
            </button>

            {hasPassword && (
              <button
                type="button"
                className="settings__btn settings__btn--ghost"
                onClick={handleSendReset}
                disabled={busy}
              >
                Forgot it? Email me a reset link
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ---------- this device ---------- */}
      <div className="settings__block">
        <h3>This device</h3>

        <p className="settings__hint">
          Signing out only affects this browser. If you used a shared computer,
          sign out when you are done.
        </p>

        <div className="settings__actions">
          <button
            type="button"
            className="settings__btn settings__btn--ghost"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

export default SecuritySection;