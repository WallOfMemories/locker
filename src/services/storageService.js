import {
  ref,
  uploadBytes,
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

export async function uploadSnapImage(
  file,
  userId
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


// Profile image upload
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