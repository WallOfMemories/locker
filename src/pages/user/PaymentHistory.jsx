import RazorpayTestPayment from "../../components/payments/RazorpayTestPayment";

function PaymentHistory() {
  return (
    <div>
      {/* CHANGED: this page was a copy of My Snaps ("MY SNAPS" heading) */}
      <p>PAYMENT HISTORY</p>
      <h1>Payment History</h1>
      <p>Your payments will appear here.</p>

      {/* TEST ONLY — remove once the real payment flow is in place */}
      <RazorpayTestPayment />
    </div>
  );
}

export default PaymentHistory;