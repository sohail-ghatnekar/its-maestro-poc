import type {
  AuditEvent,
  FinalAction,
  FinalDecisionPayload,
  FinalReviewTaskData,
  StatusUpdate,
} from '../types/finalReviewTypes';

export function buildAuditEvent(eventType: string, actor: string, notes: string): AuditEvent {
  return {
    eventType,
    timestampUtc: new Date().toISOString(),
    actor,
    notes,
  };
}

export function appendAuditEvent(taskData: FinalReviewTaskData, event: AuditEvent): FinalReviewTaskData {
  return {
    ...taskData,
    audit: {
      events: [...taskData.audit.events, event],
    },
  };
}

function statusForAction(taskData: FinalReviewTaskData, action: FinalAction): StatusUpdate {
  if (action === 'Approve') {
    return {
      currentStatus: 'Approved',
      currentStage: 'Notices',
      statusCode: 'AP',
    };
  }

  if (action === 'Deny') {
    return {
      currentStatus: 'Denied',
      currentStage: 'Notices',
      statusCode: 'DN',
    };
  }

  if (action === 'ReturnForMoreInformation' || action === 'Pend') {
    return {
      currentStatus: 'Missing Information',
      currentStage: 'Pending Applicant Response',
      statusCode: 'MI',
    };
  }

  if (action === 'Withdraw') {
    return {
      currentStatus: 'Withdrawn',
      currentStage: 'Closed',
      statusCode: 'WD',
    };
  }

  if (taskData.workerDecision.decision === 'Deny') {
    return {
      currentStatus: 'Supervisor Review',
      currentStage: 'Denial Review',
      statusCode: 'SR',
    };
  }

  return {
    currentStatus: 'Supervisor Review',
    currentStage: 'Final Review',
    statusCode: 'SR',
  };
}

export function buildFinalPayload(taskData: FinalReviewTaskData, action: FinalAction): FinalDecisionPayload {
  return {
    caseInfo: taskData.caseHeader,
    decision: action,
    workerNotes: taskData.workerDecision.workerNotes.trim()
  };
}
