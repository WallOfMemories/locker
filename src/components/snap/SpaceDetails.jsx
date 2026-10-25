import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaRegHeart, FaHeart, FaRegBookmark, FaBookmark, FaShareAlt } from "react-icons/fa";
import {
  HiX,
  HiPlus,
  HiArrowRight,
  HiLockClosed,
  HiLocationMarker,
} from "react-icons/hi";
import { useAuth } from "../../context/AuthContext";
import { formatUnlockDate, timeUntil } from "../../utils/countdown";
import { reportSnap } from "../../services/moderationApi";
import ReportDialog from "./ReportDialog";
import ReportMenu from "./ReportMenu";
import {
  getSnapLikeInfo,
  likeSnap,
  unlikeSnap,
  getSnapSaveInfo,
  saveSnap,
  unsaveSnap,
} from "../../services/snapService";

import "./SpaceDetails.css";

// FIXED (share): the Share button used to copy window.location.href, which on
// the wall is just the home page — so the person you sent it to never saw the
// Snap. A Snap's real link is /?snap=<id>; SnapWall reads that and opens it.
function buildSnapLink(snapId) {
  return `${window.location.origin}/?snap=${encodeURIComponent(snapId)}`;
}

// navigator.clipboard only exists on https / localhost and can be refused,
// so fall back to the old textarea trick instead of crashing.
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const area = document.createElement("textarea");

  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();

  const ok = document.execCommand("copy");

  document.body.removeChild(area);

  if (!ok) throw new Error("Copy failed");
}

// NEW: the picture at the top of the "available" and "sealed" popups — a
// tiny piece of the wall fading out at the edges, with this space shown as
// the highlighted tile (a "+" when it's free, a lock when it's sealed).
function SpacePreview({ locked }) {
  return (
    <div
      className={`snapmodal__preview ${locked ? "is-locked" : ""}`}
      aria-hidden="true"
    >
      <div className="snapmodal__preview-grid">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} className="snapmodal__tile" />
        ))}

        <div className="snapmodal__spot">
          <span className="snapmodal__spot-icon">
            {locked ? <HiLockClosed /> : <HiPlus />}
          </span>
        </div>
      </div>
    </div>
  );
}

