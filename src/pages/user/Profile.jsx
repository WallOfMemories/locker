import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FiGrid,
  FiClock,
  FiHeart,
  FiBookmark,
  FiCamera,
  FiEyeOff,
  FiLock,
  FiMapPin,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import { getMyProfile } from "../../services/userService";
import {
  getMySnaps,
  getLikedSnaps,
  getSavedSnaps,
} from "../../services/snapService";
import {
  formatShortDate,
  timeUntil,
} from "../../utils/countdown";

import EditSnapDialog from "../../components/snap/EditSnapDialog";
import SnapViewer from "../../components/snap/SnapViewer";

import "./Profile.css";

// ------------------------------------------------------------
// Instagram-style profile: header on top, then tabs, then a grid.
// CHANGED: My Snaps / Time Capsules / Liked / Saved used to be separate
// pages in the sidebar. They are now the tabs under the profile.
// The active tab lives in the URL (?tab=capsules) so refresh / back work
// and old links like /profile/capsules can redirect here.
// ------------------------------------------------------------
const TABS = [
  {
    key: "snaps",
    label: "Snaps",
    icon: FiGrid,
    empty: {
      icon: FiCamera,
      title: "Share your first Snap",
      text: "Pick a space on SnapWall and your Snaps will appear here.",
      action: true,
    },
  },
  {
    key: "capsules",
    label: "Time Capsules",
    icon: FiClock,
    empty: {
      icon: FiLock,
      title: "No Time Capsules yet",
      text: "Lock a Snap until a future date and it will wait for you here.",
      action: true,
    },
  },
  {
    key: "liked",
    label: "Liked",
    icon: FiHeart,
    empty: {
      icon: FiHeart,
      title: "No liked Snaps yet",
      text: "Snaps you like on SnapWall will appear here.",
    },
  },
  {
    key: "saved",
    label: "Saved",
    icon: FiBookmark,
    empty: {
      icon: FiBookmark,
      title: "No saved Snaps yet",
      text: "Save Snaps from SnapWall to find them here.",
    },
  },
];

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// A capsule is locked until its time passes, even if the server has not
// flipped the status yet (it does within a minute).
function isLockedNow(snap, now) {
  if (snap.status !== "locked") return false;

  const unlockMs = new Date(snap.unlockAt).getTime();

  return !Number.isFinite(unlockMs) || unlockMs > now;
}

// ---------------- one square in the grid ----------------
function SnapTile({ snap, locked, now, onOpen }) {
  return (
    <button
      type="button"
      className={`ptile ${locked ? "is-locked" : ""}`}
      onClick={() => onOpen(snap)}
      aria-label={
        locked
          ? `Locked Time Capsule, opens ${formatShortDate(snap.unlockAt)}`
          : snap.caption || "Open Snap"
      }
    >
      {snap.imageUrl ? (
        <img src={snap.imageUrl} alt="" loading="lazy" />
      ) : (
        <span className="ptile__blank" />
      )}

      {/* CHANGED: also shown for Snaps the owner hid themselves */}
      {(snap.status === "hidden" || snap.ownerHidden) && (
        <span
          className="ptile__hidden"
          title={
            snap.status === "hidden"
              ? "Hidden by SnapWall moderators — only you can see it"
              : "Hidden by you — only you can see it"
          }
        >
          <FiEyeOff />
          Hidden
        </span>
      )}

      {locked ? (
        <span className="ptile__lock">
          <FiLock />
          <strong>Opens {formatShortDate(snap.unlockAt)}</strong>
          <small>{timeUntil(snap.unlockAt, now)}</small>
        </span>
      ) : (
        <span className="ptile__hover">
          {snap.caption && (
            <span className="ptile__caption">{snap.caption}</span>
          )}

          {snap.location?.name && (
            <span className="ptile__place">
              <FiMapPin />
              {snap.location.name}
            </span>
          )}
        </span>
      )}
    </button>
  );
}

