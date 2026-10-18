import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import {
  getPrivacySettings,
  savePrivacySettings,
} from "../../../services/accountService";

// The switches. `key` = the field the backend stores (privacyService.js).
const CONTROLS = [
  {
    key: "showPhoto",
    title: "Show my profile photo",
    text: "Your photo appears next to your Snaps when other people see them in their Liked and Saved lists. Turn off to show your initials instead.",
  },
  {
    key: "showLocation",
    title: "Show the place on my Snaps",
    text: "The place you tagged appears on your Snaps on the wall. Turn off to hide it from everyone else — you will still see it on your own Snaps.",
  },
  {
    key: "notifyOnLikes",
    title: "Notify me when someone likes my Snap",
    text: "Get a notification each time a person likes one of your Snaps.",
  },
];

function formatJoined(value) {
  // Firestore Timestamp (has toDate) or nothing
  const date = value?.toDate ? value.toDate() : null;

  return date
    ? date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function PrivacySection() {
  const { currentUser, profile } = useAuth();

  const [privacy, setPrivacy] = useState(null);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getPrivacySettings()
      .then((result) => {
        if (!cancelled) setPrivacy(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Couldn't load your privacy settings.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The switch moves immediately; if saving fails it moves back.
  async function handleToggle(key) {
    if (!privacy || saving) return;

    const next = !privacy[key];

    setPrivacy((previous) => ({ ...previous, [key]: next }));
    setSaving(key);
    setError("");

    try {
      setPrivacy(await savePrivacySettings({ [key]: next }));
    } catch (err) {
      setPrivacy((previous) => ({ ...previous, [key]: !next }));
      setError(err.message || "Couldn't save that change. Please try again.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="settings__stack">
      {/* ---------- who sees what ---------- */}
      <div className="settings__block">
        <h3>What other people can see</h3>

        <p className="settings__hint">
          Always visible: your username and the Snaps you post on the wall.
          Never shown to other people: your email address, bio and payments.
        </p>

        {error && (
          <p className="settings__msg settings__msg--error" role="alert">
            {error}
          </p>
        )}

        {!privacy && !error && <p className="settings__hint">Loading…</p>}

        {privacy && (
          <ul className="settings__switches">
            {CONTROLS.map(({ key, title, text }) => (
              <li key={key} className="settings__switch">
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={privacy[key]}
                  aria-label={title}
                  className={`settings__toggle${privacy[key] ? " is-on" : ""}`}
                  onClick={() => handleToggle(key)}
                  disabled={saving === key}
                >
                  <span />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- personal information ---------- */}
      <div className="settings__block">
        <h3>Your personal information</h3>

        <p className="settings__hint">
          This is what we store about you. Your email is only used to sign you
          in and to contact you.
        </p>

        <ul className="settings__rows">
          <li>
            <span>Email</span>
            <strong>{currentUser?.email || "—"}</strong>
          </li>

          <li>
            <span>Name</span>
            <strong>{profile?.displayName || "—"}</strong>
          </li>

          <li>
            <span>Username</span>
            <strong>{profile?.username ? `@${profile.username}` : "—"}</strong>
          </li>

          <li>
            <span>Bio</span>
            <strong>{profile?.bio || "—"}</strong>
          </li>

          <li>
            <span>Joined</span>
            <strong>{formatJoined(profile?.createdAt)}</strong>
          </li>
        </ul>

        <div className="settings__actions">
          <Link to="/profile/edit" className="settings__btn settings__btn--ghost">
            Edit profile
          </Link>
        </div>
      </div>
    </div>
  );
}

export default PrivacySection;