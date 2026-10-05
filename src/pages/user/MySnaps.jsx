import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getMySnaps } from "../../services/snapService";

function MySnaps() {
  const { currentUser, loading: authLoading } =
    useAuth();

  const navigate = useNavigate();

  const [snaps, setSnaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function loadSnaps() {
      try {
        setLoading(true);
        setError("");

        const data = await getMySnaps();

        setSnaps(data.snaps || []);
      } catch (error) {
        console.error(
          "Failed to load my snaps:",
          error
        );

        setError(
          error.message ||
            "Failed to load your snaps."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSnaps();
  }, [
    currentUser,
    authLoading,
    navigate,
  ]);

  if (authLoading || loading) {
    return (
      <main className="page">
        <div className="container">
          <p>Loading your Snaps...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page">
        <div className="container">
          <h1>My Snaps</h1>

          <p style={{ color: "red" }}>
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="container">

        <h1>My Snaps</h1>

        <p>
          {snaps.length}{" "}
          {snaps.length === 1
            ? "Snap"
            : "Snaps"}
        </p>

        {snaps.length === 0 ? (
          <div>
            <p>
              You haven't created any Snaps yet.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate("/wall")
              }
            >
              Explore SnapWall
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "20px",
              marginTop: "30px",
            }}
          >
            {snaps.map((snap) => (
              <article
                key={snap.id}
                style={{
                  overflow: "hidden",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  background: "#fff",
                }}
              >
                {snap.imageUrl && (
                  <img
                    src={snap.imageUrl}
                    alt={
                      snap.caption ||
                      "My Snap"
                    }
                    style={{
                      width: "100%",
                      aspectRatio: "1",
                      objectFit: "cover",
                    }}
                  />
                )}

                <div
                  style={{
                    padding: "15px",
                  }}
                >
                  <p>
                    {snap.caption ||
                      "No caption"}
                  </p>

                  <small>
                    Space #{snap.spaceId}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>
    </main>
  );
}

export default MySnaps;