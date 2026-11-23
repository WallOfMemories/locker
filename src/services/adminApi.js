import { auth } from "./firebase";
import { API_BASE_URL } from "../config";


// Every admin request carries the logged-in user's Firebase token; the
// backend re-checks that the account really is an admin.
async function authedRequest(path, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// ---------- dashboard ----------

export function getAdminDashboard() {
  return authedRequest("/api/admin/dashboard");
}

// ---------- payments ----------

// -> { summary, total, items }
export function getAdminPayments() {
  return authedRequest("/api/admin/payments");
}

// ---------- wall size ----------

// -> { wall, settings, limits, expansions }
export function getAdminWall() {
  return authedRequest("/api/admin/wall");
}

export function expandWall(count) {
  return authedRequest("/api/admin/wall/expand", {
    method: "POST",
    body: JSON.stringify({ count }),
  });
}

// settings: { autoExpand?, expansionThreshold?, expansionBatchSize? }
export function updateWallSettings(settings) {
  return authedRequest("/api/admin/wall/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// ---------- bids (first boxes of the wall) ----------

// -> { bidBoxCount, boxes: [{ spaceId, number, taken, bids, result }] }
export function getAdminBids() {
  return authedRequest("/api/admin/bids");
}

// Accept a bid: that person wins the box at their bid.
export function acceptAdminBid(spaceId, userId) {
  return authedRequest(
    `/api/admin/bids/${encodeURIComponent(spaceId)}/${encodeURIComponent(userId)}/accept`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

// Reject a bid (the person can bid again).
export function rejectAdminBid(spaceId, userId) {
  return authedRequest(
    `/api/admin/bids/${encodeURIComponent(spaceId)}/${encodeURIComponent(userId)}/reject`,
    { method: "POST", body: JSON.stringify({}) }
  );
}

// Counter offer: propose a different amount (whole rupees).
export function counterAdminBid(spaceId, userId, amount) {
  return authedRequest(
    `/api/admin/bids/${encodeURIComponent(spaceId)}/${encodeURIComponent(userId)}/counter`,
    { method: "POST", body: JSON.stringify({ amount }) }
  );
}

// Throw all bids on a box away so it can start over.
export function cancelAdminBidding(spaceId) {
  return authedRequest(`/api/admin/bids/${encodeURIComponent(spaceId)}/cancel`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}