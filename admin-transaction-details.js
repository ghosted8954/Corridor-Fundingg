
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("transactionDetailsStatus");
const contentElement = document.getElementById("transactionDetailsContent");
const detailsList = document.getElementById("transactionDetailsList");

const params = new URLSearchParams(window.location.search);
const transactionId = params.get("id");

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

function readableStatus(value) {
  const labels = {
    pending: "Pending",
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
    reversed: "Reversed"
  };

  return labels[String(value || "").toLowerCase()] ||
    "Other / unverified";
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

function renderTransaction(record) {
  const currency = String(record.currency || "USD");
  const reference = record.referenceNumber || record.reference;

  detailsList.replaceChildren();

  addDetail("Transaction ID", record.transactionNumber || transactionId);
  addDetail("Customer UID", record.ownerUid);
  addDetail("Transaction type", record.type);
  addDetail("Amount", formatMoney(record.amount, currency));
  addDetail("Currency", currency);
  addDetail("Status", readableStatus(record.status));
  addDetail("Reference", reference);
  addDetail("Loan ID", record.loanId);
  addDetail("Created", formatDate(record.createdAt));
  addDetail("Last updated", formatDate(record.updatedAt));
  addDetail("Description", record.description);
}

async function loadTransaction() {
  if (!isAuthorized) return;

  if (!transactionId) {
    showStatus("No transaction ID was supplied. Return to transaction management.");
    return;
  }

  showStatus("Loading transaction details…");

  try {
    const transactionReference = doc(db, "transactions", transactionId);
    const snapshot = await getDoc(transactionReference);

    if (!snapshot.exists()) {
      showStatus("This transaction could not be found or is not accessible.");
      return;
    }

    renderTransaction(snapshot.data());
    contentElement.hidden = false;
    showStatus("Transaction details loaded.");
  } catch (error) {
    console.error("Could not load transaction details:", error);
    showStatus(
      "Unable to load this transaction. Check administrator permissions and Firestore rules."
    );
  }
}

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadTransaction();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus(
      "Administrator access is required to view transaction details."
    );
  }
});
