
import { auth, db } from "./firebase-init.js";
import { requireAuth } from "./auth-guard.js";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("documentForm");
const tableBody = document.getElementById("documentsTableBody");
const formStatus = document.getElementById("documentFormStatus");
const listStatus = document.getElementById("documentListStatus");

const allowedTypes = [
  "proof-of-income",
  "proof-of-address",
  "identity-document",
  "bank-statement",
  "business-document",
  "other"
];

function setStatus(element, message) {
  element.textContent = message;
}

function displayDate(value) {
  if (!value) return "—";

  if (typeof value.toDate === "function") {
    return value.toDate().toLocaleDateString();
  }

  return "—";
}

async function loadDocuments() {
  const user = auth.currentUser;
  if (!user) return;

  setStatus(listStatus, "Loading your document records...");

  try {
    const recordsQuery = query(
      collection(db, "documents"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(recordsQuery);
    tableBody.replaceChildren();

    if (snapshot.empty) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 5;
      cell.textContent = "You have no document records yet.";
      row.appendChild(cell);
      tableBody.appendChild(row);
      setStatus(listStatus, "No records found.");
      return;
    }

    snapshot.forEach((documentSnapshot) => {
      const record = documentSnapshot.data();
      const row = document.createElement("tr");

      [
        record.documentName || record.fileName || "Document",
        record.applicationId || "—",
        record.documentType || record.type || "—",
        record.status || "pending",
        displayDate(record.createdAt)
      ].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
      });

      tableBody.appendChild(row);
    });

    setStatus(listStatus, `${snapshot.size} record(s) loaded.`);
  } catch (error) {
    console.error("Could not load document records:", error);
    setStatus(
      listStatus,
      "Unable to load records. Check Firestore permissions and indexes."
    );
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const user = auth.currentUser;
  if (!user) {
    setStatus(formStatus, "Please sign in before creating a record.");
    return;
  }

  const applicationId =
    document.getElementById("applicationId").value.trim();

  const documentType =
    document.getElementById("documentType").value;

  const documentName =
    document.getElementById("documentName").value.trim();

  const notes =
    document.getElementById("documentNotes").value.trim();

  if (!applicationId || applicationId.length > 100 ||
      !allowedTypes.includes(documentType) ||
      !documentName || documentName.length > 120 ||
      notes.length > 500) {
    setStatus(formStatus, "Please check the fields and try again.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    // Verify the application belongs to the signed-in customer.
    const { getDoc, doc } = await import(
      "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js"
    );

    const applicationSnapshot = await getDoc(
      doc(db, "applications", applicationId)
    );

    if (!applicationSnapshot.exists() ||
        applicationSnapshot.data().ownerUid !== user.uid) {
      setStatus(
        formStatus,
        "Application not found or it does not belong to your account."
      );
      return;
    }

    await addDoc(collection(db, "documents"), {
      ownerUid: user.uid,
      applicationId,
      documentType,
      documentName,
      notes,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    form.reset();
    setStatus(
      formStatus,
      "Document record created. No file was uploaded."
    );

    await loadDocuments();
  } catch (error) {
    console.error("Could not create document record:", error);
    setStatus(
      formStatus,
      "Unable to create the record. Check your account permissions and Firestore rules."
    );
  } finally {
    submitButton.disabled = false;
  }
});

document.getElementById("refreshDocuments")
  .addEventListener("click", loadDocuments);

requireAuth({
  onAuthorized: loadDocuments,
  onUnauthorized: () => {
    setStatus(listStatus, "Please sign in to view your documents.");
    form.hidden = true;
  }
});
