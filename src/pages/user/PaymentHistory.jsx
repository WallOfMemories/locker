import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiPhotograph, HiClock } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { getMyPayments } from "../../services/paymentService";

import "./PaymentHistory.css";

// CHANGED: this page used to be a placeholder with the ₹1 Razorpay TEST
// button. Real payments now happen when a Snap is posted, so the page lists
// them instead. (The test component and its backend routes are still in the
// project — they're just no longer shown here.)

// "space_012" -> "Space #12"
function spaceLabel(spaceId) {
  const number = parseInt(String(spaceId).replace(/\D/g, ""), 10);

  return Number.isNaN(number) ? "Space" : `Space #${number}`;
}

function formatMoney(paise, currency = "INR") {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

const STATE_BADGES = {
  used: { label: "Snap posted", tone: "green" },
  // NEW: the Snap this payment bought was deleted by its owner (no refund)
  deleted: { label: "Snap deleted", tone: "grey" },
  unused: { label: "Snap not posted yet", tone: "amber" },
  refunded: { label: "Refunded", tone: "grey" },
  test: { label: "Test payment", tone: "grey" },
};

function PaymentHistory() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !currentUser) return;

    let cancelled = false;

    getMyPayments()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load your payments.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser, authLoading]);

  // Paid, but the Snap was never posted: go back to the Create Snap page
  // with the payment attached, so nothing is charged a second time.
  function finishPosting(item) {
    navigate("/create-snap", {
      state: { space: { id: item.spaceId }, paymentId: item.paymentId },
    });
  }

  return (
    <div className="payhist">
      <header className="payhist__header">
        <h1>Payment History</h1>
        <p>Every payment you've made on SnapWall.</p>
      </header>

      {error && <p className="payhist__note payhist__note--error">{error}</p>}

      {!data && !error && <p className="payhist__note">Loading your payments…</p>}

      {data && (
        <>
          <div className="payhist__stats">
            <div className="payhist__stat">
              <span>Total paid</span>
              <strong>{formatMoney(data.summary.paidPaise)}</strong>
            </div>

            <div className="payhist__stat">
              <span>Snaps posted</span>
              <strong>{data.summary.spaces}</strong>
            </div>

            {data.summary.refundedPaise > 0 && (
              <div className="payhist__stat">
                <span>Refunded</span>
                <strong>{formatMoney(data.summary.refundedPaise)}</strong>
              </div>
            )}
          </div>

          {data.items.length === 0 ? (
            <p className="payhist__note">
              No payments yet. When you post a Snap, your payment will show up
              here.
            </p>
          ) : (
            <ul className="payhist__list">
              {data.items.map((item) => {
                const badge = STATE_BADGES[item.state] || STATE_BADGES.unused;

                return (
                  <li key={item.id} className="payhist__item">
                    <div className="payhist__thumb">
                      {item.snap?.imageUrl ? (
                        <img src={item.snap.imageUrl} alt="" />
                      ) : (
                        <HiPhotograph />
                      )}
                    </div>

                    <div className="payhist__body">
                      <div className="payhist__top">
                        <div>
                          <h2>
                            {item.kind === "test"
                              ? "Test payment"
                              : spaceLabel(item.spaceId)}
                          </h2>

                          <span className="payhist__date">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <div className="payhist__right">
                          <strong className="payhist__amount">
                            {formatMoney(item.amountPaise, item.currency)}
                          </strong>

                          <span
                            className={`payhist__badge payhist__badge--${badge.tone}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                      </div>

                      {item.snap && (
                        <p className="payhist__snap">
                          {item.snap.type === "capsule" && (
                            <HiClock title="Time Capsule" />
                          )}
                          <span>
                            {item.snap.type === "capsule"
                              ? "Time Capsule"
                              : "Snap"}
                            {item.snap.caption ? ` · “${item.snap.caption}”` : ""}
                          </span>
                        </p>
                      )}

                      {item.state === "deleted" && (
                        <p className="payhist__snap">
                          You deleted this Snap, so its space was freed for
                          someone else. Deleted Snaps aren't refunded.
                        </p>
                      )}

                      {item.state === "refunded" && item.refundedAt && (
                        <p className="payhist__snap">
                          Refunded on {formatDate(item.refundedAt)}. It can take
                          5–7 working days to reach your account.
                        </p>
                      )}

                      {item.state === "unused" && (
                        <div className="payhist__unused">
                          <span>
                            You've paid for this space but your Snap isn't up
                            yet. No extra charge to finish it.
                          </span>

                          <button
                            type="button"
                            className="payhist__btn"
                            onClick={() => finishPosting(item)}
                          >
                            Finish posting
                          </button>
                        </div>
                      )}

                      <dl className="payhist__ids">
                        <div>
                          <dt>Payment ID</dt>
                          <dd>{item.paymentId}</dd>
                        </div>

                        {item.orderId && (
                          <div>
                            <dt>Order ID</dt>
                            <dd>{item.orderId}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default PaymentHistory;