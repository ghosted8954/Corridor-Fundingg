
import { db } from "./firebase-init.js";
import { requireAuth } from "./auth-guard.js";
import {
  formatDate,
  formatCurrency,
  escapeHTML
} from "./utils.js";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("applicationsStatus");
const listElement = document.getElementById("applicationsList");
const emptyElement = document.getElementById("applicationsEmpty");

function showStatus(message, type = "info") {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
}

function readableStatus(status) {
  const labels = {
    draft: "Draft",
    submitted: "Submitted",
    in_review: "In review",
    under_review: "Under review",
    approved: "Approved",
    declined: "Declined",
    withdrawn: "Withdrawn"
  };

  return labels[String(status || "").toLowerCase()]
    || "Status unavailable";
}

function displayDate(value) {
  try {
    if (!value) return "Not available";

    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    return Number.isNaN(date.getTime())
      ? "Not available"
      : formatDate(date);
  } catch {
    return "Not available";
  }
}

function renderApplication(docSnapshot) {
  const item = docSnapshot.data();
  const card = document.createElement("article");
  card.className = "application-card";

  const product = escapeHTML(
    String(item.product || "Loan application")
  );

  const state = escapeHTML(
    String(item.state || "Not provided")
  );

  const status = escapeHTML(readableStatus(item.status));
  const date = escapeHTML(displayDate(item.createdAt));

  const amount = Number(item.requestedAmount);

  const amountText =
    Number.isFinite(amount) && amount > 0
      ? formatCurrency(amount)
      : "Not specified";

  card.innerHTML = `
    <div class="application-card-heading">
      <h2>${product}</h2>
      <span class="status-pill">${status}</span>
    </div>

    <p><strong>State:</strong> ${state}</p>
    <p><strong>Requested amount:</strong> ${escapeHTML(amountText)}</p>
    <p><strong>Created:</strong> ${date}</p>

    <a class="text-link"
       href="application.html?id=${encodeURIComponent(docSnapshot.id)}">
      View application
    </a>
  `;

  return card;
}

async function loadApplications(user) {
  if (!listElement || !emptyElement) {
    showStatus("The application list could not be displayed.", "error");
    return;
  }

  listElement.replaceChildren();
  emptyElement.hidden = true;
  showStatus("Loading your applications...");

  try {
    const applicationsQuery = query(
      collection(db, "applications"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(applicationsQuery);

    if (snapshot.empty) {
      statusElement.hidden = true;
      emptyElement.hidden = false;
      return;
    }

    const fragment = document.createDocumentFragment();

    snapshot.forEach((applicationDoc) => {
      fragment.appendChild(renderApplication(applicationDoc));
    });

    listElement.appendChild(fragment);
    statusElement.hidden = true;
  } catch (error) {
    console.error("Could not load applications:", error);

    showStatus(
      "We could not load your applications. Please try again. If the problem continues, check the browser console for the specific error.",
      "error"
    );
  }
}

async function initializeApplications() {
  try {
    const user = await requireAuth();

    if (!user) return;

    await loadApplications(user);
  } catch (error) {
    console.error("Could not initialize applications:", error);

    showStatus(
      "We could not verify your sign-in or load your applications. Please sign in again.",
      "error"
    );
  }
}

initializeApplications();
