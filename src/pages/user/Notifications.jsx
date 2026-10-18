import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCreditCard,
  FiEye,
  FiEyeOff,
  FiHeart,
  FiTrash2,
  FiUnlock,
  FiX,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearNotifications,
} from "../../services/notificationService";

import "./Notifications.css";

// CHANGED: this page used to be a copy-pasted "My Snaps" placeholder. It now
// shows the person's real notifications:
//   - your Time Capsule opened
//   - someone liked your Snap
//   - a moderator hid / restored / removed your Snap
//   - a payment was refunded

const POLL_MS = 30 * 1000;

// icon + colour per notification type, and where a click should take you
const TYPE_META = {
  capsule_opened: { icon: FiUnlock, tone: "rust", link: "/profile?tab=capsules" },
  snap_liked: { icon: FiHeart, tone: "rose", link: "/profile" },
  snap_hidden: { icon: FiEyeOff, tone: "amber", link: "/profile" },
  snap_restored: { icon: FiEye, tone: "sage", link: "/profile" },
  snap_removed: { icon: FiTrash2, tone: "grey", link: null },
  payment_refunded: { icon: FiCreditCard, tone: "grey", link: "/profile/payments" },
};

const FALLBACK_META = { icon: FiBell, tone: "grey", link: null };

function timeAgo(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function Notifications() {
  const { currentUser, loading: authLoading } = useAuth();
  const { setUnreadCount } = useNotifications();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // `silent` = background refresh: no spinner, and a failure keeps the list.
  const load = useCallback(
    async (silent = false) => {
      try {
        const data = await getNotifications();

        setItems(data.notifications);
        setUnreadCount(data.unreadCount);
        setError("");
      } catch (err) {
        if (!silent) setError(err.message || "Could not load notifications.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [setUnreadCount]
  );

  useEffect(() => {
    if (authLoading || !currentUser) return undefined;

    load();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [authLoading, currentUser, load]);

  const unread = items.filter((item) => !item.read).length;

  // ---------- actions (optimistic: the screen updates first) ----------

  async function handleOpen(item) {
    if (!item.read) {
      setItems((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount(Math.max(0, unread - 1));

      markNotificationRead(item.id).catch(() => load(true));
    }

    const link = (TYPE_META[item.type] || FALLBACK_META).link;

    if (link) navigate(link);
  }

  async function handleMarkAll() {
    if (unread === 0) return;

    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);

    markAllNotificationsRead().catch(() => load(true));
  }

  async function handleDelete(item) {
    setItems((prev) => prev.filter((n) => n.id !== item.id));

    if (!item.read) setUnreadCount(Math.max(0, unread - 1));

    deleteNotification(item.id).catch(() => load(true));
  }

  async function handleClearAll() {
    if (items.length === 0) return;

    if (!window.confirm("Delete all notifications?")) return;

    setItems([]);
    setUnreadCount(0);

    clearNotifications().catch(() => load(true));
  }

  // ---------- render ----------

  return (
    <div className="notif">
      <div className="notif__header">
        <div>
          <h1>Notifications</h1>
          <p>
            Likes, Time Capsules and updates about your Snaps.
          </p>
        </div>

        {items.length > 0 && (
          <div className="notif__tools">
            <button
              type="button"
              className="notif__tool"
              onClick={handleMarkAll}
              disabled={unread === 0}
            >
              Mark all as read
            </button>

            <button
              type="button"
              className="notif__tool notif__tool--danger"
              onClick={handleClearAll}
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {loading && <p className="notif__note">Loading notifications…</p>}

      {!loading && error && (
        <p className="notif__note notif__note--error">
          {error}{" "}
          <button type="button" className="notif__retry" onClick={() => load()}>
            Try again
          </button>
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="notif__empty">
          <FiBell />
          <h2>You&apos;re all caught up</h2>
          <p>
            When someone likes your Snap, or your Time Capsule opens,
            you&apos;ll see it here.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="notif__list">
          {items.map((item) => {
            const meta = TYPE_META[item.type] || FALLBACK_META;
            const Icon = meta.icon;

            return (
              <li
                key={item.id}
                className={`notif__item${item.read ? "" : " notif__item--unread"}`}
              >
                <button
                  type="button"
                  className="notif__main"
                  onClick={() => handleOpen(item)}
                >
                  <span className="notif__avatar">
                    {item.actorPhotoURL ? (
                      <img
                        src={item.actorPhotoURL}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className={`notif__icon notif__icon--${meta.tone}`}>
                        <Icon />
                      </span>
                    )}

                    {/* small type badge on top of a profile photo */}
                    {item.actorPhotoURL && (
                      <span
                        className={`notif__chip notif__icon--${meta.tone}`}
                      >
                        <Icon />
                      </span>
                    )}
                  </span>

                  <span className="notif__body">
                    <span className="notif__message">{item.message}</span>

                    {item.snapCaption && (
                      <span className="notif__caption">
                        &ldquo;{item.snapCaption}&rdquo;
                      </span>
                    )}

                    <span className="notif__time">{timeAgo(item.createdAt)}</span>
                  </span>

                  {!item.read && (
                    <span className="notif__dot" aria-label="Unread" />
                  )}
                </button>

                <button
                  type="button"
                  className="notif__delete"
                  onClick={() => handleDelete(item)}
                  title="Delete notification"
                  aria-label="Delete notification"
                >
                  <FiX />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default Notifications;