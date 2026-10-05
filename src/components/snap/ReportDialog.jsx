import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaFlag } from "react-icons/fa";
import { HiCheck } from "react-icons/hi";

import "./ReportDialog.css";

const REASONS = [
  {
    value: "inappropriate",
    label: "Inappropriate content",
    hint: "Nudity, violence or anything offensive",
  },
  {
    value: "harassment",
    label: "Harassment or hate",
    hint: "Targets or attacks a person or group",
  },
  {
    value: "spam",
    label: "Spam or scam",
    hint: "Ads, fake offers or misleading posts",
  },
  {
    value: "copyright",
    label: "Copyright",
    hint: "Uses someone else's photo or work",
  },
  {
    value: "other",
    label: "Something else",
    hint: "It doesn't fit the options above",
  },
];

// Confirmation step for "Report this Snap".
// onSubmit(reason) must return a promise; it throws on failure.
function ReportDialog({ onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" && !sending) onClose();
    }

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, sending]);

  async function handleConfirm() {
    if (sending || !reason) return;

    try {
      setSending(true);
      setError("");

      await onSubmit(reason);

      setDone(true);
    } catch (err) {
      setError(err.message || "Unable to send your report.");
    } finally {
      setSending(false);
    }
  }

  // Rendered in a portal so it sits above the Snap pop-up. Clicks must not
  // bubble through to the pop-up's backdrop (React bubbles through portals).
  return createPortal(
    <div
      className="reportdlg-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        event.stopPropagation();
        if (!sending) onClose();
      }}
    >
      <div
        className="reportdlg"
        onClick={(event) => event.stopPropagation()}
      >
        {done ? (
          <div className="reportdlg__center">
            <span className="reportdlg__icon reportdlg__icon--ok">
              <HiCheck />
            </span>

            <h3 className="reportdlg__title">Report sent</h3>

            <p className="reportdlg__text">
              Thanks for helping keep SnapWall friendly. Our team will review
              this Snap.
            </p>

            <button
              type="button"
              className="reportdlg__btn reportdlg__btn--dark"
              onClick={onClose}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="reportdlg__center">
              <span className="reportdlg__icon">
                <FaFlag />
              </span>

              <h3 className="reportdlg__title">Report this Snap?</h3>

              <p className="reportdlg__text">
                Tell us what's wrong. Your report goes to our admin team for
                review, and the owner won't know it was you.
              </p>
            </div>

            <div className="reportdlg__reasons" role="radiogroup">
              {REASONS.map((item) => (
                <label
                  key={item.value}
                  className={`reportdlg__reason ${
                    reason === item.value ? "is-selected" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    disabled={sending}
                  />

                  <span className="reportdlg__dot" aria-hidden="true" />

                  <span className="reportdlg__reason-text">
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </label>
              ))}
            </div>

            {error && <p className="reportdlg__error">{error}</p>}

            <div className="reportdlg__buttons">
              <button
                type="button"
                className="reportdlg__btn"
                onClick={onClose}
                disabled={sending}
              >
                Cancel
              </button>

              <button
                type="button"
                className="reportdlg__btn reportdlg__btn--danger"
                onClick={handleConfirm}
                disabled={sending || !reason}
              >
                {sending ? "Sending..." : "Report"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

export default ReportDialog;