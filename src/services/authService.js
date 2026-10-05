import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000";

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});

export function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

// Creates users/{uid} the first time an account signs in.
// Returns the profile data either way.
export async function ensureUserDoc(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }

  const profile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "",
    username: "",
    photoURL: user.photoURL || "",
    bio: "",
    role: "user",
  };

  await setDoc(userRef, {
    ...profile,
    createdAt: serverTimestamp(),
  });

  return { id: user.uid, ...profile };
}

// Accepts an email or a username and returns the login email.
export async function resolveLoginEmail(identifier) {
  const value = identifier.trim();

  if (value.includes("@")) {
    return value;
  }

  const response = await fetch(
    `${API_BASE_URL}/api/auth/resolve-username`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: value }),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (response.status === 404) {
    const error = new Error(
      "No account found with this username."
    );
    error.code = "app/username-not-found";
    throw error;
  }

  if (!response.ok || !data.email) {
    throw new Error(
      data.message || "Unable to look up username."
    );
  }

  return data.email;
}