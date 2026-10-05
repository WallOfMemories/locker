import { auth } from "./firebase";

const API_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
}/api`;

async function request(path, body) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

// TEST ONLY: creates a ₹1 order -> { order: { id, amount, currency }, keyId }
export async function createTestOrder() {
  return request("/payments/test-order");
}

// Sends what Razorpay Checkout returned to the server to check the
// signature: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
export async function verifyPayment(payload) {
  return request("/payments/verify", payload);
}