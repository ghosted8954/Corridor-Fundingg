
# Corridor Funding

Corridor Funding is a static HTML, CSS and JavaScript website designed to
use Firebase Authentication and Cloud Firestore.

## Technology

- HTML5
- CSS3
- Vanilla JavaScript modules
- Firebase Authentication
- Cloud Firestore
- GitHub
- Vercel

## Project structure

All project files are stored directly in the project root. Do not move the
files into additional folders unless the code imports are updated accordingly.

## Run locally

1. Install a code editor such as Visual Studio Code.
2. Open the `Corridor Funding` folder.
3. Use a local development server, such as the VS Code Live Server extension.
4. Open `index.html` through the local server.
5. Check the browser console for errors.

Do not rely on opening HTML files directly with `file://`; JavaScript modules
and Firebase may not work correctly that way.

## Firebase setup

1. Open the Firebase Console and select the Corridor Funding project.
2. Confirm that Authentication and Cloud Firestore are configured.
3. Configure authorized domains for local testing and the production domain.
4. Review Authentication providers and email verification settings.
5. Deploy and test Firestore rules and indexes.
6. Assign staff custom claims only through a trusted, authenticated
   administrative process.
7. Test customer and staff permissions using the Firebase Emulator Suite
   before production.

The Firebase web configuration is not a substitute for access control.
Never put service-account credentials or private server keys in frontend files.

## Admin access

An email address alone must never grant administrator privileges.
Use verified custom claims and restrictive Firestore rules. Admin claims
must be assigned through a trusted server-side administrative process.

The intended initial admin account must be explicitly verified and granted
the appropriate claim by an authorized operator. Do not assume the account
has admin permissions merely because its email matches a configured address.

## Deploy to Vercel

1. Save all project files.
2. Test the website locally.
3. Review `.gitignore` and ensure no secrets are included.
4. Upload the project to a private or appropriate GitHub repository.
5. Import the repository into Vercel.
6. Use the project root as the deployment root.
7. Deploy as a static site without a build command.
8. Add the deployed domain to Firebase Authentication's authorized domains.
9. Test authentication, page navigation, Firestore permissions and mobile
   layouts on the deployed website.

## Before production

- Test every page and JavaScript module.
- Test sign-up, email verification, sign-in and password reset.
- Confirm that customers cannot read or modify other customers' records.
- Confirm that only authorized staff can access admin pages and data.
- Harden Firestore rules and test them with the Emulator Suite.
- Verify all state-specific and product-specific legal requirements.
- Replace all legal placeholders with verified information.
- Obtain qualified legal and compliance review.
- Configure secure document handling before accepting identity or financial
  documents.
- Configure trusted server-side workflows for financial records, balance
  changes, audit logs and other privileged actions.
- Verify that support forms actually create tickets and that notifications
  are delivered as represented.
- Test accessibility and responsive layouts.

## Important limitations

A working interface does not prove that a loan product is available,
that a business is licensed, that a customer is approved, or that a payment
has been received. Do not represent any of these outcomes unless they have
been verified through the appropriate real workflow.
