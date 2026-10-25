import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// CHANGED: the zoom-and-drag canvas is replaced by a grid that fits the screen
import SnapWallGrid from "../../components/snap/SnapWallGrid";
import SpaceDetails from "../../components/snap/SpaceDetails";

// NEW: who is using the site, so their own Snaps can be highlighted
import { useAuth } from "../../context/AuthContext";

import { getSpaces } from "../../services/spaceApi";
import { getSnapWallSettings } from "../../services/settingsApi";

import "./SnapWall.css";

function SnapWall() {
  const { currentUser } = useAuth();

  const [spaces, setSpaces] = useState([]);
  const [spacePrice, setSpacePrice] = useState(0);
  const [selectedSpace, setSelectedSpace] = useState(null);

  // Shared links look like /?snap=<id> and open that Snap straight away.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedSnapId = searchParams.get("snap");
  // /?space=space_006 reopens an available space after the visitor logs in.
  const linkedSpaceId = searchParams.get("space");

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

  // NEW: while the page is open, quietly re-check the wall so spaces an admin
  // adds and Snaps other people post show up without a refresh. It never
  // shows the loading screen and never touches an error that is on screen.
  useEffect(() => {
    let cancelled = false;

    async function refreshQuietly() {
      if (document.visibilityState !== "visible") return;

      try {
        const spacesData = await getSpaces();

        if (!cancelled) setSpaces(spacesData);
      } catch {
        // keep showing what we have; the next check will try again
      }
    }

    const timer = setInterval(refreshQuietly, 30 * 1000);

    document.addEventListener("visibilitychange", refreshQuietly);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshQuietly);
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
        const query = new URLSearchParams(window.location.search);
        const linked = query.get("snap");
        const linkedSpace = query.get("space");
        const match = linked
          ? spacesData.find((space) => space.snapId === linked)
          : linkedSpace
            ? spacesData.find((space) => space.id === linkedSpace)
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

    if (linkedSnapId || linkedSpaceId) setSearchParams({}, { replace: true });
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
        <SnapWallGrid
          spaces={spaces}
          onSelect={setSelectedSpace}
          myId={currentUser?.uid}
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