import { db } from "./firebase-init.js";
import { requireAuth } from "./auth-guard.js";
import { formatDate, escapeHTML } from "./utils.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("messagesStatus");
const listElement = document.getElementById("conversationsList");
const emptyElement = document.getElementById("conversationsEmpty");

function showStatus(message, type = "info") {
  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
}

function displayDate(value) {
  if (!value) return "Not available";

  try {
    const date = typeof value.toDate === "function"
      ? value.toDate()
      : new Date(value);

    return Number.isNaN(date.getTime()) ? "Not available" : formatDate(date);
  } catch {
    return "Not available";
  }
}

function renderConversation(snapshot) {
  const conversation = snapshot.data();
  const card = document.createElement("article");
  card.className = "application-card";

  const title = escapeHTML(String(conversation.title || "Support conversation"));
  const status = escapeHTML(String(conversation.status || "Open"));
  const updated = escapeHTML(displayDate(conversation.updatedAt));

  card.innerHTML = `
    <div class="application-card-heading">
      <h2>${title}</h2>
      <span class="status-pill">${status}</span>
    </div>
    <p><strong>Last updated:</strong> ${updated}</p>
  `;

  const link = document.createElement("a");
  link.className = "text-link";
  link.href = `live-chat.html?conversationId=${encodeURIComponent(snapshot.id)}`;
  link.textContent = "Open conversation";
  card.appendChild(link);

  return card;
}

async function loadConversations(user) {
  listElement.replaceChildren();
  emptyElement.hidden = true;
  showStatus("Loading conversations...");

  try {
    const conversationsQuery = query(
      collection(db, "conversations"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(conversationsQuery);

    if (snapshot.empty) {
      statusElement.hidden = true;
      emptyElement.hidden = false;
      return;
    }

    const fragment = document.createDocumentFragment();

    snapshot.forEach((conversationSnapshot) => {
      fragment.appendChild(renderConversation(conversationSnapshot));
    });

    listElement.appendChild(fragment);
    statusElement.hidden = true;
  } catch (error) {
    console.error("Could not load conversations:", error);
    showStatus(
      "We could not load your conversations. Please try again later.",
      "error"
    );
  }
}

requireAuth({
  onAuthenticated: loadConversations
});