# Benefits Case Management Click-Through

Local-only React prototype for a benefits case-management dashboard. The UI uses mock data and follows the styling conventions from the referenced Benefits-Claims-App sample: USDA-green header, Tailwind cards, compact case cards, tabs, badges, toasts, drawers, and modal interactions.

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

- Case Inbox as the home page
- Case Detail with all required tabs
- Operations Dashboard
- Testing workbench for SOAP, REST, and SFTP placeholders
- Mock Settings / Role Switcher
- Help Center / Self-Help

## Self-Help / Contextual Guidance

- The global Help button is in the top-right header. It opens the context-aware Help & Guidance drawer.
- The Help drawer changes based on the current screen or case tab and includes worker guidance, role-aware notes, key terms, related actions, and placeholder reference links.
- The Help Center page is available from global navigation and from the Help drawer. It includes frontend-only search, category filters, FAQs, glossary terms, a worker quick-start guide, and a screen-by-screen guide.
- The Testing tab includes static contextual help for editable SOAP, REST, and SFTP command text boxes.
- Demo Coach Mode is toggled in Mock Settings with Show Demo Coach Tips. When enabled, small presenter callouts appear on relevant screens.
- Role-aware help uses the selected local role only. It is not real authentication or authorization.
- Help content is static mock content. Future production self-help could include governed procedure references, policy links, knowledge articles, and role-specific guidance.

## Demo Walkthrough

1. Start the app locally.
2. Open Mock Settings and turn on Show Demo Coach Tips.
3. Return to the Case Inbox home page.
4. Filter to cases needing review.
5. Open MYB-1004 for the Michael Motorist SNAP walkthrough.
6. Review the Summary tab.
7. Open Application.
8. Open Documents and use the Help drawer.
9. Hover the Confidence and Reusable Document tooltips.
10. Review Michael Motorist's paystub and National Grid utility bill.
11. Send the mock request to sohail.ghatnekar@uipath.com from Interview / Missing Info.
12. Simulate applicant response.
13. Simulate replacement upload in Documents if presenting the document loop.
14. Mark the document verified.
15. Open Clearance and resolve a possible match.
16. Open External Validation and review a discrepancy.
17. Open Budget and create a mock budget.
18. Open Forms & Notices and show reason-code help.
19. Generate a notice preview.
20. Open Timeline / Audit and review the Maestro instance flow.
21. Open Operations Dashboard and show dashboard help.
22. Open Testing, open a command text box, run a mock SOAP, REST, or SFTP test, and review the populated mock return.
23. Open Help Center and search "reason code", "document", or "testing."

## What Is Mocked

- Benefits cases, applicants, household members, documents, notices, timelines, validations, budgets, users, roles, counties, regions, and dashboard metrics
- Document extraction and confidence scores
- CIN / SIN matching
- Email, notice, and audit export behavior
- Role switching and disabled-state behavior
- SOAP, REST, and SFTP testing command text boxes and return information
- Contextual help drawer, Help Center search/filter, FAQs, glossary, role-aware guidance, demo coach tips, and placeholder reference links
- Local document previews for MYB-1004 using files in `public/mock-documents`. The mock data checks for a case-associated file first, then falls back to these local files, with UiPath document repository fields left as future scaffolding.

## Not Built Yet

- Real authentication
- Real service integrations
- Real document repository
- Real correspondence
- Real SFTP, REST, or SOAP test execution
- Backend endpoints or live UiPath service calls

## Future Work

- Replace the local role switcher with real authentication.
- Map real users and groups to role-based views.
- Connect document repository and OCR results.
- Connect correspondence generation and delivery.
