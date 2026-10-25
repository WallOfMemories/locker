// Remembers where a visitor was heading when we asked them to log in, so after
// login (and, for new accounts, profile setup) they continue the same flow
// instead of landing back on the wall. Kept in sessionStorage so it survives
// switching between Login / Register, Google sign-in and page refreshes.

const KEY = "snapwall.returnTo";
const MAX_AGE_MS = 30 * 60 * 1000; // forgotten after 30 minutes

export function setReturnTo({ pathname = "/", search = "", state = null }) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ pathname, search, state, savedAt: Date.now() })
    );
  } catch {
    // storage blocked: login still works, just without the continue-flow
  }
}

function read() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null");

    if (!saved || Date.now() - saved.savedAt > MAX_AGE_MS) return null;

    return saved;
  } catch {
    return null;
  }
}

// Look without forgetting it (used while profile setup is still pending).
export function peekReturnTo() {
  return read();
}

// Read it and forget it.
export function takeReturnTo() {
  const saved = read();

  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }

  return saved;
}