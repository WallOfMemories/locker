import { auth } from "./firebase";

const API_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
}/api`;

// `freshToken` forces a brand-new ID token. Needed right after the person
// re-entered their password: the server checks when they LAST signed in, and
// an old cached token would still say "an hour ago".
async function request(path, { method = "GET", body, freshToken = false } = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken(freshToken);

  const response = await fetch(`${API_URL}/account${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Request failed.");

    error.code = data.code || null;

    throw error;
  }

  return data;
}

// ---------- privacy ----------

// -> { showPhoto, showLocation, notifyOnLikes }
export async function getPrivacySettings() {
  const data = await request("/privacy");

  return data.privacy;
}

// Send only what changed, e.g. { showLocation: false }. -> all settings
export async function savePrivacySettings(changes) {
  const data = await request("/privacy", { method: "PUT", body: changes });

  return data.privacy;
}

// ---------- delete account ----------

// -> { snaps, sealedCapsules, graceDays, isAdmin,
//      deletion: { pending, requestedAt, scheduledFor } }
export async function getAccountSummary() {
  const data = await request("/summary");

  return data.summary;
}

export async function requestAccountDeletion() {
  const data = await request("/delete-request", {
    method: "POST",
    freshToken: true,
  });

  return data.summary;
}

export async function cancelAccountDeletion() {
  const data = await request("/cancel-deletion", { method: "POST" });

  return data.summary;
}

// ---------- help & support ----------

export async function sendSupportRequest({ category, message }) {
  return request("/support", {
    method: "POST",
    body: { category, message },
  });
}