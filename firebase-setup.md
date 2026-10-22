
# Corridor Funding — Firebase Setup

## 1. Firebase project

Project ID: `corridorfunding-62580`

Use the existing Firebase project. Do not create a second project unless intentionally migrating.

## 2. Enable Authentication

In Firebase Console:

1. Open Authentication.
2. Open Sign-in method.
3. Enable Email/Password.
4. Enable email verification in the authentication flow.
5. Configure the authorized domains for your local development and production website.
6. Enable Google sign-in only if it is required and fully configured.

The application must not treat an unverified email as a fully verified customer account.

## 3. Enable Cloud Firestore

1. Open Firestore Database.
2. Create or select the database for the project.
3. Use the correct production region for your operational and compliance requirements.
4. Keep the database in production mode.
5. Deploy `firestore.rules` after testing.
6. Deploy `firestore.indexes.json`.

Do not leave permissive test rules enabled in production.

## 4. Deploy Firestore rules and indexes

Using the Firebase CLI in a separate local setup environment:

1. Install the Firebase CLI.
2. Sign in to the correct Firebase account.
3. Select the `corridorfunding-62580` project.
4. Initialize or configure Firestore for this project.
5. Place the rules and index files at the paths expected by the Firebase CLI configuration.
6. Test the rules with the Firebase Emulator Suite.
7. Deploy the verified rules and indexes.

The website source files can remain together in the `Corridor Funding` folder. The Firebase CLI may require its own local tooling configuration to deploy these resources.

## 5. Authentication security

- Require email verification before allowing sensitive customer actions.
- Provide password reset and sign-out features.
- Never put passwords, private keys, service-account credentials, or privileged secrets in browser JavaScript.
- Use the Firebase Authentication SDK for sign-in and account management.
- Re-check authorization on protected operations.

## 6. Admin roles

The initial intended administrator email is:

`gardenk8954@gmail.com`

This email is NOT automatically an administrator.

A trusted administrator must verify the account and assign the appropriate Firebase custom claim using a secure, server-side Firebase Admin SDK process.

Example role claim:

`{ "role": "super_admin" }`

Never assign this claim from a public webpage or client-side JavaScript. Never let a customer change their own role.

The admin pages must check the signed-in user's token claims for display and navigation. Firestore Rules must independently enforce the same access restrictions.

## 7. State and product activation

All 50 U.S. states and Washington, D.C. may be represented in the site.

However, a state or loan product must remain inactive until its actual availability, licensing requirements, disclosures, and operational readiness have been verified.

Do not invent license numbers, NMLS identifiers, approval statistics, rates, or funding promises.

## 8. Financial data

Customers must not be able to edit balances, transaction records, loan decisions, or funding status from the browser.

Financial changes must use trusted server-side processing, authorization, validation, and audit logging. Never treat a client-generated reference number as proof of payment or funding.

## 9. Documents

Firestore metadata is not secure file storage. Do not store identity documents, bank statements, or large Base64 files in ordinary Firestore records.

Choose and configure an appropriate secure document-storage solution before enabling document uploads.

## 10. Testing checklist

- A signed-out visitor cannot access private customer records.
- A customer cannot read another customer's application.
- A customer cannot change their role or balance.
- A customer cannot approve their own loan.
- A customer cannot create financial transactions.
- An unprivileged account cannot access admin operations.
- Unverified accounts cannot perform restricted actions.
- Inactive state and product entries are not presented as available.
- Firestore rules and indexes deploy successfully.
- Authentication and authorization are tested on mobile and desktop.

## 11. Production readiness

Before launching Corridor Funding, arrange appropriate legal and compliance review for the products and states served, including applicable federal and state lending laws, licensing, privacy, security, advertising, electronic consent, and disclosure requirements.
