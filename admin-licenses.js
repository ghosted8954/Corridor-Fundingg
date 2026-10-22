
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("licenseForm");
const tableBody = document.getElementById("licensesTableBody");
const formStatus = document.getElementById("licenseFormStatus");
const listStatus = document.getElementById("licenseListStatus");

const jurisdictions = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC",
  "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY",
  "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH",
  "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT",
  "VT", "VA", "WA", "WV", "WI", "WY"
]);

const licenseStatuses = [
  "unverified",
  "under-review",
  "verified",
  "expired",
  "not-applicable"
];

function statusMessage(element, message) {
  if (element) element.textContent = message;
}

function validId(value) {
  return /^[a-zA-Z0-9_-]{3,80}$/.test(value);
}

function renderLicenses(records) {
  tableBody.replaceChildren();

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 7;
    cell.textContent = "No licensing records found.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  records.forEach((record) => {
    const row = document.createElement("tr");

    [
      record.id,
      record.state || "",
      record.licenseType || "",
      record.licenseNumber || "Not provided",
      record.status || "unverified",
      record.expiryDate || "Not specified"
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Edit";

    button.addEventListener("click", () => {
      document.getElementById("licenseId").value = record.id;
      document.getElementById("licenseState").value = record.state || "";
      document.getElementById("licenseType").value =
        record.licenseType || "";
      document.getElementById("licenseNumber").value =
        record.licenseNumber || "";
      document.getElementById("licenseStatus").value =
        record.status || "unverified";
      document.getElementById("licenseExpiry").value =
        record.expiryDate || "";
      document.getElementById("licenseNotes").value =
        record.notes || "";

      form.scrollIntoView({ behavior: "smooth", block: "start" });
      statusMessage(formStatus, "Review this record before saving changes.");
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

async function loadLicenses() {
  statusMessage(listStatus, "Loading licensing records...");

  try {
    const snapshot = await getDocs(collection(db, "licensingRecords"));
    const records = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    records.sort((a, b) =>
      String(a.state || "").localeCompare(String(b.state || ""))
    );

    renderLicenses(records);
    statusMessage(listStatus, `${records.length} record(s) loaded.`);
  } catch (error) {
    console.error("Unable to load licensing records:", error);
    statusMessage(
      listStatus,
      "Could not load records. Check administrator access and Firestore rules."
    );
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("licenseId").value.trim();
  const state = document.getElementById("licenseState").value;
  const licenseType = document.getElementById("licenseType").value.trim();
  const licenseNumber =
    document.getElementById("licenseNumber").value.trim();
  const status = document.getElementById("licenseStatus").value;
  const expiryDate = document.getElementById("licenseExpiry").value;
  const notes = document.getElementById("licenseNotes").value.trim();

  if (!validId(id) || !jurisdictions.has(state) ||
      !licenseType || licenseType.length > 150 ||
      licenseNumber.length > 150 || notes.length > 2000 ||
      !licenseStatuses.includes(status)) {
    statusMessage(formStatus, "Please check all fields and try again.");
    return;
  }

  if (status === "verified" && !window.confirm(
    "Confirm that an authorized reviewer has checked the official " +
    "licensing evidence and recorded the correct jurisdiction and product."
  )) {
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    await setDoc(
      doc(db, "licensingRecords", id),
      {
        state,
        licenseType,
        licenseNumber,
        status,
        expiryDate,
        notes,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    statusMessage(formStatus, "Licensing record saved.");
    await loadLicenses();
  } catch (error) {
    console.error("Unable to save licensing record:", error);
    statusMessage(
      formStatus,
      "Could not save the record. Check your permissions and Firestore rules."
    );
  } finally {
    if (button) button.disabled = false;
  }
});

document.getElementById("refreshLicenses")
  ?.addEventListener("click", loadLicenses);

requireAdmin({
  onAuthorized: loadLicenses,
  onUnauthorized: () => {
    statusMessage(listStatus, "Administrator access is required.");
    if (form) form.hidden = true;
  }
});
