import type {
  AbleBudgetResult,
  ReviewBudgetResultsInputs,
  ValidationResult
} from "../types/reviewBudgetResultsTypes";

function emptyResult(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: []
  };
}

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

function addError(result: ValidationResult, message: string): void {
  result.valid = false;
  result.errors.push(message);
}

export function hasAbleErrors(ableBudgetResult: AbleBudgetResult): boolean {
  return ableBudgetResult.calculationErrors.length > 0;
}

export function hasAbleWarnings(ableBudgetResult: AbleBudgetResult): boolean {
  return ableBudgetResult.calculationWarnings.length > 0;
}

export function validateSaveDraft(_inputs: ReviewBudgetResultsInputs): ValidationResult {
  return emptyResult();
}

export function validateBudgetReviewed(_inputs: ReviewBudgetResultsInputs): ValidationResult {
  return emptyResult();
}

export function validateBudgetNeedsCorrection(_inputs: ReviewBudgetResultsInputs): ValidationResult {
  return emptyResult();
}

export function validateRequestMoreInformation(_inputs: ReviewBudgetResultsInputs): ValidationResult {
  return emptyResult();
}

export function validateSendToSupervisor(_inputs: ReviewBudgetResultsInputs): ValidationResult {
  return emptyResult();
}

export function canMarkBudgetReviewed(_inputs: ReviewBudgetResultsInputs): boolean {
  return true;
}

export function buildValidationSummary(inputs: ReviewBudgetResultsInputs): ValidationResult {
  const result = emptyResult();
  const { readinessResult, ableBudgetResult, workerReview } = inputs;

  if (!readinessResult.isReadyForBudget) {
    addError(result, "This case is not ready for budget review.");
  }

  if (hasAbleErrors(ableBudgetResult)) {
    addError(result, "The ABLE result contains calculation errors.");
  }

  if (hasAbleWarnings(ableBudgetResult)) {
    result.warnings.push("The ABLE result contains warnings. Review them before proceeding.");
  }

  if (workerReview.correctionNeeded && isBlank(workerReview.correctionReason)) {
    addError(result, "Correction reason is required when Correction needed is checked.");
  }

  if (workerReview.requestMoreInformation && isBlank(workerReview.moreInformationReason)) {
    addError(result, "More information reason is required when Request more information is checked.");
  }

  if (workerReview.sendToSupervisor && isBlank(workerReview.supervisorReason)) {
    addError(result, "Supervisor reason is required when Send to supervisor is checked.");
  }

  if (
    workerReview.budgetReviewed &&
    !workerReview.inputsAppearCorrect &&
    !workerReview.correctionNeeded &&
    !workerReview.requestMoreInformation &&
    !workerReview.sendToSupervisor
  ) {
    result.warnings.push("Inputs appear correct is usually checked when Budget reviewed is checked.");
  }

  return result;
}
