import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAdminWall,
  expandWall,
  updateWallSettings,
} from "../../services/adminApi";
import { planGrowth } from "../../utils/wallGrowth";

import "./AdminWall.css";

const PRESETS = [10, 25, 50, 100];

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString();
}

function AdminWall() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // expand form
  const [count, setCount] = useState("");
  const [expanding, setExpanding] = useState(false);

  // auto-expansion form (kept as strings so typing feels natural)
  const [autoExpand, setAutoExpand] = useState(false);
  const [threshold, setThreshold] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [saving, setSaving] = useState(false);

  // Puts a server response into the page's state.
  const applyResult = useCallback((result) => {
    setData(result);
    setAutoExpand(result.settings.autoExpand);
    setThreshold(String(result.settings.expansionThreshold));
    setBatchSize(String(result.settings.expansionBatchSize));

    // Only pre-fill the amount the first time.
    setCount((current) =>
      current === "" ? String(result.settings.expansionBatchSize) : current
    );
  }, []);

  // Re-fetches after an expansion / settings change.
  const reload = useCallback(async () => {
    applyResult(await getAdminWall());
  }, [applyResult]);

  useEffect(() => {
    let cancelled = false;

    getAdminWall()
      .then((result) => {
        if (!cancelled) applyResult(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load the wall.");
      });

    return () => {
      cancelled = true;
    };
  }, [applyResult]);

  const wall = data?.wall;
  const limits = data?.limits;

  // ---------- live preview of the expansion ----------
  const want = Number(count);
  const wantIsValid =
    Number.isInteger(want) && want >= 1 && want <= (limits?.maxAddPerAction || 0);

  const plan = useMemo(() => {
    if (!wall || !wantIsValid) return null;

    return planGrowth(wall.cols, wall.rows, wall.total, want);
  }, [wall, wantIsValid, want]);

  const overLimit =
    plan && limits ? wall.total + plan.add > limits.maxTotalSpaces : false;

  // Map of the wall (and where the new spaces would go).
  const mapCells = useMemo(() => {
    if (!wall) return null;

    const state = new Map();
    wall.cells.forEach(([row, column, occupied]) => {
      state.set(`${row}:${column}`, occupied ? "taken" : "free");
    });

    const cols = plan && !overLimit ? plan.cols : wall.cols;
    const rows = plan && !overLimit ? plan.rows : wall.rows;
    const cells = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < cols; column += 1) {
        cells.push({
          key: `${row}:${column}`,
          kind: state.get(`${row}:${column}`) || "new",
        });
      }
    }

    return { cols, cells };
  }, [wall, plan, overLimit]);

  // ---------- actions ----------
  async function handleExpand() {
    if (!plan || overLimit || expanding) return;

    const ok = window.confirm(
      `Add ${plan.add} spaces? The wall grows from ${wall.cols} × ${wall.rows} to ${plan.cols} × ${plan.rows}. This can't be undone.`
    );

    if (!ok) return;

    try {
      setExpanding(true);
      setError("");
      setNotice("");

      const result = await expandWall(want);
      await reload();

      setNotice(
        `Added ${result.added} spaces. The wall is now ${result.toCols} × ${result.toRows} (${result.totalAfter} spaces).`
      );
    } catch (err) {
      setError(err.message || "Failed to expand the wall.");
    } finally {
      setExpanding(false);
    }
  }

  const settingsChanged =
    data &&
    (autoExpand !== data.settings.autoExpand ||
      threshold !== String(data.settings.expansionThreshold) ||
      batchSize !== String(data.settings.expansionBatchSize));

  async function handleSaveSettings() {
    const thresholdNumber = Number(threshold);
    const batchNumber = Number(batchSize);

    if (
      !Number.isInteger(thresholdNumber) ||
      thresholdNumber < 1 ||
      thresholdNumber > 100
    ) {
      setError("Threshold must be a whole number from 1 to 100.");
      return;
    }

    if (
      !Number.isInteger(batchNumber) ||
      batchNumber < 1 ||
      batchNumber > limits.maxAddPerAction
    ) {
      setError(
        `Batch size must be a whole number from 1 to ${limits.maxAddPerAction}.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setNotice("");

      await updateWallSettings({
        autoExpand,
        expansionThreshold: thresholdNumber,
        expansionBatchSize: batchNumber,
      });
      await reload();

      setNotice("Auto-expansion settings saved.");
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  // ---------- render ----------
  return (
    <div className="ad-page">
      <div className="ad-head">
        <h1>Wall Size</h1>
        <p>
          Make the wall bigger when it fills up. New spaces are only ever
          added — existing Snaps never move, and the wall can't be made
          smaller.
        </p>
      </div>

      {error && <p className="ad-error">{error}</p>}
      {notice && <p className="ad-notice">{notice}</p>}

      {!data && !error && <p className="ad-status">Loading...</p>}

      {data && (
        <>
          <div className="ad-stats">
            <div className="ad-stat">
              <span className="ad-stat__label">Wall size</span>
              <span className="ad-stat__value">
                {wall.cols} × {wall.rows}
              </span>
              <span className="ad-stat__hint">columns × rows</span>
            </div>

            <div className="ad-stat">
              <span className="ad-stat__label">Total spaces</span>
              <span className="ad-stat__value">{wall.total}</span>
              <span className="ad-stat__hint">max {limits.maxTotalSpaces}</span>
            </div>

            <div className="ad-stat">
              <span className="ad-stat__label">Taken</span>
              <span className="ad-stat__value">{wall.occupied}</span>
              <span className="ad-stat__hint">{wall.occupancyPercent}% full</span>
            </div>

            <div className="ad-stat">
              <span className="ad-stat__label">Free</span>
              <span className="ad-stat__value">{wall.available}</span>
            </div>
          </div>

          <div className="ad-two">
            <section className="ad-panel">
              <div className="ad-panel__head">
                <h2>Add spaces</h2>
              </div>

              <label className="ad-field">
                <span>How many spaces?</span>
                <input
                  type="number"
                  min="1"
                  max={limits.maxAddPerAction}
                  className="ad-input"
                  value={count}
                  onChange={(event) => setCount(event.target.value)}
                />
              </label>

              <div className="ad-tabs" style={{ marginBottom: 14 }}>
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`ad-tab ${
                      Number(count) === preset ? "is-active" : ""
                    }`}
                    onClick={() => setCount(String(preset))}
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              <p className="ad-wall__plan" aria-live="polite">
                {!wantIsValid &&
                  `Enter a whole number from 1 to ${limits.maxAddPerAction}.`}

                {wantIsValid && overLimit && (
                  <span className="ad-wall__bad">
                    That would make {wall.total + plan.add} spaces. The wall can
                    hold at most {limits.maxTotalSpaces}.
                  </span>
                )}

                {wantIsValid && plan && !overLimit && (
                  <>
                    The wall grows from{" "}
                    <strong>
                      {wall.cols} × {wall.rows}
                    </strong>{" "}
                    to{" "}
                    <strong>
                      {plan.cols} × {plan.rows}
                    </strong>{" "}
                    and adds <strong>{plan.add}</strong> spaces
                    {plan.add !== want &&
                      " (rounded up so the wall stays a full rectangle)"}
                    .
                  </>
                )}
              </p>

              <button
                type="button"
                className="ad-btn"
                disabled={!plan || overLimit || expanding}
                onClick={handleExpand}
              >
                {expanding ? "Expanding…" : "Expand wall"}
              </button>
            </section>

            <section className="ad-panel">
              <div className="ad-panel__head">
                <h2>Auto-expansion</h2>
              </div>

              <p className="ad-panel__sub">
                When this is on, SnapWall adds spaces by itself right after a
                Snap is posted and the wall is at least the chosen percentage
                full.
              </p>

              <label className="ad-switch">
                <input
                  type="checkbox"
                  checked={autoExpand}
                  onChange={(event) => setAutoExpand(event.target.checked)}
                />
                <span className="ad-switch__track" aria-hidden="true" />
                <span>{autoExpand ? "On" : "Off"}</span>
              </label>

              <label className="ad-field">
                <span>Expand when the wall is this full (%)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  className="ad-input"
                  value={threshold}
                  onChange={(event) => setThreshold(event.target.value)}
                />
              </label>

              <label className="ad-field">
                <span>Spaces to add each time</span>
                <input
                  type="number"
                  min="1"
                  max={limits.maxAddPerAction}
                  className="ad-input"
                  value={batchSize}
                  onChange={(event) => setBatchSize(event.target.value)}
                />
                <small>Rounded up to a full row/column, like manual expansion.</small>
              </label>

              <button
                type="button"
                className="ad-btn"
                disabled={!settingsChanged || saving}
                onClick={handleSaveSettings}
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </section>
          </div>

          <section className="ad-panel" style={{ marginTop: 22 }}>
            <div className="ad-panel__head">
              <h2>{plan && !overLimit ? "Preview" : "Wall map"}</h2>
            </div>

            <div
              className="ad-map"
              style={{
                gridTemplateColumns: `repeat(${mapCells.cols}, minmax(0, 1fr))`,
              }}
              aria-hidden="true"
            >
              {mapCells.cells.map((cell) => (
                <span key={cell.key} className={`ad-map__cell is-${cell.kind}`} />
              ))}
            </div>

            <div className="ad-map__legend">
              <span>
                <i className="ad-map__dot is-taken" /> Taken
              </span>
              <span>
                <i className="ad-map__dot is-free" /> Free
              </span>
              {plan && !overLimit && (
                <span>
                  <i className="ad-map__dot is-new" /> New
                </span>
              )}
            </div>
          </section>

          <section className="ad-panel">
            <div className="ad-panel__head">
              <h2>Expansion history</h2>
            </div>

            {data.expansions.length === 0 ? (
              <p className="ad-empty">The wall hasn't been expanded yet.</p>
            ) : (
              <ul className="ad-list">
                {data.expansions.map((item) => (
                  <li key={item.id}>
                    <div>
                      +{item.added} spaces · {item.fromCols} × {item.fromRows} →{" "}
                      {item.toCols} × {item.toRows}
                      <small>{formatDate(item.createdAt)}</small>
                    </div>

                    <span
                      className={`ad-badge ${
                        item.source === "auto" ? "ad-badge--green" : ""
                      }`}
                    >
                      {item.source === "auto" ? "Automatic" : "Manual"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AdminWall;