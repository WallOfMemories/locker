// NEW: remembers an unfinished Create Snap so a refresh (or a closed tab)
// doesn't lose it. The text fields go in localStorage; the photo goes in
// IndexedDB (it is too big for localStorage). One draft per person per space,
// kept for 7 days, and removed once the Snap is posted.
//
// Everything is wrapped so that a blocked/full browser storage (private mode)
// simply means "no draft" — it never breaks the page.

const DAY_MS = 24 * 60 * 60 * 1000;
const KEEP_MS = 7 * DAY_MS;
const DB_NAME = "locker-snap-drafts";
const STORE = "photos";

const textKey = (uid, spaceId) => `snapdraft:v1:${uid}:${spaceId}`;
const photoKey = (uid, spaceId) => `${uid}:${spaceId}`;

// ---------- text fields ----------

export function loadDraft(uid, spaceId) {
  try {
    const raw = localStorage.getItem(textKey(uid, spaceId));

    if (!raw) return null;

    const draft = JSON.parse(raw);

    if (!draft?.savedAt || Date.now() - draft.savedAt > KEEP_MS) {
      clearDraft(uid, spaceId);
      return null;
    }

    return draft;
  } catch {
    return null;
  }
}

// Merges into whatever is already saved.
export function saveDraft(uid, spaceId, patch) {
  try {
    const current = loadDraft(uid, spaceId) || {};

    localStorage.setItem(
      textKey(uid, spaceId),
      JSON.stringify({ ...current, ...patch, savedAt: Date.now() })
    );
  } catch {
    // storage full or blocked: skip
  }
}

// ---------- the photo ----------

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore(mode, action) {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const request = action(transaction.objectStore(STORE));

    transaction.oncomplete = () => {
      db.close();
      resolve(request?.result);
    };
    transaction.onerror = transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
}

export async function saveDraftImage(uid, spaceId, file) {
  try {
    await withStore("readwrite", (store) =>
      store.put(
        { blob: file, name: file.name, type: file.type, savedAt: Date.now() },
        photoKey(uid, spaceId)
      )
    );
  } catch {
    // skip
  }
}

export async function loadDraftImage(uid, spaceId) {
  try {
    const row = await withStore("readonly", (store) =>
      store.get(photoKey(uid, spaceId))
    );

    if (!row?.blob || Date.now() - row.savedAt > KEEP_MS) return null;

    return new File([row.blob], row.name || "photo.jpg", {
      type: row.type || row.blob.type,
      lastModified: row.savedAt,
    });
  } catch {
    return null;
  }
}

export async function deleteDraftImage(uid, spaceId) {
  try {
    await withStore("readwrite", (store) => store.delete(photoKey(uid, spaceId)));
  } catch {
    // skip
  }
}

// ---------- everything ----------

export function clearDraft(uid, spaceId) {
  try {
    localStorage.removeItem(textKey(uid, spaceId));
  } catch {
    // skip
  }

  return deleteDraftImage(uid, spaceId);
}