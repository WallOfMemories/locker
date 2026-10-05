import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getIdToken } from "firebase/auth";
import {
  HiArrowLeft,
  HiPhotograph,
  HiCloudUpload,
  HiLightningBolt,
  HiClock,
  HiExclamationCircle,
  HiX,
} from "react-icons/hi";

import { uploadSnapImage } from "../../services/storageService";
import { useAuth } from "../../context/AuthContext";
import LocationPicker from "../../components/snap/LocationPicker";
import LockerPicker, {
  MIN_LOCK_MINUTES,
} from "../../components/snap/LockerPicker";
import { toLocalInputValue } from "../../utils/countdown";

import "./CreateSnap.css";

const SNAP_TYPES = [
  {
    value: "post",
    title: "Post Now",
    hint: "Show it on the wall right away",
    Icon: HiLightningBolt,
  },
  {
    value: "capsule",
    title: "Time Capsule",
    hint: "Lock it until a date you choose",
    Icon: HiClock,
  },
];

// CHANGED: caption limit is 100 characters (was 500). Keep in sync with the
// same limit in backend snapController.js.
const MAX_CAPTION = 100;

function CreateSnap() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const selectedSpace = location.state?.space;

  const [image, setImage] = useState(null);
  const [caption, setCaption] = useState("");
  const [snapType, setSnapType] = useState("post");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [dragging, setDragging] = useState(false);

  // NEW: where the photo was captured (optional) + locker date/time
  const [snapLocation, setSnapLocation] = useState(null);
  const [unlockAt, setUnlockAt] = useState(""); // "YYYY-MM-DDTHH:mm", local time

  // Free the preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!selectedSpace) {
    return (
      <main className="createsnap">
        <div className="createsnap__card createsnap__card--empty">
          <div className="createsnap__empty-icon">
            <HiPhotograph />
          </div>

          <h1 className="createsnap__title">No space selected</h1>

          <p className="createsnap__subtitle">
            Please select an available space from SnapWall first.
          </p>

          <button
            type="button"
            className="createsnap__btn createsnap__btn--primary"
            onClick={() => navigate("/wall")}
          >
            <HiArrowLeft />
            Back to SnapWall
          </button>
        </div>
      </main>
    );
  }

  function applyFile(file) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setImage(file);
    setError("");
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleImageChange(event) {
    applyFile(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    applyFile(event.dataTransfer.files?.[0]);
  }

  function handleRemoveImage() {
    setImage(null);
    setPreviewUrl("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // NEW: choosing Time Capsule opens the locker with a sensible default
  // (tomorrow, 9:00 AM) so the person only has to adjust it.
  function handleTypeChange(value) {
    setSnapType(value);
    setError("");

    if (value === "capsule" && !unlockAt) {
      const tomorrow = new Date();

      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      setUnlockAt(toLocalInputValue(tomorrow));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
      setError("Please login before creating a Snap.");
      return;
    }

    if (!image) {
      setError("Please select an image.");
      return;
    }

    // NEW: the locker needs a valid future time
    let unlockDate = null;

    if (snapType === "capsule") {
      unlockDate = unlockAt ? new Date(unlockAt) : null;

      if (!unlockDate || Number.isNaN(unlockDate.getTime())) {
        setError("Pick the date and time your Time Capsule should open.");
        return;
      }

      if (unlockDate.getTime() < Date.now() + MIN_LOCK_MINUTES * 60000) {
        setError(
          `Pick an unlock time at least ${MIN_LOCK_MINUTES} minutes from now.`
        );
        return;
      }
    }

    try {
      setUploading(true);
      setError("");

      const uploadResult = await uploadSnapImage(image, currentUser.uid);

      const idToken = await getIdToken(currentUser);

      const response = await fetch("http://localhost:5000/api/snaps", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },

        body: JSON.stringify({
          spaceId: selectedSpace.id,
          imageUrl: uploadResult.downloadURL,
          storagePath: uploadResult.storagePath,
          caption,
          snapType,

          // NEW
          location: snapLocation,
          unlockAt: unlockDate ? unlockDate.toISOString() : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create Snap.");
      }

      console.log("Snap created:", data);

      // A locked capsule isn't on the wall yet — show it in Time Capsules.
      navigate(snapType === "capsule" ? "/profile?tab=capsules" : "/wall");
    } catch (error) {
      console.error("Create Snap failed:", error);

      setError(error.message || "Failed to create Snap.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="createsnap">
      <div className="createsnap__card">
        <button
          type="button"
          className="createsnap__back"
          onClick={() => navigate("/wall")}
        >
          <HiArrowLeft />
          Back to wall
        </button>

        <header className="createsnap__header">
          <span className="createsnap__chip">
            Space <strong>{selectedSpace.id}</strong>
          </span>

          <h1 className="createsnap__title">Create your Snap</h1>

          <p className="createsnap__subtitle">
            Pick a photo, add a few words, and place your memory on SnapWall.
          </p>
        </header>

        {error && (
          <div className="createsnap__error" role="alert">
            <HiExclamationCircle />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="createsnap__form">
          {/* ---------- Photo ---------- */}
          <section className="createsnap__section">
            <span className="createsnap__label">Photo</span>

            <input
              ref={fileInputRef}
              id="snap-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="createsnap__file"
            />

            {previewUrl ? (
              <div className="createsnap__preview">
                <div className="createsnap__polaroid">
                  <img src={previewUrl} alt="Snap preview" />
                </div>

                <div className="createsnap__preview-actions">
                  <label
                    htmlFor="snap-image"
                    className="createsnap__btn createsnap__btn--soft"
                  >
                    Change photo
                  </label>

                  <button
                    type="button"
                    className="createsnap__btn createsnap__btn--ghost"
                    onClick={handleRemoveImage}
                  >
                    <HiX />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="snap-image"
                className={`createsnap__drop ${
                  dragging ? "is-dragging" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <span className="createsnap__drop-icon">
                  <HiCloudUpload />
                </span>

                <span className="createsnap__drop-title">
                  {dragging ? "Release to add your photo" : "Drop a photo here"}
                </span>

                <span className="createsnap__drop-hint">
                  or <u>browse from your device</u>
                </span>

                {/* NEW: same limits the upload enforces (storageService.js) */}
                <span className="createsnap__drop-note">
                  JPG, PNG or WebP · up to 5 MB
                </span>
              </label>
            )}
          </section>

          {/* ---------- Caption ---------- */}
          <section className="createsnap__section">
            <div className="createsnap__label-row">
              <label htmlFor="snap-caption" className="createsnap__label">
                Caption
              </label>

              <span className="createsnap__counter">
                {caption.length}/{MAX_CAPTION}
              </span>
            </div>

            <textarea
              id="snap-caption"
              className="createsnap__textarea"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Write something about this memory..."
              maxLength={MAX_CAPTION}
              rows={4}
            />
          </section>

          {/* ---------- Location (NEW) ---------- */}
          <section className="createsnap__section">
            <div className="createsnap__label-row">
              <span className="createsnap__label">Location</span>
              <span className="createsnap__counter">Optional</span>
            </div>

            <LocationPicker value={snapLocation} onChange={setSnapLocation} />
          </section>

          {/* ---------- Snap type ---------- */}
          <section className="createsnap__section">
            <span className="createsnap__label">Snap type</span>

            <div className="createsnap__types">
              {SNAP_TYPES.map(({ value, title, hint, Icon }) => (
                <label
                  key={value}
                  className={`createsnap__type ${
                    snapType === value ? "is-active" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="snapType"
                    value={value}
                    checked={snapType === value}
                    onChange={() => handleTypeChange(value)}
                    className="createsnap__type-input"
                  />

                  <span className="createsnap__type-icon">
                    <Icon />
                  </span>

                  <span className="createsnap__type-title">{title}</span>
                  <span className="createsnap__type-hint">{hint}</span>
                </label>
              ))}
            </div>
          </section>

          {/* ---------- Locker (NEW — Time Capsule only) ---------- */}
          {snapType === "capsule" && (
            <LockerPicker value={unlockAt} onChange={setUnlockAt} />
          )}

          {/* ---------- Actions ---------- */}
          <div className="createsnap__actions">
            <button
              type="button"
              className="createsnap__btn createsnap__btn--ghost"
              onClick={() => navigate("/wall")}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="createsnap__btn createsnap__btn--primary"
              disabled={uploading}
            >
              {uploading && <span className="createsnap__spinner" />}
              {uploading
                ? "Uploading..."
                : snapType === "capsule"
                ? "Lock Snap"
                : "Post Snap"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default CreateSnap;