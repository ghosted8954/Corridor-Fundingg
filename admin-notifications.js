
import { auth, db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminNotificationsStatus");
const tableBody = document.getElementById("adminNotificationsTableBody");
const countElement = document.getElementById("adminNotificationsCount");
const searchInput = document.getElementById("notificationSearch");
const createForm = document.getElementById("createNotificationForm");
const createButton = document.getElementById("createNotificationButton");

let notificationRecords = [];
let creatingNotification = false;

function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "info";
}

function safeValue(value, fallback = "—") {
  return value === undefined || value === null || value === ""
    ? fallback
    : String(value);
}

function formatDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function makeCell(value) {
  const cell = document.createElement("td");
  cell.textContent = safeValue(value);
  return cell;
}

function renderNotifications() {
  const search = searchInput.value.trim().toLowerCase();

  const filtered = notificationRecords.filter((record) => {
    const searchable = `${record.id} ${record.ownerUid || ""} ${record.title || ""}`
      .toLowerCase();

    return !search || searchable.includes(search);
  });

  tableBody.replaceChildren();

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No matching notification records found.";
    row.append(cell);
    tableBody.append(row);
  } else {
    for (const record of filtered) {
      const row = document.createElement("tr");

      row.append(
        makeCell(record.id),
        makeCell(record.ownerUid),
        makeCell(record.title),
        makeCell(record.category),
        makeCell(record.read === true ? "Yes" : "No"),
        makeCell(formatDate(record.createdAt))
      );

      tableBody.append(row);
    }
  }

  countElement.textContent =
    `Showing ${filtered.length} of ${notificationRecords.length} loaded records.`;
}

async function loadNotifications() {
  showStatus("Loading notification records...");

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "notifications"),
        orderBy("createdAt", "desc"),
        limit(200)
      )
    );

    notificationRecords = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderNotifications();
    showStatus("Notification records loaded. Showing up to 200 records.");
  } catch (error) {
    console.error("Notification load error:", error);
    notificationRecords = [];
    renderNotifications();

    showStatus(
      "Unable to load notifications. Check administrator permissions and Firestore rules.",
      true
    );
  }
}

createForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (creatingNotification) return;

  const user = auth.currentUser;
  const ownerUid = document.getElementById("notificationOwnerUid").value.trim();
  const title = document.getElementById("notificationTitle").value.trim();
  const message = document.getElementById("notificationMessage").value.trim();
  const category = document.getElementById("notificationCategory").value;

  if (!user) {
    showStatus("Your administrator session has expired. Sign in again.", true);
    return;
  }

  if (
    !ownerUid ||
    ownerUid.length > 128 ||
    !title ||
    title.length > 120 ||
    !message ||
    message.length > 1500
  ) {
    showStatus("Check the customer UID, title, and message lengths.", true);
    return;
  }

  const allowedCategories = [
    "general",
    "application",
    "account",
    "support"
  ];

  if (!allowedCategories.includes(category)) {
    showStatus("Select a valid notification category.", true);
    return;
  }

  creatingNotification = true;
  createButton.disabled = true;
  showStatus("Creating in-app notification...");

  try {
    await addDoc(collection(db, "notifications"), {
      ownerUid,
      title,
      message,
      category,
      read: false,
      createdAt: serverTimestamp(),
      createdBy: user.uid
    });

    createForm.reset();
    showStatus("Notification record created successfully.");
    await loadNotifications();
  } catch (error) {
    console.error("Notification creation error:", error);
    showStatus(
      "Could not create the notification. Confirm the recipient and check Firestore rules.",
      true
    );
  } finally {
    creatingNotification = false;
    createButton.disabled = false;
  }
});

searchInput.addEventListener("input", renderNotifications);

document.getElementById("refreshAdminNotifications")
  .addEventListener("click", loadNotifications);

requireAdmin({
  onAuthorized: loadNotifications,
  onUnauthorized: () => {
    showStatus("Administrator access is required.", true);
  }
});
