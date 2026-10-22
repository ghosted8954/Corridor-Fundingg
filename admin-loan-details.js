import { db } from "./firebase-init.js"; import { requireAdmin } from "./auth-guard.js"; import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const statusElement = document.getElementById("loanDetailsStatus"); const contentElement = document.getElementById("loanDetailsContent"); const detailsElement = document.getElementById("loanDetailsList");

function showStatus(message) { if (statusElement) { statusElement.textContent = message; statusElement.hidden = false; } }

function formatValue(value) { if (value === null || value === undefined || value === "") { return "Not provided"; }

if (value && typeof value.toDate === "function") { return value.toDate().toLocaleString(); }

if (typeof value === "object") { return JSON.stringify(value, null, 2); }

return String(value); }

function renderLoanDetails(loan, loanId) { if (!detailsElement) { showStatus("The loan details list was not found in the HTML."); return; }

detailsElement.replaceChildren();

const fields = [ ["Applicant Name", loan.fullName || loan.name], ["Email", loan.email], ["Phone", loan.phone], ["Loan Type", loan.loanType || loan.type], ["Loan Amount", loan.loanAmount ?? loan.amount], ["Loan Term", loan.loanTerm || loan.term], ["Purpose", loan.purpose], ["Status", loan.status], ["Application Date", loan.createdAt], ["Application ID", loanId] ];

for (const [label, value] of fields) { const item = document.createElement("div"); const heading = document.createElement("strong"); const text = document.createElement("p");

heading.textContent = label; text.textContent = formatValue(value); item.append(heading, text); detailsElement.appendChild(item); 

}

if (contentElement) { contentElement.hidden = false; }

if (statusElement) { statusElement.hidden = true; } }

async function loadLoan() { const loanId = new URLSearchParams(location.search).get("id");

if (!loanId) { showStatus("No loan application ID was provided in the page URL."); return; }

showStatus("Loading loan application...");

try { const loanRef = doc(db, "loans", loanId); const loanSnapshot = await getDoc(loanRef);

if (!loanSnapshot.exists()) { showStatus("This loan application could not be found."); return; } renderLoanDetails(loanSnapshot.data(), loanId); 

} catch (error) { console.error("Error loading loan details:", error);

showStatus( error.code === "permission-denied" ? "Access denied. Please check your Firestore security rules." : "Unable to load loan details. Please check your connection and try again." ); 

} }

async function initializePage() { if (!statusElement || !detailsElement) { console.error( "Missing required HTML elements: loanDetailsStatus or loanDetailsList." ); return; }

if (contentElement) { contentElement.hidden = true; }

try { const user = await requireAdmin();

if (!user) return; await loadLoan(); 

} catch (error) { console.error("Admin verification failed:", error); showStatus("We could not verify your administrator access. Please try again."); } }

initializePage();

