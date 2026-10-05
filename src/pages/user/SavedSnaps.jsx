import { useEffect, useState } from "react";

import { getSavedSnaps } from "../../services/snapService";
import { useAuth } from "../../context/AuthContext";
import "./SavedSnaps.css";

function SavedSnaps() {
  const { currentUser } = useAuth();

  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    async function loadSavedSnaps() {
      try {
        setLoading(true);
        setError("");

        const data = await getSavedSnaps();

        setSnaps(data);
      } catch (error) {
        console.error(
          "Failed to load saved Snaps:",
          error
        );

        setError(
          error.message ||
            "Failed to load saved Snaps."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSavedSnaps();
  }, [currentUser]);

  if (loading) {
    return (
      <main className="page">
        <div className="container">
          <h1>Saved Snaps</h1>
          <p>Loading your saved Snaps...</p>
        </div>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="page">
        <div className="container">
          <h1>Saved Snaps</h1>
          <p>Please login to see your saved Snaps.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        <h1>Saved Snaps</h1>

        <p>
          Snaps you saved for later.
        </p>

        {error && (
          <p style={{ color: "red" }}>
            {error}
          </p>
        )}

        {!error && snaps.length === 0 && (
          <div>
            <h2>No saved Snaps yet.</h2>

            <p>
              Save memories from SnapWall and
              they'll appear here.
            </p>
          </div>
        )}

        {snaps.length > 0 && (
          <div className="saved-snaps-grid">
            {snaps.map((snap) => (
              <article
                key={snap.id}
                className="saved-snap-card"
              >
                <img
                  src={snap.imageUrl}
                  alt={
                    snap.caption ||
                    "Saved Snap"
                  }
                />

                <div>
                  <strong>
                    @{snap.username}
                  </strong>

                  <p>
                    {snap.caption}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default SavedSnaps;