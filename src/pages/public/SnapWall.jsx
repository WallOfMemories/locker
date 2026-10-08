import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import SnapWallCanvas from "../../components/snap/SnapWallCanvas";
import SpaceDetails from "../../components/snap/SpaceDetails";

import { getSpaces } from "../../services/spaceApi";
import { getSnapWallSettings } from "../../services/settingsApi";

import "./SnapWall.css";

function SnapWall() {
  const [spaces, setSpaces] = useState([]);
  const [spacePrice, setSpacePrice] = useState(0);
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Shared links look like /?snap=<id> and open that Snap straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSnapId = searchParams.get("snap");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // The wall fills the screen; the page itself never scrolls.
  useEffect(() => {
    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSnapWall() {
      try {
        setLoading(true);
        setError("");

        const [spacesData, settingsData] = await Promise.all([
          getSpaces(),
          getSnapWallSettings(),
        ]);

        if (cancelled) return;

        setSpaces(spacesData);

        // Opened from a shared link? Show that Snap right away.
        const linked = new URLSearchParams(window.location.search).get("snap");
        const match = linked
          ? spacesData.find((space) => space.snapId === linked)
          : null;

        if (match) setSelectedSpace(match);
        setSpacePrice(settingsData.spacePrice);
      } catch (error) {
        console.error("Failed to load SnapWall:", error);

        if (!cancelled) {
          setError("Unable to load SnapWall. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSnapWall();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  function closeDetails() {
    setSelectedSpace(null);

    if (linkedSnapId) setSearchParams({}, { replace: true });
  }

  return (
    <main className="snapwall-page">
      {loading && (
        <div className="snapwall-status">Loading SnapWall...</div>
      )}

      {!loading && error && (
        <div className="snapwall-status">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <SnapWallCanvas
          spaces={spaces}
          onSelect={setSelectedSpace}
        />
      )}

      <SpaceDetails
        space={selectedSpace}
        price={spacePrice}
        onClose={closeDetails}
      />
    </main>
  );
}

export default SnapWall;