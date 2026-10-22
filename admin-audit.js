
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const tableBody = document.getElementById("auditTableBody");
const statusElement = document.getElementById("auditStatus");
const searchInput = document.getElementById("auditSearch");
const actionFilter = document.getElementById("auditActionFilter");

let auditRecords = [];

function showStatus(message) {
  statusElement.textContent = message;
}

function textValue(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

function actionCategory(record) {
  const value = (
    textValue(record.action) + " " +
    textValue(record.targetType) + " " +
    textValue(record.entityType)
  ).toLowerCase();

  const categories = [
    "application", "user", "loan", "offer",
    "balance", "transaction", "support", "settings"
  ];

  return categories.find((category) => value.includes(category)) || "other";
}

function renderLogs() {
  const term = searchInput.value.trim().toLowerCase();
  const category = actionFilter.value;

  const filtered = auditRecords.filter((record) => {
    const matchesCategory =
      !category || actionCategory(record) === category;

    const searchable = [
      record.actorUid,
      record.action,
      record.targetType,
      record.entityType,
      record.targetId,
      record.entityId,
      record.summary
    ].map(textValue).join(" ").toLowerCase();

    return matchesCategory && searchable.includes(term);
  });

  tableBody.replaceChildren();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No matching audit records.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  filtered.forEach((record) => {
    const row = document.createElement("tr");
    const timestamp = record.createdAt?.toDate
      ? record.createdAt.toDate().toLocaleString()
      : "Time unavailable";

    const values = [
      timestamp,
      record.actorUid,
      record.action,
      record.targetType || record.entityType,
      record.targetId || record.entityId,
      record.summary
    ];

    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = textValue(value);
      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });

  showStatus(`Showing ${filtered.length} matching event(s) from the loaded records.`);
}

async function loadAuditLogs() {
  showStatus("Loading audit logs...");

  try {
    const result = await getDocs(
      query(
        collection(db, "auditLogs"),
        orderBy("createdAt", "desc"),
        limit(300)
      )
    );

    auditRecords = result.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderLogs();
  } catch (error) {
    console.error("Audit log loading failed:", error);
    auditRecords = [];
    tableBody.replaceChildren();

    showStatus(
      "Unable to load audit logs. Check staff permissions, record structure and Firestore indexes."
    );
  }
}

searchInput.addEventListener("input", renderLogs);
actionFilter.addEventListener("change", renderLogs);

document.getElementById("refreshAuditLogs")
  .addEventListener("click", loadAuditLogs);

requireAdmin({
  onAuthorized: loadAuditLogs,
  onUnauthorized: () => {
    showStatus("Administrator access is required.");
  }
});
