import type {
  InterviewMissingInfoInputs,
  MissingInfo,
  MissingInfoItem,
  ValidationResult,
  ValidationSummary,
} from '../types/interviewMissingInfoTypes';

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function success(): ValidationResult {
  return { valid: true, errors: [] };
}

function result(errors: string[]): ValidationResult {
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getUnresolvedRequiredItems(missingInfo: MissingInfo): MissingInfoItem[] {
  return missingInfo.missingItems.filter((item) => item.required && !item.resolved);
}

export function getSelectedUnresolvedMissingItems(inputs: InterviewMissingInfoInputs): MissingInfoItem[] {
  const selectedIds = new Set(inputs.workerResponse.selectedMissingItemIds);

  return inputs.missingInfo.missingItems.filter((item) => selectedIds.has(item.itemId) && !item.resolved);
}

export function validateSaveDraft(_inputs: InterviewMissingInfoInputs): ValidationResult {
  return success();
}

export function validateCompleteInterview(_inputs: InterviewMissingInfoInputs): ValidationResult {
  return success();
}

export function validateRequestMissingInformation(_inputs: InterviewMissingInfoInputs): ValidationResult {
  return success();
}

export function validatePendForApplicantResponse(_inputs: InterviewMissingInfoInputs): ValidationResult {
  return success();
}

export function validateReturnToCaseReview(_inputs: InterviewMissingInfoInputs): ValidationResult {
  return success();
}

export function buildValidationSummary(inputs: InterviewMissingInfoInputs): ValidationSummary {
  const saveDraft = validateSaveDraft(inputs);
  const completeInterview = validateCompleteInterview(inputs);
  const requestMissingInformation = validateRequestMissingInformation(inputs);
  const pendForApplicantResponse = validatePendForApplicantResponse(inputs);
  const returnToCaseReview = validateReturnToCaseReview(inputs);
  const errors = [
    ...completeInterview.errors.map((error) => `Complete Interview: ${error}`),
    ...requestMissingInformation.errors.map((error) => `Request Missing Information: ${error}`),
    ...pendForApplicantResponse.errors.map((error) => `Pend For Applicant Response: ${error}`),
    ...returnToCaseReview.errors.map((error) => `Return To Case Review: ${error}`),
  ];

  return {
    errors,
    saveDraft,
    completeInterview,
    requestMissingInformation,
    pendForApplicantResponse,
    returnToCaseReview,
  };
}
