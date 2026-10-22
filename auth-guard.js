
import { auth, authPersistenceReady } from "./firebase-init.js";
import {
  onAuthStateChanged,
  reload
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

function waitForUser() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error("Authentication check timed out."));
    }, 15000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      },
      (error) => {
        clearTimeout(timeout);
        unsubscribe();
        reject(error);
      }
    );
  });
}

export async function requireAuth(options = {}) {
  const {
    requireVerifiedEmail = true,
    redirectTo = "/login.html"
  } = options;

  await authPersistenceReady;
  const user = await waitForUser();

  if (!user) {
    const next = encodeURIComponent(
      location.pathname + location.search
    );
    location.replace(`${redirectTo}?next=${next}`);
    return null;
  }

  await reload(user);

  if (requireVerifiedEmail && !user.emailVerified) {
    location.replace("/verify-email.html");
    return null;
  }

  return user;
}

export async function requireAdmin(options = {}) {
  const user = await requireAuth(options);
  if (!user) return null;

  const token = await user.getIdTokenResult(true);
  const role = token.claims.role;

  if (!["super_admin", "admin"].includes(role)) {
    location.replace("/account-status.html?reason=restricted");
    return null;
  }

  return user;
}

export async function requireStaff(options = {}) {
  const user = await requireAuth(options);
  if (!user) return null;

  const token = await user.getIdTokenResult(true);
  const role = token.claims.role;

  if (!["super_admin", "admin", "loan_officer", "support"].includes(role)) {
    location.replace("/account-status.html?reason=restricted");
    return null;
  }

  return user;
}
