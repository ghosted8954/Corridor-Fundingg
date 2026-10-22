
import { auth } from "./firebase-init.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";
import { loadUserProfile, saveUserProfile } from "./user.js";
import { isAllowedState } from "./security.js";

const $ = (id) => document.getElementById(id);

function showProfileMessage(message, type = "info") {
  const element = $("profileMessage");
  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;
  element.hidden = false;
}

function valueOf(id) {
  return $(id)?.value.trim() || "";
}

function setFormValues(profile, user) {
  $("profileName").value = profile.displayName || user.displayName || "";
  $("profileEmail").value = user.email || "";
  $("profilePhone").value = profile.phone || "";
  $("profileAddress").value = profile.address || "";
  $("profileCity").value = profile.city || "";
  $("profileState").value = profile.state || "";
  $("profilePostalCode").value = profile.postalCode || "";
}

document.addEventListener("DOMContentLoaded", async () => {
  const form = $("profileForm");

  document.querySelectorAll("[data-signout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await signOut(auth);
        location.replace("/login.html");
      } catch (error) {
        console.error("Sign-out failed:", error);
        showProfileMessage("Could not sign out. Please try again.", "error");
        button.disabled = false;
      }
    });
  });

  try {
    const user = await requireAuth({ requireVerifiedEmail: true });
    if (!user) return;

    const profile = await loadUserProfile(user.uid);
    setFormValues(profile, user);
    form.hidden = false;
  } catch (error) {
    console.error("Could not load profile:", error);
    showProfileMessage(
      "We could not load your profile. Please refresh or contact support.",
      "error"
    );
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = valueOf("profileName");
    const state = valueOf("profileState");

    if (displayName.length < 2 || displayName.length > 100) {
      showProfileMessage("Enter a name between 2 and 100 characters.", "error");
      return;
    }

    if (state && !isAllowedState(state)) {
      showProfileMessage("Choose a valid state or district.", "error");
      return;
    }

    const saveButton = form.querySelector('[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      await saveUserProfile(auth.currentUser.uid, {
        displayName,
        phone: valueOf("profilePhone"),
        address: valueOf("profileAddress"),
        city: valueOf("profileCity"),
        state,
        postalCode: valueOf("profilePostalCode")
      });

      showProfileMessage("Your profile has been updated.", "success");
    } catch (error) {
      console.error("Could not save profile:", error);
      showProfileMessage(
        "We could not save your changes. Please try again.",
        "error"
      );
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save changes";
    }
  });
});
