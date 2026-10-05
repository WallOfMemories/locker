import { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";

import LocationPicker from "./LocationPicker";
import LockerPicker, { MIN_LOCK_MINUTES } from "./LockerPicker";
import { updateSnap } from "../../services/snapService";
import { toLocalInputValue } from "../../utils/countdown";

import "./EditSnapDialog.css";

const MAX_CAPTION = 100; // keep in sync with CreateSnap.jsx + snapController.js

// Saved location -> the shape LocationPicker works with.
function toPickerValue(location) {
  if (!location?.name) return null;

  return {
    id: location.placeId || `saved-${location.name}`,
    name: location.name,
    address: location.address || "",
    lat: location.lat ?? null,
    lng: location.lng ?? null,
  };
}

function sameLocation(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;

  return (
    a.name === b.name &&
    (a.address || "") === (b.address || "") &&
    (a.lat ?? null) === (b.lat ?? null) &&
    (a.lng ?? null) === (b.lng ?? null)
  );
}

/**
 * Edit pop-up. Only caption + location can change on a Snap.
 * A Time Capsule that is still sealed can also change its unlock time.
 */
function EditSnapDialog({ snap, onClose, onSaved }) {
  const isCapsule = snap.type === "capsule";

  const unlockMs = new Date(snap.unlockAt).getTime();
  const canEditTime =
    isCapsule &&
    snap.status === "locked" &&
    Number.isFinite(unlockMs) &&
    unlockMs > Date.now();

  const initialLocation = toPickerValue(snap.location);
  const initialUnlock = canEditTime
    ? toLocalInputValue(new Date(snap.unlockAt))
    : "";

  const [caption, setCaption] = useState(snap.caption || "");
  const [location, setLocation] = useState(initialLocation);
  const [unlockAt, setUnlockAt] = useState(initialUnlock);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape" && !saving) onClose();
    }

    document.addEventListener("keydown", handleKey);

    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose, saving]);

  const captionChanged = caption.trim() !== (snap.caption || "").trim();
  const locationChanged = !sameLocation(location, initialLocation);
  const timeChanged = canEditTime && unlockAt !== initialUnlock;

  const unlockDate = unlockAt ? new Date(unlockAt) : null;
  const timeInvalid =
    canEditTime &&
    timeChanged &&
    (!unlockDate ||
      Number.isNaN(unlockDate.getTime()) ||
      unlockDate.getTime() < Date.now() + MIN_LOCK_MINUTES * 60000);

  const hasChanges = captionChanged || locationChanged || timeChanged;

  async function handleSave(event) {
    event.preventDefault();

    if (!hasChanges || timeInvalid || saving) return;

    const changes = {};

    if (captionChanged) changes.caption = caption.trim();
    if (locationChanged) changes.location = location; // null removes it
    if (timeChanged) changes.unlockAt = unlockDate.toISOString();

    try {
      setSaving(true);
      setError("");

      const data = await updateSnap(snap.id, changes);

      onSaved(data.snap);
    } catch (err) {
      setError(err.message || "Failed to save changes.");
      setSaving(false);
    }
  }

  return (
    <div
      className="editsnap"
      role="dialog"
      aria-modal="true"
      aria-label={isCapsule ? "Edit Time Capsule" : "Edit Snap"}
      onClick={() => !saving && onClose()}
    >
      <form
        className="editsnap__card"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <header className="editsnap__head">
          <h2>{isCapsule ? "Edit Time Capsule" : "Edit Snap"}</h2>

          <button
            type="button"
            className="editsnap__close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <FiX />
          </button>
        </header>

        <div className="editsnap__body">
          <section className="editsnap__section">
            <div className="editsnap__label-row">
              <label htmlFor="edit-caption">Caption</label>
              <span>
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>

            <textarea
              id="edit-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={MAX_CAPTION}
              rows={3}
              placeholder="Write something about this memory..."
            />
          </section>

          <section className="editsnap__section">
            <div className="editsnap__label-row">
              <span className="editsnap__label">Location</span>
              <span>Optional</span>
            </div>

            <LocationPicker value={location} onChange={setLocation} />
          </section>

          {isCapsule && (
            <section className="editsnap__section">
              {canEditTime ? (
                <LockerPicker value={unlockAt} onChange={setUnlockAt} />
              ) : (
                <p className="editsnap__note">
                  This capsule has already opened, so its unlock time can't be
                  changed.
                </p>
              )}
            </section>
          )}

          {error && (
            <p className="editsnap__error" role="alert">
              {error}
            </p>
          )}
        </div>

        <footer className="editsnap__foot">
          <button
            type="button"
            className="editsnap__btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="editsnap__btn editsnap__btn--primary"
            disabled={!hasChanges || timeInvalid || saving}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default EditSnapDialog;