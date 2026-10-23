
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
  if (draftButton) draftButton.disabled = value || applicationReadOnly;
  if (submitButton) submitButton.disabled = value || applicationReadOnly;
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

function setFormReadOnly() {
  applicationReadOnly = true;

  form.querySelectorAll("input, select, textarea").forEach((element) => {
    element.disabled = true;
  });

  if (draftButton) draftButton.disabled = true;
  if (submitButton) submitButton.disabled = true;
}

function showApplicationDetails(data) {
  const statusLabels = {
    draft: "Draft",
    submitted: "Submitted",
    in_review: "In review",
    under_review: "Under review",
    approved: "Approved",
    declined: "Declined",
    withdrawn: "Withdrawn"
  };

  const status = statusLabels[data.status] || "Status unavailable";

  const details = document.createElement("section");
  details.className = "application-review-details";

  const heading = document.createElement("h2");
  heading.textContent = "Application status";
  details.appendChild(heading);

  const statusText = document.createElement("p");
  statusText.textContent = `Current status: ${status}`;
  details.appendChild(statusText);

  if (data.decisionReason) {
    const noteHeading = document.createElement("h3");
    noteHeading.textContent = data.status === "declined"
      ? "Decision or decline reason"
      : "Administrator review note";

    const note = document.createElement("p");
    note.textContent = data.decisionReason;

    details.append(noteHeading, note);
  } else if (["approved", "declined", "in_review"].includes(data.status)) {
    const note = document.createElement("p");
    note.textContent = "No review note has been provided.";
    details.appendChild(note);
  }

  form.before(details);

  if (data.status !== "draft") {
    setFormReadOnly();

    showStatus(
      "This saved application is read-only. Its status and any review note appear above.",
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
    throw new Error("The purpose must be between 10 and 1,000 characters.");
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
  const now = serverTimestamp();

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
      updatedAt: now
    });
  } else {
    const reference = doc(collection(db, "applications"));

    await setDoc(reference, {
      ownerUid: currentUser.uid,
      ...values,
      status,
      createdAt: now,
      updatedAt: now
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
      setFormReadOnly();
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

  showApplicationDetails(data);
}

async function initializeApplication() {
  if (!form || !productElement || !stateElement ||
      !amountElement || !purposeElement || !acknowledgementElement) {
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
