
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("balanceDetailsStatus");
const contentElement = document.getElementById("balanceDetailsContent");
const detailsList = document.getElementById("balanceDetailsList");

const params = new URLSearchParams(window.location.search);
const recordId = params.get("id");

let isAuthorized = false;

function showStatus(message) {
  statusElement.textContent = message;
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

function addDetail(label, value) {
  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent =
    value === undefined || value === null || value === ""
      ? "Not provided"
      : String(value);

  detailsList.append(term, description);
}

function renderBalance(record) {
  const currency = String(record.currency || "USD");
  const amount = record.balance ?? record.currentBalance ?? record.amount;

  detailsList.replaceChildren();

  addDetail("Record ID", recordId);
  addDetail("Customer UID", record.ownerUid);
  addDetail("Recorded balance", formatMoney(amount, currency));
  addDetail("Currency", currency);
  addDetail("Created", formatDate(record.createdAt));
  addDetail("Last updated", formatDate(record.updatedAt));
}

async function loadBalance() {
  if (!isAuthorized) return;

  if (!recordId) {
    showStatus("No balance record ID was supplied. Return to balance management.");
    return;
  }

  showStatus("Loading balance record…");

  try {
    const balanceReference = doc(db, "balances", recordId);
    const snapshot = await getDoc(balanceReference);

    if (!snapshot.exists()) {
      showStatus("This balance record could not be found or is not accessible.");
      return;
    }

    renderBalance(snapshot.data());
    contentElement.hidden = false;
    showStatus("Balance record loaded.");
  } catch (error) {
    console.error("Could not load balance details:", error);
    showStatus(
      "Unable to load this record. Check administrator permissions and Firestore rules."
    );
  }
}

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadBalance();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus(
      "Administrator access is required to view balance details."
    );
  }
});
