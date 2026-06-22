import type {
  ExternalValidationInputs,
  ValidationErrors,
  ValidationResults,
  WorkerResolution
} from "../types/externalValidationTypes";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function hasAnyDiscrepancy(validationResults: ValidationResults): boolean {
  return (
    validationResults.uibDol.discrepancyFound ||
    validationResults.taxRecords.discrepancyFound ||
    validationResults.paystubComparison.discrepancyFound
  );
}

export function allSourcesReviewed(workerResolution: WorkerResolution): boolean {
  return (
    workerResolution.uibDolReviewed &&
    workerResolution.taxReviewed &&
    workerResolution.paystubComparisonReviewed
  );
}

export function validateExternalValidationResolution(_inputs: ExternalValidationInputs): ValidationErrors {
  return {};
}


export function canCompleteValidation(_inputs: ExternalValidationInputs): boolean {
  return true;
}

export function canRequestApplicantFollowUp(_inputs: ExternalValidationInputs): boolean {
  return true;
}

export function canSendToSupervisor(_inputs: ExternalValidationInputs): boolean {
  return true;
}

export function canReturnForMoreInformation(_inputs: ExternalValidationInputs): boolean {
  return true;
}
