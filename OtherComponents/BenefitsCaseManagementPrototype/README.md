# Benefits Case Management Click-Through

Local-only React prototype for a benefits case-management dashboard. The UI uses mock data and follows the styling conventions from the referenced Benefits-Claims-App sample: USDA-green header, Tailwind cards, bordered tables, tabs, badges, toasts, and modal interactions.

## Install

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

Open the Vite localhost URL shown in the terminal.

## Test

```bash
npm test
```

The test script runs the production build.

## Screens Added

- Home / Overview
- Case Inbox
- Case Detail with all required tabs
- Operations Dashboard
- Mock Settings / Role Switcher

## Demo Walkthrough

1. Start the app locally.
2. Open the Case Inbox.
3. Filter to cases needing review.
4. Open MYB-1004.
5. Review the Summary tab.
6. Open Application.
7. Open Documents and mark the paystub insufficient.
8. Send the mock request to sohail.ghatnekar@uipath.com from Interview / Missing Info.
9. Simulate applicant response.
10. Simulate replacement upload in Documents.
11. Mark the document verified.
12. Open Clearance and resolve a possible match.
13. Open External Validation and review a discrepancy.
14. Open Budget and create a mock budget.
15. Open Forms & Notices and generate a notice preview.
16. Open Transaction Status and simulate acceptance.
17. Open Timeline / Audit and review the click-through history.
18. Open Operations Dashboard and review county/region bottlenecks.

## What Is Mocked

- Benefits cases, applicants, household members, documents, notices, timelines, validations, budgets, users, roles, counties, regions, and dashboard metrics
- Document extraction and confidence scores
- CIN / SIN matching
- Email, notice, transaction, and audit export behavior
- Role switching and disabled-state behavior

## Not Built Yet

- Real authentication
- Real service integrations
- Real document repository
- Real correspondence
- Real transaction submission
- Backend endpoints or live UiPath service calls

## Future Work

- Replace the local role switcher with real authentication.
- Map real users and groups to role-based views.
- Connect document repository and OCR results.
- Connect correspondence generation and delivery.
- Connect transaction submission and status polling.
