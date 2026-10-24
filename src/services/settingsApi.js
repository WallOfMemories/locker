
import { API_BASE_URL } from "../config";
export async function getSnapWallSettings() {
  const response = await fetch(
    `${API_BASE_URL}/api/settings`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch SnapWall settings."
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.message || "Failed to fetch settings."
    );
  }

  return data.settings;
}