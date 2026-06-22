import type {
  AuditEvent,
  AuditInfo,
  FinalAction,
  FinalOutputPayload,
  InterviewMissingInfoInputs,
  MissingInfoItem,
  StatusUpdate,
} from '../types/interviewMissingInfoTypes';

export function buildAuditEvent(eventType: string, actor: string, notes: string): AuditEvent {
  return {
    eventType,
    timestampUtc: new Date().toISOString(),
    actor,
    notes,
  };
}

export function appendAuditEvent(auditInfo: AuditInfo, event: AuditEvent): AuditInfo {
  return {
    events: [...auditInfo.events, event],
  };
}

function getSelectedUnresolvedItems(inputs: InterviewMissingInfoInputs): MissingInfoItem[] {
  const selectedIds = new Set(inputs.workerResponse.selectedMissingItemIds);

  return inputs.missingInfo.missingItems.filter((item) => selectedIds.has(item.itemId) && !item.resolved);
}

function getStatusUpdate(action: FinalAction): StatusUpdate {
  if (action === 'CompleteInterview') {
    return {
      currentStatus: 'In Progress',
      currentStage: 'Case Review',
      nextRecommendedStep: 'Run Case Readiness Evaluator',
    };
  }

  if (action === 'RequestMissingInformation') {
    return {
      currentStatus: 'Missing Information',
      currentStage: 'Applicant Follow-up',
      nextRecommendedStep: 'Send Missing Information Request',
    };
  }

  if (action === 'PendForApplicantResponse') {
    return {
      currentStatus: 'Pending Applicant Response',
      currentStage: 'Applicant Follow-up',
      nextRecommendedStep: 'Wait For Applicant Response',
    };
  }

  if (action === 'ReturnToCaseReview') {
    return {
      currentStatus: 'In Progress',
      currentStage: 'Case Review',
      nextRecommendedStep: 'Run Case Readiness Evaluator',
    };
  }

  if (action === 'Cancel') {
    return {
      currentStatus: 'In Progress',
      currentStage: 'Interview',
      nextRecommendedStep: 'Review Canceled Interview Task',
    };
  }

  return {
    currentStatus: 'In Progress',
    currentStage: 'Interview',
    nextRecommendedStep: 'Continue Interview and Missing Info Task',
  };
}

function getAuditEventType(action: FinalAction): string {
  if (action === 'CompleteInterview') {
    return 'InterviewMissingInfoCompleted';
  }

  if (action === 'RequestMissingInformation') {
    return 'MissingInformationRequested';
  }

  if (action === 'PendForApplicantResponse') {
    return 'PendedForApplicantResponse';
  }

  if (action === 'ReturnToCaseReview') {
    return 'ReturnedToCaseReview';
  }

  if (action === 'Cancel') {
    return 'InterviewMissingInfoCanceled';
  }

  return 'InterviewMissingInfoDraftSaved';
}

function getAuditNotes(action: FinalAction): string {
  if (action === 'CompleteInterview') {
    return 'Interview and Missing Info task completed.';
  }

  if (action === 'RequestMissingInformation') {
    return 'Applicant missing information request prepared.';
  }

  if (action === 'PendForApplicantResponse') {
    return 'Interview and Missing Info task pended for applicant response.';
  }

  if (action === 'ReturnToCaseReview') {
    return 'Interview and Missing Info task returned to case review.';
  }

  if (action === 'Cancel') {
    return 'Interview and Missing Info task canceled.';
  }

  return 'Interview and Missing Info draft saved.';
}

export function buildFinalPayload(inputs: InterviewMissingInfoInputs, action: FinalAction): FinalOutputPayload {
  return {
    caseInfo: inputs.caseInfo,
    decision: action,
    workerNotes: inputs.workerResponse.workerNotes.trim()
  };
}
