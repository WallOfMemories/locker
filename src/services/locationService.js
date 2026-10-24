import { auth } from "./firebase";
import { API_BASE_URL } from "../config";


async function authedGet(path, signal) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Location lookup failed.");
  }

  return data;
}

// Search places by name -> [{ id, name, address, lat, lng }]
// `bias` ({ lat, lng }, optional) makes places near the user rank first.
export async function searchLocations(query, signal, bias) {
  const near = bias
    ? `&lat=${bias.lat.toFixed(4)}&lng=${bias.lng.toFixed(4)}`
    : "";

  const data = await authedGet(
    `/api/locations/search?q=${encodeURIComponent(query)}${near}`,
    signal
  );

  return data.places || [];
}

// Coordinates -> nearest place (or null)
export async function reverseLocation(lat, lng) {
  const data = await authedGet(
    `/api/locations/reverse?lat=${lat}&lng=${lng}`
  );

  return data.place || null;
}