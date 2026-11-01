
import { API_BASE_URL } from "../config";
export async function getSpaces() {
  const response = await fetch(
    `${API_BASE_URL}/api/spaces`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch The Locker spaces.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.message || "Failed to fetch spaces."
    );
  }

  return data.spaces;
}