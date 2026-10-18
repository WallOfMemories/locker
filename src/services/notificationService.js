import { auth } from "./firebase";

const API_URL = `${
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"
}/api`;

async function request(path, method = "GET") {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

// -> { notifications: [...newest first], unreadCount }
export async function getNotifications() {
  const data = await request("/notifications");

  return {
    notifications: data.notifications || [],
    unreadCount: data.unreadCount || 0,
  };
}

// Cheap call used for the sidebar badge. -> number
export async function getUnreadCount() {
  const data = await request("/notifications/unread-count");

  return data.unreadCount || 0;
}

export async function markNotificationRead(id) {
  return request(`/notifications/${encodeURIComponent(id)}/read`, "PUT");
}

export async function markAllNotificationsRead() {
  return request("/notifications/read-all", "PUT");
}

export async function deleteNotification(id) {
  return request(`/notifications/${encodeURIComponent(id)}`, "DELETE");
}

export async function clearNotifications() {
  return request("/notifications", "DELETE");
}