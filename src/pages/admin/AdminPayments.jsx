import { useEffect, useMemo, useState } from "react";
import { getAdminPayments } from "../../services/adminApi";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "space", label: "Space purchases" },
  { key: "test", label: "Test" },
];

function formatMoney(paise) {
  return (paise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function AdminPayments() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAdminPayments()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load payments.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];

    const term = search.trim().toLowerCase();

    return data.items.filter((item) => {
      if (filter !== "all" && item.kind !== filter) return false;
      if (!term) return true;

      return [
        item.paymentId,
        item.orderId,
        item.spaceId,
        item.user.username,
        item.user.displayName,
        item.user.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [data, filter, search]);

  return (
    <div className="ad-page">
      <div className="ad-head">
        <h1>Payments</h1>
        <p>
          Every verified Razorpay payment. Test payments are listed too, but
          never counted in revenue.
        </p>
      </div>

      {error && <p className="ad-error">{error}</p>}

      {!data && !error && <p className="ad-status">Loading...</p>}

      {data && (
        <>
          <div className="ad-stats">
            <div className="ad-stat">
              <span className="ad-stat__label">Total collected</span>
              <span className="ad-stat__value">
                {formatMoney(data.summary.space.amountPaise)}
              </span>
              <span className="ad-stat__hint">
                {data.summary.space.count} payment
                {data.summary.space.count === 1 ? "" : "s"}
              </span>
            </div>

            <div className="ad-stat">
              <span className="ad-stat__label">Last 30 days</span>
              <span className="ad-stat__value">
                {formatMoney(data.summary.spaceLast30Days.amountPaise)}
              </span>
              <span className="ad-stat__hint">
                {data.summary.spaceLast30Days.count} payment
                {data.summary.spaceLast30Days.count === 1 ? "" : "s"}
              </span>
            </div>

            {data.summary.refunded.count > 0 && (
              <div className="ad-stat ad-stat--muted">
                <span className="ad-stat__label">Refunded</span>
                <span className="ad-stat__value">
                  {formatMoney(data.summary.refunded.amountPaise)}
                </span>
                <span className="ad-stat__hint">
                  {data.summary.refunded.count} (not counted in revenue)
                </span>
              </div>
            )}

            <div className="ad-stat ad-stat--muted">
              <span className="ad-stat__label">Test payments</span>
              <span className="ad-stat__value">
                {formatMoney(data.summary.test.amountPaise)}
              </span>
              <span className="ad-stat__hint">
                {data.summary.test.count} (not counted above)
              </span>
            </div>
          </div>

          <div className="ad-toolbar">
            <div className="ad-tabs" role="tablist">
              {FILTERS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  className={`ad-tab ${filter === key ? "is-active" : ""}`}
                  onClick={() => setFilter(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              type="search"
              className="ad-input ad-input--search"
              placeholder="Search user, payment or space"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {rows.length === 0 ? (
            <p className="ad-status">
              {data.items.length === 0
                ? "No payments yet. Verified payments will show up here."
                : "No payments match."}
            </p>
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Payment ID</th>
                    <th className="is-num">Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.createdAt)}</td>
                      <td>
                        @{item.user.username || "unknown"}
                        {item.user.email && <small>{item.user.email}</small>}
                      </td>
                      <td>
                        {item.kind === "test" ? (
                          <span className="ad-badge">Test</span>
                        ) : (
                          <span className="ad-badge ad-badge--rust">
                            {item.spaceId
                              ? item.spaceId.replace("space_", "Space #")
                              : "Space"}
                          </span>
                        )}
                      </td>
                      <td>
                        {item.status === "refunded" ? (
                          <span className="ad-badge">Refunded</span>
                        ) : item.kind === "test" ? (
                          <span className="ad-badge">Test</span>
                        ) : item.deleted ? (
                          <span className="ad-badge">Snap deleted</span>
                        ) : item.used ? (
                          <span className="ad-badge ad-badge--green">
                            Snap posted
                          </span>
                        ) : (
                          <span className="ad-badge">Not used yet</span>
                        )}
                      </td>
                      <td className="ad-mono">{item.paymentId}</td>
                      <td className="is-num">
                        <strong>{formatMoney(item.amountPaise)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.total > data.items.length && (
            <p className="ad-panel__sub" style={{ marginTop: 12 }}>
              Showing the latest {data.items.length} of {data.total} payments.
              Totals above include all of them.
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default AdminPayments;