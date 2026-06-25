# Demo Runbook

## Scenario

Run sample scenario MYB-1004 to demonstrate critical-priority case handling with null document extraction.

## Steps

1. Install dependencies.

```bash
npm install
```

2. Run the sample cases.

```bash
npm run run:sample
```

3. Open `tests/results/MYB-1004.json`.

## Confirmations

- `agentReview.interviewNeeded` is `true`.
- `agentReview.shouldCreateHumanTask` is `true`.
- `agentReview.reasons` includes `SNAP_INTERVIEW_REQUIRED`.
- `agentReview.reasons` does not include document extraction reason codes.
- `agentReview.missingInfoItems` is empty.
- `humanTaskRecommendation` exists.
- The output does not make an eligibility approval or denial decision.

## Expected Use

A downstream UiPath workflow can read `humanTaskRecommendation` and create an Interview and Missing Info human task. This package does not create the task itself.
