import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../../services/adminApi";

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

function Stat({ label, value, hint, tone }) {
  return (
    <div className={`ad-stat ${tone ? `ad-stat--${tone}` : ""}`}>
      <span className="ad-stat__label">{label}</span>
      <span className="ad-stat__value">{value}</span>
      {hint && <span className="ad-stat__hint">{hint}</span>}
    </div>
  );
}

function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAdminDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load the dashboard.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="ad-page">
        <div className="ad-head">
          <h1>Dashboard</h1>
        </div>
        <p className="ad-error">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="ad-page">
        <div className="ad-head">
          <h1>Dashboard</h1>
        </div>
        <p className="ad-status">Loading...</p>
      </div>
    );
  }

  const { wall, users, snaps, reports, payments } = data;
  const revenue = payments.summary.space;
  const last30 = payments.summary.spaceLast30Days;

  return (
    <div className="ad-page">
      <div className="ad-head">
        <h1>Dashboard</h1>
        <p>A quick look at how SnapWall is doing.</p>
      </div>

      <div className="ad-stats">
        <Stat
          label="Pending reports"
          value={reports.pendingSnaps}
          hint={
            reports.pendingSnaps === 0
              ? "All clear"
              : `${reports.pendingReports} report${
                  reports.pendingReports === 1 ? "" : "s"
                } to review`
          }
          tone={reports.pendingSnaps > 0 ? "alert" : undefined}
        />
        <Stat
          label="Revenue"
          value={formatMoney(revenue.amountPaise)}
          hint={`${revenue.count} payment${
            revenue.count === 1 ? "" : "s"
          } · ${formatMoney(last30.amountPaise)} in last 30 days`}
        />
        <Stat label="Users" value={users.total} />
        <Stat
          label="Snaps"
          value={snaps.total}
          hint={`${snaps.newLast7Days} new in the last 7 days`}
        />
        <Stat label="Hidden Snaps" value={snaps.hidden} />
        <Stat label="Sealed capsules" value={snaps.lockedCapsules} />
      </div>

      <section className="ad-panel">
        <div className="ad-panel__head">
          <h2>Wall</h2>
          <Link to="/admin/wall" className="ad-link">
            Manage wall size
          </Link>
        </div>

        <div className="ad-meter" aria-hidden="true">
          <div
            className="ad-meter__fill"
            style={{ width: `${Math.min(wall.occupancyPercent, 100)}%` }}
          />
          {wall.autoExpand && (
            <span
              className="ad-meter__mark"
              style={{ left: `${wall.expansionThreshold}%` }}
              title={`Auto-expand at ${wall.expansionThreshold}%`}
            />
          )}
        </div>

        <div className="ad-meter__legend">
          <span>
            <strong>{wall.occupied}</strong> of <strong>{wall.total}</strong>{" "}
            spaces taken ({wall.occupancyPercent}%) · {wall.available} free
          </span>
          <span>
            {wall.autoExpand
              ? `Auto-expands at ${wall.expansionThreshold}%`
              : "Auto-expand is off"}
          </span>
        </div>
      </section>

      <div className="ad-two">
        <section className="ad-panel">
          <div className="ad-panel__head">
            <h2>Recent payments</h2>
            <Link to="/admin/payments" className="ad-link">
              View all
            </Link>
          </div>

          {payments.recent.length === 0 ? (
            <p className="ad-empty">No payments yet.</p>
          ) : (
            <ul className="ad-list">
              {payments.recent.map((payment) => (
                <li key={payment.id}>
                  <div>
                    @{payment.user.username || "unknown"}
                    <small>
                      {formatDate(payment.createdAt)}
                      {payment.kind === "test" ? " · Test" : ""}
                    </small>
                  </div>
                  <strong>{formatMoney(payment.amountPaise)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ad-panel">
          <div className="ad-panel__head">
            <h2>Needs attention</h2>
            <Link to="/admin/reports" className="ad-link">
              Open reports
            </Link>
          </div>

          <ul className="ad-list">
            <li>
              <span>Snaps waiting for review</span>
              <strong>{reports.pendingSnaps}</strong>
            </li>
            <li>
              <span>Snaps currently hidden</span>
              <strong>{snaps.hidden}</strong>
            </li>
            <li>
              <div>
                Last wall expansion
                {wall.lastExpansion && (
                  <small>{formatDate(wall.lastExpansion.createdAt)}</small>
                )}
              </div>
              <strong>
                {wall.lastExpansion
                  ? `+${wall.lastExpansion.added} (${wall.lastExpansion.source})`
                  : "None yet"}
              </strong>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;