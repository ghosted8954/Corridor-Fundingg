
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("disclosureForm");
const tableBody = document.getElementById("disclosuresTableBody");
const formStatus = document.getElementById("disclosureFormStatus");
const listStatus = document.getElementById("disclosureListStatus");

const categories = [
  "general", "personal", "mortgage", "business",
  "state", "privacy", "electronic-consent"
];

const statuses = [
  "draft", "pending-review", "approved", "archived"
];

function statusMessage(element, message) {
  if (element) element.textContent = message;
}

function validId(value) {
  return /^[a-zA-Z0-9_-]{3,80}$/.test(value);
}

function renderRows(records) {
  tableBody.replaceChildren();

  if (!records.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = "No disclosure records found.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  for (const record of records) {
    const row = document.createElement("tr");

    [
      record.id,
      record.title || "Untitled",
      record.category || "Uncategorized",
      record.status || "draft",
      record.published === true ? "Yes" : "No"
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";

    editButton.addEventListener("click", () => {
      document.getElementById("disclosureId").value = record.id;
      document.getElementById("disclosureTitle").value =
        record.title || "";
      document.getElementById("disclosureCategory").value =
        record.category || "";
      document.getElementById("disclosureContent").value =
        record.content || "";
      document.getElementById("disclosureStatus").value =
        record.status || "draft";
      document.getElementById("disclosurePublished").checked =
        record.published === true;

      form.scrollIntoView({ behavior: "smooth", block: "start" });
      statusMessage(formStatus, "Review the record before saving.");
    });

    actionCell.appendChild(editButton);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  }
}

async function loadDisclosures() {
  statusMessage(listStatus, "Loading disclosure records...");

  try {
    const snapshot = await getDocs(collection(db, "disclosures"));
    const records = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    records.sort((a, b) =>
      String(a.title || "").localeCompare(String(b.title || ""))
    );

    renderRows(records);
    statusMessage(listStatus, `${records.length} record(s) loaded.`);
  } catch (error) {
    console.error("Disclosure loading failed:", error);
    statusMessage(
      listStatus,
      "Unable to load records. Check administrator access and Firestore rules."
    );
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("disclosureId").value.trim();
  const title = document.getElementById("disclosureTitle").value.trim();
  const category = document.getElementById("disclosureCategory").value;
  const content =
    document.getElementById("disclosureContent").value.trim();
  const status = document.getElementById("disclosureStatus").value;
  const published =
    document.getElementById("disclosurePublished").checked;

  if (!validId(id)) {
    statusMessage(
      formStatus,
      "Use 3–80 letters, numbers, underscores or hyphens for the ID."
    );
    return;
  }

  if (!title || title.length > 150 || !content ||
      content.length > 15000 || !categories.includes(category) ||
      !statuses.includes(status)) {
    statusMessage(formStatus, "Check the disclosure fields and try again.");
    return;
  }

  if (published && status !== "approved") {
    statusMessage(
      formStatus,
      "A disclosure must have approved status before it can be marked published."
    );
    return;
  }

  if (published && !window.confirm(
    "Confirm that this disclosure has received the required legal and " +
    "compliance approval and is authorized for publication."
  )) {
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    await setDoc(
      doc(db, "disclosures", id),
      {
        title,
        category,
        content,
        status,
        published,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    statusMessage(formStatus, "Disclosure record saved.");
    await loadDisclosures();
  } catch (error) {
    console.error("Disclosure save failed:", error);
    statusMessage(
      formStatus,
      "Could not save. Check your permissions and Firestore rules."
    );
  } finally {
    if (button) button.disabled = false;
  }
});

document.getElementById("refreshDisclosures")
  ?.addEventListener("click", loadDisclosures);

requireAdmin({
  onAuthorized: loadDisclosures,
  onUnauthorized: () => {
    statusMessage(listStatus, "Administrator access is required.");
    if (form) form.hidden = true;
  }
});
