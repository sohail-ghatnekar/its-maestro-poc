# IES Final Case Worker Review Action App

UiPath Coded Action App for the `Final Case Worker Review` human task in the IES Maestro demo. The app uses the Benefits Case Management dashboard visual style and keeps the worker flow intentionally lightweight.

## Contract

Input:
- `caseInfo`: UiPath case record object.
- `supervisorFlag`: boolean. When true, the app renders the compact supervisor review.
- `previousWorkerDecision`: optional prior worker decision string for supervisor review.
- `previousWorkerNotes`: optional prior worker notes string for supervisor review.

Outputs:
- `caseInfo`: normalized case record returned with the decision.
- `decision`: submitted outcome/action.
- `workerNotes`: optional worker notes.

No document payloads are embedded in the task contract.

## Validate

```bash
npm test
npm run build
```
