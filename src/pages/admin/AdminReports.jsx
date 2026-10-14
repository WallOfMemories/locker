import { useEffect, useState } from "react";
import { getAdminReports, moderateSnap } from "../../services/moderationApi";

import "./AdminReports.css";

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "hidden", label: "Hidden" },
  { key: "history", label: "History" },
];

const REASON_LABEL = {
  inappropriate: "Inappropriate",
  harassment: "Harassment",
  spam: "Spam",
  copyright: "Copyright",
  other: "Other",
};

const ACTION_LABEL = {
  hidden: "Hidden",
  safe: "Marked safe",
  deleted: "Deleted",
};

function formatDateTime(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function AdminReports() {
  const [tab, setTab] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    let cancelled = false;

    getAdminReports(tab)
      .then((data) => {
        if (cancelled) return;

        setItems(data);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;

        setItems([]);
        setError(err.message || "Failed to load reports.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  function changeTab(key) {
    if (key === tab) return;

    setLoading(true);
    setTab(key);
  }

  async function handleAction(item, action) {
    if (
      action === "delete" &&
      !window.confirm(
        "Delete this Snap permanently? Its space will become available again."
      )
    ) {
      return;
    }

    try {
      setBusyId(item.snapId);
      setError("");

      await moderateSnap(item.snapId, action);

      // Every action moves the Snap out of the current list.
      setItems((current) =>
        current.filter((entry) => entry.snapId !== item.snapId)
      );
    } catch (err) {
      setError(err.message || "Action failed.");
    } finally {
      setBusyId("");
    }
  }

  function renderCard(item) {
    const busy = busyId === item.snapId;

    return (
      <li key={item.snapId} className="adm-card">
        <div className="adm-card__media">
          {item.imageUrl ? (
            <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">
              <img src={item.imageUrl} alt={item.caption || "Reported Snap"} />
            </a>
          ) : (
            <span className="adm-card__blank" />
          )}
        </div>

        <div className="adm-card__body">
          <p className="adm-card__caption">
            {item.caption || <em>No caption</em>}
          </p>

          <p className="adm-card__meta">
            @{item.owner.username || "unknown"}
            {item.owner.displayName ? ` · ${item.owner.displayName}` : ""}
            {" · "}
            {item.spaceId.replace("space_", "Space #")}
            {item.type === "capsule" ? " · Time Capsule" : ""}
          </p>

          {item.sealed && (
            <p className="adm-card__sealed">
              Sealed capsule — only you can see this photo until{" "}
              {formatDateTime(item.unlockAt)}
            </p>
          )}

          {tab === "pending" && (
            <>
              <p className="adm-card__count">
                {item.reportCount} {item.reportCount === 1 ? "report" : "reports"}
              </p>

              <div className="adm-card__chips">
                {Object.entries(item.reasons).map(([reason, count]) => (
                  <span key={reason} className="adm-chip">
                    {REASON_LABEL[reason] || reason} × {count}
                  </span>
                ))}
              </div>

              <p className="adm-card__time">
                Latest report: {formatDateTime(item.latestReportedAt)}
              </p>
            </>
          )}

          {tab === "hidden" && (
            <p className="adm-card__time">
              Hidden: {formatDateTime(item.hiddenAt)}
            </p>
          )}

          <div className="adm-card__actions">
            {tab === "pending" && (
              <>
                <button
                  type="button"
                  className="adm-btn adm-btn--safe"
                  disabled={busy}
                  onClick={() => handleAction(item, "safe")}
                >
                  Safe
                </button>

                <button
                  type="button"
                  className="adm-btn"
                  disabled={busy}
                  onClick={() => handleAction(item, "hide")}
                >
                  Hide
                </button>
              </>
            )}

            {tab === "hidden" && (
              <button
                type="button"
                className="adm-btn adm-btn--safe"
                disabled={busy}
                onClick={() => handleAction(item, "unhide")}
              >
                Unhide
              </button>
            )}

            <button
              type="button"
              className="adm-btn adm-btn--danger"
              disabled={busy}
              onClick={() => handleAction(item, "delete")}
            >
              Delete
            </button>
          </div>
        </div>
      </li>
    );
  }

  function renderHistory(item) {
    return (
      <li key={item.id} className="adm-row">
        <div>
          <strong>{ACTION_LABEL[item.action] || item.action}</strong>
          <span className="adm-row__caption">
            {item.snapCaption || "No caption"}
          </span>
        </div>

        <div className="adm-row__right">
          <span className="adm-chip">
            {REASON_LABEL[item.reason] || item.reason}
          </span>
          <small>{formatDateTime(item.resolvedAt)}</small>
        </div>
      </li>
    );
  }

  // CHANGED: the wrapper was <main className="container page adm">. The admin
  // layout already provides the <main> and the page width, so it is a plain
  // <div> now (a <main> inside a <main> is invalid HTML).
  return (
    <div className="adm">
      <h1 className="adm__title">Reports</h1>

      <p className="adm__sub">
        Review Snaps that users have reported. <strong>Safe</strong> keeps the
        Snap as it is, <strong>Hide</strong> removes it from the wall (the
        owner can still see it), <strong>Delete</strong> removes it and frees
        the space.
      </p>

      <div className="adm__tabs" role="tablist">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`adm__tab ${tab === key ? "is-active" : ""}`}
            onClick={() => changeTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="adm__error">{error}</p>}

      {loading ? (
        <p className="adm__status">Loading...</p>
      ) : items.length === 0 ? (
        <p className="adm__status">
          {tab === "pending" && "No pending reports. All clear!"}
          {tab === "hidden" && "No hidden Snaps."}
          {tab === "history" && "No reviewed reports yet."}
        </p>
      ) : (
        <ul className={tab === "history" ? "adm-rows" : "adm-cards"}>
          {items.map(tab === "history" ? renderHistory : renderCard)}
        </ul>
      )}
    </div>
  );
}

export default AdminReports;