import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HiLockClosed, HiLocationMarker, HiGlobeAlt } from "react-icons/hi";

import { useAuth } from "../../context/AuthContext";
import { getMySnaps } from "../../services/snapService";
import { formatUnlockDate, timeUntil } from "../../utils/countdown";

import "./TimeCapsules.css";

function TimeCapsules() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Re-evaluates "locked / opened" and the countdowns every 30s.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !currentUser) return;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const data = await getMySnaps();

        setCapsules(
          (data.snaps || [])
            .filter((snap) => snap.type === "capsule")
            // soonest-to-open first
            .sort(
              (a, b) =>
                new Date(a.unlockAt || 0).getTime() -
                new Date(b.unlockAt || 0).getTime()
            )
        );
      } catch (err) {
        console.error("Failed to load capsules:", err);
        setError(err.message || "Failed to load your Time Capsules.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [currentUser, authLoading]);

  if (authLoading || loading) {
    return <p className="capsules__note">Loading your Time Capsules…</p>;
  }

  if (error) {
    return (
      <p className="capsules__note capsules__note--error">{error}</p>
    );
  }

  return (
    <div className="capsules">
      <header className="capsules__header">
        <h1>Time Capsules</h1>
        <p>
          {capsules.length} {capsules.length === 1 ? "capsule" : "capsules"}
        </p>
      </header>

      {capsules.length === 0 ? (
        <div className="capsules__empty">
          <span className="capsules__empty-icon">
            <HiLockClosed />
          </span>

          <h2>Nothing sealed yet</h2>

          <p>
            Pick a space on SnapWall and choose Time Capsule to lock a Snap
            until a date you choose.
          </p>

          <button type="button" onClick={() => navigate("/wall")}>
            Explore SnapWall
          </button>
        </div>
      ) : (
        <div className="capsules__grid">
          {capsules.map((snap) => {
            const unlockMs = new Date(snap.unlockAt).getTime();

            // Open once the time has passed, even if the server hasn't
            // flipped the status yet (it does so within a minute).
            const isLocked =
              snap.status === "locked" &&
              (!Number.isFinite(unlockMs) || unlockMs > now);

            return (
              <article
                key={snap.id}
                className={`capsules__card ${
                  isLocked ? "is-locked" : "is-open"
                }`}
              >
                <div className="capsules__media">
                  {snap.imageUrl && (
                    <img src={snap.imageUrl} alt={snap.caption || "Capsule"} />
                  )}

                  {isLocked && (
                    <span className="capsules__lock">
                      <HiLockClosed />
                    </span>
                  )}
                </div>

                <div className="capsules__body">
                  <span
                    className={`capsules__badge ${
                      isLocked ? "" : "capsules__badge--open"
                    }`}
                  >
                    {isLocked ? (
                      <>
                        <HiLockClosed /> Locked
                      </>
                    ) : (
                      <>
                        <HiGlobeAlt /> Public now
                      </>
                    )}
                  </span>

                  <p className="capsules__caption">
                    {snap.caption || "No caption"}
                  </p>

                  {snap.location && (
                    <p className="capsules__meta">
                      <HiLocationMarker />
                      <span>{snap.location.name}</span>
                    </p>
                  )}

                  <p className="capsules__when">
                    {isLocked ? (
                      <>
                        Opens {formatUnlockDate(snap.unlockAt)}
                        <small>{timeUntil(snap.unlockAt, now)}</small>
                      </>
                    ) : (
                      <>Opened {formatUnlockDate(snap.unlockAt)}</>
                    )}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TimeCapsules;