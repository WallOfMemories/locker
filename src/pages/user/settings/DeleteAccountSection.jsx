import { useEffect, useState } from "react";

import { useAuth } from "../../../context/AuthContext";
import {
  cancelAccountDeletion,
  getAccountSummary,
  requestAccountDeletion,
} from "../../../services/accountService";
import {
  authErrorMessage,
  hasPasswordLogin,
  reauthenticate,
} from "../../../services/reauthService";

const CONFIRM_WORD = "DELETE";

function formatLongDate(value) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function DeleteAccountSection() {
  const { currentUser } = useAuth();

  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState("");

  const [typed, setTyped] = useState("");
  const [password, setPassword] = useState("");
  const [understood, setUnderstood] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAccountSummary()
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "Couldn't load your account details.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const needsPassword = hasPasswordLogin(currentUser);

  const ready =
    typed === CONFIRM_WORD && understood && (!needsPassword || password.length > 0);

  async function handleRequest(event) {
    event.preventDefault();

    if (!ready) return;

    setBusy(true);
    setError("");

    try {
      // 1. prove it's really them (password, or the Google account picker)
      await reauthenticate(currentUser, password);

      // 2. ask the server — it double-checks the sign-in is fresh
      setSummary(await requestAccountDeletion());

      setTyped("");
      setPassword("");
      setUnderstood(false);
    } catch (err) {
      setError(
        err.code === "reauth-required"
          ? err.message
          : authErrorMessage(err, "Couldn't request deletion. Please try again.")
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel() {
    setBusy(true);
    setError("");

    try {
      setSummary(await cancelAccountDeletion());
    } catch (err) {
      setError(err.message || "Couldn't cancel the deletion. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loadError) {
    return <p className="settings__msg settings__msg--error">{loadError}</p>;
  }

  if (!summary) return <p className="settings__hint">Loading…</p>;

  // ---------- already requested ----------
  if (summary.deletion.pending) {
    return (
      <div className="settings__stack">
        <div className="settings__notice settings__notice--danger">
          <h3>Your account is scheduled for deletion</h3>

          <p>
            On <strong>{formatLongDate(summary.deletion.scheduledFor)}</strong>{" "}
            your account, your Snaps and your Time Capsules will be permanently
            deleted. Until then your Snaps are hidden from everyone.
          </p>

          <p>
            Changed your mind? Cancel now and everything comes back exactly as
            you left it.
          </p>

          {error && (
            <p className="settings__msg settings__msg--error" role="alert">
              {error}
            </p>
          )}

          <div className="settings__actions">
            <button
              type="button"
              className="settings__btn"
              onClick={handleCancel}
              disabled={busy}
            >
              {busy ? "Please wait…" : "Cancel deletion and keep my account"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- admins ----------
  if (summary.isAdmin) {
    return (
      <p className="settings__hint">
        Admin accounts can&apos;t be deleted from Settings. Please contact the
        team if you need yours removed.
      </p>
    );
  }

  // ---------- normal: explain, then confirm ----------
  return (
    <div className="settings__stack">
      <div className="settings__block">
        <h3>What happens when you delete your account</h3>

        <p className="settings__hint">
          Deleting your account is permanent. Here is exactly what will happen
          to your data and your memories.
        </p>

        <ol className="settings__timeline">
          <li>
            <strong>Right away</strong>
            <p>
              All your Snaps are hidden from the wall, share links and other
              people&apos;s lists. You can still sign in.
            </p>
          </li>

          <li>
            <strong>For {summary.graceDays} days</strong>
            <p>
              Nothing is deleted yet. Sign in and press &ldquo;Cancel
              deletion&rdquo; and everything is restored. You can&apos;t buy
              new spaces during this time.
            </p>
          </li>

          <li>
            <strong>After {summary.graceDays} days</strong>
            <p>
              Your account is permanently deleted. This cannot be undone and we
              cannot bring anything back.
            </p>
          </li>
        </ol>
      </div>

      <div className="settings__block">
        <h3>What will be permanently deleted</h3>

        <ul className="settings__list">
          <li>
            Your memories:{" "}
            <strong>
              {summary.snaps > 0
                ? `${plural(summary.snaps, "Snap")}`
                : "all your Snaps"}
            </strong>{" "}
            with their photos, captions and places.
          </li>

          {summary.sealedCapsules > 0 && (
            <li>
              <strong>{plural(summary.sealedCapsules, "sealed Time Capsule")}</strong>{" "}
              will be deleted without ever opening.
            </li>
          )}

          <li>
            The spaces your Snaps use go back on the wall and anyone can take
            them. <strong>There is no refund</strong> for deleted Snaps.
          </li>

          <li>Your profile, username, photo and bio. Your username becomes available to others.</li>
          <li>Your likes, saves and notifications.</li>
          <li>Your sign-in. You will not be able to log in again.</li>
        </ul>
      </div>

      <div className="settings__block">
        <h3>What we keep</h3>

        <ul className="settings__list">
          <li>
            Payment records, for accounting and tax rules. They have no profile
            attached once your account is gone.
          </li>
          <li>
            Reports you made and messages you sent to support, so moderation and
            help requests stay accurate.
          </li>
        </ul>
      </div>

      <form className="settings__block settings__danger" onSubmit={handleRequest}>
        <h3>Request account deletion</h3>

        <label className="settings__check">
          <input
            type="checkbox"
            checked={understood}
            onChange={(event) => {
              setUnderstood(event.target.checked);
              setError("");
            }}
          />
          <span>
            I understand my Snaps and memories will be permanently deleted after{" "}
            {summary.graceDays} days.
          </span>
        </label>

        <label className="settings__field">
          <span>
            Type <strong>{CONFIRM_WORD}</strong> to confirm
          </span>
          <input
            type="text"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value);
              setError("");
            }}
            autoComplete="off"
            placeholder={CONFIRM_WORD}
          />
        </label>

        {needsPassword ? (
          <label className="settings__field">
            <span>Your password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError("");
              }}
              autoComplete="current-password"
            />
          </label>
        ) : (
          <p className="settings__hint">
            You&apos;ll be asked to confirm with your Google account.
          </p>
        )}

        {error && (
          <p className="settings__msg settings__msg--error" role="alert">
            {error}
          </p>
        )}

        <div className="settings__actions">
          <button
            type="submit"
            className="settings__btn settings__btn--danger"
            disabled={!ready || busy}
          >
            {busy ? "Please wait…" : "Request account deletion"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeleteAccountSection;