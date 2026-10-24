
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

  if (!element) return;

  element.textContent =
    typeof value === "number" && Number.isFinite(value)
      ? value.toLocaleString()
      : String(value);
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
    loadCount(
      "Customer profiles",
      collection(db, "users")
    ),
    loadCount(
      "Loan applications",
      collection(db, "applications")
    ),
    loadCount(
      "Submitted applications",
      query(
        collection(db, "applications"),
        where("status", "==", "submitted")
      )
    )
  ]);

  showCount(
    "totalUsers",
    results[0] === null ? "Unavailable" : results[0]
  );

  showCount(
    "totalApplications",
    results[1] === null ? "Unavailable" : results[1]
  );

  showCount(
    "submittedApplications",
    results[2] === null ? "Unavailable" : results[2]
  );

  // Loan records remain restricted to protect financial data.
  // A secure backend is needed to provide this count.
  showCount("totalLoans", "Restricted");

  if (results.every((count) => count !== null)) {
    showStatus(
      "Summary loaded. Loan account records remain restricted.",
      "success"
    );
  } else {
    showStatus(
      "Some summary figures are unavailable. Check the application and customer permissions.",
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
      "Could not verify administrator access. Please sign in again.",
      "error"
    );
  }
}

initializeAdminDashboard();
