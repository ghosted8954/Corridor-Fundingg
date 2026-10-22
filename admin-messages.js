
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminMessagesStatus");
const tableBody = document.getElementById("messageConversationsBody");
const searchInput = document.getElementById("messageConversationSearch");

let conversations = [];

function formatDate(value) {
  if (!value) return "—";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

function textCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value === undefined || value === null || value === ""
    ? "—"
    : String(value);
  return cell;
}

function renderConversations() {
  const search = searchInput.value.trim().toLowerCase();

  const filtered = conversations.filter((conversation) => {
    const participants = Array.isArray(conversation.participants)
      ? conversation.participants.join(" ")
      : "";

    return `${conversation.id} ${participants}`
      .toLowerCase()
      .includes(search);
  });

  tableBody.replaceChildren();

  if (!filtered.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No matching conversations found.";
    row.append(cell);
    tableBody.append(row);
    return;
  }

  for (const conversation of filtered) {
    const row = document.createElement("tr");

    row.append(
      textCell(conversation.id),
      textCell(Array.isArray(conversation.participants)
        ? conversation.participants.join(", ")
        : "—"),
      textCell(conversation.status || "open"),
      textCell(formatDate(conversation.updatedAt))
    );

    const actionCell = document.createElement("td");
    const link = document.createElement("a");
    link.href = `admin-chat.html?conversationId=${encodeURIComponent(conversation.id)}`;
    link.textContent = "Open chat";
    actionCell.append(link);
    row.append(actionCell);

    tableBody.append(row);
  }
}

async function loadConversations() {
  statusElement.textContent = "Loading conversations...";

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "conversations"),
        orderBy("updatedAt", "desc"),
        limit(200)
      )
    );

    conversations = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderConversations();
    statusElement.textContent = "Conversation records loaded.";
  } catch (error) {
    console.error("Unable to load conversations:", error);
    statusElement.textContent =
      "Could not load conversations. Check administrator permissions and Firestore rules.";
    tableBody.replaceChildren();

    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Unable to load conversation records.";
    row.append(cell);
    tableBody.append(row);
  }
}

searchInput.addEventListener("input", renderConversations);

document.getElementById("refreshMessageConversations")
  .addEventListener("click", loadConversations);

requireAdmin({
  onAuthorized: loadConversations,
  onUnauthorized: () => {
    statusElement.textContent = "Administrator access is required.";
  }
});
