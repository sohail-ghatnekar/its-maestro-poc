import type { FinalReviewTaskData, ReasonCode, ValidationResult } from '../types/finalReviewTypes';

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function requiresDynamicText(reasonCodes: ReasonCode[]): boolean {
  return reasonCodes.includes('Q21') || reasonCodes.includes('Q22');
}

function getSelectedReasonCodes(taskData: FinalReviewTaskData): ReasonCode[] {
  const reasonCodes = [...taskData.notice.selectedReasonCodes];

  if (taskData.workerDecision.reasonCode && !reasonCodes.includes(taskData.workerDecision.reasonCode)) {
    reasonCodes.push(taskData.workerDecision.reasonCode);
  }

  return reasonCodes;
}

export function canApprove(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function canPend(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function canSendToSupervisor(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function canWithdraw(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function canApproveSupervisorReview(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function canReturnSupervisorReview(_taskData: FinalReviewTaskData): boolean {
  return true;
}

export function validateSupervisorReviewDecision(taskData: FinalReviewTaskData): ValidationResult {
  const errors = taskData.workerDecision.decision ? [] : ['Select a supervisor decision before completing the task.'];

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}


export function validateFinalDecision(taskData: FinalReviewTaskData): ValidationResult {
  const errors = taskData.workerDecision.decision ? [] : ['Select a final decision before completing the task.'];

  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
  };
}
