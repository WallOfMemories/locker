import { HiLockClosed, HiEyeOff } from "react-icons/hi";
// CHANGED: the "+" is now a real icon, so every one is drawn identically at
// every size (the old hand-drawn bars looked thicker or thinner depending on
// where the box landed on the screen)
import { FiPlusCircle } from "react-icons/fi";

import { formatShortDate } from "../../utils/countdown";

import "./SnapSpace.css";

// One box on the wall.
//
// CHANGED (new design): every box is now a white card with a soft shadow.
//   - available  -> a dashed rust frame with a "+" and AVAILABLE inside
//   - occupied   -> the photo sits inside the white card, like a print
//   - sealed / hidden -> a dark panel inside the card
// CHANGED: photos now fill the whole box (no white frame), the "+" is
// smaller, and the account holder's own boxes are highlighted (`mine`) with
// a rust ring and a YOU badge so they are easy to spot on a big wall.
// The card is a separate inner element (.snap-space__card) because the box
// itself is the "container" its sizes (fonts, padding, corner radius) scale
// from, so the same design looks right whether a box is 54px or 240px wide.
function SnapSpace({ space, onSelect, style, mine = false }) {
  const isOccupied = space.status === "occupied";

  // A sealed Time Capsule — the space is taken but the photo and caption
  // stay private until it unlocks (the server doesn't send them).
  const isLocked = isOccupied && space.locked;

  // Hidden by an admin — the space stays taken but shows no photo.
  const isHidden = isOccupied && space.hidden;

  const label =
    (isHidden
      ? "Hidden Snap"
      : isLocked
        ? "Sealed Time Capsule"
        : isOccupied
          ? space.caption || "Snap"
          : "Available space") + (mine ? " (yours)" : "");

  return (
    <button
      className={`snap-space ${
        isOccupied ? "snap-space--occupied" : "snap-space--available"
      } ${isLocked || isHidden ? "snap-space--locked" : ""} ${
        mine ? "snap-space--mine" : ""
      }`}
      style={style}
      onClick={() => onSelect(space)}
      type="button"
      aria-label={label}
    >
      <div className="snap-space__card">
        {mine && <span className="snap-space__badge">You</span>}

        {isHidden ? (
          <div className="snap-space__locked">
            <span className="snap-space__lock">
              <HiEyeOff />
            </span>

            <strong>Hidden</strong>
          </div>
        ) : isLocked ? (
          <div className="snap-space__locked">
            <span className="snap-space__lock">
              <HiLockClosed />
            </span>

            <strong>Time Capsule</strong>

            {space.unlockAt && (
              <small>Opens {formatShortDate(space.unlockAt)}</small>
            )}
          </div>
        ) : isOccupied ? (
          <>
            {space.image && (
              <img
                src={space.image}
                alt={space.caption || "Snap"}
                className="snap-space__image"
                draggable={false}
                decoding="async"
                loading="lazy"
              />
            )}

            <div className="snap-space__overlay">
              <span>
                {space.username ? `@${space.username}` : "Occupied"}
              </span>
            </div>
          </>
        ) : (
          <div className="snap-space__available">
            <FiPlusCircle
              className="snap-space__plus"
              strokeWidth={1.6}
              aria-hidden="true"
            />
            <small>Available</small>
          </div>
        )}
      </div>
    </button>
  );
}

export default SnapSpace;