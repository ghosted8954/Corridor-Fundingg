
import { auth, db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  addDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

/*
 * This module is intended for a future internal support-notes page.
 * It uses a separate "supportInternalNotes" collection.
 *
 * Do not include customer-visible messages or sensitive documents here.
 * Firestore rules must explicitly authorize staff access before use.
 */

const statusElement = document.getElementById("supportNotesStatus");
const ticketInput = document.getElementById("supportNotesTicketId");
const noteInput = document.getElementById("supportNotesText");
const noteForm = document.getElementById("supportNotesForm");
const notesList = document.getElementById("supportNotesList");

function showStatus(message, isError = false) {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "info";
}

function createTextElement(tag, text) {
  const element = document.createElement(tag);
  element.textContent = text;
  return element;
}

function formatDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

async function loadNotes(ticketId) {
  if (!notesList || !ticketId) return;

  notesList.replaceChildren(
    createTextElement("p", "Loading internal notes...")
  );

  try {
    const notesQuery = query(
      collection(db, "supportInternalNotes"),
      where("ticketId", "==", ticketId),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(notesQuery);
    notesList.replaceChildren();

    if (snapshot.empty) {
      notesList.append(
        createTextElement("p", "No internal notes recorded for this ticket.")
      );
      return;
    }

    for (const item of snapshot.docs) {
      const note = item.data();
      const article = document.createElement("article");

      article.append(
        createTextElement("p", note.text || ""),
        createTextElement("small", `Author UID: ${note.authorUid || "—"}`),
        createTextElement("small", `Created: ${formatDate(note.createdAt)}`)
      );

      notesList.append(article);
    }
  } catch (error) {
    console.error("Internal notes load error:", error);
    notesList.replaceChildren(
      createTextElement("p", "Unable to load internal notes.")
    );
  }
}

if (noteForm) {
  noteForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const user = auth.currentUser;
    const ticketId = ticketInput?.value.trim();
    const text = noteInput?.value.trim();

    if (!user) {
      showStatus("Administrator session expired. Sign in again.", true);
      return;
    }

    if (!ticketId || !text || text.length > 1000) {
      showStatus("Enter a ticket ID and a note of up to 1,000 characters.", true);
      return;
    }

    const submitButton = noteForm.querySelector('button[type="submit"]');

    if (submitButton) submitButton.disabled = true;
    showStatus("Saving internal note...");

    try {
      await addDoc(collection(db, "supportInternalNotes"), {
        ticketId,
        text,
        authorUid: user.uid,
        createdAt: serverTimestamp()
      });

      noteInput.value = "";
      showStatus("Internal note saved.");
      await loadNotes(ticketId);
    } catch (error) {
      console.error("Internal note save error:", error);
      showStatus(
        "Could not save the note. Verify staff permissions and Firestore rules.",
        true
      );
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

if (ticketInput) {
  ticketInput.addEventListener("change", () => {
    loadNotes(ticketInput.value.trim());
  });
}

requireAdmin({
  onAuthorized: () => {
    showStatus("Internal support notes are available to authorized staff.");
  },
  onUnauthorized: () => {
    showStatus("Administrator access is required.", true);
  }
});
