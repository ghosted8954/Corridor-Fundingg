
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminSupportStatus");
const tableBody = document.getElementById("supportTicketsBody");
const countElement = document.getElementById("supportTicketsCount");
const searchInput = document.getElementById("supportSearch");
const statusFilter = document.getElementById("supportStatusFilter");

let tickets = [];

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

function cell(value) {
  const element = document.createElement("td");
  element.textContent = safeValue(value);
  return element;
}

function renderTickets() {
  const search = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  const filtered = tickets.filter((ticket) => {
    const searchable = [
      ticket.id,
      ticket.ownerUid,
      ticket.subject,
      ticket.category
    ].map((value) => safeValue(value, "")).join(" ").toLowerCase();

    return (!search || searchable.includes(search)) &&
      (!selectedStatus || ticket.status === selectedStatus);
  });

  tableBody.replaceChildren();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = 7;
    emptyCell.textContent = "No matching support tickets found.";
    row.append(emptyCell);
    tableBody.append(row);
  } else {
    for (const ticket of filtered) {
      const row = document.createElement("tr");

      row.append(
        cell(ticket.id),
        cell(ticket.ownerUid),
        cell(ticket.subject),
        cell(ticket.category),
        cell(ticket.status || "open"),
        cell(formatDate(ticket.createdAt))
      );

      const actionCell = document.createElement("td");
      const link = document.createElement("a");
      link.href = `admin-support-details.html?id=${encodeURIComponent(ticket.id)}`;
      link.textContent = "View details";
      actionCell.append(link);
      row.append(actionCell);

      tableBody.append(row);
    }
  }

  countElement.textContent =
    `Showing ${filtered.length} of ${tickets.length} loaded tickets.`;
}

async function loadTickets() {
  showStatus("Loading support tickets...");

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "supportTickets"),
        orderBy("createdAt", "desc"),
        limit(200)
      )
    );

    tickets = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderTickets();
    showStatus("Support ticket records loaded. Showing up to 200 tickets.");
  } catch (error) {
    console.error("Support ticket loading error:", error);
    tickets = [];
    renderTickets();

    showStatus(
      "Unable to load support tickets. Check administrator permissions and Firestore rules.",
      true
    );
  }
}

searchInput.addEventListener("input", renderTickets);
statusFilter.addEventListener("change", renderTickets);

document.getElementById("clearSupportFilters")
  .addEventListener("click", () => {
    searchInput.value = "";
    statusFilter.value = "";
    renderTickets();
  });

document.getElementById("refreshSupportTickets")
  .addEventListener("click", loadTickets);

requireAdmin({
  onAuthorized: loadTickets,
  onUnauthorized: () => {
    showStatus("Administrator access is required.", true);
  }
});
