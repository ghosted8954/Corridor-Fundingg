
import { db } from "./firebase-init.js";
import { requireAuth } from "./auth-guard.js";
import {
  isAllowedState,
  isAllowedLoanProduct
} from "./security.js";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("applicationForm");
const statusElement = document.getElementById("applicationStatus");
const productElement = document.getElementById("product");
const stateElement = document.getElementById("state");
const amountElement = document.getElementById("requestedAmount");
const purposeElement = document.getElementById("purpose");
const acknowledgementElement = document.getElementById("acknowledgement");
const draftButton = document.getElementById("saveDraftButton");
const submitButton = document.getElementById("submitApplicationButton");

const stateOptions = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"],
  ["AR", "Arkansas"], ["CA", "California"], ["CO", "Colorado"],
  ["CT", "Connecticut"], ["DE", "Delaware"], ["DC", "District of Columbia"],
  ["FL", "Florida"], ["GA", "Georgia"], ["HI", "Hawaii"],
  ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"],
  ["IA", "Iowa"], ["KS", "Kansas"], ["KY", "Kentucky"],
  ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"],
  ["MS", "Mississippi"], ["MO", "Missouri"], ["MT", "Montana"],
  ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"],
  ["NJ", "New Jersey"], ["NM", "New Mexico"], ["NY", "New York"],
  ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"],
  ["UT", "Utah"], ["VT", "Vermont"], ["VA", "Virginia"],
  ["WA", "Washington"], ["WV", "West Virginia"],
  ["WI", "Wisconsin"], ["WY", "Wyoming"]
];

const stateNames = Object.fromEntries(stateOptions);

const productNames = {
  personal: "Personal loan",
  mortgage: "Mortgage loan",
  business: "Business loan",
  "debt-consolidation": "Debt consolidation"
};

const statusLabels = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  under_review: "Under review",
  approved: "Approved",
  declined: "Declined",
  withdrawn: "Withdrawn"
};

let currentUser = null;
let existingApplicationId = null;
let busy = false;
let applicationReadOnly = false;

function showStatus(message, type = "info") {
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
}

function setBusy(value) {
  busy = value;

  if (draftButton) {
    draftButton.disabled = value || applicationReadOnly;
  }

  if (submitButton) {
    submitButton.disabled = value || applicationReadOnly;
  }
}

function populateStates() {
  if (!stateElement) return;

  for (const [code, name] of stateOptions) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    stateElement.appendChild(option);
  }
}

function formatAmount(value) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(value) {
  try {
    if (!value) return "Not available";

    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  } catch {
    return "Not available";
  }
}

function addDetail(container, label, value) {
  const row = document.createElement("div");
  row.className = "application-detail-row";

  const heading = document.createElement("h3");
  heading.className = "application-detail-label";
  heading.textContent = label;

  const content = document.createElement("p");
  content.className = "application-detail-value";
  content.textContent = value || "Not provided";

  row.append(heading, content);
  container.appendChild(row);
}

function setFormReadOnly() {
  applicationReadOnly = true;

  form.querySelectorAll("input, select, textarea").forEach((element) => {
    element.disabled = true;
  });

  if (draftButton) draftButton.disabled = true;
  if (submitButton) submitButton.disabled = true;
}

function showApplicationDetails(data) {
  const status = statusLabels[data.status] || "Status unavailable";
  const isFinalDecision = ["approved", "declined"].includes(data.status);

  const details = document.createElement("section");
  details.className = "application-review-details";
  details.setAttribute("aria-labelledby", "applicationDetailsHeading");

  const heading = document.createElement("h2");
  heading.id = "applicationDetailsHeading";
  heading.textContent = "Application details";

  const statusRow = document.createElement("div");
  statusRow.className = "application-status-summary";

  const statusLabel = document.createElement("span");
  statusLabel.textContent = "Current status";

  const statusValue = document.createElement("strong");
  statusValue.className = `status-pill status-${String(data.status || "unknown")}`;
  statusValue.textContent = status;

  statusRow.append(statusLabel, statusValue);
  details.append(heading, statusRow);

  addDetail(
    details,
    "Loan product",
    productNames[data.product] || "Not available"
  );

  addDetail(
    details,
    "State or jurisdiction",
    stateNames[data.state] || data.state || "Not provided"
  );

  addDetail(
    details,
    "Requested amount",
    formatAmount(data.requestedAmount)
  );

  addDetail(
    details,
    "Purpose of the loan",
    data.purpose || "Not provided"
  );

  addDetail(
    details,
    "Application date",
    formatDate(data.createdAt)
  );

  if (data.decisionReason) {
    addDetail(
      details,
      data.status === "declined"
        ? "Decline reason"
        : "Administrator review note",
      data.decisionReason
    );
  } else if (isFinalDecision || data.status === "in_review") {
    addDetail(
      details,
      data.status === "declined" ? "Decline reason" : "Review note",
      "No note has been provided."
    );
  }

  if (data.reviewedAt) {
    addDetail(details, "Last reviewed", formatDate(data.reviewedAt));
  }

  const disclaimer = document.createElement("p");
  disclaimer.className = "legal-note";

  if (data.status === "approved") {
    disclaimer.textContent =
      "An application marked approved does not by itself confirm that funds have been issued. Refer to official loan documents for any actual offer and its terms.";
  } else if (data.status === "declined") {
    disclaimer.textContent =
      "This application has been declined. Contact the lender through its verified support channel if you need clarification.";
  } else {
    disclaimer.textContent =
      "Application status may change as the application is reviewed. Submission does not guarantee approval or funding.";
  }

  details.appendChild(disclaimer);

  form.before(details);

  // Non-draft records are displayed as details, not as an editable form.
  if (data.status !== "draft") {
    form.hidden = true;
    setFormReadOnly();

    showStatus(
      "Your saved application details are shown below.",
      "info"
    );
  } else {
    showStatus(
      "You can continue editing this draft before submitting it.",
      "info"
    );
  }
}

