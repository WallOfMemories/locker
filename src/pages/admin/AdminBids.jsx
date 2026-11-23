import { useCallback, useEffect, useState } from "react";

import {
  getAdminBids,
  acceptAdminBid,
  rejectAdminBid,
  counterAdminBid,
  cancelAdminBidding,
} from "../../services/adminApi";

// NEW: bids on the first boxes of the wall. Every bid is reviewed by hand:
//   Accept  -> that person wins the box at their bid (other bids are rejected)
//   Reject  -> the bid is declined (the person may bid again)
//   Counter -> you propose another amount; the person accepts or declines
// An accepted bidder has 48 hours to pay (once they have paid, the box is
// theirs until they post), and a counter offer must be answered within 48
// hours; otherwise the box / offer opens up again by itself. "Cancel all bids" wipes a box so it can start over right away.

const STATUS = {
  pending: { label: "Waiting for you", tone: "rust" },
  countered: { label: "Counter sent", tone: "gold" },
  rejected: { label: "Rejected", tone: "grey" },
  accepted: { label: "Accepted", tone: "green" },
  expired: { label: "Expired", tone: "grey" },
};

function AdminBids() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyKey, setBusyKey] = useState("");
  // which bid is being countered, and the amount typed so far
  const [counter, setCounter] = useState({ key: "", amount: "" });

  const load = useCallback(async () => {
    try {
      setData(await getAdminBids());
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load bids.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(box, bid, action) {
    const key = `${box.spaceId}:${bid.userId}`;
    const who = `${bid.name} (box #${box.number})`;

    if (action === "accept") {
      const ok = window.confirm(
        `Accept ₹${bid.amount} from ${who}? They win the box and every other bid on it is rejected.`
      );

      if (!ok) return;
    }

    if (action === "counter") {
      const value = Number(counter.amount);

      if (!Number.isInteger(value) || value < 1) {
        setError("Enter the counter offer in whole rupees.");
        return;
      }
    }

    setBusyKey(key);
    setError("");
    setNotice("");

    try {
      if (action === "accept") {
        await acceptAdminBid(box.spaceId, bid.userId);
        setNotice(`Accepted ₹${bid.amount} from ${who}. They have been told to pay.`);
      } else if (action === "reject") {
        await rejectAdminBid(box.spaceId, bid.userId);
        setNotice(`Rejected the bid from ${who}.`);
      } else {
        await counterAdminBid(box.spaceId, bid.userId, Number(counter.amount));
        setNotice(`Sent a counter offer of ₹${counter.amount} to ${who}.`);
        setCounter({ key: "", amount: "" });
      }

      await load();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusyKey("");
    }
  }

  async function cancelAll(box) {
    const ok = window.confirm(
      `Delete ALL bids on box #${box.number}? The box starts over with no bids.`
    );

    if (!ok) return;

    setBusyKey(box.spaceId);
    setError("");
    setNotice("");

    try {
      await cancelAdminBidding(box.spaceId);
      setNotice(`All bids on box #${box.number} were deleted.`);
      await load();
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusyKey("");
    }
  }

  // Boxes that were taken meanwhile are left alone ("no change").
  const boxes = (data?.boxes || []).filter((box) => !box.taken);

  return (
    <div className="ad-page">
      <div className="ad-head">
        <h1>Bids</h1>
        <p>
          The first {data?.bidBoxCount ?? 20} boxes are bid-only while empty.
          Accept a bid, reject it, or send a counter offer. You also get an
          email for every new bid.
        </p>
      </div>

      {error && <p className="ad-error">{error}</p>}
      {notice && <p className="ad-notice">{notice}</p>}
      {!data && !error && <p className="ad-status">Loading...</p>}
      {data && boxes.length === 0 && <p className="ad-empty">No bids yet.</p>}

      {boxes.map((box) => (
        <section className="ad-panel" key={box.spaceId}>
          <div className="ad-panel__head">
            <h2>
              Box #{box.number}{" "}
              {box.result && <span className="ad-badge ad-badge--green">Given away</span>}
            </h2>
          </div>

          {box.result && (
            <p className="ad-notice">
              Accepted: <strong>{box.result.winnerName}</strong> at ₹
              {box.result.amount}.{" "}
              {box.result.paid
                ? "They have paid — the box is reserved for them until they post their Snap."
                : box.result.payBy
                  ? `Waiting for payment — they have until ${new Date(box.result.payBy).toLocaleString()}.`
                  : "Waiting for them to pay and create their Snap."}
            </p>
          )}

          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Bidder</th>
                  <th>Email</th>
                  <th className="is-num">Bid</th>
                  <th>Status</th>
                  <th>Decision</th>
                </tr>
              </thead>
              <tbody>
                {box.bids.map((bid) => {
                  const key = `${box.spaceId}:${bid.userId}`;
                  const status = STATUS[bid.status] || STATUS.pending;
                  const open = !box.result && (bid.status === "pending" || bid.status === "countered");
                  const countering = counter.key === key;

                  return (
                    <tr key={bid.userId}>
                      <td>
                        {bid.name}
                        {bid.username && <small> @{bid.username}</small>}
                      </td>
                      <td>{bid.email || "—"}</td>
                      <td className="is-num">
                        ₹{bid.amount}
                        {bid.status === "countered" && (
                          <small> → ₹{bid.counterAmount}</small>
                        )}
                        {bid.status === "countered" && bid.counterBy && (
                          <small>
                            {" "}
                            (reply by {new Date(bid.counterBy).toLocaleString()})
                          </small>
                        )}
                        {bid.status === "expired" && (
                          <small>
                            {" "}
                            ({bid.expiredReason === "counter" ? "didn't reply" : "didn't pay"})
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`ad-badge ad-badge--${status.tone}`}>
                          {status.label}
                        </span>
                      </td>
                      <td>
                        {open && !countering && (
                          <div className="ad-toolbar">
                            {bid.status === "pending" && (
                              <button
                                type="button"
                                className="ad-btn"
                                disabled={busyKey === key}
                                onClick={() => act(box, bid, "accept")}
                              >
                                Accept
                              </button>
                            )}
                            <button
                              type="button"
                              className="ad-btn"
                              disabled={busyKey === key}
                              onClick={() => act(box, bid, "reject")}
                            >
                              Reject
                            </button>
                            <button
                              type="button"
                              className="ad-btn"
                              disabled={busyKey === key}
                              onClick={() => setCounter({ key, amount: "" })}
                            >
                              Counter
                            </button>
                          </div>
                        )}

                        {open && countering && (
                          <div className="ad-toolbar">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              autoFocus
                              placeholder="₹ counter"
                              value={counter.amount}
                              onChange={(event) =>
                                setCounter({ key, amount: event.target.value })
                              }
                              style={{ width: 110 }}
                            />
                            <button
                              type="button"
                              className="ad-btn"
                              disabled={busyKey === key}
                              onClick={() => act(box, bid, "counter")}
                            >
                              Send
                            </button>
                            <button
                              type="button"
                              className="ad-btn"
                              onClick={() => setCounter({ key: "", amount: "" })}
                            >
                              Back
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ad-toolbar">
            <button
              type="button"
              className="ad-btn"
              disabled={busyKey === box.spaceId}
              onClick={() => cancelAll(box)}
            >
              Cancel all bids on this box
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}

export default AdminBids;