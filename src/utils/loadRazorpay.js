// Loads Razorpay's checkout.js once, only when a payment is started
// (so it isn't downloaded on every page).

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

let loading = null;

export function loadRazorpay() {
  if (typeof window !== "undefined" && window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }

  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = SCRIPT_URL;
    script.async = true;

    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        loading = null;
        reject(new Error("Razorpay failed to initialise."));
      }
    };

    script.onerror = () => {
      loading = null; // allow a retry
      script.remove();

      reject(
        new Error(
          "Couldn't load Razorpay. Check your internet connection and try again."
        )
      );
    };

    document.body.appendChild(script);
  });

  return loading;
}