import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import {
  getMyProfile,
  updateMyProfile,
  checkUsernameAvailable,
} from "../../services/userService";

import { uploadProfileImage } from "../../services/storageService";

import "./EditProfile.css";

// Limits — the same ones the backend enforces (profileService.js).
const MAX_NAME = 50;
const MAX_BIO = 160;
const MAX_USERNAME = 20; // CHANGED: was 30, but the server only accepts 3–20
const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

// Same limits as storageService.js, checked here so the person gets
// feedback the moment they pick a file instead of after pressing Save.
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function EditProfile() {
  const { currentUser, loading: authLoading, refreshProfile } = useAuth();

  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const previewRef = useRef(""); // blob: URL we created (so we can free it)
  const redirectRef = useRef(null);

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    photoURL: "",
  });

  // What was loaded from the server — used to know if anything changed.
  const [initial, setInitial] = useState(null);

  const [image, setImage] = useState(null);
  const [previewURL, setPreviewURL] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // { username, available } for the last username we checked
  const [availability, setAvailability] = useState(null);

  // ---------- load ----------
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function loadProfile() {
      try {
        const profile = await getMyProfile();

        const loaded = {
          username: profile.username || "",
          displayName: profile.displayName || "",
          bio: profile.bio || "",
          photoURL: profile.photoURL || "",
        };

        setForm(loaded);
        setInitial(loaded);
        setPreviewURL(loaded.photoURL);
      } catch (err) {
        console.error("Failed to load profile:", err);

        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [currentUser, authLoading, navigate]);

  // Free the temporary preview + cancel the redirect if we leave early.
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      if (redirectRef.current) clearTimeout(redirectRef.current);
    },
    []
  );

  // ---------- username ----------
  const normalizedUsername = form.username.trim().toLowerCase();
  const isValidFormat = USERNAME_REGEX.test(normalizedUsername);
  const usernameChanged =
    initial !== null && normalizedUsername !== initial.username;

  // Live availability (only when it changed and looks valid).
  useEffect(() => {
    if (!usernameChanged || !isValidFormat) return undefined;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(normalizedUsername);

        if (!cancelled) {
          setAvailability({
            username: normalizedUsername,
            available: result.available,
          });
        }
      } catch (err) {
        console.error("Username check failed:", err);

        if (!cancelled) {
          setAvailability({ username: normalizedUsername, available: null });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedUsername, usernameChanged, isValidFormat]);

  // empty | unchanged | invalid | checking | available | taken | unknown
  const usernameStatus = useMemo(() => {
    if (!normalizedUsername) return "empty";
    if (!usernameChanged) return "unchanged";
    if (!isValidFormat) return "invalid";

    if (!availability || availability.username !== normalizedUsername) {
      return "checking";
    }

    if (availability.available === true) return "available";
    if (availability.available === false) return "taken";

    return "unknown"; // check failed — the server re-checks on save
  }, [normalizedUsername, usernameChanged, isValidFormat, availability]);

  // ---------- handlers ----------
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setSuccess("");
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    // allow picking the same file again later
    event.target.value = "";

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("Only JPG, PNG, and WebP images are allowed.");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image size must be 5 MB or less.");
      return;
    }

    setError("");
    setSuccess("");
    setImage(file);

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);

    previewRef.current = URL.createObjectURL(file);
    setPreviewURL(previewRef.current);
  }

  const hasChanges =
    initial !== null &&
    (image !== null ||
      normalizedUsername !== initial.username ||
      form.displayName.trim() !== initial.displayName ||
      form.bio.trim() !== initial.bio);

  const usernameBlocks =
    usernameStatus === "empty" ||
    usernameStatus === "invalid" ||
    usernameStatus === "checking" ||
    usernameStatus === "taken";

  const canSave =
    hasChanges &&
    !saving &&
    !usernameBlocks &&
    form.displayName.trim().length > 0;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!currentUser) {
      setError("Please login first.");
      return;
    }

    if (!canSave) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Final availability check before uploading anything.
      if (usernameChanged) {
        const check = await checkUsernameAvailable(normalizedUsername);

        if (!check.available) {
          setAvailability({ username: normalizedUsername, available: false });
          setError("That username is already taken.");
          return;
        }
      }

      let photoURL = form.photoURL;

      if (image) {
        const uploadResult = await uploadProfileImage(image, currentUser.uid);

        photoURL = uploadResult.downloadURL;
      }

      await updateMyProfile({
        username: normalizedUsername,
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        photoURL,
      });

      // NEW: refresh the app-wide profile so the sidebar / navbar show
      // the new name and photo straight away (no page reload needed).
      try {
        await refreshProfile?.();
      } catch {
        /* not critical — the profile page reloads its own copy */
      }

      setSuccess("Profile updated. Taking you back…");

      redirectRef.current = setTimeout(() => navigate("/profile"), 800);
    } catch (err) {
      console.error("Profile update failed:", err);

      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return <p className="editprofile__note">Loading profile…</p>;
  }

  const shownName = form.displayName || form.username;

  return (
    <div className="editprofile">
      <header className="editprofile__header">
        <h1>Edit profile</h1>
        <p>Update how you appear on SnapWall.</p>
      </header>

      {error && (
        <div className="editprofile__alert editprofile__alert--error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="editprofile__alert editprofile__alert--success" role="status">
          <FiCheckCircle />
          <span>{success}</span>
        </div>
      )}

      <form className="editprofile__form" onSubmit={handleSubmit} noValidate>
        {/* ---------- photo ---------- */}
        <section className="editprofile__photo">
          <button
            type="button"
            className="editprofile__avatar"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change profile photo"
          >
            {previewURL ? (
              <img src={previewURL} alt="Profile preview" />
            ) : (
              <span className="editprofile__initials">
                {getInitials(shownName)}
              </span>
            )}

            <span className="editprofile__camera">
              <FiCamera />
            </span>
          </button>

          <div className="editprofile__photo-text">
            <strong>{form.username ? `@${form.username}` : "Your photo"}</strong>

            <button
              type="button"
              className="editprofile__link"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewURL ? "Change photo" : "Add photo"}
            </button>

            <small>JPG, PNG or WebP · up to 5 MB</small>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            hidden
          />
        </section>

        {/* ---------- display name ---------- */}
        <div className="editprofile__field">
          <div className="editprofile__label-row">
            <label htmlFor="displayName">Name</label>
            <span>
              {form.displayName.length}/{MAX_NAME}
            </span>
          </div>

          <input
            id="displayName"
            name="displayName"
            type="text"
            value={form.displayName}
            onChange={handleChange}
            maxLength={MAX_NAME}
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        {/* ---------- username ---------- */}
        <div className="editprofile__field">
          <div className="editprofile__label-row">
            <label htmlFor="username">Username</label>
            <span>
              {form.username.length}/{MAX_USERNAME}
            </span>
          </div>

          <div
            className={`editprofile__input-wrap ${
              usernameStatus === "invalid" || usernameStatus === "taken"
                ? "is-bad"
                : usernameStatus === "available"
                ? "is-good"
                : ""
            }`}
          >
            <span className="editprofile__prefix">@</span>

            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              maxLength={MAX_USERNAME}
              placeholder="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
            />

            <span className="editprofile__status" aria-hidden="true">
              {usernameStatus === "checking" && (
                <FiLoader className="editprofile__spin" />
              )}
              {usernameStatus === "available" && <FiCheckCircle />}
              {(usernameStatus === "taken" ||
                usernameStatus === "invalid") && <FiAlertCircle />}
            </span>
          </div>

          <p
            className={`editprofile__hint ${
              usernameStatus === "taken" || usernameStatus === "invalid"
                ? "is-bad"
                : usernameStatus === "available"
                ? "is-good"
                : ""
            }`}
          >
            {usernameStatus === "invalid" &&
              "3–20 characters: letters, numbers, dot or underscore."}
            {usernameStatus === "checking" && "Checking availability…"}
            {usernameStatus === "available" && "Great — that username is available."}
            {usernameStatus === "taken" && "That username is already taken."}
            {usernameStatus === "unknown" &&
              "Couldn't check availability — we'll verify when you save."}
            {(usernameStatus === "empty" ||
              usernameStatus === "unchanged") &&
              "Letters, numbers, dot or underscore. Saved in lowercase."}
          </p>
        </div>

        {/* ---------- bio ---------- */}
        <div className="editprofile__field">
          <div className="editprofile__label-row">
            <label htmlFor="bio">Bio</label>
            <span>
              {form.bio.length}/{MAX_BIO}
            </span>
          </div>

          <textarea
            id="bio"
            name="bio"
            value={form.bio}
            onChange={handleChange}
            maxLength={MAX_BIO}
            rows={4}
            placeholder="Tell people a little about yourself…"
          />
        </div>

        {/* ---------- actions ---------- */}
        <div className="editprofile__actions">
          <button
            type="button"
            className="editprofile__btn editprofile__btn--ghost"
            onClick={() => navigate("/profile")}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="editprofile__btn editprofile__btn--primary"
            disabled={!canSave}
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditProfile;