import React, { useEffect, useRef, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Link, useNavigate } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { auth } from "../../services/firebase";
import {
  resolveLoginEmail,
  signInWithGoogle,
} from "../../services/authService";

import img1 from "../../assets/image-1.png";
import img2 from "../../assets/image-2.png";
import img3 from "../../assets/image-3.png";
import img4 from "../../assets/image-4.png";
import img5 from "../../assets/image-5.png";

import "./Auth.css";

// Each pin on the wall: position, how far it drifts with the pointer (depth),
// its resting tilt (rot), and — for the ones set further back — a soft blur
// and smaller size so the wall reads with real depth, not one flat layer.
// A few reuse the same five photos with a different crop (objectPos) so the
// wall feels full without needing more source images.
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

const TAGLINE = "Capture. Share.\nEnjoy.";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    identifier: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

    // Typewriter reveal of the tagline
    let i = 0;
    const typeInterval = setInterval(() => {
      i += 1;
      setTyped(TAGLINE.slice(0, i));
      if (i >= TAGLINE.length) clearInterval(typeInterval);
    }, 55);

    // Occasional camera-flash on a random wall photo, like the room is still snapping pictures
    const flashInterval = setInterval(() => {
      const next = Math.floor(Math.random() * wallPhotos.length);
      setFlashIndex(next);
      setTimeout(() => setFlashIndex(null), 550);
    }, 3200);

    // Pointer parallax across the whole wall + card
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

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  function getErrorMessage(error) {
    switch (error.code) {
      case "app/username-not-found":
        return "No account found with this username.";

      case "auth/invalid-credential":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Account not found or incorrect password.";

      case "auth/invalid-email":
        return "Please enter a valid email address.";

      case "auth/too-many-requests":
        return "Too many failed attempts. Please try again later.";

      case "auth/network-request-failed":
        return "Network error. Please check your connection.";

      default:
        return error.message || "Unable to login. Please try again.";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const email = await resolveLoginEmail(form.identifier);

      await signInWithEmailAndPassword(auth, email, form.password);
      // Redirect is handled by PublicOnlyRoute.
    } catch (error) {
      console.error("Login error:", error);
      setError(getErrorMessage(error));
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      if (
        error.code !== "auth/popup-closed-by-user" &&
        error.code !== "auth/cancelled-popup-request"
      ) {
        console.error("Google login error:", error);
        setError("Google sign-in failed. Please try again.");
      }
      setLoading(false);
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
        <p className="wall-subtitle">Start sharing your moments with the world</p>
      </div>

      {/* The form, styled as one pinned instant-print */}
      <div className="login-stage">
        <div className={`photo-card ${settled ? "is-settled" : ""}`}>
          <span className="pin" aria-hidden="true" />

          <div className="photo-card__body">
            <p className="photo-card__eyebrow">SnapWall</p>
            <h2 className="photo-card__title">Welcome back</h2>
            <p className="photo-card__desc">Sign in to manage your Snaps and profile.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="field-stack">
              <label className="field">
                <span className="field__label">Username or email</span>
                <input
                  type="text"
                  name="identifier"
                  value={form.identifier}
                  onChange={handleChange}
                  placeholder="username or you@example.com"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </label>

              <label className="field">
                <span className="field__label">Password</span>
                <div className="field__control">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Your password"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>

              <Link to="/forgot-password" className="field__forgot">
                Forgot password?
              </Link>

              <button
                type="submit"
                className={`btn-primary ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-primary__shutter" aria-hidden="true" />
                <span className="btn-primary__label">
                  {loading ? "Logging in…" : "Log in"}
                </span>
              </button>
            </form>

            <div className="divider">
              <span>or</span>
            </div>

            <button className="btn-google" onClick={handleGoogle} disabled={loading}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
              />
              Continue with Google
            </button>

            <p className="photo-card__footer">
              Don't have an account? <Link to="/register">Create account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;