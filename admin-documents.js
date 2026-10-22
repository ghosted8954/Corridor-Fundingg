
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("documentsStatus");
const tableBody = document.getElementById("documentsTableBody");
const countElement = document.getElementById("documentsCount");
const searchInput = document.getElementById("documentSearch");
const statusFilter = document.getElementById("documentStatusFilter");

let records = [];

function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "info";
}

function safeText(value, fallback = "—") {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return String(value);
}

function displayDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString();
}

function makeCell(value) {
  const cell = document.createElement("td");
  cell.textContent = safeText(value);
  return cell;
}

function renderRecords() {
  const search = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = records.filter((record) => {
    const searchable = [
      record.id,
      record.ownerUid,
      record.applicationId,
      record.type,
      record.documentType
    ].map((value) => safeText(value, "")).join(" ").toLowerCase();

    const matchesSearch = !search || searchable.includes(search);
    const matchesStatus = !selectedStatus || record.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  tableBody.replaceChildren();

  if (filtered.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No matching document records found.";
    row.append(cell);
    tableBody.append(row);
  } else {
    for (const record of filtered) {
      const row = document.createElement("tr");

      row.append(
        makeCell(record.id),
        makeCell(record.ownerUid),
        makeCell(record.type || record.documentType),
        makeCell(record.applicationId),
        makeCell(record.status),
        makeCell(displayDate(record.createdAt))
      );

      const actionCell = document.createElement("td");
      const link = document.createElement("a");
      link.href = `admin-document-details.html?id=${encodeURIComponent(record.id)}`;
      link.textContent = "View details";
      actionCell.append(link);
      row.append(actionCell);

      tableBody.append(row);
    }
  }

  countElement.textContent =
    `Showing ${filtered.length} of ${records.length} loaded records.`;
}

async function loadDocuments() {
  showStatus("Loading document records...");
  tableBody.replaceChildren();

  try {
    const documentsQuery = query(
      collection(db, "documents"),
      orderBy("createdAt", "desc"),
      limit(200)
    );

    const snapshot = await getDocs(documentsQuery);

    records = snapshot.docs.map((document) => ({
      id: document.id,
      ...document.data()
    }));

    renderRecords();
    showStatus(
      "Document metadata loaded. Only the latest 200 records are included."
    );
  } catch (error) {
    console.error("Unable to load document records:", error);
    records = [];
    renderRecords();
    showStatus(
      "Could not load document records. Check administrator permissions and Firestore rules.",
      true
    );
  }
}

document.getElementById("documentSearchForm")
  .addEventListener("submit", (event) => {
    event.preventDefault();
    renderRecords();
  });

document.getElementById("clearDocumentFilters")
  .addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    renderRecords();
  });

document.getElementById("refreshDocuments")
  .addEventListener("click", () => {
    loadDocuments();
  });

statusFilter.addEventListener("change", renderRecords);

requireAdmin({
  onAuthorized: loadDocuments,
  onUnauthorized: () => {
    showStatus("Administrator access is required to view these records.", true);
  }
});
