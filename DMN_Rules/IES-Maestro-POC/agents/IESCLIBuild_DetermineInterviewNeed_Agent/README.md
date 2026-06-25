# Determine Interview Need Agent

Parent solution: IES - Maestro POC

Project name: DetermineInterviewNeed_Agent

## Purpose

This deterministic UiPath coded agent reviews SNAP case data and returns an advisory JSON decision about whether an Interview and Missing Info human task should be created.

The agent is advisory only. It does not approve benefits, deny benefits, or replace worker review.

## Input Contract

Top-level inputs:

- `caseData`: Case Management/Data Service case record, including `MyBNumber`, `Id`, file path fields, worker assignment, stage/status, priority, and filing metadata.
- `documentExtraction`: Optional/null document extraction data. It may be omitted and is ignored for this review for now.
- `expeditedScreeningResult`: Plain text expedited screening result, such as `NOT_EXPEDITED` or `EXPEDITED_LOW_INCOME_RESOURCE`.

See [docs/data-contract.md](docs/data-contract.md) for sample JSON.

## Output Contract

Top-level outputs:

- `caseInfo`
- `invocationInfo`
- `agentReview`
- `humanTaskRecommendation`
- `statusUpdate`
- `auditEvent`
- `errors`

`humanTaskRecommendation` is populated only when the advisory review recommends creating an Interview and Missing Info human task.

## Local Run Instructions

```bash
npm install
npm test
```

`npm test` prints compact JSON for the sample scenarios and writes result files under `tests/results`.

## Out of Scope

See [docs/out-of-scope.md](docs/out-of-scope.md).
