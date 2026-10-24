import { auth } from "./firebase";
import { API_BASE_URL } from "../config";


async function authedRequest(path, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong.");
  }

  return data;
}

// ---------- any user ----------

export function reportSnap(snapId, reason) {
  return authedRequest(`/api/snaps/${snapId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

// ---------- admin only ----------

// tab: "pending" | "hidden" | "history"
export async function getAdminReports(tab) {
  const data = await authedRequest(
    `/api/admin/reports?tab=${encodeURIComponent(tab)}`
  );

  return data.items || [];
}

// action: "hide" | "unhide" | "safe" | "delete"
export function moderateSnap(snapId, action) {
  return authedRequest(`/api/admin/snaps/${snapId}/action`, {
    method: "POST",
    body: JSON.stringify({ action }),
  });
}