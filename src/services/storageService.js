import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { storage } from "./firebase";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

function validateImage(file) {
  if (!file) {
    throw new Error("Please select an image.");
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Only JPG, PNG, and WebP images are allowed."
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      "Image size must be 5 MB or less."
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
  validateImage(file);

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