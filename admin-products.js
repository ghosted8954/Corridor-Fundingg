
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("productForm");
const tableBody = document.getElementById("productsTableBody");
const formStatus = document.getElementById("productFormStatus");
const listStatus = document.getElementById("productListStatus");
const refreshButton = document.getElementById("refreshProducts");

const allowedProducts = [
  "personal",
  "mortgage",
  "business",
  "debt-consolidation"
];

function showStatus(element, message) {
  if (element) element.textContent = message;
}

function renderProducts(products) {
  tableBody.replaceChildren();

  if (!products.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No products have been configured.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  products.forEach((item) => {
    const row = document.createElement("tr");

    [
      item.id,
      item.name || "Unnamed product",
      item.description || "No description",
      item.active === true ? "Active" : "Inactive"
    ].forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = String(value);
      row.appendChild(cell);
    });

    const actionCell = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.active === true
      ? "Deactivate"
      : "Edit / Activate";

    button.addEventListener("click", () => {
      document.getElementById("productId").value = item.id;
      document.getElementById("productName").value = item.name || "";
      document.getElementById("productDescription").value =
        item.description || "";
      document.getElementById("productActive").checked =
        item.active === true;

      form.scrollIntoView({ behavior: "smooth", block: "start" });

      if (item.active === true) {
        showStatus(
          formStatus,
          "This product is active. Uncheck Active and save to deactivate it."
        );
      } else {
        showStatus(
          formStatus,
          "Review the product details before saving any changes."
        );
      }
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

async function loadProducts() {
  showStatus(listStatus, "Loading products...");

  try {
    const snapshot = await getDocs(collection(db, "loanProducts"));
    const products = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    products.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );

    renderProducts(products);
    showStatus(listStatus, `${products.length} product(s) found.`);
  } catch (error) {
    console.error("Unable to load loan products:", error);
    showStatus(
      listStatus,
      "Could not load products. Check your admin access and Firestore rules."
    );
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("productId").value;
  const name = document.getElementById("productName").value.trim();
  const description =
    document.getElementById("productDescription").value.trim();
  const active = document.getElementById("productActive").checked;

  if (!allowedProducts.includes(id)) {
    showStatus(formStatus, "Select a valid product ID.");
    return;
  }

  if (!name || name.length > 100 || !description ||
      description.length > 1000) {
    showStatus(formStatus, "Enter a valid name and description.");
    return;
  }

  if (active && !window.confirm(
    "Only activate this product after verifying applicable licensing, " +
    "state availability, disclosures and compliance approval. Continue?"
  )) {
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    await setDoc(
      doc(db, "loanProducts", id),
      {
        name,
        description,
        active,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    showStatus(formStatus, "Product saved.");
    await loadProducts();
  } catch (error) {
    console.error("Unable to save product:", error);
    showStatus(
      formStatus,
      "Product could not be saved. Check your permissions and Firestore rules."
    );
  } finally {
    if (button) button.disabled = false;
  }
});

refreshButton?.addEventListener("click", loadProducts);

requireAdmin({
  onAuthorized: loadProducts,
  onUnauthorized: () => {
    showStatus(listStatus, "Administrator access is required.");
    if (form) form.hidden = true;
  }
});
