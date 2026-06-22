# Data Contract

The agent accepts three top-level inputs: `caseData`, `documentExtraction`, and `expeditedScreeningResult`.

## Required Inputs

`caseData` is the Case Management/Data Service record. The agent requires `MyBNumber` and `Id`. It also uses optional fields such as `Priority`, `FilingDate`, `CreateTime`, `CurrentStatus`, `CurrentStage`, `MaestroProcessID`, `ApplicantEmail`, `AssignedWorker`, and document file path fields.

`documentExtraction` contains submitted document metadata, confidence values, missing required documents, and insufficient documents. The agent requires `documents` to be an array.

`expeditedScreeningResult` is a plain string with the expedited screening result. Use values such as `NOT_EXPEDITED`, `EXPEDITED_LOW_INCOME_RESOURCE`, or a short human-readable result string.

## Internal Defaults

The caller no longer sends task context, invocation metadata, application extraction, intake rule output, prior interview state, policy config, or audit history.

The agent defaults to:

- SNAP interview generally required.
- Phone interview method.
- Low document confidence threshold of `0.85`.
- Due-soon window of `7` days.
- No known existing interview task or pending applicant response.

## Sample Input

```json
{
  "caseData": {
    "ProofofResidenceFilePath": "Michael_Motorist_National_Grid_Utility_SAMPLE.pdf",
    "LicenseFilePath": "fake-license.jpg",
    "MyBNumber": "MYB-2D8U66GM",
    "CreatedBy": {
      "Type": 0,
      "Email": "sohail.ghatnekar@uipath.com",
      "IsActive": true,
      "CreateTime": "2025-09-04T19:12:57.2233333+00:00",
      "UpdateTime": "2025-09-04T19:12:57.2233333+00:00",
      "Id": "be674e56-2470-4ebd-8fb2-7ea82948b4f8",
      "Name": "Sohail Ghatnekar"
    },
    "MaestroProcessID": "bb935bce-2e74-42fa-96fd-a056e1e1b588@",
    "ApplicantEmail": "sohail.ghatnekar@uipath.com",
    "AssignedWorker": "sohail.ghatnekar@uipath.com",
    "CurrentStatus": 1,
    "Priority": 4,
    "AppFilePath": "Fake_SNAP_App_Completed.pdf",
    "CreateTime": "2026-06-16T19:42:17.3436527+00:00",
    "CurrentStage": 6,
    "FolderID": "0712d628-1391-46d2-859c-d71a6ace28e1",
    "PaystubFilePath": "Michael_Motorist_Pay_Stub_SAMPLE.pdf",
    "FilingDate": "2026-06-16",
    "UpdateTime": "2026-06-16T19:42:17.3436527+00:00",
    "Id": "875db17a-bb69-f111-8fcb-002248a04067"
  },
  "documentExtraction": {
    "documents": [
      {
        "documentId": "DOC-LOW-PAYSTUB",
        "documentType": "Paystub",
        "status": "Low Confidence Review",
        "confidence": 0.74,
        "reusable": false,
        "fileName": "Michael_Motorist_Pay_Stub_SAMPLE.pdf",
        "requiresWorkerReview": true
      }
    ],
    "documentReviewNeeded": true,
    "lowestConfidence": 0.74,
    "missingRequiredDocuments": [],
    "insufficientDocuments": ["Paystub"]
  },
  "expeditedScreeningResult": "NOT_EXPEDITED"
}
```
