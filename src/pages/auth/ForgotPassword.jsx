import React, { useEffect, useRef, useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { Link } from "react-router-dom";

import { auth } from "../../services/firebase";
import { resolveLoginEmail } from "../../services/authService";

import img1 from "../../assets/image-1.png";
import img2 from "../../assets/image-2.png";
import img3 from "../../assets/image-3.png";
import img4 from "../../assets/image-4.png";
import img5 from "../../assets/image-5.png";

import "./Auth.css";

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

const TAGLINE = "Find your\nway back.";

function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
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

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSent(false);
    setLoading(true);

    try {
      const email = await resolveLoginEmail(identifier);

      await sendPasswordResetEmail(auth, email);

      setSent(true);
    } catch (error) {
      // Same message whether or not the account exists, so this
      // page can't be used to find out which accounts are registered.
      if (
        error.code === "app/username-not-found" ||
        error.code === "auth/user-not-found"
      ) {
        setSent(true);
      } else if (error.code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection.");
      } else {
        console.error("Password reset error:", error);
        setError("Unable to send reset email. Please try again.");
      }
    } finally {
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
        <p className="wall-subtitle">We'll send a link to get you back in</p>
      </div>

      {/* The form, styled as one pinned instant-print */}
      <div className="login-stage">
        <div className={`photo-card ${settled ? "is-settled" : ""}`}>
          <span className="pin" aria-hidden="true" />

          <div className="photo-card__body">
            <p className="photo-card__eyebrow">FORGOT PASSWORD</p>
            <h2 className="photo-card__title">Reset your password</h2>
            <p className="photo-card__desc">
              Enter your username or email and we'll send you a link to
              reset your password.
            </p>

            {error && <div className="auth-error">{error}</div>}

            {sent && (
              <div className="auth-success">
                If an account exists for that username or email, a
                password reset link has been sent. Check your inbox
                (and spam folder).
              </div>
            )}

            <form onSubmit={handleSubmit} className="field-stack">
              <label className="field">
                <span className="field__label">Username or email</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="username or you@example.com"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </label>

              <button
                type="submit"
                className={`btn-primary ${loading ? "is-loading" : ""}`}
                disabled={loading}
              >
                <span className="btn-primary__shutter" aria-hidden="true" />
                <span className="btn-primary__label">
                  {loading ? "Sending…" : sent ? "Resend link" : "Send reset link"}
                </span>
              </button>
            </form>

            <p className="photo-card__footer">
              Remembered it? <Link to="/login">Back to login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;