import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  db,
  auth,
} from "./firebase";

// CHANGED: every request below used a hard-coded "http://localhost:5000",
// which ignored VITE_API_BASE_URL and would break once the app is deployed.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export async function getPublishedSnaps() {
  const snapsQuery = query(
    collection(db, "snaps"),
    where("status", "==", "published")
  );

  const snapshot =
    await getDocs(snapsQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}


export async function getMySnaps() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token =
    await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/my`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load your snaps."
    );
  }

  return data;
}

export async function updateSnap(snapId, changes) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(changes),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to update Snap."
    );
  }

  return data;
}

export async function likeSnap(snapId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/like`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to like Snap."
    );
  }

  return data;
}

export async function unlikeSnap(snapId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/like`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to unlike Snap."
    );
  }

  return data;
}

export async function getSnapLikeInfo(
  snapId
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/likes`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load like information."
    );
  }

  return data;
}

export async function saveSnap(snapId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/save`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to save Snap."
    );
  }

  return data;
}

export async function unsaveSnap(snapId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/save`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || "Failed to unsave Snap."
    );
  }

  return data;
}

export async function getSnapSaveInfo(
  snapId
) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/save`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load save information."
    );
  }

  return data;
}

export async function getSavedSnaps() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/saved`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load saved Snaps."
    );
  }

  return data.snaps || [];
}

export async function getLikedSnaps() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/liked`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load liked Snaps."
    );
  }

  return data.snaps || [];
}

// NEW: hide (hidden = true) or show (hidden = false) my own Snap.
// The space stays mine either way — a hidden Snap just isn't shown to
// anyone else. Moderator-hidden Snaps can't be changed (the server says so).
export async function setSnapHidden(snapId, hidden) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}/visibility`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ hidden }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        (hidden ? "Failed to hide Snap." : "Failed to show Snap.")
    );
  }

  return data;
}

// NEW: delete my own Snap. Its space becomes available again for someone
// else. There is NO refund. This can't be undone.
export async function deleteSnap(snapId) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please login first.");
  }

  const token = await user.getIdToken();

  const response = await fetch(
    `${API_BASE_URL}/api/snaps/${snapId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete Snap.");
  }

  return data;
}