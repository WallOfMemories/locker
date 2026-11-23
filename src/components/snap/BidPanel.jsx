import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowRight, HiShieldCheck } from "react-icons/hi";
import { FaGavel } from "react-icons/fa";

import {
  getBidOverview,
  placeBid,
  respondToCounter,
} from "../../services/bidService";
import "./BidPanel.css";

// ------------------------------------------------------------
// NEW: the bid option for the first boxes of the wall (a gold panel).
//
// useBoxBid(space) loads this person's bid state for ONE empty box.
// What they can see depends on where their bid is:
//   no bid / rejected -> the bid form
//   pending           -> "waiting for the admin" (and they can change it)
//   countered         -> the admin's counter offer: Accept / Decline
//   accepted (winner) -> Pay ₹X & create Snap
//   another bidder won -> closed message
// Other people's bids are never shown, and no ₹ price is shown.
// ------------------------------------------------------------

export function useBoxBid(space) {
  const [state, setState] = useState({ loaded: false, box: null });

  const spaceId = space?.id;
  const isEmpty = space?.status !== "occupied";

  const load = useCallback(async () => {
    if (!spaceId || !isEmpty) return;

    try {
      const data = await getBidOverview();

      setState({ loaded: true, box: data.boxes?.[spaceId] || null });
    } catch {
      setState({ loaded: true, box: null });
    }
  }, [spaceId, isEmpty]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load, setBox: (box) => setState({ loaded: true, box }) };
}

