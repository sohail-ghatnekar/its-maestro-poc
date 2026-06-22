# IESCLIBuild DMN Rules

This folder contains the two DMN decision tables needed for the first intake decision layer of the NY SNAP / IES CLI demo.

## Files

1. `IESCLIBuild_Intake_Rules.dmn`
   - Validates whether the submitted SNAP application can be accepted for filing and routed forward.
   - Designed to run after the lightweight API kickoff and document extraction produce basic booleans such as `namePresent`, `signaturePresent`, `addressPresent`, and `documentAvailable`.

2. `IESCLIBuild_Expedited_Screening.dmn`
   - Determines whether the case qualifies for expedited SNAP processing and assigns the demo SLA/priority.
   - Designed to run after intake filing is accepted and the extracted financial/resource/shelter fields are available.

## Important design choice

The external API kickoff is intentionally lightweight. It only needs the MyB number, applicant name, email, county, filing/due dates, and a pointer to the uploaded application document. The uploaded application PDF/document extraction should populate the boolean and numeric inputs consumed by these DMNs.

## Intake Rules inputs

```json
{
  "documentAvailable": true,
  "myBNumberPresent": true,
  "namePresent": true,
  "addressPresent": true,
  "noFixedAddressFlag": false,
  "signaturePresent": true,
  "signatureDatePresent": true,
  "countyKnown": true,
  "snapProgramSelected": true,
  "applicantEmailPresent": true
}
```

## Intake Rules outputs

```json
{
  "intakeDecision": "FILING_ACCEPTED",
  "filingAccepted": true,
  "missingInfoFlag": false,
  "nextStage": "Expedited Screening",
  "recommendedAction": "Proceed to same-day expedited screening.",
  "reasonCode": "INTAKE_COMPLETE",
  "policyRef": "SNAPSB Section 4 Application Filing"
}
```

## Expedited Screening inputs

```json
{
  "filingAccepted": true,
  "expeditedInputsComplete": true,
  "priorExpeditedVerificationOutstanding": false,
  "destituteMigrantSeasonalFarmworker": false,
  "grossMonthlyIncome": 2200,
  "liquidResources": 2412.17,
  "homelessHousehold": false,
  "shelterAndUtilityCosts": 1250
}
```

## Expedited Screening outputs

```json
{
  "expeditedDecision": "NOT_EXPEDITED",
  "expeditedFlag": false,
  "slaDays": 30,
  "priority": "Normal",
  "nextStage": "Documents",
  "recommendedAction": "Continue standard SNAP processing.",
  "reasonCode": "EXPEDITED_CRITERIA_NOT_MET",
  "policyRef": "SNAPSB Normal Processing Standard"
}
```

## Notes

- These DMNs are intentionally narrow and POC-sized.
- They do not calculate benefits.
- They do not replace worker review.
- They do not contain full NY SNAP policy logic.
- They are meant to drive the first Maestro/automation gateway decisions: filing accepted vs. missing information, and expedited vs. standard processing.
