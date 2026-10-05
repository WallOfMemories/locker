import { HiLockClosed, HiEyeOff } from "react-icons/hi";

import { formatShortDate } from "../../utils/countdown";

import "./SnapSpace.css";

function SnapSpace({ space, onSelect, style }) {
  const isOccupied = space.status === "occupied";

  // NEW: a sealed Time Capsule — the space is taken but the photo and
  // caption stay private until it unlocks (the server doesn't send them).
  const isLocked = isOccupied && space.locked;

  // NEW: hidden by an admin — the space stays taken but shows no photo.
  const isHidden = isOccupied && space.hidden;

  return (
    <button
      className={`snap-space ${
        isOccupied
          ? "snap-space--occupied"
          : "snap-space--available"
      } ${isLocked || isHidden ? "snap-space--locked" : ""}`}
      style={style}
      onClick={() => onSelect(space)}
      type="button"
    >
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
          <span>+</span>
          <small>Available</small>
        </div>
      )}
    </button>
  );
}

export default SnapSpace;