
/**
 * Corridor Funding — frontend security helpers.
 * Never use these helpers as a replacement for Firestore Rules.
 */

export function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(value ?? "").trim()
  );
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function isAllowedState(value) {
  const states = new Set([
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC"
  ]);

  return states.has(String(value ?? "").trim().toUpperCase());
}

export function isAllowedLoanProduct(value) {
  const products = new Set([
    "personal",
    "mortgage",
    "business",
    "debt-consolidation"
  ]);

  return products.has(String(value ?? "").trim().toLowerCase());
}

export function hasRequiredText(value, maxLength = 200) {
  const text = String(value ?? "").trim();
  return text.length > 0 && text.length <= maxLength;
}

/**
 * Client-side role information is only a display hint.
 * Real authorization must be enforced by trusted claims and Firestore Rules.
 */
export function getDisplayRole(user) {
  if (!user) return "signed-out";

  const role = user.getIdTokenResult
    ? null
    : null;

  return role || "authenticated-user";
}

/**
 * Generate a reference for display or draft correlation only.
 * This is not a secure authorization token or a financial transaction ID.
 */
export function createDisplayReference(prefix = "CF") {
  const randomPart = Array.from(
    crypto.getRandomValues(new Uint8Array(8)),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("").toUpperCase();

  return `${prefix}-${randomPart}`;
}
