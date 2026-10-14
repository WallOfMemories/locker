import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiX,
  FiLock,
  FiMapPin,
  FiEdit2,
  FiShare2,
  FiCheck,
  FiClock,
  FiEye,
  FiEyeOff,
  FiTrash2,
} from "react-icons/fi";
import {
  FaHeart,
  FaRegHeart,
  FaBookmark,
  FaRegBookmark,
} from "react-icons/fa";

import {
  getSnapLikeInfo,
  likeSnap,
  unlikeSnap,
  getSnapSaveInfo,
  saveSnap,
  unsaveSnap,
  setSnapHidden,
  deleteSnap,
} from "../../services/snapService";
import { formatUnlockDate, timeUntil } from "../../utils/countdown";

import "./SnapViewer.css";

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Link that opens this Snap on the wall (SnapWall reads ?snap=<id>).
function buildSnapLink(snapId) {
  return `${window.location.origin}/?snap=${encodeURIComponent(snapId)}`;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // Fallback for non-secure contexts
  const area = document.createElement("textarea");

  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  document.body.removeChild(area);
}

/**
 * Big pop-up for one Snap: photo on the left (top on phones), details on
 * the right with Like / Save / Share and, for the owner, Edit.
 *
 * - Like + Save are optimistic: the UI flips instantly and rolls back if
 *   the server refuses.
 * - Sealed Time Capsules and hidden Snaps have no Like / Save / Share
 *   (the server rejects them too).
 * - NEW: the owner (canManage) can Hide / Unhide their Snap and Delete it.
 *   Hiding keeps the space; deleting frees the space and is NOT refunded.
 *   A Snap the moderators hid can't be un-hidden by its owner.
 */
