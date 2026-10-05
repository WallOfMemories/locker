import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "./firebase";

export async function getSpaces() {
  const spacesQuery = query(
    collection(db, "spaces"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(spacesQuery);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