function SpaceDetails({ space, price, onClose }) {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Visitors who are not logged in can look around, but liking, saving,
  // reporting and creating a Snap send them to /login. After login they come
  // back to this same Snap / space on the wall.
  function goToLogin() {
    const search = space?.snapId
      ? `?snap=${encodeURIComponent(space.snapId)}`
      : space?.id
        ? `?space=${encodeURIComponent(space.id)}`
        : "";

    navigate("/login", { state: { from: { pathname: "/", search } } });
  }

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);

  // "idle" | "copied" | "failed" — shown on the Share button for 2 seconds
  const [shareState, setShareState] = useState("idle");

  useEffect(() => {
    if (!space) return;

    // Available spaces and sealed capsules have no likes / saves to load.
    if (space.status !== "occupied" || space.locked || space.hidden) {
      return;
    }

    async function loadLikeInfo() {
      try {
        const data = await getSnapLikeInfo(space.snapId);

        setLiked(data.liked);
        setLikeCount(data.likeCount);
      } catch (error) {
        console.error("Failed to load likes:", error);
      }
    }

    async function loadSaveInfo() {
      try {
        const data = await getSnapSaveInfo(space.snapId);

        setSaved(data.saved);
      } catch (error) {
        console.error("Failed to load save status:", error);
      }
    }

    loadLikeInfo();
    loadSaveInfo();
  }, [space]);

  async function handleLike() {
    if (!currentUser) {
      goToLogin();
      return;
    }

    if (likeLoading) return;

    try {
      setLikeLoading(true);

      if (liked) {
        await unlikeSnap(space.snapId);

        setLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      } else {
        await likeSnap(space.snapId);

        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch (error) {
      console.error("Like action failed:", error);

      alert(error.message || "Unable to update like.");
    } finally {
      setLikeLoading(false);
    }
  }

  // Phones: open the native share sheet. Everyone else: copy the link.
  async function handleShare() {
    const link = buildSnapLink(space.snapId);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "SnapWall",
          text: space.caption || "Check out this Snap",
          url: link,
        });

        return;
      } catch (error) {
        if (error?.name === "AbortError") return; // person closed the sheet
        // any other failure: fall through and copy the link instead
      }
    }

    try {
      await copyText(link);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }

    setTimeout(() => setShareState("idle"), 2000);
  }

  async function handleSave() {
    if (!currentUser) {
      goToLogin();
      return;
    }

    if (saveLoading) return;

    try {
      setSaveLoading(true);

      if (saved) {
        await unsaveSnap(space.snapId);
        setSaved(false);
      } else {
        await saveSnap(space.snapId);
        setSaved(true);
      }
    } catch (error) {
      console.error("Save action failed:", error);

      alert(error.message || "Unable to update saved status.");
    } finally {
      setSaveLoading(false);
    }
  }

  function handleReportClick() {
    if (!currentUser) {
      goToLogin();
      return;
    }

    setReportOpen(true);
  }

  if (!space) return null;

  const isOccupied = space.status === "occupied";
  const isLocked = isOccupied && space.locked;

  // Hidden by an admin: the photo is not sent to the browser at all.
  const isHidden = isOccupied && space.hidden;

  // Everyone except the owner gets the three-dots menu with "Report"
  // (photo Snaps and Time Capsules, sealed or open). Logged-out visitors
  // see it too and are asked to log in when they choose Report.
  const ownerId = space.ownerId || space.occupiedBy || "";
  const isOwner = Boolean(currentUser) && currentUser.uid === ownerId;
  const canReport = isOccupied && !isHidden && !isOwner;

  // "space_006" -> "006" (nothing is shown if the id has no digits)
  const spaceNumber = String(space.id ?? "").match(/\d+/)?.[0] || "";

  // NEW: the location pill opens the place in Google Maps. Places the
  // person typed by hand have no coordinates, so those stay plain text.
  const place = space.location;

  const mapsUrl =
    place &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
      ? `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`
      : null;

  const placeTitle = place
    ? [place.name, place.address].filter(Boolean).join(", ")
    : "";

  const placeContent = place && (
    <>
      <span className="snapmodal__place-pin">
        <HiLocationMarker />
      </span>

      <span className="snapmodal__place-name">{place.name}</span>
    </>
  );

  return (
    <div className="snapmodal-backdrop" onClick={onClose}>
      <div
        className="snapmodal"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          className="snapmodal__close"
          onClick={onClose}
          type="button"
          aria-label="Close"
        >
          <HiX />
        </button>

        {isHidden ? (
          <div className="snapmodal__available">
            <span className="snapmodal__badge snapmodal__badge--sealed">
              Hidden Snap
            </span>

            {space.username && (
              <p className="snapmodal__sealed-by">@{space.username}</p>
            )}

            <h2 className="snapmodal__title">Hidden for now.</h2>

            {/* CHANGED: says who hid it — the moderators, or the owner */}
            <p className="snapmodal__description">
              {space.hiddenBy === "owner"
                ? isOwner
                  ? "You've hidden this Snap. Your space is still yours — unhide it from your profile to show it again."
                  : "The owner has hidden this Snap."
                : "This Snap has been hidden by the SnapWall moderators."}
            </p>
          </div>
        ) : isLocked ? (
          <div className="snapmodal__available">
            {canReport && (
              <ReportMenu floating onReport={handleReportClick} />
            )}

            <SpacePreview locked />

            <span className="snapmodal__badge snapmodal__badge--sealed">
              Sealed Time Capsule
            </span>

            {space.username && (
              <p className="snapmodal__sealed-by">@{space.username}</p>
            )}

            <h2 className="snapmodal__title">Locked for now.</h2>

            <p className="snapmodal__description">
              This Snap opens to everyone on{" "}
              <strong>{formatUnlockDate(space.unlockAt)}</strong>
              {space.unlockAt && (
                <> ({timeUntil(space.unlockAt, Date.now())})</>
              )}
              . Come back then to see it.
            </p>
          </div>
        ) : isOccupied ? (
          <>
            <div className="snapmodal__frame">
              <img
                src={space.image}
                alt={space.caption || "Snap"}
                className="snapmodal__image"
              />
            </div>

            {/* CHANGED: username on the left, location pill on the right,
                both directly under the photo and above the caption */}
            <div className="snapmodal__meta">
              <p className="snapmodal__username">@{space.username}</p>

              <div className="snapmodal__meta-end">
                {place &&
                  (mapsUrl ? (
                    <a
                      className="snapmodal__place snapmodal__place--link"
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`${placeTitle} · Open in Google Maps`}
                    >
                      {placeContent}
                    </a>
                  ) : (
                    <span className="snapmodal__place" title={placeTitle}>
                      {placeContent}
                    </span>
                  ))}

                {canReport && <ReportMenu onReport={handleReportClick} />}
              </div>
            </div>

            <h2 className="snapmodal__title">{space.caption}</h2>

            <div className="snapmodal__actions">
              <button
                type="button"
                className="snapmodal__action snapmodal__action--like"
                onClick={handleLike}
                disabled={likeLoading}
              >
                {liked ? <FaHeart /> : <FaRegHeart />}
                {liked ? "Liked" : "Like"} {likeCount}
              </button>

              <button
                type="button"
                className="snapmodal__action snapmodal__action--save"
                onClick={handleSave}
                disabled={saveLoading}
              >
                {saved ? <FaBookmark /> : <FaRegBookmark />}
                {saved ? "Saved" : "Save"}
              </button>

              <button
                type="button"
                className="snapmodal__action snapmodal__action--share"
                onClick={handleShare}
              >
                <FaShareAlt />
                {shareState === "copied"
                  ? "Link copied!"
                  : shareState === "failed"
                    ? "Couldn't copy"
                    : "Share"}
              </button>
            </div>
          </>
        ) : (
          <div className="snapmodal__available">
            <SpacePreview />

            <span className="snapmodal__badge snapmodal__badge--available">
              Available space
              {spaceNumber && (
                <em className="snapmodal__badge-id">#{spaceNumber}</em>
              )}
            </span>

            <h2 className="snapmodal__title">Make this space yours.</h2>

            <p className="snapmodal__description">
              Create a Snap and place your memory on SnapWall.
            </p>

            <div className="snapmodal__price">
              <span className="snapmodal__price-label">Space price</span>
              <span className="snapmodal__price-value">₹{price}</span>
            </div>

            <button
              className="snapmodal__primary"
              type="button"
              onClick={() => {
                if (!currentUser) {
                  goToLogin();
                  return;
                }

                navigate("/create-snap", {
                  state: {
                    space,
                  },
                });
              }}
            >
              {currentUser ? "Create Snap" : "Log in to create a Snap"}
              <HiArrowRight />
            </button>
          </div>
        )}
      </div>

      {reportOpen && (
        <ReportDialog
          onSubmit={(reason) => reportSnap(space.snapId, reason)}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  );
}

export default SpaceDetails;