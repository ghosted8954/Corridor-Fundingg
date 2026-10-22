
import { auth, db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminChatStatus");
const conversationList = document.getElementById("conversationList");
const messagesContainer = document.getElementById("adminChatMessages");
const searchInput = document.getElementById("conversationSearch");
const replyForm = document.getElementById("adminChatReplyForm");
const replyInput = document.getElementById("adminChatReply");
const sendButton = document.getElementById("sendAdminChatReply");

let conversations = [];
let activeConversationId = "";
let stopMessagesListener = null;
let loadingConversations = false;
let sendingReply = false;

function showStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "info";
}

function safeValue(value, fallback = "—") {
  return value === undefined || value === null || value === ""
    ? fallback
    : String(value);
}

function makeElement(tag, text, className = "") {
  const element = document.createElement(tag);
  element.textContent = text;

  if (className) element.className = className;
  return element;
}

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = typeof value.toDate === "function"
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString();
}

function renderConversationList() {
  const search = searchInput.value.trim().toLowerCase();

  const filtered = conversations.filter((conversation) => {
    const participants = Array.isArray(conversation.participants)
      ? conversation.participants.join(" ")
      : "";

    const searchable = [
      conversation.id,
      participants,
      conversation.subject,
      conversation.status
    ].map((value) => safeValue(value, "")).join(" ").toLowerCase();

    return !search || searchable.includes(search);
  });

  conversationList.replaceChildren();

  if (!filtered.length) {
    conversationList.append(
      makeElement("p", "No matching conversations found.")
    );
    return;
  }

  for (const conversation of filtered) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-list-item";
    button.setAttribute(
      "aria-pressed",
      String(conversation.id === activeConversationId)
    );

    button.append(
      makeElement("strong", safeValue(conversation.subject, "Customer conversation")),
      makeElement("span", `ID: ${conversation.id}`),
      makeElement("span", `Status: ${safeValue(conversation.status, "open")}`),
      makeElement("small", `Updated: ${formatDate(conversation.updatedAt)}`)
    );

    button.addEventListener("click", () => {
      selectConversation(conversation.id);
    });

    conversationList.append(button);
  }
}

async function loadConversations() {
  if (loadingConversations) return;
  loadingConversations = true;

  showStatus("Loading conversations...");

  try {
    const snapshot = await getDocs(
      query(
        collection(db, "conversations"),
        orderBy("updatedAt", "desc"),
        limit(100)
      )
    );

    conversations = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    renderConversationList();
    showStatus("Conversation list loaded. Showing up to 100 records.");
  } catch (error) {
    console.error("Conversation list error:", error);
    showStatus(
      "Unable to load conversations. Verify staff permissions and Firestore rules.",
      true
    );
  } finally {
    loadingConversations = false;
  }
}

function stopListeningToMessages() {
  if (typeof stopMessagesListener === "function") {
    stopMessagesListener();
  }

  stopMessagesListener = null;
}

function renderMessages(snapshot) {
  messagesContainer.replaceChildren();

  if (snapshot.empty) {
    messagesContainer.append(makeElement("p", "No messages in this conversation."));
    return;
  }

  for (const item of snapshot.docs) {
    const message = item.data();
    const messageBox = document.createElement("article");
    messageBox.className = "chat-message";

    messageBox.append(
      makeElement("strong", message.senderUid === auth.currentUser?.uid
        ? "You"
        : safeValue(message.senderUid, "Participant")),
      makeElement("p", safeValue(message.text, "")),
      makeElement("small", formatDate(message.createdAt))
    );

    messagesContainer.append(messageBox);
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function selectConversation(conversationId) {
  const selected = conversations.find((item) => item.id === conversationId);

  if (!selected) {
    showStatus("That conversation is not in the loaded list.", true);
    return;
  }

  activeConversationId = conversationId;
  renderConversationList();
  stopListeningToMessages();

  document.getElementById("activeConversationTitle").textContent =
    safeValue(selected.subject, "Customer conversation");

  document.getElementById("activeConversationInfo").textContent =
    `Conversation ID: ${conversationId}`;

  messagesContainer.replaceChildren(
    makeElement("p", "Loading messages...")
  );

  replyInput.value = "";
  sendButton.disabled = false;

  try {
    const messagesQuery = query(
      collection(db, "conversations", conversationId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );

    stopMessagesListener = onSnapshot(
      messagesQuery,
      (snapshot) => renderMessages(snapshot),
      (error) => {
        console.error("Message listener error:", error);
        showStatus(
          "Unable to read this conversation. Check Firestore permissions.",
          true
        );
      }
    );
  } catch (error) {
    console.error("Unable to select conversation:", error);
    showStatus("Could not open this conversation.", true);
  }
}

replyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (sendingReply) return;

  const text = replyInput.value.trim();
  const user = auth.currentUser;
  const conversationId = activeConversationId;

  if (!user || !conversationId) {
    showStatus("Select a conversation before replying.", true);
    return;
  }

  if (!text || text.length > 3000) {
    showStatus("Enter a reply between 1 and 3,000 characters.", true);
    return;
  }

  const selected = conversations.find((item) => item.id === conversationId);

  if (!selected) {
    showStatus("Conversation not found. Refresh the list.", true);
    return;
  }

  sendingReply = true;
  sendButton.disabled = true;
  showStatus("Sending reply...");

  try {
    await addDoc(
      collection(db, "conversations", conversationId, "messages"),
      {
        senderUid: user.uid,
        text,
        createdAt: serverTimestamp()
      }
    );

    replyInput.value = "";
    showStatus("Reply sent.");
  } catch (error) {
    console.error("Reply error:", error);
    showStatus(
      "Reply could not be sent. Verify the conversation's staff permissions and message rules.",
      true
    );
  } finally {
    sendingReply = false;
    sendButton.disabled = !activeConversationId;
  }
});

searchInput.addEventListener("input", renderConversationList);

document.getElementById("refreshConversations")
  .addEventListener("click", loadConversations);

window.addEventListener("beforeunload", stopListeningToMessages);

requireAdmin({
  onAuthorized: loadConversations,
  onUnauthorized: () => {
    showStatus("Administrator access is required.", true);
  }
});
