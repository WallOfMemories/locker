import { useEffect, useState } from "react";

import { getLikedSnaps } from "../../services/snapService";
import { useAuth } from "../../context/AuthContext";

import "./LikedSnaps.css";

function LikedSnaps() {
  const { currentUser } = useAuth();

  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    async function loadLikedSnaps() {
      try {
        setLoading(true);
        setError("");

        const data = await getLikedSnaps();

        setSnaps(data);
      } catch (error) {
        console.error(
          "Failed to load liked Snaps:",
          error
        );

        setError(
          error.message ||
            "Failed to load liked Snaps."
        );
      } finally {
        setLoading(false);
      }
    }

    loadLikedSnaps();
  }, [currentUser]);

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <h1>Liked Snaps</h1>
          <p>Loading your liked Snaps...</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="page">
        <div className="container">
          <h1>Liked Snaps</h1>
          <p>
            Please login to see your liked Snaps.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <h1>Liked Snaps</h1>

        <p>
          Snaps you've liked on SnapWall.
        </p>

        {error && (
          <p style={{ color: "red" }}>
            {error}
          </p>
        )}

        {!error && snaps.length === 0 && (
          <div className="liked-snaps-empty">
            <h2>No liked Snaps yet.</h2>

            <p>
              Like a memory on SnapWall and
              it will appear here.
            </p>
          </div>
        )}

        {snaps.length > 0 && (
          <div className="liked-snaps-grid">
            {snaps.map((snap) => (
              <article
                key={snap.id}
                className="liked-snap-card"
              >
                <img
                  src={snap.imageUrl}
                  alt={
                    snap.caption ||
                    "Liked Snap"
                  }
                />

                <div className="liked-snap-card__content">
                  <strong>
                    @{snap.username}
                  </strong>

                  {snap.caption && (
                    <p>{snap.caption}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default LikedSnaps;