function readForm() {
  const product = productElement.value;
  const state = stateElement.value;
  const requestedAmount = Number(amountElement.value);
  const purpose = purposeElement.value.trim();

  if (!isAllowedLoanProduct(product)) {
    throw new Error("Please select a valid loan product.");
  }

  if (!isAllowedState(state)) {
    throw new Error("Please select a valid state or jurisdiction.");
  }

  if (
    !Number.isFinite(requestedAmount) ||
    requestedAmount <= 0 ||
    requestedAmount > 10000000
  ) {
    throw new Error("Enter a valid requested amount.");
  }

  if (purpose.length < 10 || purpose.length > 1000) {
    throw new Error(
      "The purpose must be between 10 and 1,000 characters."
    );
  }

  if (!acknowledgementElement.checked) {
    throw new Error("Please confirm the application acknowledgement.");
  }

  return { product, state, requestedAmount, purpose };
}

async function saveApplication(status) {
  if (!currentUser) {
    throw new Error("Please sign in again.");
  }

  if (applicationReadOnly) {
    throw new Error("This application is read-only.");
  }

  const values = readForm();

  if (existingApplicationId) {
    const reference = doc(db, "applications", existingApplicationId);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists() || snapshot.data().ownerUid !== currentUser.uid) {
      throw new Error("This application could not be found.");
    }

    if (snapshot.data().status !== "draft") {
      throw new Error("Only draft applications can be edited.");
    }

    await updateDoc(reference, {
      ...values,
      status,
      updatedAt: serverTimestamp()
    });
  } else {
    const reference = doc(collection(db, "applications"));

    await setDoc(reference, {
      ownerUid: currentUser.uid,
      ...values,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    existingApplicationId = reference.id;

    history.replaceState(
      null,
      "",
      `application.html?id=${encodeURIComponent(reference.id)}`
    );
  }

  return status;
}

async function handleSave(status) {
  if (busy || applicationReadOnly) return;

  setBusy(true);

  try {
    await saveApplication(status);

    if (status === "draft") {
      showStatus("Your draft has been saved.", "success");
    } else {
      showStatus(
        "Your application has been submitted. This does not guarantee approval or funding.",
        "success"
      );

      // Reload the saved record so it switches to the details view.
      await loadApplication(existingApplicationId);
    }
  } catch (error) {
    console.error("Application save failed:", error);

    showStatus(
      error.code === "permission-denied"
        ? "Firebase denied this action. Please check the security rules."
        : error.message || "Unable to save the application.",
      "error"
    );
  } finally {
    setBusy(false);
  }
}

async function loadApplication(id) {
  const snapshot = await getDoc(doc(db, "applications", id));

  if (!snapshot.exists()) {
    throw new Error("This application was not found.");
  }

  const data = snapshot.data();

  if (data.ownerUid !== currentUser.uid) {
    throw new Error("You do not have permission to view this application.");
  }

  existingApplicationId = snapshot.id;

  productElement.value = data.product || "";
  stateElement.value = data.state || "";
  amountElement.value = data.requestedAmount ?? "";
  purposeElement.value = data.purpose || "";

  // Remove any previously rendered details before refreshing the view.
  form.parentElement
    .querySelectorAll(".application-review-details")
    .forEach((element) => element.remove());

  showApplicationDetails(data);
}

async function initializeApplication() {
  if (
    !form ||
    !productElement ||
    !stateElement ||
    !amountElement ||
    !purposeElement ||
    !acknowledgementElement
  ) {
    showStatus("The application form could not be initialized.", "error");
    return;
  }

  populateStates();

  if (draftButton) {
    draftButton.addEventListener("click", () => handleSave("draft"));
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSave("submitted");
  });

  try {
    currentUser = await requireAuth();

    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const applicationId = params.get("id");
    const product = params.get("product");
    const state = params.get("state");

    if (product && isAllowedLoanProduct(product)) {
      productElement.value = product;
    }

    if (state && isAllowedState(state)) {
      stateElement.value = state;
    }

    if (applicationId) {
      await loadApplication(applicationId);
    } else {
      showStatus("Application form is ready.", "info");
    }
  } catch (error) {
    console.error("Application initialization failed:", error);

    showStatus(
      error.code === "permission-denied"
        ? "You cannot access this application with the current account."
        : error.message || "The application page could not initialize.",
      "error"
    );
  }
}

initializeApplication();
