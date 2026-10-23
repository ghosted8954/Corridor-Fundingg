
import { auth, db } from "./firebase-init.js";
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
  ["CT", "Connecticut"], ["DE", "Delaware"],
  ["DC", "District of Columbia"], ["FL", "Florida"],
  ["GA", "Georgia"], ["HI", "Hawaii"], ["ID", "Idaho"],
  ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"],
  ["ME", "Maine"], ["MD", "Maryland"], ["MA", "Massachusetts"],
  ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"],
  ["MO", "Missouri"], ["MT", "Montana"], ["NE", "Nebraska"],
  ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"],
  ["ND", "North Dakota"], ["OH", "Ohio"], ["OK", "Oklahoma"],
  ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"],
  ["SC", "South Carolina"], ["SD", "South Dakota"],
  ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"],
  ["VT", "Vermont"], ["VA", "Virginia"], ["WA", "Washington"],
  ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"]
];

let currentUser = null;
let existingApplicationId = null;
let busy = false;

function showStatus(message, type = "info") {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.dataset.type = type;
  statusElement.hidden = false;
}

function setBusy(value) {
  busy = value;
  if (draftButton) draftButton.disabled = value;
  if (submitButton) submitButton.disabled = value;
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
    throw new Error("Your sign-in could not be confirmed. Please sign in again.");
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
  if (busy) return;

  setBusy(true);

  try {
    await saveApplication(status);

    if (status === "draft") {
      showStatus("Your draft has been saved.", "success");
    } else {
      showStatus(
        "Your application has been submitted. This is not an approval or guarantee of funding.",
        "success"
      );

      form.querySelectorAll("input, select, textarea, button")
        .forEach((element) => {
          element.disabled = true;
        });
    }
  } catch (error) {
    console.error("Application save failed:", error);
    showStatus(
      error.code === "permission-denied"
        ? "Permission denied by Firestore. Please report this message so we can check the rules."
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

  if (data.status !== "draft") {
    form.querySelectorAll("input, select, textarea, button")
      .forEach((element) => {
        element.disabled = true;
      });

    showStatus(
      `This application is ${data.status || "not editable"} and cannot be edited here.`
    );
  }
}

async function initializeApplication() {
  populateStates();

  if (draftButton) {
    draftButton.addEventListener("click", () => handleSave("draft"));
  }

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      handleSave("submitted");
    });
  }

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
    }

    showStatus("Application form is ready.", "info");
  } catch (error) {
    console.error("Application initialization failed:", error);
    showStatus(
      "The application page could not initialize. Refresh the page or sign in again.",
      "error"
    );
  }
}

initializeApplication();
