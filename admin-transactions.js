
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("transactionsStatus");
const contentElement = document.getElementById("transactionsContent");
const tableBody = document.getElementById("transactionsTableBody");
const searchInput = document.getElementById("transactionSearch");
const statusFilter = document.getElementById("transactionStatusFilter");
const emptyElement = document.getElementById("transactionsEmpty");
const refreshButton = document.getElementById("refreshTransactions");

let transactionRecords = [];
let isAuthorized = false;
let isLoading = false;

function showStatus(message) {
  statusElement.textContent = message;
}

function readableStatus(value) {
  const labels = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    reversed: "Reversed"
  };

  return labels[String(value || "").toLowerCase()] || "Other / unverified";
}

function formatMoney(value, currency = "USD") {
  const amount = Number(value);

  if (value === null || value === undefined || value === "" ||
      !Number.isFinite(amount)) {
    return "Not provided";
  }

  const safeCurrency = /^[A-Z]{3}$/.test(String(currency))
    ? String(currency)
    : "USD";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${safeCurrency} ${amount.toFixed(2)}`;
  }
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "Not provided";

  return date.toLocaleString();
}

function getTransactionId(record) {
  return String(record.transactionNumber || record.id || "Unavailable");
}

function renderTransactions() {
  const term = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = transactionRecords.filter((record) => {
    const status = String(record.status || "").toLowerCase();

    const matchesStatus =
      selectedStatus === "all" || status === selectedStatus;

    const searchable = [
      getTransactionId(record),
      record.ownerUid,
      record.reference,
      record.referenceNumber,
      record.type,
      record.status
    ].map((value) => String(value || "")).join(" ").toLowerCase();

    return matchesStatus && searchable.includes(term);
  });

  tableBody.replaceChildren();

  for (const record of filtered) {
    const row = document.createElement("tr");
    const currency = String(record.currency || "USD");
    const reference = record.referenceNumber || record.reference || "Not provided";

    const values = [
      getTransactionId(record),
      record.ownerUid || "Unavailable",
      record.type || "Not provided",
      formatMoney(record.amount, currency),
      readableStatus(record.status),
      reference,
      formatDate(record.createdAt)
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    }

    const actionCell = document.createElement("td");
    const link = document.createElement("a");

    link.href =
      `admin-transaction-details.html?id=${encodeURIComponent(record.id)}`;
    link.textContent = "View details";

    actionCell.appendChild(link);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  }

  emptyElement.hidden = filtered.length !== 0;
}

async function loadTransactions() {
  if (!isAuthorized || isLoading) return;

  isLoading = true;
  refreshButton.disabled = true;
  showStatus("Loading transaction records…");

  try {
    const transactionsQuery = query(
      collection(db, "transactions"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(transactionsQuery);

    transactionRecords = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderTransactions();
    contentElement.hidden = false;
    showStatus(`Loaded ${transactionRecords.length} transaction record(s).`);
  } catch (error) {
    console.error("Could not load transactions:", error);
    showStatus(
      "Could not load transactions. Check administrator permissions, Firestore rules and indexes."
    );
  } finally {
    isLoading = false;
    refreshButton.disabled = false;
  }
}

searchInput.addEventListener("input", renderTransactions);
statusFilter.addEventListener("change", renderTransactions);
refreshButton.addEventListener("click", loadTransactions);

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadTransactions();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus("Administrator access is required to view transactions.");
  }
});
