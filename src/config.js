// ------------------------------------------------------------
// The one place that knows where the backend lives.
//
// Local development falls back to http://localhost:5000.
// A production build REQUIRES VITE_API_BASE_URL (vite.config.js stops the
// build if it is missing), so a deployed site can never quietly try to
// call "localhost".
// ------------------------------------------------------------

const configured = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL = String(
  configured || (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, ""); // no trailing slash

export const API_URL = `${API_BASE_URL}/api`;
