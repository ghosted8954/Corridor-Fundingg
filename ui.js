
/**
 * Corridor Funding
 * Shared interface behavior for the public website.
 */

import { getElement, normalizeText } from "./utils.js";

const CorridorUI = {
  setStatus(elementOrId, message, type = "info") {
    const element = typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

    if (!element) return;

    element.textContent = message;
    element.className = `status-message show ${type}`;
    element.setAttribute("role", "status");
    element.setAttribute("aria-live", "polite");
  },

  clearStatus(elementOrId) {
    const element = typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;

    if (!element) return;

    element.textContent = "";
    element.className = "status-message";
  },

  toast(message, type = "info") {
    const container = getElement("#toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className =
      `toast ${type === "success" || type === "error" ? type : ""}`.trim();
    toast.textContent = String(message);
    toast.setAttribute("role", "status");

    container.appendChild(toast);

    window.setTimeout(() => {
      toast.remove();
    }, 4500);
  }
};

window.CorridorUI = CorridorUI;

function setupMobileNavigation() {
  const button =
    getElement("#mobileMenuButton") ||
    getElement("[data-menu-toggle]");

  const navigation =
    getElement("#mainNav") ||
    getElement("[data-site-nav]");

  if (!button || !navigation) return;

  const closeMenu = () => {
    navigation.classList.remove("is-open");
    button.setAttribute("aria-expanded", "false");

    if (button.hasAttribute("aria-label")) {
      button.setAttribute("aria-label", "Open navigation");
    }
  };

  button.addEventListener("click", () => {
    const isOpen = !navigation.classList.contains("is-open");

    navigation.classList.toggle("is-open", isOpen);
    button.setAttribute("aria-expanded", String(isOpen));

    if (button.hasAttribute("aria-label")) {
      button.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    }
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 820) {
      closeMenu();
    }
  });
}

function setupCurrentYear() {
  const yearElement = getElement("#currentYear");

  if (yearElement) {
    yearElement.textContent = String(new Date().getFullYear());
  }
}

function setupQuickStartForm() {
  const form = getElement("#quickStartForm");

  if (!form) return;

  const productInput = getElement("#quickProduct", form);
  const stateInput = getElement("#quickState", form);
  const statusElement = getElement("#quickStartStatus", form);
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener("submit", event => {
    event.preventDefault();
    CorridorUI.clearStatus(statusElement);

    const product = normalizeText(productInput?.value);
    const state = normalizeText(stateInput?.value);

    if (!product || !state) {
      CorridorUI.setStatus(
        statusElement,
        "Please select a financing type and state before continuing.",
        "error"
      );
      return;
    }

    const validProducts = [
      "personal",
      "mortgage",
      "business",
      "debt-consolidation"
    ];

    const validStates = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
      "DC"
    ];

    if (!validProducts.includes(product) || !validStates.includes(state)) {
      CorridorUI.setStatus(
        statusElement,
        "Please select a valid financing type and state.",
        "error"
      );
      return;
    }

    CorridorUI.setStatus(
      statusElement,
      "Your selections are ready. State and product availability must be verified before an application can be submitted.",
      "info"
    );

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Continuing…";
    }

    const query = new URLSearchParams({ product, state });

    window.setTimeout(() => {
      window.location.href = `applications.html?${query.toString()}`;
    }, 900);
  });
}

function initializePublicUI() {
  setupMobileNavigation();
  setupCurrentYear();
  setupQuickStartForm();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePublicUI, {
    once: true
  });
} else {
  initializePublicUI();
}

export { CorridorUI };
