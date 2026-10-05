import { useState } from "react";
import { FiCreditCard, FiCheckCircle, FiAlertCircle } from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import { createTestOrder, verifyPayment } from "../../services/paymentService";
import { loadRazorpay } from "../../utils/loadRazorpay";

import "./RazorpayTestPayment.css";

/**
 * TEST ONLY — a ₹1 Razorpay Standard Checkout payment so the integration
 * can be tried end to end. Flow:
 *   1. server creates an order            (POST /api/payments/test-order)
 *   2. Razorpay modal opens with that order
 *   3. on success, the 3 values Razorpay returns are sent to the server,
 *      which checks the signature         (POST /api/payments/verify)
 */
function RazorpayTestPayment() {
  const { currentUser, profile } = useAuth();

  // idle | creating | paying | verifying
  const [step, setStep] = useState("idle");
  const [result, setResult] = useState(null); // { type: success|error|info, text }

  const busy = step !== "idle";

  async function handlePay() {
    if (busy) return;

    setResult(null);

    try {
      setStep("creating");

      // Run both at once: order from our server + Razorpay's script.
      const [{ order, keyId }, Razorpay] = await Promise.all([
        createTestOrder(),
        loadRazorpay(),
      ]);

      const checkout = new Razorpay({
        key: keyId,
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        name: "SnapWall",
        description: "Test payment",
        prefill: {
          name: profile?.displayName || currentUser?.displayName || "",
          email: currentUser?.email || "",
        },
        theme: { color: "#b4502a" },

        // Payment succeeded in the modal — now the server must confirm it.
        handler: async (response) => {
          try {
            setStep("verifying");

            const verified = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            setResult({
              type: "success",
              text: `Payment verified. Payment ID: ${verified.paymentId}`,
            });
          } catch (err) {
            setResult({
              type: "error",
              text:
                err.message ||
                "Payment went through but couldn't be verified.",
            });
          } finally {
            setStep("idle");
          }
        },

        modal: {
          // The person closed the window without paying.
          ondismiss: () => {
            setStep((current) =>
              current === "paying" ? "idle" : current
            );

            setResult((current) =>
              current?.type === "error"
                ? current // keep the failure message shown by payment.failed
                : { type: "info", text: "Payment cancelled." }
            );
          },
        },
      });

      // A card/UPI attempt failed. The modal stays open so they can retry.
      checkout.on("payment.failed", (response) => {
        setResult({
          type: "error",
          text:
            response?.error?.description ||
            "Payment failed. Please try again.",
        });
      });

      setStep("paying");
      checkout.open();
    } catch (err) {
      console.error("Razorpay test payment failed:", err);

      setResult({
        type: "error",
        text: err.message || "Something went wrong. Please try again.",
      });

      setStep("idle");
    }
  }

  const label =
    step === "creating"
      ? "Preparing payment…"
      : step === "paying"
      ? "Complete the payment…"
      : step === "verifying"
      ? "Verifying payment…"
      : "Pay ₹1 (test)";

  return (
    <section className="rzptest">
      <div className="rzptest__head">
        <span className="rzptest__icon">
          <FiCreditCard />
        </span>

        <div>
          <h2>Razorpay test payment</h2>
          <p>
            Try the checkout end to end with a ₹1 test order. No real money
            moves in test mode.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="rzptest__button"
        onClick={handlePay}
        disabled={busy}
      >
        {label}
      </button>

      {result && (
        <div
          className={`rzptest__result rzptest__result--${result.type}`}
          role={result.type === "error" ? "alert" : "status"}
        >
          {result.type === "success" && <FiCheckCircle />}
          {result.type === "error" && <FiAlertCircle />}
          <span>{result.text}</span>
        </div>
      )}

      <p className="rzptest__hint">
        Test card: <code>4111 1111 1111 1111</code> · any future expiry · any
        CVV · or UPI <code>success@razorpay</code>
      </p>
    </section>
  );
}

export default RazorpayTestPayment;