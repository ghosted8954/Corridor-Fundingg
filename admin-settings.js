
import { db } from "./firebase-init.js";
import { requireAdmin } from "./auth-guard.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const form = document.getElementById("siteSettingsForm");
const statusElement = document.getElementById("settingsStatus");

const settingsRef = doc(db, "siteSettings", "public");

function showStatus(message) {
  statusElement.textContent = message;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadSettings() {
  showStatus("Loading website settings...");

  try {
    const snapshot = await getDoc(settingsRef);

    if (snapshot.exists()) {
      const settings = snapshot.data();

      document.getElementById("siteName").value =
        settings.siteName || "Corridor Funding";

      document.getElementById("supportEmail").value =
        settings.supportEmail || "";

      document.getElementById("supportPhone").value =
        settings.supportPhone || "";

      document.getElementById("supportHours").value =
        settings.supportHours || "";

      document.getElementById("announcement").value =
        settings.announcement || "";

      document.getElementById("announcementEnabled").checked =
        settings.announcementEnabled === true;
    }

    showStatus("Settings loaded.");
  } catch (error) {
    console.error("Unable to load settings:", error);
    showStatus(
      "Unable to load settings. Check administrator access and Firestore rules."
    );
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const siteName =
    document.getElementById("siteName").value.trim();

  const supportEmail =
    document.getElementById("supportEmail").value.trim();

  const supportPhone =
    document.getElementById("supportPhone").value.trim();

  const supportHours =
    document.getElementById("supportHours").value.trim();

  const announcement =
    document.getElementById("announcement").value.trim();

  const announcementEnabled =
    document.getElementById("announcementEnabled").checked;

  if (!siteName || siteName.length > 100 ||
      !isValidEmail(supportEmail) ||
      supportPhone.length > 30 ||
      supportHours.length > 200 ||
      announcement.length > 1000) {
    showStatus("Please check the settings and try again.");
    return;
  }

  if (announcementEnabled && !announcement) {
    showStatus("Enter an announcement or turn off the announcement option.");
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  showStatus("Saving settings...");

  try {
    await setDoc(settingsRef, {
      siteName,
      supportEmail,
      supportPhone,
      supportHours,
      announcement,
      announcementEnabled,
      updatedAt: serverTimestamp()
    }, { merge: true });

    showStatus("Website settings saved successfully.");
  } catch (error) {
    console.error("Unable to save settings:", error);
    showStatus(
      "Settings were not saved. Check your administrator permissions and Firestore rules."
    );
  } finally {
    button.disabled = false;
  }
});

requireAdmin({
  onAuthorized: loadSettings,
  onUnauthorized: () => {
    showStatus("Administrator access is required.");
    form.hidden = true;
  }
});
