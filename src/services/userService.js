import { auth } from "./firebase";
import { API_URL } from "../config";


async function getAuthToken() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  return user.getIdToken();
}

async function request(path, options = {}) {
  const token = await getAuthToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body
        ? { "Content-Type": "application/json" }
        : {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export async function getMyProfile() {
  const data = await request("/users/me");

  return data.profile;
}

export async function updateMyProfile(profileData) {
  const data = await request("/users/me", {
    method: "PUT",
    body: JSON.stringify(profileData),
  });

  return data.profile;
}

// First-time setup: displayName, username, bio, photoURL.
export async function setupProfile(profileData) {
  const data = await request("/users/setup", {
    method: "POST",
    body: JSON.stringify(profileData),
  });

  return data.profile;
}

export async function checkUsernameAvailable(username) {
  const data = await request(
    `/users/username-available?username=${encodeURIComponent(
      username
    )}`
  );

  return {
    available: data.available,
    message: data.message,
  };
}