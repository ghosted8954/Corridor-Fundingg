
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("balancesStatus");
const contentElement = document.getElementById("balancesContent");
const tableBody = document.getElementById("balancesTableBody");
const searchInput = document.getElementById("balanceSearch");
const emptyElement = document.getElementById("balancesEmpty");
const refreshButton = document.getElementById("refreshBalances");

let balanceRecords = [];
let isAuthorized = false;
let isLoading = false;

function showStatus(message) {
  statusElement.textContent = message;
}

function getRecordId(record) {
  return String(record.id || "Unavailable");
}

function getBalanceValue(record) {
  // Support common field names without changing the stored record.
  return record.balance ?? record.currentBalance ?? record.amount;
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

function renderBalances() {
  const term = searchInput.value.trim().toLowerCase();

  const filtered = balanceRecords.filter((record) => {
    const searchable = [
      getRecordId(record),
      record.ownerUid
    ].map((value) => String(value || "")).join(" ").toLowerCase();

    return searchable.includes(term);
  });

  tableBody.replaceChildren();

  for (const record of filtered) {
    const row = document.createElement("tr");
    const currency = String(record.currency || "USD");

    const values = [
      getRecordId(record),
      record.ownerUid || "Unavailable",
      formatMoney(getBalanceValue(record), currency),
      currency,
      formatDate(record.updatedAt || record.createdAt)
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    }

    const actionCell = document.createElement("td");
    const link = document.createElement("a");

    link.href =
      `admin-balance-details.html?id=${encodeURIComponent(record.id)}`;
    link.textContent = "View details";

    actionCell.appendChild(link);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  }

  emptyElement.hidden = filtered.length !== 0;
}

async function loadBalances() {
  if (!isAuthorized || isLoading) return;

  isLoading = true;
  refreshButton.disabled = true;
  showStatus("Loading balance records…");

  try {
    const balancesQuery = query(
      collection(db, "balances"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(balancesQuery);

    balanceRecords = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderBalances();
    contentElement.hidden = false;
    showStatus(`Loaded ${balanceRecords.length} balance record(s).`);
  } catch (error) {
    console.error("Could not load balance records:", error);
    showStatus(
      "Could not load balance records. Check administrator permissions, Firestore rules and indexes."
    );
  } finally {
    isLoading = false;
    refreshButton.disabled = false;
  }
}

searchInput.addEventListener("input", renderBalances);
refreshButton.addEventListener("click", loadBalances);

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadBalances();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus(
      "Administrator access is required to view balance records."
    );
  }
});
