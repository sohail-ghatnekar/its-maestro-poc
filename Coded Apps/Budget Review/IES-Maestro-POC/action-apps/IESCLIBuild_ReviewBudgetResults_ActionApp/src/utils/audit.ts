import type {
  AuditEvent,
  AuditInfo,
  FinalAction,
  FinalPayload,
  ReviewBudgetResultsInputs
} from "../types/reviewBudgetResultsTypes";

export function buildAuditEvent(eventType: string, actor: string, notes: string): AuditEvent {
  return {
    eventType,
    timestampUtc: new Date().toISOString(),
    actor,
    notes
  };
}

export function appendAuditEvent(auditInfo: AuditInfo, event: AuditEvent): AuditInfo {
  return {
    events: [...auditInfo.events, event]
  };
}

function buildStatusUpdate(inputs: ReviewBudgetResultsInputs, action: FinalAction): { currentStatus: string; currentStage: string; budgetStatus: string; nextRecommendedStep: string } {
  switch (action) {
    case "BudgetReviewed":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: "Final Review",
        budgetStatus: "Worker Reviewed",
        nextRecommendedStep: "Final Case Worker Review"
      };
    case "BudgetNeedsCorrection":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: "Budget",
        budgetStatus: "Needs Correction",
        nextRecommendedStep: "Correct budget inputs and rerun mock ABLE budget."
      };
    case "RequestMoreInformation":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: "Budget",
        budgetStatus: "More Information Requested",
        nextRecommendedStep: "Collect missing applicant information."
      };
    case "SendToSupervisor":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: "Budget",
        budgetStatus: "Supervisor Review",
        nextRecommendedStep: "Supervisor budget review."
      };
    case "SaveDraft":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: inputs.caseInfo.currentStage,
        budgetStatus: "Draft Saved",
        nextRecommendedStep: "Continue Review Budget Results."
      };
    case "Cancel":
      return {
        currentStatus: inputs.caseInfo.currentStatus,
        currentStage: inputs.caseInfo.currentStage,
        budgetStatus: "Cancelled",
        nextRecommendedStep: "Return task without budget disposition."
      };
  }
}

function buildCompletionAuditEvent(inputs: ReviewBudgetResultsInputs, action: FinalAction): AuditEvent {
  switch (action) {
    case "BudgetReviewed":
      return buildAuditEvent("BudgetResultsReviewed", "worker", "Worker reviewed budget result.");
    case "BudgetNeedsCorrection":
      return buildAuditEvent("BudgetResultsNeedsCorrection", "worker", "Worker marked the budget result as needing correction.");
    case "RequestMoreInformation":
      return buildAuditEvent("BudgetReviewMoreInformationRequested", "worker", "Worker requested more applicant information.");
    case "SendToSupervisor":
      return buildAuditEvent("BudgetReviewSentToSupervisor", "worker", "Worker sent budget review to supervisor.");
    case "SaveDraft":
      return buildAuditEvent("BudgetReviewDraftSaved", "worker", "Worker saved Review Budget Results draft.");
    case "Cancel":
      return buildAuditEvent("BudgetReviewCancelled", "worker", "Worker cancelled Review Budget Results task.");
  }
}

export function buildFinalPayload(inputs: ReviewBudgetResultsInputs, action: FinalAction): FinalPayload {
  return {
    caseInfo: inputs.caseInfo,
    decision: action,
    workerNotes: inputs.workerReview.workerNotes.trim()
  };
}
