import {
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "./firebase";
import { API_BASE_URL } from "../config";


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

// Username login / reset happen on the server, so the browser is never told
// which email belongs to a username (that lookup used to be public).
async function postAuth(path, body) {
  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  return { response, data };
}

// Signs in with a username + password. Emails go straight to Firebase.
export async function signInWithIdentifier(identifier, password) {
  const value = identifier.trim();

  if (value.includes("@")) {
    return signInWithEmailAndPassword(auth, value, password);
  }

  const { response, data } = await postAuth("username-login", {
    username: value,
    password,
  });

  if (response.status === 429) {
    const error = new Error(
      data.message || "Too many attempts. Please try again later."
    );
    error.code = "auth/too-many-requests";
    throw error;
  }

  if (!response.ok || !data.customToken) {
    // Same error for "no such username" and "wrong password".
    const error = new Error("Incorrect username or password.");
    error.code = "auth/invalid-credential";
    throw error;
  }

  return signInWithCustomToken(auth, data.customToken);
}

// Sends a password reset email for an email address or a username.
// Always looks successful, so it can't be used to find registered accounts.
export async function sendResetForIdentifier(identifier) {
  const value = identifier.trim();

  if (value.includes("@")) {
    try {
      await sendPasswordResetEmail(auth, value);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
    }

    return;
  }

  const { response } = await postAuth("forgot-password", { username: value });

  if (response.status === 429) {
    const error = new Error("Too many attempts. Please try again later.");
    error.code = "auth/too-many-requests";
    throw error;
  }
}
