import {
  createSpaceOrder,
  releaseSpace,
  verifyPayment,
} from "./paymentService";
import { loadRazorpay } from "../utils/loadRazorpay";

// NEW: "pay first, post whenever you want".
// Opens the Razorpay window for a space, confirms the payment with our
// server, and resolves with the payment id. After that the server keeps the
// space reserved for this person with no deadline.
//
//   resolves  paymentId  -> paid (or already paid earlier: never charged twice)
//   resolves  null       -> they closed the window without paying
//   rejects   Error      -> something to show them
//
// onFailed(message) is called when a card/UPI attempt fails; the Razorpay
// window stays open so they can try again.

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Confirming can fail for a moment (bad signal). Try a few times before
// giving up; the server's webhook also records the payment by itself.
async function confirmWithRetry(payload) {
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await verifyPayment(payload);
    } catch (error) {
      lastError = error;
      await wait(1500 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function payAndReserve({ space, user, profile, onFailed }) {
  let order;
  let keyId;
  let Razorpay;

  try {
    [{ order, keyId }, Razorpay] = await Promise.all([
      createSpaceOrder(space.id),
      loadRazorpay(),
    ]);
  } catch (error) {
    // They already paid for this space earlier: nothing more to charge.
    if (error.code === "ALREADY_PAID" && error.paymentId) {
      return error.paymentId;
    }

    throw error;
  }

  return new Promise((resolve, reject) => {
    let succeeded = false;

    const checkout = new Razorpay({
      key: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "The Locker",
      description: `Reserve space ${space.id}`,
      prefill: {
        name: profile?.displayName || user?.displayName || "",
        email: user?.email || "",
      },
      theme: { color: "#b4502a" },

      handler: async (response) => {
        succeeded = true;

        try {
          const verified = await confirmWithRetry({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          resolve(verified.paymentId);
        } catch {
          reject(
            new Error(
              "Your payment went through, but we couldn't confirm it yet. Please wait a minute and open this box again — you won't be charged twice."
            )
          );
        }
      },

      modal: {
        // Closed the window without paying: free the space for others.
        ondismiss: () => {
          if (succeeded) return;

          releaseSpace(space.id).catch(() => {});
          resolve(null);
        },
      },
    });

    checkout.on("payment.failed", (response) => {
      onFailed?.(
        response?.error?.description || "Payment failed. Please try again."
      );
    });

    checkout.open();
  });
}