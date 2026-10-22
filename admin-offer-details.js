
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("offerDetailsStatus");
const contentElement = document.getElementById("offerDetailsContent");
const detailsList = document.getElementById("offerDetailsList");

const params = new URLSearchParams(window.location.search);
const offerId = params.get("id");

let isAuthorized = false;

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

  return date.toLocaleString();
}

function readableStatus(value) {
  const labels = {
    pending: "Pending",
    offered: "Offered",
    accepted: "Accepted",
    declined: "Declined",
    expired: "Expired",
    withdrawn: "Withdrawn"
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

function renderOffer(offer) {
  detailsList.replaceChildren();

  addDetail("Offer ID", offer.offerNumber || offerId);
  addDetail("Customer UID", offer.ownerUid);
  addDetail("Application ID", offer.applicationId);
  addDetail("Product", offer.product);
  addDetail("Offer amount", formatMoney(offer.amount));
  addDetail("Interest rate", formatRate(offer.rate));
  addDetail("Offer status", readableStatus(offer.status));
  addDetail("Expiration date", formatDate(offer.expiresAt));
  addDetail("Created", formatDate(offer.createdAt));
  addDetail("Last updated", formatDate(offer.updatedAt));
}

async function loadOffer() {
  if (!isAuthorized) return;

  if (!offerId) {
    showStatus("No offer ID was supplied. Return to the offers list.");
    return;
  }

  showStatus("Loading offer details…");

  try {
    const offerReference = doc(db, "offers", offerId);
    const snapshot = await getDoc(offerReference);

    if (!snapshot.exists()) {
      showStatus("This offer could not be found or is not accessible.");
      return;
    }

    renderOffer(snapshot.data());
    contentElement.hidden = false;
    showStatus("Offer details loaded.");
  } catch (error) {
    console.error("Could not load offer details:", error);
    showStatus(
      "Unable to load this offer. Check administrator permissions and Firestore rules."
    );
  }
}

requireAdmin({
  onAuthorized: async () => {
    isAuthorized = true;
    await loadOffer();
  },
  onUnauthorized: () => {
    isAuthorized = false;
    contentElement.hidden = true;
    showStatus("Administrator access is required to view offer details.");
  }
});