function Profile() {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // My own snaps (posts + capsules) load with the profile.
  const [mySnaps, setMySnaps] = useState([]);
  const [mySnapsError, setMySnapsError] = useState("");

  // Liked / Saved load the first time their tab is opened.
  const [lists, setLists] = useState({
    liked: { items: [], loading: true, error: "" },
    saved: { items: [], loading: true, error: "" },
  });
  const requested = useRef(new Set());

  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  // Re-evaluates locked tiles and countdowns every 30s.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);

    return () => clearInterval(timer);
  }, []);

  // Active tab comes from the URL; anything unknown falls back to "snaps".
  const requestedTab = searchParams.get("tab");
  const tab = TABS.some((t) => t.key === requestedTab)
    ? requestedTab
    : "snaps";

  function selectTab(key) {
    setSearchParams(key === "snaps" ? {} : { tab: key }, { replace: true });
  }

  // ---------- profile + my snaps ----------
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      navigate("/login");
      return;
    }

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const [profileData, snapsData] = await Promise.all([
          getMyProfile(),
          // a failure here must not hide the whole profile
          getMySnaps()
            .then((data) => ({ snaps: data.snaps || [] }))
            .catch((err) => ({
              snaps: [],
              error: err.message || "Failed to load your Snaps.",
            })),
        ]);

        setProfile(profileData);
        setMySnaps(snapsData.snaps);
        setMySnapsError(snapsData.error || "");
      } catch (err) {
        console.error("Profile loading failed:", err);

        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [currentUser, authLoading, navigate]);

  // ---------- liked / saved (lazy) ----------
  useEffect(() => {
    if (!currentUser) return;
    if (tab !== "liked" && tab !== "saved") return;
    if (requested.current.has(tab)) return;

    requested.current.add(tab);

    const load = tab === "liked" ? getLikedSnaps : getSavedSnaps;

    load()
      .then((items) =>
        setLists((prev) => ({
          ...prev,
          [tab]: { items, loading: false, error: "" },
        }))
      )
      .catch((err) => {
        // allow a retry the next time this tab is opened
        requested.current.delete(tab);

        setLists((prev) => ({
          ...prev,
          [tab]: {
            items: [],
            loading: false,
            error: err.message || "Failed to load Snaps.",
          },
        }));
      });
  }, [tab, currentUser]);

  if (authLoading || loading) {
    return <p className="profile__note">Loading profile…</p>;
  }

  if (error) {
    return <p className="profile__note profile__note--error">{error}</p>;
  }

  if (!profile) return null;

  // ---------- derive the grid for the active tab ----------
  const posts = mySnaps.filter((snap) => snap.type !== "capsule");

  const capsules = mySnaps
    .filter((snap) => snap.type === "capsule")
    // soonest-to-open first
    .sort(
      (a, b) =>
        new Date(a.unlockAt || 0).getTime() -
        new Date(b.unlockAt || 0).getTime()
    );

  let items = [];
  let tabLoading = false;
  let tabError = "";

  if (tab === "snaps") {
    items = posts;
    tabError = mySnapsError;
  } else if (tab === "capsules") {
    items = capsules;
    tabError = mySnapsError;
  } else {
    items = lists[tab].items;
    tabLoading = lists[tab].loading;
    tabError = lists[tab].error;
  }

  // Edit is only for my own Snaps / Time Capsules (not Liked / Saved), and
  // not for ones the moderators hid.
  const isOwnTab = tab === "snaps" || tab === "capsules";

  const canEditViewing =
    isOwnTab &&
    viewing &&
    viewing.status !== "hidden";

  function handleSaved(updated) {
    setMySnaps((prev) =>
      prev.map((snap) =>
        snap.id === updated.id ? { ...snap, ...updated } : snap
      )
    );

    setViewing((prev) =>
      prev && prev.id === updated.id ? { ...prev, ...updated } : prev
    );

    setEditing(null);
  }

  // NEW: I hid / unhid one of my Snaps in the pop-up.
  function handleHiddenChange(snap, hidden) {
    const patch = hidden
      ? { ownerHidden: true, ownerHiddenAt: new Date().toISOString() }
      : { ownerHidden: false, ownerHiddenAt: null };

    setMySnaps((prev) =>
      prev.map((item) => (item.id === snap.id ? { ...item, ...patch } : item))
    );

    setViewing((prev) =>
      prev && prev.id === snap.id ? { ...prev, ...patch } : prev
    );

    // A hidden Snap drops out of Liked / Saved lists (mine included, if I
    // liked my own), so reload them the next time they are opened.
    requested.current.delete("liked");
    requested.current.delete("saved");
  }

  // NEW: I deleted one of my Snaps. Its space is free again.
  function handleDeleted(snap) {
    setMySnaps((prev) => prev.filter((item) => item.id !== snap.id));

    setLists((prev) => ({
      liked: {
        ...prev.liked,
        items: prev.liked.items.filter((item) => item.id !== snap.id),
      },
      saved: {
        ...prev.saved,
        items: prev.saved.items.filter((item) => item.id !== snap.id),
      },
    }));

    setViewing(null);
  }

  // Keep the Liked / Saved tabs in step with what happens in the pop-up:
  // un-liking removes the tile; liking marks the tab to reload next time.
  function syncList(listKey, snap, on) {
    if (on) {
      requested.current.delete(listKey);
      return;
    }

    setLists((prev) => ({
      ...prev,
      [listKey]: {
        ...prev[listKey],
        items: prev[listKey].items.filter((item) => item.id !== snap.id),
      },
    }));
  }

  const activeTab = TABS.find((t) => t.key === tab);
  const Empty = activeTab.empty.icon;

  const username = profile.username || "";
  const displayName = profile.displayName || "";

  return (
    <div className="profile">
      {/* ---------------- header ---------------- */}
      <header className="profile__header">
        <div className="profile__avatar">
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Profile" />
          ) : (
            <span>{getInitials(displayName || username)}</span>
          )}
        </div>

        <div className="profile__info">
          <h1 className="profile__username">
            {username || displayName || "Your Profile"}
          </h1>

          {displayName && username && (
            <p className="profile__name">{displayName}</p>
          )}

          <ul className="profile__stats">
            <li>
              <strong>{posts.length}</strong>{" "}
              {posts.length === 1 ? "snap" : "snaps"}
            </li>
            <li>
              <strong>{capsules.length}</strong>{" "}
              {capsules.length === 1 ? "capsule" : "capsules"}
            </li>
          </ul>

          {profile.bio && <p className="profile__bio">{profile.bio}</p>}
        </div>
      </header>

      <div className="profile__actions">
        <button type="button" onClick={() => navigate("/profile/edit")}>
          Edit profile
        </button>

        <button type="button" onClick={() => navigate("/wall")}>
          Open SnapWall
        </button>
      </div>

      {/* ---------------- tabs ---------------- */}
      <nav className="profile__tabs" role="tablist" aria-label="Profile">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`profile__tab ${tab === key ? "is-active" : ""}`}
            onClick={() => selectTab(key)}
            title={label}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ---------------- grid ---------------- */}
      {tabLoading ? (
        <p className="profile__note">Loading…</p>
      ) : tabError ? (
        <p className="profile__note profile__note--error">{tabError}</p>
      ) : items.length === 0 ? (
        <div className="profile__empty">
          <span className="profile__empty-icon">
            <Empty />
          </span>

          <h2>{activeTab.empty.title}</h2>
          <p>{activeTab.empty.text}</p>

          {activeTab.empty.action && (
            <button type="button" onClick={() => navigate("/wall")}>
              Explore SnapWall
            </button>
          )}
        </div>
      ) : (
        <div className="profile__grid">
          {items.map((snap) => (
            <SnapTile
              key={snap.id}
              snap={snap}
              now={now}
              locked={isLockedNow(snap, now)}
              onOpen={setViewing}
            />
          ))}
        </div>
      )}

      {viewing && (
        <SnapViewer
          key={viewing.id}
          snap={viewing}
          now={now}
          ownerName={isOwnTab ? username : ""}
          ownerPhoto={isOwnTab ? profile.photoURL : ""}
          locked={isLockedNow(viewing, now)}
          onClose={() => setViewing(null)}
          onLikeChange={(snap, on) => syncList("liked", snap, on)}
          onSaveChange={(snap, on) => syncList("saved", snap, on)}
          onEdit={canEditViewing ? () => setEditing(viewing) : undefined}
          canManage={isOwnTab}
          onHiddenChange={handleHiddenChange}
          onDeleted={handleDeleted}
        />
      )}

      {editing && (
        <EditSnapDialog
          snap={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

export default Profile;