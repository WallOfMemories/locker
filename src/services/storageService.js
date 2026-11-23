import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "./firebase";

// CHANGED: Snap photos can now be up to 50 MB. Profile photos stay at 5 MB.
// (The same numbers are enforced by storage.rules — change both together.)
export const MAX_SNAP_MB = 50;
export const MAX_PROFILE_MB = 5;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// CHANGED: exported, so the Create Snap page can check the photo BEFORE the
// person pays (the photo is uploaded after payment — a photo that is too big
// must be caught first, not after the money has moved).
// CHANGED: takes the size limit, so Snap photos (50 MB) and profile photos
// (5 MB) can use the same check.
export function validateImage(file, maxMb = MAX_SNAP_MB) {
  if (!file) {
    throw new Error("Please select an image.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG, and WebP images are allowed."
    );
  }

  if (file.size > maxMb * 1024 * 1024) {
    // CHANGED: tell the person the real size so they know how much to shrink.
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    throw new Error(
      `This photo is ${sizeMb} MB, but the limit is ${maxMb} MB. Please choose a smaller photo.`
    );
  }
}

// NEW: turns Firebase's technical messages ("Firebase Storage: Max retry time
// for operation exceeded...") into something a person can act on.
function friendlyUploadError(error) {
  const code = error?.code || "";

  if (code === "storage/retry-limit-exceeded" || code === "storage/network-request-failed") {
    return "The photo upload was too slow or your connection dropped.";
  }

  if (code === "storage/unauthorized") {
    return "The upload was blocked. Please log in again and try once more.";
  }

  if (code === "storage/canceled") {
    return "The upload was cancelled.";
  }

  if (code === "storage/quota-exceeded") {
    return "We can't take uploads right now. Please try again later.";
  }

  return "We couldn't upload your photo.";
}

// CHANGED: uses a resumable upload so we can report progress
// (onProgress receives 0–100), and fails with a readable message.
export async function uploadSnapImage(
  file,
  userId,
  onProgress
) {
  validateImage(file);

  if (!userId) {
    throw new Error(
      "You must be logged in to upload an image."
    );
  }

  const fileExtension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName =
    `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

  const storagePath =
    `snaps/${userId}/${fileName}`;

  const storageRef =
    ref(storage, storagePath);

  try {
    await new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file, {
        contentType: file.type,
      });

      task.on(
        "state_changed",
        (snapshot) => {
          if (onProgress && snapshot.totalBytes > 0) {
            onProgress(
              Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            );
          }
        },
        reject,
        resolve
      );
    });

    const downloadURL =
      await getDownloadURL(storageRef);

    return {
      downloadURL,
      storagePath,
      fileName,
    };
  } catch (error) {
    console.error("Photo upload failed:", error);

    throw new Error(friendlyUploadError(error), { cause: error });
  }
}

export async function uploadProfileImage(
  file,
  userId
) {
  validateImage(file, MAX_PROFILE_MB); // CHANGED: profile photos stay at 5 MB

  if (!userId) {
    throw new Error(
      "You must be logged in to upload a profile image."
    );
  }

  const fileExtension =
    file.name.split(".").pop()?.toLowerCase() || "jpg";

  const fileName =
    `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`;

  const storagePath =
    `users/${userId}/profile/${fileName}`;

  const storageRef =
    ref(storage, storagePath);

  await uploadBytes(
    storageRef,
    file,
    {
      contentType: file.type,
    }
  );

  const downloadURL =
    await getDownloadURL(storageRef);

  return {
    downloadURL,
    storagePath,
    fileName,
  };
}