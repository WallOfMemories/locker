import { auth } from "./firebase";
import { API_URL } from "../config";

// NEW: bidding on the first boxes of the wall.
// Reading is public (amounts only). If the person is logged in we also send
// their token, so the server can say which bid is theirs and whether they won.

async function request(path, options = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : null;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// -> { bidBoxCount, basePrice, boxes: { [spaceId]: summary } }
export function getBidOverview() {
  return request("/bids");
}

// amount = whole rupees -> { box: summary }
export function placeBid(spaceId, amount) {
  return request(`/bids/${encodeURIComponent(spaceId)}`, {
    method: "POST",
    body: JSON.stringify({ amount }),
  });
}

// Answer the admin's counter offer: "accept" | "decline" -> { box: summary }
export function respondToCounter(spaceId, action) {
  return request(`/bids/${encodeURIComponent(spaceId)}/respond`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}