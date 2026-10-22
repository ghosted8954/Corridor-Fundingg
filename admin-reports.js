
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const reportType = document.getElementById("reportType");
const statusElement = document.getElementById("reportStatus");
const tableHead = document.getElementById("reportTableHead");
const tableBody = document.getElementById("reportTableBody");

const reportCollections = {
  applications: "applications",
  loans: "loans",
  offers: "offers",
  transactions: "transactions",
  users: "users"
};

let currentReport = [];

function showStatus(message) {
  statusElement.textContent = message;
}

function safeValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return "";
  return String(value).replace(/[\r\n]+/g, " ");
}

function getStatus(record) {
  return String(record.status || "").toLowerCase();
}

function statusGroup(status) {
  if (["approved", "completed", "active", "paid"].includes(status)) {
    return "completed";
  }

  if (["declined", "failed", "rejected", "defaulted"].includes(status)) {
    return "declined";
  }

  if ([
    "pending", "submitted", "in_review", "under_review",
    "processing", "draft", "open"
  ].includes(status)) {
    return "pending";
  }

  return "other";
}

function updateSummary(records, type) {
  document.getElementById("reportTotal").textContent =
    String(records.length);

  document.getElementById("reportPending").textContent =
    String(records.filter((record) =>
      statusGroup(getStatus(record)) === "pending"
    ).length);

  document.getElementById("reportCompleted").textContent =
    String(records.filter((record) =>
      statusGroup(getStatus(record)) === "completed"
    ).length);

  document.getElementById("reportDeclined").textContent =
    String(records.filter((record) =>
      statusGroup(getStatus(record)) === "declined"
    ).length);

  if (type === "users") {
    document.getElementById("reportPending").textContent = "N/A";
    document.getElementById("reportCompleted").textContent = "N/A";
    document.getElementById("reportDeclined").textContent = "N/A";
  }
}

function renderTable(records, type) {
  const fieldsByType = {
    applications: ["id", "ownerUid", "product", "state", "status", "createdAt"],
    loans: ["id", "ownerUid", "product", "principal", "currentBalance", "status"],
    offers: ["id", "ownerUid", "product", "amount", "rate", "status"],
    transactions: ["id", "ownerUid", "type", "amount", "currency", "status"],
    users: ["id", "email", "displayName", "state", "createdAt"]
  };

  const fields = fieldsByType[type] || ["id", "status"];
  tableHead.replaceChildren();
  tableBody.replaceChildren();

  const headerRow = document.createElement("tr");

  fields.forEach((field) => {
    const th = document.createElement("th");
    th.textContent = field;
    headerRow.appendChild(th);
  });

  tableHead.appendChild(headerRow);

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = fields.length;
    cell.textContent = "No records found.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");

    fields.forEach((field) => {
      const cell = document.createElement("td");
      const value = record[field];

      if (field === "createdAt" && value?.toDate) {
        cell.textContent = value.toDate().toLocaleString();
      } else {
        cell.textContent = safeValue(value);
      }

      row.appendChild(cell);
    });

    tableBody.appendChild(row);
  });
}

async function generateReport() {
  const type = reportType.value;
  const collectionName = reportCollections[type];

  if (!collectionName) {
    showStatus("Select a valid report type.");
    return;
  }

  showStatus("Loading report...");

  document.getElementById("generateReport").disabled = true;

  try {
    // Limit the report to a manageable sample. This is not a full
    // accounting export or a complete historical report.
    const result = await getDocs(
      query(collection(db, collectionName), limit(500))
    );

    currentReport = result.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    updateSummary(currentReport, type);
    renderTable(currentReport, type);

    document.getElementById("reportDataNote").textContent =
      `Showing up to 500 records from ${collectionName}. ` +
      "This is a limited sample, not a complete report.";

    showStatus(`Report generated: ${currentReport.length} record(s).`);
  } catch (error) {
    console.error("Report generation failed:", error);
    currentReport = [];
    showStatus(
      "Unable to generate report. Check administrator permissions and Firestore rules."
    );
  } finally {
    document.getElementById("generateReport").disabled = false;
  }
}

function exportCSV() {
  if (!currentReport.length) {
    showStatus("Generate a report with records before exporting.");
    return;
  }

  const type = reportType.value;
  const fieldsByType = {
    applications: ["id", "ownerUid", "product", "state", "status", "createdAt"],
    loans: ["id", "ownerUid", "product", "principal", "currentBalance", "status"],
    offers: ["id", "ownerUid", "product", "amount", "rate", "status"],
    transactions: ["id", "ownerUid", "type", "amount", "currency", "status"],
    users: ["id", "email", "displayName", "state", "createdAt"]
  };

  const fields = fieldsByType[type] || ["id", "status"];

  function csvCell(value) {
    let text = safeValue(value);

    if (value?.toDate) {
      text = value.toDate().toISOString();
    }

    // Prevent spreadsheet formula injection in exported values.
    if (/^[=+\-@\t]/.test(text)) {
      text = "'" + text;
    }

    return '"' + text.replace(/"/g, '""') + '"';
  }

  const rows = [
    fields.map(csvCell).join(","),
    ...currentReport.map((record) =>
      fields.map((field) => csvCell(record[field])).join(",")
    )
  ];

  const blob = new Blob(["\uFEFF" + rows.join("\r\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `corridor-funding-${type}-report.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  showStatus("CSV export prepared. Store it securely because it may contain private information.");
}

document.getElementById("generateReport")
  .addEventListener("click", generateReport);

document.getElementById("exportReport")
  .addEventListener("click", exportCSV);

requireAdmin({
  onAuthorized: () => showStatus("Choose a report and select Generate report."),
  onUnauthorized: () => showStatus("Administrator access is required.")
});
