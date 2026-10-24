import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import {
  checkUsernameAvailable,
  setupProfile,
} from "../../services/userService";
import { uploadProfileImage } from "../../services/storageService";

import img1 from "../../assets/image-1.png";
import img2 from "../../assets/image-2.png";
import img3 from "../../assets/image-3.png";
import img4 from "../../assets/image-4.png";
import img5 from "../../assets/image-5.png";

import "../auth/Auth.css";
import "./SetupProfile.css";

const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;

// Same wall as Login/Register — position, pointer-parallax depth, resting
// tilt, and (for the ones set further back) a soft blur + smaller size.
const wallPhotos = [
  { src: img1, top: "8%", left: "4%", width: 200, rot: -8, depth: 22, objectPos: "center" },
  { src: img2, top: "18%", left: "29%", width: 145, rot: 6, depth: 12, objectPos: "center" },
  { src: img3, top: "52%", left: "6%", width: 165, rot: 4, depth: 16, objectPos: "center" },
  { src: img4, top: "60%", left: "31%", width: 135, rot: -5, depth: 10, objectPos: "center" },
  { src: img5, top: "5%", left: "55%", width: 140, rot: 7, depth: 14, objectPos: "center" },
  { src: img5, top: "74%", left: "3%", width: 155, rot: -4, depth: 18, objectPos: "top" },
  { src: img3, top: "36%", left: "45%", width: 120, rot: 9, depth: 9, objectPos: "bottom", distant: true },
  { src: img2, top: "2%", left: "80%", width: 115, rot: -10, depth: 7, objectPos: "left", distant: true },
  { src: img4, top: "80%", left: "60%", width: 120, rot: 8, depth: 8, objectPos: "right", distant: true },
  { src: img1, top: "38%", left: "83%", width: 105, rot: 5, depth: 6, objectPos: "bottom", distant: true },
  { src: img1, top: "70%", left: "40%", width: 110, rot: -7, depth: 11, objectPos: "left", distant: true },
];

const TAGLINE = "Make it\nyours.";

