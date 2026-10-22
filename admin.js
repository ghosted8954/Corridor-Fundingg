import { db } from "./firebase-init.js"; import { requireAdmin } from "./auth-guard.js"; import { collection, getCountFromServer, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("adminStatus"); const contentElement = document.getElementById("adminContent");

function showStatus(message, type = "info") { if (!statusElement) return;

statusElement.textContent = message; statusElement.dataset.type = type; statusElement.hidden = false; }

function showCount(id, value) { const element = document.getElementById(id);

if (element) { element.textContent = Number.isFinite(value) ? value.toLocaleString() : "Unavailable"; } }

async function loadAdminSummary() { showStatus("Loading administrative summary...");

try { const [users, applications, submitted, loans] = await Promise.all([ getCountFromServer(collection(db, "users")), getCountFromServer(collection(db, "applications")), getCountFromServer( query( collection(db, "applications"), where("status", "==", "submitted") ) ), getCountFromServer(collection(db, "loans")) ]);

showCount("totalUsers", users.data().count); showCount("totalApplications", applications.data().count); showCount("submittedApplications", submitted.data().count); showCount("totalLoans", loans.data().count); showStatus("Summary loaded from Firebase.", "success"); 

} catch (error) { console.error("Could not load admin summary:", error);

showStatus( "Some figures could not be loaded. Check Firebase permissions and security rules.", "error" ); 

} }

async function initializeAdminDashboard() { if (contentElement) contentElement.hidden = true;

showStatus("Checking administrator access...");

try { const user = await requireAdmin();

if (!user) return; if (contentElement) contentElement.hidden = false; await loadAdminSummary(); 

} catch (error) { console.error("Admin access check failed:", error);

showStatus( "Could not verify administrator access. Please try signing in again.", "error" ); 

} }

initializeAdminDashboard();

