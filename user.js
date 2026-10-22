
import { db, authPersistenceReady } from "./firebase-init.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const PROFILE_FIELDS = [
  "displayName",
  "phone",
  "address",
  "city",
  "state",
  "postalCode"
];

export async function loadUserProfile(uid) {
  await authPersistenceReady;

  if (!uid) throw new Error("A signed-in user is required.");

  const snapshot = await getDoc(doc(db, "users", uid));

  if (!snapshot.exists()) {
    throw new Error("The customer profile could not be found.");
  }

  return snapshot.data();
}

export async function saveUserProfile(uid, input) {
  await authPersistenceReady;

  if (!uid || !input || typeof input !== "object") {
    throw new Error("Invalid profile update.");
  }

  const updates = {};

  for (const field of PROFILE_FIELDS) {
    const value = String(input[field] ?? "").trim();

    if (value.length > 200) {
      throw new Error(`The ${field} field is too long.`);
    }

    updates[field] = value;
  }

  if (updates.displayName.length < 2 || updates.displayName.length > 100) {
    throw new Error("Enter a valid display name.");
  }

  if (updates.phone.length > 30) {
    throw new Error("Enter a valid phone number.");
  }

  if (updates.state && !/^[A-Z]{2}$/.test(updates.state)) {
    throw new Error("Choose a valid two-letter state code.");
  }

  if (updates.postalCode && !/^\d{5}(?:-\d{4})?$/.test(updates.postalCode)) {
    throw new Error("Enter a valid U.S. ZIP code.");
  }

  const profileRef = doc(db, "users", uid);

  await updateDoc(profileRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });

  // Update the Firebase display name after the profile document is saved.
  const currentUser = (await import("./firebase-init.js")).auth.currentUser;

  if (currentUser && currentUser.uid === uid) {
    await updateProfile(currentUser, {
      displayName: updates.displayName
    });
  }

  return updates;
}