function SetupProfile() {
  const navigate = useNavigate();

  const { currentUser, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(
    profile?.displayName || ""
  );
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    profile?.photoURL || ""
  );

  // { username, available } for the last checked username.
  const [availability, setAvailability] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdProfile, setCreatedProfile] = useState(null);

  const [settled, setSettled] = useState(false);
  const [typed, setTyped] = useState("");
  const [flashIndex, setFlashIndex] = useState(null);

  const pageRef = useRef(null);
  const reducedMotion = useRef(false);
  const rafId = useRef(null);

  // Single orchestrated entrance: the card "pins" itself to the wall on mount.
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Respect reduced-motion: skip the pointer parallax, the flash bulbs and the typewriter.
  useEffect(() => {
    reducedMotion.current =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion.current) {
      setTyped(TAGLINE);
      return;
    }

    let i = 0;
    const typeInterval = setInterval(() => {
      i += 1;
      setTyped(TAGLINE.slice(0, i));
      if (i >= TAGLINE.length) clearInterval(typeInterval);
    }, 55);

    const flashInterval = setInterval(() => {
      const next = Math.floor(Math.random() * wallPhotos.length);
      setFlashIndex(next);
      setTimeout(() => setFlashIndex(null), 550);
    }, 3200);

    const handleMove = (e) => {
      if (rafId.current) return;
      rafId.current = requestAnimationFrame(() => {
        const mx = (e.clientX / window.innerWidth - 0.5) * 2;
        const my = (e.clientY / window.innerHeight - 0.5) * 2;
        if (pageRef.current) {
          pageRef.current.style.setProperty("--mx", mx.toFixed(3));
          pageRef.current.style.setProperty("--my", my.toFixed(3));
        }
        rafId.current = null;
      });
    };
    window.addEventListener("mousemove", handleMove);

    return () => {
      clearInterval(typeInterval);
      clearInterval(flashInterval);
      window.removeEventListener("mousemove", handleMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, []);

  const normalizedUsername = username.trim().toLowerCase();
  const isValidFormat = USERNAME_REGEX.test(normalizedUsername);

  // Live username availability check (debounced).
  useEffect(() => {
    if (!isValidFormat) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      try {
        const result = await checkUsernameAvailable(
          normalizedUsername
        );

        if (!cancelled) {
          setAvailability({
            username: normalizedUsername,
            available: result.available,
          });
        }
      } catch (error) {
        console.error("Username check failed:", error);

        if (!cancelled) {
          setAvailability({
            username: normalizedUsername,
            available: null,
          });
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [normalizedUsername, isValidFormat]);

  const usernameStatus = useMemo(() => {
    if (!normalizedUsername) return "empty";
    if (!isValidFormat) return "invalid";

    if (availability?.username !== normalizedUsername) {
      return "checking";
    }

    if (availability.available === true) return "available";
    if (availability.available === false) return "taken";

    return "unknown";
  }, [normalizedUsername, isValidFormat, availability]);

  const statusMessage = {
    empty: "",
    invalid:
      "3-20 characters: letters, numbers, dot or underscore.",
    checking: "Checking availability...",
    available: "Username is available.",
    taken: "That username is already taken.",
    unknown: "",
  }[usernameStatus];

  async function handleContinue() {
    try {
      await refreshProfile();
    } catch (error) {
      console.error("Failed to refresh profile:", error);
    }

    navigate("/", { replace: true });
  }

  // Success screen, then on to the main site.
  useEffect(() => {
    if (!createdProfile) return;

    const timer = setTimeout(handleContinue, 3000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdProfile]);

  // Already finished setup (and not on the success screen).
  if (profile?.username && !createdProfile) {
    return <Navigate to="/" replace />;
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!isValidFormat) {
      setError(
        "Username must be 3-20 characters: letters, numbers, dot or underscore."
      );
      return;
    }

    if (usernameStatus === "taken") {
      setError("That username is already taken.");
      return;
    }

    try {
      setSaving(true);

      // Final availability check before uploading the image.
      const check = await checkUsernameAvailable(
        normalizedUsername
      );

      if (!check.available) {
        setAvailability({
          username: normalizedUsername,
          available: false,
        });
        setError("That username is already taken.");
        return;
      }

      let photoURL = profile?.photoURL || "";

      if (image) {
        const upload = await uploadProfileImage(
          image,
          currentUser.uid
        );

        photoURL = upload.downloadURL;
      }

      const saved = await setupProfile({
        displayName: displayName.trim(),
        username: normalizedUsername,
        bio: bio.trim(),
        photoURL,
      });

      setCreatedProfile(saved);
    } catch (error) {
      console.error("Profile setup failed:", error);

      setError(
        error.message ||
          "Failed to create profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-page" ref={pageRef}>
      {/* The wall: a dim room where snapshots are pinned up */}
      <div className="wall" aria-hidden="true">
        {wallPhotos.map((photo, i) => (
          <div
            key={i}
            className="wall-photo-slot"
            style={{
              top: photo.top,
              left: photo.left,
              width: photo.width,
              animationDelay: `${(i % 5) * 1.3}s`,
            }}
          >
            <div
              className={`photo-frame ${photo.distant ? "is-distant" : ""} ${
                flashIndex === i ? "is-flashing" : ""
              }`}
              style={{
                "--depth": photo.depth,
                "--rot": `${photo.rot}deg`,
              }}
            >
              <img
                src={photo.src}
                alt=""
                className="wall-photo"
                style={{ objectPosition: photo.objectPos }}
              />
            </div>
          </div>
        ))}
        <div className="wall-vignette" />
        <h1 className="wall-tagline">
          {typed}
          <span className="wall-tagline__cursor" aria-hidden="true" />
        </h1>
        <p className="wall-subtitle">One last step before you join the wall</p>
      </div>

      {/* The form, styled as one pinned instant-print */}
      <div className="login-stage">
        <div className={`photo-card setup-card ${settled ? "is-settled" : ""}`}>
          <span className="pin" aria-hidden="true" />

          {createdProfile ? (
            <div className="photo-card__body setup-success">
              <div className="setup-success__check">✓</div>

              <h2 className="photo-card__title">Profile created</h2>

              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Your profile"
                  className="setup-avatar setup-avatar--small"
                />
              )}

              <p className="setup-success__name">{createdProfile.displayName}</p>
              <p className="setup-success__username">@{createdProfile.username}</p>
              <p className="setup-success__hint">Taking you to SnapWall...</p>

              <button
                type="button"
                className="btn-primary setup-success__button"
                onClick={handleContinue}
              >
                <span className="btn-primary__label">Continue</span>
              </button>
            </div>
          ) : (
            <div className="photo-card__body">
              <p className="photo-card__eyebrow">ONE LAST STEP</p>
              <h2 className="photo-card__title">Set up your profile</h2>
              <p className="photo-card__desc">Tell us a little about yourself.</p>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="field-stack">
                <div className="setup-photo">
                  <div className="setup-avatar">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Profile preview" />
                    ) : (
                      <span>
                        {(displayName || currentUser?.email || "?")
                          .charAt(0)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>

                  <label className="setup-photo__button">
                    {previewUrl ? "Change photo" : "Choose photo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageChange}
                      hidden
                    />
                  </label>
                </div>

                <label className="field">
                  <span className="field__label">Name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    autoComplete="name"
                    disabled={saving}
                    required
                  />
                </label>

                <label className="field">
                  <span className="field__label">Username</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="username"
                    maxLength={20}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    disabled={saving}
                    required
                  />

                  {statusMessage && (
                    <small className={`setup-status setup-status--${usernameStatus}`}>
                      {statusMessage}
                    </small>
                  )}
                </label>

                <label className="field">
                  <span className="field__label">Bio</span>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Write something about yourself..."
                    maxLength={160}
                    rows={4}
                    disabled={saving}
                  />
                  <small className="setup-counter">{bio.length}/160</small>
                </label>

                <button
                  type="submit"
                  className={`btn-primary ${saving ? "is-loading" : ""}`}
                  disabled={saving || usernameStatus === "taken"}
                >
                  <span className="btn-primary__shutter" aria-hidden="true" />
                  <span className="btn-primary__label">
                    {saving ? "Creating profile…" : "Create profile"}
                  </span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupProfile;