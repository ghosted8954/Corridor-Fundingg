
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("stateForm");
const tableBody = document.getElementById("statesTableBody");
const formStatus = document.getElementById("stateFormStatus");
const listStatus = document.getElementById("stateListStatus");
const refreshButton = document.getElementById("refreshStates");

const stateNames = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut",
  DE: "Delaware", DC: "District of Columbia", FL: "Florida",
  GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming"
};

function showStatus(element, message) {
  if (element) element.textContent = message;
}

function renderStates(states) {
  tableBody.replaceChildren();

  if (!states.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No state settings have been saved.";
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  states.forEach((state) => {
    const row = document.createElement("tr");

    [
      state.id,
      state.name || stateNames[state.id] || "Unknown",
      state.active === true ? "Active" : "Inactive",
      state.complianceNote || "No note"
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
      document.getElementById("stateCode").value = state.id;
      document.getElementById("stateStatus").value =
        state.active === true ? "active" : "inactive";
      document.getElementById("stateNote").value =
        state.complianceNote || "";

      form.scrollIntoView({ behavior: "smooth", block: "start" });
      showStatus(formStatus, "Review the selected state's settings.");
    });

    actionCell.appendChild(button);
    row.appendChild(actionCell);
    tableBody.appendChild(row);
  });
}

async function loadStates() {
  showStatus(listStatus, "Loading state settings...");

  try {
    const snapshot = await getDocs(collection(db, "stateAvailability"));
    const states = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data()
    }));

    states.sort((a, b) =>
      String(a.name || stateNames[a.id] || a.id).localeCompare(
        String(b.name || stateNames[b.id] || b.id)
      )
    );

    renderStates(states);
    showStatus(listStatus, `${states.length} state setting(s) found.`);
  } catch (error) {
    console.error("Unable to load state settings:", error);
    showStatus(
      listStatus,
      "Could not load states. Check your admin access and Firestore rules."
    );
  }
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = document.getElementById("stateCode").value;
  const status = document.getElementById("stateStatus").value;
  const complianceNote =
    document.getElementById("stateNote").value.trim();

  if (!Object.hasOwn(stateNames, code)) {
    showStatus(formStatus, "Select a valid U.S. state or DC.");
    return;
  }

  const active = status === "active";

  if (active && !window.confirm(
    "Have you verified the required lending authorizations, " +
    "product permissions and disclosures for this state? " +
    "Continue only if the verification is complete."
  )) {
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    await setDoc(
      doc(db, "stateAvailability", code),
      {
        name: stateNames[code],
        active,
        complianceNote,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    showStatus(formStatus, "State settings saved.");
    await loadStates();
  } catch (error) {
    console.error("Unable to save state settings:", error);
    showStatus(
      formStatus,
      "Could not save settings. Check your permissions and Firestore rules."
    );
  } finally {
    if (button) button.disabled = false;
  }
});

refreshButton?.addEventListener("click", loadStates);

requireAdmin({
  onAuthorized: loadStates,
  onUnauthorized: () => {
    showStatus(listStatus, "Administrator access is required.");
    if (form) form.hidden = true;
  }
});
