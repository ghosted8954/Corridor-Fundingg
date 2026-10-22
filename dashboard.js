
import { auth, db } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { formatDate } from "./utils.js";
const $ = (id) => document.getElementById(id);

function showDashboardMessage(message) {
  const box = $("dashboardMessage");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}

function displayDate(value) {
  if (!value) return "Date unavailable";
  try {
    return formatDate(value.toDate ? value.toDate() : value);
  } catch {
    return "Date unavailable";
  }
}

function readableStatus(status) {
  return String(status || "pending")
    .replaceAll("-", " ")
    .replaceAll("_", " ");
}

function renderApplication(item) {
const product = String(item.product || "Loan application");
const status = readableStatus(item.status);
const state = String(item.state || "State not provided");
const date = displayDate(item.createdAt);
  const article = document.createElement("article");
  article.className = "dashboard-list-item";

  const details = document.createElement("div");
  const heading = document.createElement("h3");
  heading.textContent = product;
  const description = document.createElement("p");
  description.textContent = `${state} · Created ${date}`;

  details.append(heading, description);

  const badge = document.createElement("span");
  badge.className = "dashboard-status";
  badge.textContent = status;

  article.append(details, badge);
  return article;
}

async function loadDashboard(user) {
  $("customerEmail").textContent = user.email || "Email unavailable";
  $("emailVerificationStatus").textContent =
    user.emailVerified ? "Verified" : "Not verified";

  $("customerName").textContent =
    user.displayName?.trim() || "Customer";

  try {
    const applicationsQuery = query(
      collection(db, "applications"),
      where("ownerUid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const snapshot = await getDocs(applicationsQuery);
    const applications = snapshot.docs.map((item) => item.data());

    $("applicationCount").textContent = String(applications.length);
    $("submittedCount").textContent = String(
      applications.filter((item) => item.status === "submitted").length
    );
    $("draftCount").textContent = String(
      applications.filter((item) => item.status === "draft").length
    );

    const container = $("recentApplications");
    container.replaceChildren();

    if (!applications.length) {
      const message = document.createElement("p");
      message.className = "dashboard-muted";
      message.textContent =
        "You have no applications to display yet. You can start an application when a product is available in your state.";
      container.append(message);
      return;
    }

    applications.slice(0, 5).forEach((item) => {
      container.append(renderApplication(item));
    });
  } catch (error) {
    console.error("Could not load customer applications:", error);
    showDashboardMessage(
      "We could not load your applications right now. Please refresh or contact support."
    );

    $("applicationCount").textContent = "—";
    $("submittedCount").textContent = "—";
    $("draftCount").textContent = "—";

    const container = $("recentApplications");
    if (container) {
      container.replaceChildren();
      const message = document.createElement("p");
      message.className = "dashboard-muted";
      message.textContent = "Application information is temporarily unavailable.";
      container.append(message);
    }
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll("[data-signout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await signOut(auth);
        location.replace("/login.html");
      } catch (error) {
        console.error("Sign-out failed:", error);
        showDashboardMessage("Sign out failed. Please try again.");
        button.disabled = false;
      }
    });
  });

  try {
    const user = await requireAuth({ requireVerifiedEmail: true });
    if (!user) return;

    await loadDashboard(user);
  } catch (error) {
    console.error("Dashboard access check failed:", error);
    showDashboardMessage(
      "We could not verify your account. Please sign in again."
    );
  }
});
