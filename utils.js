
/**
 * Corridor Funding
 * Shared utility functions.
 * This module does not initialize Firebase.
 */

export function formatCurrency(value, currency = "USD") {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(value, options = {}) {
  if (!value) return "—";

  let date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value?.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options
  }).format(date);
}

export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function isValidEmail(value) {
  const email = normalizeText(value);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isPositiveNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0;
}

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function escapeHTML(value) {
  const replacements = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, character => {
    return replacements[character];
  });
}

export function debounce(callback, delay = 250) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export function getElement(selector, root = document) {
  return root.querySelector(selector);
}

export function getElements(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

export function setElementText(element, value) {
  if (!element) return;

  // textContent prevents a string from being interpreted as HTML.
  element.textContent = String(value ?? "");
}

export function createReference(prefix = "CF") {
  const randomPart = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    byte => byte.toString(16).padStart(2, "0")
  ).join("");

  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomPart.toUpperCase()}`;
}
