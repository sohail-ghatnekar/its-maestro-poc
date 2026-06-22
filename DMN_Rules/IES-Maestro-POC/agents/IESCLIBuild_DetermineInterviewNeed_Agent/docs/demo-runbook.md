# Demo Runbook

## Scenario

Run sample scenario MYB-1004 to demonstrate a low-confidence paystub and fluctuating income.

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
- `agentReview.reasons` includes `DOCUMENT_REVIEW_PAYSTUB_LOW_CONFIDENCE`.
- `agentReview.reasons` includes `INCOME_CONFIRMATION_NEEDED`.
- `agentReview.missingInfoItems` includes a paystub follow-up item.
- `humanTaskRecommendation` exists.
- The output does not make an eligibility approval or denial decision.

## Expected Use

A downstream UiPath workflow can read `humanTaskRecommendation` and create an Interview and Missing Info human task. This package does not create the task itself.
