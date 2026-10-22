
import { auth, db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("supportDetailsStatus");
const statusForm = document.getElementById("supportStatusForm");
const saveButton = document.getElementById("saveSupportStatus");

let ticketRef = null;
let currentTicket = null;
let saving = false;

const allowedStatuses = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed"
];

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.dataset.state = isError ? "error" : "info";
}

function setText(id, value, fallback = "—") {
  const element = document.getElementById(id);
  if (!element) return;

  element.textContent =
    value === undefined || value === null || value === ""
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

function renderTicket(ticket, id) {
  setText("ticketId", id);
  setText("ticketOwnerUid", ticket.ownerUid);
  setText("ticketSubject", ticket.subject);
  setText("ticketCategory", ticket.category);
  setText("ticketMessage", ticket.message);
  setText("ticketStatus", ticket.status || "open");
  setText("ticketCreatedAt", formatDate(ticket.createdAt));
  setText("ticketUpdatedAt", formatDate(ticket.updatedAt));

  const statusSelect = document.getElementById("newTicketStatus");
  statusSelect.value = allowedStatuses.includes(ticket.status)
    ? ticket.status
    : "open";
}

async function loadTicket() {
  const params = new URLSearchParams(window.location.search);
  const ticketId = params.get("id");

  if (!ticketId || ticketId.length > 150) {
    setStatus("A valid support ticket ID is required.", true);
    statusForm.hidden = true;
    return;
  }

  setStatus("Loading support ticket...");

  try {
    ticketRef = doc(db, "supportTickets", ticketId);
    const snapshot = await getDoc(ticketRef);

    if (!snapshot.exists()) {
      setStatus("Ticket not found or access denied.", true);
      statusForm.hidden = true;
      return;
    }

    currentTicket = snapshot.data();
    renderTicket(currentTicket, snapshot.id);
    setStatus("Support ticket loaded.");
  } catch (error) {
    console.error("Ticket load error:", error);
    setStatus(
      "Unable to load this ticket. Check administrator permissions and Firestore rules.",
      true
    );
    statusForm.hidden = true;
  }
}

statusForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (saving || !ticketRef || !currentTicket) return;

  const user = auth.currentUser;
  const newStatus = document.getElementById("newTicketStatus").value;
  const internalNote = document.getElementById("supportInternalNote").value.trim();

  if (!user) {
    setStatus("Your administrator session has expired. Sign in again.", true);
    return;
  }

  if (!allowedStatuses.includes(newStatus)) {
    setStatus("Choose a valid ticket status.", true);
    return;
  }

  if (internalNote.length > 1000) {
    setStatus("Internal notes cannot exceed 1,000 characters.", true);
    return;
  }

  saving = true;
  saveButton.disabled = true;
  setStatus("Saving ticket update...");

  try {
    const update = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      lastUpdatedBy: user.uid
    };

    if (internalNote) {
      update.internalNotes = arrayUnion({
        text: internalNote,
        authorUid: user.uid,
        createdAt: new Date().toISOString()
      });
    }

    await updateDoc(ticketRef, update);

    const refreshed = await getDoc(ticketRef);

    if (refreshed.exists()) {
      currentTicket = refreshed.data();
      renderTicket(currentTicket, refreshed.id);
    }

    document.getElementById("supportInternalNote").value = "";
    setStatus("Support ticket updated successfully.");
  } catch (error) {
    console.error("Ticket update error:", error);
    setStatus(
      "Unable to update the ticket. Confirm that Firestore rules permit these exact fields.",
      true
    );
  } finally {
    saving = false;
    saveButton.disabled = false;
  }
});

requireAdmin({
  onAuthorized: loadTicket,
  onUnauthorized: () => {
    setStatus("Administrator access is required.", true);
    statusForm.hidden = true;
  }
});
