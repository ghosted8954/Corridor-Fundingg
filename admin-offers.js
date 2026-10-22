
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("offersStatus");
const contentElement = document.getElementById("offersContent");
const tableBody = document.getElementById("offersTableBody");
const searchInput = document.getElementById("offerSearch");
const statusFilter = document.getElementById("offerStatusFilter");
const emptyElement = document.getElementById("offersEmpty");
const refreshButton = document.getElementById("refreshOffers");

let offerRecords = [];
let isAuthorized = false;
let isLoading = false;

function showStatus(message) {
  statusElement.textContent = message;
}

function formatMoney(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "Not provided";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

function formatRate(value) {
  const rate = Number(value);

  return value === undefined || value === null || value === "" ||
    !Number.isFinite(rate)
    ? "Not provided"
    : `${rate}%`;
}

function formatDate(value) {
  if (!value) return "Not provided";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "Not provided";

  return date.toLocaleDateString();
}

function readableStatus(value) {
  const status = String(value || "").toLowerCase();

  const labels = {
    pending: "Pending",
    offered: "Offered",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
    withdrawn: "Withdrawn"
  };

  return labels[status] || "Other / unverified";
}

function getOfferId(offer) {
  return String(offer.offerNumber || offer.id || "Unavailable");
}

function renderOffers() {
  const term = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = offerRecords.filter((offer) => {
    const status = String(offer.status || "").toLowerCase();

    const matchesStatus =
      selectedStatus === "all" || status === selectedStatus;

    const searchable = [
      getOfferId(offer),
      offer.ownerUid,
      offer.applicationId,
      offer.product,
      offer.status
    ].map((value) => String(value || "")).join(" ").toLowerCase();

    return matchesStatus && searchable.includes(term);
  });

  tableBody.replaceChildren();

  for (const offer of filtered) {
    const row = document.createElement("tr");

    const values = [
      getOfferId(offer),
      offer.ownerUid || "Unavailable",
      offer.applicationId || "Not provided",
      formatMoney(offer.amount),
      formatRate(offer.rate),
      readableStatus(offer.status),
      formatDate(offer.expiresAt)
    ];

    for (const value of values) {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    }

    const actionCell = document.createElement("td");
    const link = document.createElement("a");

    link.href = `admin-offer-details.html?id=${encodeURIComponent(offer.id)}`;
    link.textContent = "View details";

    actionCell.appendChild(link);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  }

  emptyElement.hidden = filtered.length !== 0;
}

async function loadOffers() {
  if (!isAuthorized || isLoading) return;

  isLoading = true;
  refreshButton.disabled = true;
  showStatus("Loading offer records…");

  try {
    const offersQuery = query(
      collection(db, "offers"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(offersQuery);

    offerRecords = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderOffers();
    contentElement.hidden = false;

    showStatus(`Loaded ${offerRecords.length} offer record(s).`);
  } catch (error) {
    console.error("Could not load offers:", error);
    showStatus(
      "Could not load offer records. Check administrator permissions, Firestore rules and indexes."
    );
  } finally {
    isLoading = false;
    refreshButton.disabled = false;
  }
}

searchInput.addEventListener("input", renderOffers);
statusFilter.addEventListener("change", renderOffers);
refreshButton.addEventListener("click", loadOffers);

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadOffers();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus("Administrator access is required to view loan offers.");
  }
});
