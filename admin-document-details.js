
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("documentDetailsStatus");

function setText(id, value, fallback = "—") {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent =
    value === undefined || value === null || value === ""
      ? fallback
      : String(value);
}

function formatDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

async function loadDocumentDetails() {
  const params = new URLSearchParams(window.location.search);
  const recordId = params.get("id");

  if (!recordId || recordId.length > 150) {
    statusElement.textContent = "A valid document record ID is required.";
    return;
  }

  statusElement.textContent = "Loading document record...";

  try {
    const snapshot = await getDoc(doc(db, "documents", recordId));

    if (!snapshot.exists()) {
      statusElement.textContent = "Document record not found or access denied.";
      return;
    }

    const record = snapshot.data();

    setText("detailId", snapshot.id);
    setText("detailOwnerUid", record.ownerUid);
    setText("detailApplicationId", record.applicationId);
    setText("detailType", record.type || record.documentType);
    setText("detailStatus", record.status);
    setText("detailFilename", record.originalFilename, "Not available");
    setText("detailContentType", record.contentType, "Not available");
    setText("detailCreatedAt", formatDate(record.createdAt));
    setText("detailUpdatedAt", formatDate(record.updatedAt));
    setText("detailReviewerUid", record.reviewerUid);
    setText("detailReviewNotes", record.reviewNotes, "No notes recorded.");

    statusElement.textContent =
      "Record metadata loaded. The document file itself is not available here.";
  } catch (error) {
    console.error("Unable to load document details:", error);
    statusElement.textContent =
      "Unable to load this record. Check administrator permissions and Firestore rules.";
  }
}

requireAdmin({
  onAuthorized: loadDocumentDetails,
  onUnauthorized: () => {
    statusElement.textContent = "Administrator access is required.";
  }
});
