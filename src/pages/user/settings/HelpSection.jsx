import { useState } from "react";

import { sendSupportRequest } from "../../../services/accountService";
import {
  FAQS,
  GUIDELINES,
  PROBLEM_CATEGORIES,
  SUPPORT_EMAIL,
} from "./settingsContent";

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

function HelpSection() {
  const [category, setCategory] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!category) {
      setError("Please choose what your message is about.");
      return;
    }

    if (message.trim().length < MIN_LENGTH) {
      setError(`Please tell us a little more (at least ${MIN_LENGTH} characters).`);
      return;
    }

    setBusy(true);
    setError("");

    try {
      await sendSupportRequest({ category, message: message.trim() });

      setSent(true);
      setCategory("");
      setMessage("");
    } catch (err) {
      setError(err.message || "Couldn't send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="settings__stack">
      {/* ---------- contact ---------- */}
      <div className="settings__block">
        <h3>Contact support</h3>

        <p className="settings__hint">
          Email us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="settings__link">
            {SUPPORT_EMAIL}
          </a>{" "}
          and we&apos;ll get back to you. For a problem with the app itself, the
          form below is quicker — it already knows who you are.
        </p>
      </div>

      {/* ---------- report a problem ---------- */}
      <div className="settings__block">
        <h3>Report a problem</h3>

        {sent ? (
          <p className="settings__msg settings__msg--ok">
            Thanks — your message has reached us. We&apos;ll reply to the email on
            your account.{" "}
            <button
              type="button"
              className="settings__linkbtn"
              onClick={() => setSent(false)}
            >
              Send another
            </button>
          </p>
        ) : (
          <form className="settings__form" onSubmit={handleSubmit}>
            <label className="settings__field">
              <span>What is it about?</span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setError("");
                }}
              >
                <option value="">Choose…</option>

                {PROBLEM_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="settings__field">
              <span>Tell us what happened</span>
              <textarea
                rows={5}
                maxLength={MAX_LENGTH}
                value={message}
                onChange={(event) => {
                  setMessage(event.target.value);
                  setError("");
                }}
                placeholder="What did you do, and what did you expect to happen?"
              />
              <small>
                {message.length}/{MAX_LENGTH}
              </small>
            </label>

            {error && (
              <p className="settings__msg settings__msg--error" role="alert">
                {error}
              </p>
            )}

            <div className="settings__actions">
              <button type="submit" className="settings__btn" disabled={busy}>
                {busy ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ---------- FAQs ---------- */}
      <div className="settings__block">
        <h3>FAQs</h3>

        <div className="settings__faqs">
          {FAQS.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>

      {/* ---------- community guidelines ---------- */}
      <div className="settings__block">
        <h3>Community guidelines</h3>

        <p className="settings__hint">
          SnapWall is a shared wall, so a few simple rules keep it a nice place
          for everyone:
        </p>

        <ul className="settings__list">
          {GUIDELINES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default HelpSection;