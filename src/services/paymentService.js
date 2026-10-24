import { auth } from "./firebase";
import { API_URL } from "../config";


async function request(path, body, method = "POST") {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(method === "GET" ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${token}`,
    },
    ...(method === "GET" ? {} : { body: JSON.stringify(body || {}) }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

// NEW: starts a payment for a space -> { order: { id, amount, currency }, keyId }
// The server checks the space is still free and holds it for this person
// while they pay. The price is decided by the server, never by the browser.
export async function createSpaceOrder(spaceId) {
  return request("/payments/create-order", { spaceId });
}

// NEW: the person closed the payment window — free the space again.
export async function releaseSpace(spaceId) {
  return request("/payments/release", { spaceId });
}

// NEW: the logged-in person's payments -> { summary, items }
export async function getMyPayments() {
  return request("/payments/my", null, "GET");
}

// TEST ONLY: creates a ₹1 order -> { order: { id, amount, currency }, keyId }

// Sends what Razorpay Checkout returned to the server to check the
// signature: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function verifyPayment(payload) {
  return request("/payments/verify", payload);
}