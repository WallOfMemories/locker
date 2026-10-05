const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

export async function getSpaces() {
  const response = await fetch(
    `${API_BASE_URL}/api/spaces`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch SnapWall spaces.");
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.message || "Failed to fetch spaces."
    );
  }

  return data.spaces;
}