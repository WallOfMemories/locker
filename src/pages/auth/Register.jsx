import React, { useEffect, useRef, useState } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Link } from "react-router-dom";
import { FaEye, FaEyeSlash } from "react-icons/fa";

import { auth } from "../../services/firebase";
import { signInWithGoogle } from "../../services/authService";

import img1 from "../../assets/image-1.png";
import img2 from "../../assets/image-2.png";
import img3 from "../../assets/image-3.png";
import img4 from "../../assets/image-4.png";
import img5 from "../../assets/image-5.png";

import "./Auth.css";

// Same wall as Login — position, pointer-parallax depth, resting tilt, and
// (for the ones set further back) a soft blur + smaller size for real depth.
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

const TAGLINE = "Pin your first\nmemory.";

function Register() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      );
      // Profile doc is created in AuthContext; redirect is
      // handled by PublicOnlyRoute.
    } catch (error) {
      console.error("Register error:", error);

      switch (error.code) {
        case "auth/email-already-in-use":
          setError("An account with this email already exists.");
          break;

        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;

        case "auth/weak-password":
          setError("Password should be at least 6 characters.");
          break;

        case "auth/network-request-failed":
          setError("Network error. Please check your connection.");
          break;

        default:
          setError("Unable to create account. Please try again.");
      }

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
        console.error("Google sign-up error:", error);
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
        <p className="wall-subtitle">Start creating and sharing your memories</p>
      </div>

      {/* The form, styled as one pinned instant-print */}
      <div className="login-stage">
        <div className={`photo-card ${settled ? "is-settled" : ""}`}>
          <span className="pin" aria-hidden="true" />

          <div className="photo-card__body">
            <p className="photo-card__eyebrow">WELCOME TO SNAPWALL</p>
            <h2 className="photo-card__title">Create your account</h2>
            <p className="photo-card__desc">Start creating and sharing your memories.</p>

            {error && <div className="auth-error">{error}</div>}

            <form onSubmit={handleSubmit} className="field-stack">
              <label className="field">
                <span className="field__label">Email</span>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
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
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    minLength={6}
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

              <label className="field">
                <span className="field__label">Confirm password</span>
                <div className="field__control">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    minLength={6}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                className={`btn-primary ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-primary__shutter" aria-hidden="true" />
                <span className="btn-primary__label">
                  {loading ? "Creating account…" : "Create account"}
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
              Sign up with Google
            </button>

            <p className="photo-card__footer">
              Already have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;