
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getCountFromServer,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminStatus");
const contentElement = document.getElementById("adminContent");

function showStatus(message, type = "info") {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
}

function showCount(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent =
      Number.isFinite(value) ? value.toLocaleString() : "Unavailable";
  }
}

async function loadCount(label, countQuery) {
  try {
    const result = await getCountFromServer(countQuery);
    return result.data().count;
  } catch (error) {
    console.error(`Could not load ${label} count:`, error);
    return null;
  }
}

async function loadAdminSummary() {
  showStatus("Loading administrative summary...");

  const results = await Promise.all([
    loadCount("Customer profiles", collection(db, "users")),
    loadCount("Loan applications", collection(db, "applications")),
    loadCount(
      "Submitted applications",
      query(
        collection(db, "applications"),
        where("status", "==", "submitted")
      )
    ),
    loadCount("Loan accounts", collection(db, "loans"))
  ]);

  const ids = [
    "totalUsers",
    "totalApplications",
    "submittedApplications",
    "totalLoans"
  ];

  results.forEach((count, index) => {
    showCount(ids[index], count === null ? NaN : count);
  });

  if (results.every((count) => count !== null)) {
    showStatus("Summary loaded from Firebase.", "success");
  } else {
    showStatus(
      "Some figures are unavailable. Check the browser console for the specific Firebase permission error.",
      "error"
    );
  }
}

async function initializeAdminDashboard() {
  if (contentElement) contentElement.hidden = true;

  showStatus("Checking administrator access...");

  try {
    const user = await requireAdmin();

    if (!user) return;

    if (contentElement) contentElement.hidden = false;

    await loadAdminSummary();
  } catch (error) {
    console.error("Admin access check failed:", error);

    showStatus(
      "Could not verify administrator access. Please try signing in again.",
      "error"
    );
  }
}

initializeAdminDashboard();