// NEW: "12 Mar, 6:30 pm" for the payment deadline
function formatDeadline(iso) {
  if (!iso) return "";

  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

// NEW: the little gold gavel badge + title that tops every state of the panel
function Head({ title }) {
  return (
    <div className="bidpanel__head">
      <span className="bidpanel__badge" aria-hidden="true">
        <FaGavel />
      </span>
      <span className="bidpanel__tag">{title}</span>
    </div>
  );
}

function BidPanel({ space, bid, currentUser, onLogin }) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const box = bid.box;
  const mine = box?.myBid || null;

  // ----- someone's bid was accepted -----
  if (box?.closed) {
    // NEW: the winner already PAID — the box is theirs until they post.
    if (box.iAmWinner && box.paidPaymentId) {
      return (
        <div className="bidpanel bidpanel--won">
          <Head title="Payment received" />
          <p>
            This box is reserved for you. There is no deadline — create your
            Snap whenever you're ready.
          </p>
          <button
            type="button"
            className="bidpanel__primary"
            onClick={() =>
              navigate("/create-snap", {
                state: {
                  space,
                  bidAmount: box.winningAmount,
                  paymentId: box.paidPaymentId,
                },
              })
            }
          >
            Create your Snap
            <HiArrowRight />
          </button>
        </div>
      );
    }

    if (box.iAmWinner) {
      return (
        <div className="bidpanel bidpanel--won">
          <Head title="Your bid was accepted" />
          <p>
            This box is yours at <strong>₹{box.winningAmount}</strong>. Pay that
            amount and create your Snap to claim it.
          </p>
          {box.payBy && (
            <p className="bidpanel__deadline">
              Pay by <strong>{formatDeadline(box.payBy)}</strong> (within 48
              hours) or the box opens up for other bidders.
            </p>
          )}
          <button
            type="button"
            className="bidpanel__primary"
            onClick={() =>
              navigate("/create-snap", {
                state: { space, bidAmount: box.winningAmount },
              })
            }
          >
            Pay ₹{box.winningAmount} &amp; create Snap
            <HiArrowRight />
          </button>
        </div>
      );
    }

    return (
      <div className="bidpanel bidpanel--closed">
        <Head title="Bidding closed" />
        <p>This box has been given to another bidder.</p>
      </div>
    );
  }

  async function submitBid(event) {
    event.preventDefault();

    if (!currentUser) {
      onLogin();
      return;
    }

    const value = Number(amount);

    if (!Number.isInteger(value) || value < 1) {
      setMessage({ type: "error", text: "Enter your amount in whole rupees." });
      return;
    }

    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await placeBid(space.id, value);

      bid.setBox(result.box);
      setAmount("");
      setEditing(false);
      setMessage({
        type: "ok",
        text: "Your bid has been sent to the admin. Nothing is charged unless it is accepted.",
      });
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      await bid.reload();
    } finally {
      setBusy(false);
    }
  }

  async function answer(action) {
    setBusy(true);
    setMessage({ type: "", text: "" });

    try {
      const result = await respondToCounter(space.id, action);

      bid.setBox(result.box);
    } catch (error) {
      setMessage({ type: "error", text: error.message });
      await bid.reload();
    } finally {
      setBusy(false);
    }
  }

  // ----- the admin sent a counter offer -----
  if (mine?.status === "countered") {
    return (
      <div className="bidpanel bidpanel--counter">
        <Head title="Counter offer" />
        <p>
          You bid <strong>₹{mine.amount}</strong>. The admin offers this box for{" "}
          <strong>₹{mine.counterAmount}</strong>.
        </p>
        {mine.counterBy && (
          <p className="bidpanel__deadline">
            Answer by <strong>{formatDeadline(mine.counterBy)}</strong> (within
            48 hours) or the offer expires.
          </p>
        )}

        <div className="bidpanel__actions">
          <button
            type="button"
            className="bidpanel__primary"
            disabled={busy}
            onClick={() => answer("accept")}
          >
            Accept ₹{mine.counterAmount}
          </button>
          <button
            type="button"
            className="bidpanel__secondary"
            disabled={busy}
            onClick={() => answer("decline")}
          >
            Decline
          </button>
        </div>

        {message.text && (
          <p className={`bidpanel__msg bidpanel__msg--${message.type}`} role="alert">
            {message.text}
          </p>
        )}
      </div>
    );
  }

  // ----- waiting for the admin -----
  if (mine?.status === "pending" && !editing) {
    return (
      <div className="bidpanel">
        <Head title="Your bid" />
        <p className="bidpanel__big">₹{mine.amount}</p>
        <p>Waiting for the admin to accept, decline or send a counter offer.</p>

        <button
          type="button"
          className="bidpanel__link"
          onClick={() => setEditing(true)}
        >
          Change my bid
        </button>

        {message.text && (
          <p className={`bidpanel__msg bidpanel__msg--${message.type}`} role="alert">
            {message.text}
          </p>
        )}
      </div>
    );
  }

  // ----- the bid form (no bid yet, rejected, or changing a bid) -----
  return (
    <form className="bidpanel" onSubmit={submitBid}>
      <Head title="Place your bid" />

      {mine?.status === "rejected" && (
        <p className="bidpanel__msg bidpanel__msg--error">
          Your last bid (₹{mine.amount}) was not accepted. You can bid again.
        </p>
      )}

      {mine?.status === "expired" && (
        <p className="bidpanel__msg bidpanel__msg--error">
          {mine.expiredReason === "counter"
            ? `You didn't answer the counter offer within 48 hours, so it expired. You can bid again.`
            : `You didn't pay within 48 hours, so your accepted bid (₹${mine.amount}) expired. You can bid again.`}
        </p>
      )}

      <label className="bidpanel__label" htmlFor="bid-amount">
        Your amount
      </label>

      {/* CHANGED: the ₹ sign now sits inside the field, as one clean input */}
      <div className="bidpanel__field">
        <span className="bidpanel__currency">₹</span>
        <input
          id="bid-amount"
          type="number"
          inputMode="numeric"
          min="1"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Enter amount"
          disabled={busy}
        />
      </div>

      <button type="submit" className="bidpanel__primary" disabled={busy}>
        {busy
          ? "Sending..."
          : currentUser
            ? "Send bid to admin"
            : "Log in to place a bid"}
      </button>

      <p className="bidpanel__hint">
        <HiShieldCheck aria-hidden="true" />
        Nothing is charged unless the admin accepts your bid.
      </p>

      {message.text && (
        <p className={`bidpanel__msg bidpanel__msg--${message.type}`} role="alert">
          {message.text}
        </p>
      )}
    </form>
  );
}

export default BidPanel;