function SnapViewer({
  snap,
  locked,
  now,
  ownerName,
  ownerPhoto,
  onClose,
  onEdit,
  onLikeChange,
  onSaveChange,
  canManage, // NEW: this is my own Snap
  onHiddenChange, // NEW: (snap, hidden) after I hide / unhide it
  onDeleted, // NEW: (snap) after I delete it
}) {
  // Hidden by the moderators (only they can undo it) vs hidden by me.
  const modHidden = snap.status === "hidden";
  const ownerHidden = snap.ownerHidden === true;
  const hidden = modHidden || ownerHidden;
  const canInteract = !locked && !hidden;

  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState({
    like: false,
    save: false,
    hide: false, // NEW
    remove: false, // NEW
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false); // NEW
  const [toast, setToast] = useState(null);
  const [burst, setBurst] = useState(0);

  const toastTimer = useRef(null);

  const showToast = useCallback((text, tone = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // Esc closes, page behind stops scrolling while the pop-up is open.
  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);

    const previous = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  // Load this Snap's like count + whether I liked / saved it.
  useEffect(() => {
    if (!canInteract) return undefined;

    let cancelled = false;

    getSnapLikeInfo(snap.id)
      .then((data) => {
        if (cancelled) return;

        setLiked(Boolean(data.liked));
        setLikeCount(data.likeCount || 0);
      })
      .catch((err) => console.error("Failed to load likes:", err));

    getSnapSaveInfo(snap.id)
      .then((data) => {
        if (!cancelled) setSaved(Boolean(data.saved));
      })
      .catch((err) => console.error("Failed to load save status:", err));

    return () => {
      cancelled = true;
    };
  }, [snap.id, canInteract]);

  async function handleLike() {
    if (busy.like) return;

    const next = !liked;

    setBusy((b) => ({ ...b, like: true }));
    setLiked(next);
    setLikeCount((count) => Math.max(0, count + (next ? 1 : -1)));

    if (next) setBurst((n) => n + 1);

    try {
      if (next) await likeSnap(snap.id);
      else await unlikeSnap(snap.id);

      onLikeChange?.(snap, next);
    } catch (err) {
      // roll back
      setLiked(!next);
      setLikeCount((count) => Math.max(0, count + (next ? -1 : 1)));
      showToast(err.message || "Couldn't update like.", "error");
    } finally {
      setBusy((b) => ({ ...b, like: false }));
    }
  }

  async function handleSave() {
    if (busy.save) return;

    const next = !saved;

    setBusy((b) => ({ ...b, save: true }));
    setSaved(next);

    try {
      if (next) await saveSnap(snap.id);
      else await unsaveSnap(snap.id);

      onSaveChange?.(snap, next);
      showToast(next ? "Saved to your collection" : "Removed from saved");
    } catch (err) {
      setSaved(!next);
      showToast(err.message || "Couldn't update saved.", "error");
    } finally {
      setBusy((b) => ({ ...b, save: false }));
    }
  }

  // NEW: hide / show my own Snap
  async function handleToggleHidden() {
    if (busy.hide) return;

    const next = !ownerHidden;

    setBusy((b) => ({ ...b, hide: true }));

    try {
      await setSnapHidden(snap.id, next);

      onHiddenChange?.(snap, next);
      showToast(
        next ? "Hidden — only you can see it" : "Visible on SnapWall again"
      );
    } catch (err) {
      showToast(err.message || "Couldn't update this Snap.", "error");
    } finally {
      setBusy((b) => ({ ...b, hide: false }));
    }
  }

  // NEW: delete my own Snap (the space is freed, no refund)
  async function handleDelete() {
    if (busy.remove) return;

    setBusy((b) => ({ ...b, remove: true }));

    try {
      await deleteSnap(snap.id);

      // The parent removes it and closes this pop-up.
      onDeleted?.(snap);
    } catch (err) {
      setConfirmingDelete(false);
      showToast(err.message || "Couldn't delete this Snap.", "error");
      setBusy((b) => ({ ...b, remove: false }));
    }
  }

  async function handleShare() {
    const link = buildSnapLink(snap.id);

    // Phones: open the native share sheet. Everyone else: copy the link.
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SnapWall",
          text: snap.caption || "Check out this Snap",
          url: link,
        });

        return;
      } catch (err) {
        if (err?.name === "AbortError") return; // user closed the sheet
      }
    }

    try {
      await copyText(link);
      showToast("Link copied to clipboard");
    } catch {
      showToast("Couldn't copy the link.", "error");
    }
  }

  const author = snap.username || ownerName;
  const photo = snap.userPhotoURL || ownerPhoto;

  return (
    <div
      className="sv"
      role="dialog"
      aria-modal="true"
      aria-label="Snap"
      onClick={onClose}
    >
      <div className="sv__card" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="sv__close"
          onClick={onClose}
          aria-label="Close"
        >
          <FiX />
        </button>

        {/* ---------- photo ---------- */}
        <div className={`sv__media ${locked ? "is-locked" : ""}`}>
          {snap.imageUrl && <img src={snap.imageUrl} alt={snap.caption || ""} />}

          {locked && (
            <span className="sv__lock">
              <FiLock />
              <strong>Time Capsule</strong>
            </span>
          )}
        </div>

        {/* ---------- details ---------- */}
        <div className="sv__panel">
          <header className="sv__head">
            <span className="sv__avatar">
              {photo ? (
                <img src={photo} alt="" />
              ) : (
                <span>{getInitials(author)}</span>
              )}
            </span>

            <div className="sv__who">
              {author && <strong>@{author}</strong>}
            </div>

            {snap.type === "capsule" && (
              <span className="sv__chip">
                <FiClock />
                Capsule
              </span>
            )}
          </header>

          <div className="sv__content">
            {locked ? (
              <p className="sv__when">
                Sealed until <strong>{formatUnlockDate(snap.unlockAt)}</strong>{" "}
                ({timeUntil(snap.unlockAt, now)}). It becomes public to
                everyone automatically.
              </p>
            ) : (
              <>
                {snap.caption ? (
                  <p className="sv__caption">{snap.caption}</p>
                ) : (
                  <p className="sv__caption sv__caption--empty">No caption</p>
                )}

                {snap.type === "capsule" && snap.unlockAt && (
                  <p className="sv__when">
                    Opened {formatUnlockDate(snap.unlockAt)}
                  </p>
                )}
              </>
            )}

            {modHidden && (
              <p className="sv__notice">
                Hidden by SnapWall moderators — only you can see this Snap.
              </p>
            )}

            {/* NEW: hidden by me */}
            {ownerHidden && !modHidden && (
              <p className="sv__notice">
                You've hidden this Snap — only you can see it. Your space is
                still yours. Unhide it to show it on SnapWall again.
              </p>
            )}

            {snap.location?.name && (
              <p className="sv__address">
                <FiMapPin />
                <span>
                  {snap.location.name}
                  {snap.location.address ? `, ${snap.location.address}` : ""}
                </span>
              </p>
            )}
          </div>

          <footer className="sv__footer">
            {canInteract && (
              <>
                <div className="sv__actions">
                  <button
                    type="button"
                    className={`sv__btn sv__btn--like ${liked ? "is-on" : ""}`}
                    onClick={handleLike}
                    disabled={busy.like}
                    aria-pressed={liked}
                    aria-label={liked ? "Unlike" : "Like"}
                  >
                    <span key={burst} className="sv__icon sv__icon--pop">
                      {liked ? <FaHeart /> : <FaRegHeart />}
                    </span>
                    <span className="sv__label">{liked ? "Liked" : "Like"}</span>
                  </button>

                  <button
                    type="button"
                    className={`sv__btn sv__btn--save ${saved ? "is-on" : ""}`}
                    onClick={handleSave}
                    disabled={busy.save}
                    aria-pressed={saved}
                    aria-label={saved ? "Remove from saved" : "Save"}
                  >
                    <span className="sv__icon">
                      {saved ? <FaBookmark /> : <FaRegBookmark />}
                    </span>
                    <span className="sv__label">{saved ? "Saved" : "Save"}</span>
                  </button>

                  <button
                    type="button"
                    className="sv__btn sv__btn--share"
                    onClick={handleShare}
                    aria-label="Share link"
                  >
                    <span className="sv__icon">
                      <FiShare2 />
                    </span>
                    <span className="sv__label">Share</span>
                  </button>
                </div>

                <p className="sv__likes">
                  <strong>{likeCount}</strong>{" "}
                  {likeCount === 1 ? "like" : "likes"}
                </p>
              </>
            )}

            {onEdit && (
              <button type="button" className="sv__edit" onClick={onEdit}>
                <FiEdit2 />
                Edit {snap.type === "capsule" ? "capsule" : "snap"}
              </button>
            )}

            {/* ---------- NEW: owner controls ---------- */}
            {canManage &&
              (confirmingDelete ? (
                <div className="sv__confirm" role="alertdialog">
                  <p>
                    <strong>
                      Delete this {snap.type === "capsule" ? "capsule" : "Snap"}
                      ?
                    </strong>{" "}
                    Your space will be freed for someone else to take.{" "}
                    <strong>You won't get a refund</strong>, and this can't be
                    undone.
                  </p>

                  <div className="sv__manage">
                    <button
                      type="button"
                      className="sv__btn"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={busy.remove}
                    >
                      <span className="sv__label">Keep it</span>
                    </button>

                    <button
                      type="button"
                      className="sv__btn sv__btn--danger is-on"
                      onClick={handleDelete}
                      disabled={busy.remove}
                    >
                      <span className="sv__icon">
                        <FiTrash2 />
                      </span>
                      <span className="sv__label">
                        {busy.remove ? "Deleting…" : "Yes, delete"}
                      </span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sv__manage">
                  {/* A sealed capsule is already private, and a Snap the
                      moderators hid can't be changed by its owner. */}
                  {!modHidden && !locked && (
                    <button
                      type="button"
                      className="sv__btn"
                      onClick={handleToggleHidden}
                      disabled={busy.hide}
                    >
                      <span className="sv__icon">
                        {ownerHidden ? <FiEye /> : <FiEyeOff />}
                      </span>
                      <span className="sv__label">
                        {ownerHidden ? "Unhide" : "Hide"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="sv__btn sv__btn--danger"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    <span className="sv__icon">
                      <FiTrash2 />
                    </span>
                    <span className="sv__label">Delete</span>
                  </button>
                </div>
              ))}
          </footer>
        </div>

        {toast && (
          <div
            className={`sv__toast ${toast.tone === "error" ? "is-error" : ""}`}
            role="status"
          >
            {toast.tone === "error" ? <FiX /> : <FiCheck />}
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

export default SnapViewer;