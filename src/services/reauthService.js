import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";

// Shared by Settings > Security and Settings > Delete Account: both ask the
// person to prove it's really them before doing something sensitive.

export function hasPasswordLogin(user) {
  return Boolean(user?.providerData?.some((p) => p.providerId === "password"));
}

export function hasGoogleLogin(user) {
  return Boolean(user?.providerData?.some((p) => p.providerId === "google.com"));
}

// Password accounts: checks the password they typed.
// Google-only accounts: opens the Google account picker.
export async function reauthenticate(user, password) {
  if (hasPasswordLogin(user) && password) {
    const credential = EmailAuthProvider.credential(user.email, password);

    await reauthenticateWithCredential(user, credential);

    return;
  }

  if (hasGoogleLogin(user)) {
    const provider = new GoogleAuthProvider();

    if (user.email) provider.setCustomParameters({ login_hint: user.email });

    await reauthenticateWithPopup(user, provider);

    return;
  }

  const error = new Error("Please enter your password.");

  error.code = "app/password-required";

  throw error;
}

// Firebase error -> sentence a person can act on.
export function authErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  switch (error?.code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "That password is incorrect.";

    case "auth/weak-password":
      return "That password is too weak. Use at least 8 characters.";

    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";

    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "The Google window was closed. Please try again.";

    case "auth/popup-blocked":
      return "Your browser blocked the Google window. Allow pop-ups and try again.";

    case "auth/user-mismatch":
      return "Please choose the same Google account you signed in with.";

    case "auth/requires-recent-login":
      return "For your security, please confirm your sign-in and try again.";

    case "auth/credential-already-in-use":
    case "auth/email-already-in-use":
      return "That email already has a password sign-in.";

    case "auth/network-request-failed":
      return "Network error. Please check your connection.";

    case "app/password-required":
      return error.message;

    default:
      return error?.message && !String(error.message).startsWith("Firebase:")
        ? error.message
        : fallback;
  }
}