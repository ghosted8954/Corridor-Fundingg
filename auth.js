
import { auth, db, authPersistenceReady } from "./firebase-init.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  signOut,
  reload
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const $ = (selector) => document.querySelector(selector);

function showMessage(message, type = "info") {
  const element = $("#authMessage");
  if (!element) return;

  element.textContent = message;
  element.className = `auth-message ${type}`;
  element.hidden = false;
}

function setBusy(form, busy, label = "Please wait...") {
  const button = form?.querySelector('[type="submit"]');
  if (!button) return;

  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || "Submit";
    button.disabled = false;
  }
}

function friendlyError(error) {
  const messages = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/expired-action-code": "This link has expired. Request a new one.",
    "auth/invalid-action-code": "This link is invalid or has already been used.",
    "auth/weak-password": "Your new password does not meet the requirements."
  };

  return messages[error?.code] ||
    "We could not complete that request. Please try again.";
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeNextPath() {
  const next = new URLSearchParams(location.search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "";
  if (next.includes("\\") || next.includes("\n")) return "";
  return next;
}

function goTo(path) {
  location.assign(path);
}

async function sendVerification(user) {
  const continueUrl = `${location.origin}/verify-email.html`;

  await sendEmailVerification(user, {
    url: continueUrl,
    handleCodeInApp: false
  });
}

async function handleRegistration(form) {
  const displayName = $("#displayName")?.value.trim() || "";
  const email = $("#registerEmail")?.value.trim().toLowerCase() || "";
  const password = $("#registerPassword")?.value || "";
  const confirmPassword = $("#confirmPassword")?.value || "";
  const acceptedTerms = $("#acceptTerms")?.checked === true;

  if (displayName.length < 2 || displayName.length > 100) {
    throw new Error("Enter your name (2–100 characters).");
  }
  if (!validEmail(email)) throw new Error("Enter a valid email address.");
  if (password.length < 8) throw new Error("Use at least 8 characters for your password.");
  if (password !== confirmPassword) throw new Error("Your passwords do not match.");
  if (!acceptedTerms) throw new Error("Please review and accept the terms before registering.");

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  try {
    await setDoc(doc(db, "users", credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName,
      createdAt: serverTimestamp()
    });

    await sendVerification(credential.user);
    goTo("/verify-email.html");
  } catch (error) {
    // Keep the account signed in so the user can retry verification/profile setup.
    console.error("Registration setup needs attention:", error);
    throw new Error(
      "Your account was created, but setup or verification email delivery did not finish. Sign in and contact support if this continues."
    );
  }
}

async function handleLogin(form) {
  const email = $("#loginEmail")?.value.trim().toLowerCase() || "";
  const password = $("#loginPassword")?.value || "";

  if (!validEmail(email) || !password) {
    throw new Error("Enter your email address and password.");
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  await reload(credential.user);

  if (!credential.user.emailVerified) {
    goTo("/verify-email.html");
    return;
  }

  const token = await credential.user.getIdTokenResult(true);
  const role = token.claims.role;

  if (role === "super_admin" || role === "admin") {
    goTo("/admin.html");
  } else {
    goTo(safeNextPath() || "/dashboard.html");
  }
}

async function handleForgotPassword(form) {
  const email = $("#forgotEmail")?.value.trim().toLowerCase() || "";
  if (!validEmail(email)) throw new Error("Enter a valid email address.");

  await sendPasswordResetEmail(auth, email, {
    url: `${location.origin}/reset-password.html`,
    handleCodeInApp: false
  });

  // Use a generic message to reduce account-enumeration leakage.
  showMessage(
    "If an account exists for that email, a password-reset email will be sent.",
    "success"
  );
}

async function handleResetPassword(form) {
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode");
  const code = params.get("oobCode");
  const password = $("#newPassword")?.value || "";
  const confirmPassword = $("#confirmNewPassword")?.value || "";

  if (mode !== "resetPassword" || !code) {
    throw new Error("This reset link is missing information. Open the full link from your email.");
  }
  if (password.length < 8) throw new Error("Use at least 8 characters for your new password.");
  if (password !== confirmPassword) throw new Error("Your passwords do not match.");

  await verifyPasswordResetCode(auth, code);
  await confirmPasswordReset(auth, code, password);

  showMessage("Password updated. You can now sign in with your new password.", "success");
  form.reset();

  const link = $("#resetLoginLink");
  if (link) link.hidden = false;
}

async function handleForm(form, handler, label) {
  await authPersistenceReady;
  setBusy(form, true, label);

  try {
    await handler(form);
  } catch (error) {
    showMessage(
      error?.message && !error?.code ? error.message : friendlyError(error),
      "error"
    );
  } finally {
    setBusy(form, false);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await authPersistenceReady;
  } catch {
    showMessage("Authentication could not initialize. Refresh and try again.", "error");
    return;
  }

  const registerForm = $("#registerForm");
  const loginForm = $("#loginForm");
  const forgotForm = $("#forgotPasswordForm");
  const resetForm = $("#resetPasswordForm");

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleForm(registerForm, handleRegistration, "Creating account...");
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleForm(loginForm, handleLogin, "Signing in...");
  });

  forgotForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleForm(forgotForm, handleForgotPassword, "Sending...");
  });

  resetForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    handleForm(resetForm, handleResetPassword, "Updating password...");
  });

  $("#resendVerification")?.addEventListener("click", async () => {
    const button = $("#resendVerification");
    button.disabled = true;

    try {
      await authPersistenceReady;

      if (!auth.currentUser) {
        showMessage("Sign in first to request another verification email.", "error");
        return;
      }

      await reload(auth.currentUser);
      if (auth.currentUser.emailVerified) {
        showMessage("Your email is already verified.", "success");
      } else {
        await sendVerification(auth.currentUser);
        showMessage("Verification email requested. Check your inbox and spam folder.", "success");
      }
    } catch (error) {
      showMessage(friendlyError(error), "error");
    } finally {
      button.disabled = false;
    }
  });

  $("#checkVerification")?.addEventListener("click", async () => {
    try {
      await authPersistenceReady;

      if (!auth.currentUser) {
        showMessage("Sign in to check your verification status.", "error");
        return;
      }

      await reload(auth.currentUser);

      if (auth.currentUser.emailVerified) {
        goTo("/dashboard.html");
      } else {
        showMessage("Your email is not verified yet. Open the link in your verification email first.", "info");
      }
    } catch (error) {
      showMessage(friendlyError(error), "error");
    }
  });

  document.querySelectorAll("[data-signout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await signOut(auth);
        goTo("/login.html");
      } catch (error) {
        showMessage(friendlyError(error), "error");
      }
    });
  });

  const resetFormElement = $("#resetPasswordForm");
  if (resetFormElement) {
    const params = new URLSearchParams(location.search);
   if (params.get("mode") === "resetPassword" && params.get("oobCode")) {
  try {
    await verifyPasswordResetCode(auth, params.get("oobCode"));
    resetFormElement.hidden = false;
  } catch (error) {
        showMessage(friendlyError(error), "error");
        resetFormElement.hidden = true;
      }
    } else {
      showMessage(
        "Open the password-reset link from your email. If the link does not open this page, configure the Firebase email action handler.",
        "info"
      );
      resetFormElement.hidden = true;
    }
  }
});
