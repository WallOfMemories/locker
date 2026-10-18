import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import { getUnreadCount } from "../services/notificationService";

// Keeps ONE shared "unread notifications" number for the whole app, so the
// sidebar badge and the Notifications page always agree. It re-checks every
// 30 seconds (only while the tab is visible) and whenever the tab comes back
// into view — no websockets needed.

const POLL_MS = 30 * 1000;

const NotificationContext = createContext({
  unreadCount: 0,
  refreshUnread: async () => {},
  setUnreadCount: () => {},
});

export function NotificationProvider({ children }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid || null;

  // The count is stored together with WHO it belongs to, so after logging
  // out / in as someone else the old number is never shown.
  const [state, setState] = useState({ uid: null, count: 0 });

  const unreadCount = state.uid === uid ? state.count : 0;

  const setUnreadCount = useCallback(
    (count) => setState({ uid, count: Math.max(0, count) }),
    [uid]
  );

  const refreshUnread = useCallback(async () => {
    if (!uid) return;

    try {
      const count = await getUnreadCount();

      setState({ uid, count });
    } catch {
      // Offline / server hiccup: keep showing the last known number.
    }
  }, [uid]);

  useEffect(() => {
    if (!uid) return undefined;

    refreshUnread();

    function refreshIfVisible() {
      if (document.visibilityState === "visible") refreshUnread();
    }

    const timer = setInterval(refreshIfVisible, POLL_MS);

    document.addEventListener("visibilitychange", refreshIfVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [uid, refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnread, setUnreadCount }),
    [unreadCount, refreshUnread, setUnreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}