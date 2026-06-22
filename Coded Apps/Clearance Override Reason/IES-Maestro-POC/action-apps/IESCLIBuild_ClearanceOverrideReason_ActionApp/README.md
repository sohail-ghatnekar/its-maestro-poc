# IES Clearance Override Reason Action App

UiPath Coded Action App for the `Clearance Override Reason` human task in the IES Maestro demo. The app uses the Benefits Case Management dashboard visual style and keeps the worker flow intentionally lightweight.

## Contract

Input:
- `caseInfo`: UiPath case record object.

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
