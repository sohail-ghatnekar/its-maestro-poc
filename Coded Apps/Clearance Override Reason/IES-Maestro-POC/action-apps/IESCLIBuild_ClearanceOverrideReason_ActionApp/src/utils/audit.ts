import type {
  AuditEvent,
  AuditInfo,
  ClearanceOverrideInputs,
  FinalClearancePayload,
  TaskAction
} from "../types/clearanceOverrideTypes";
import { getSelectedCandidate, isOverrideRequired } from "./validation";

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

export function buildFinalPayload(inputs: ClearanceOverrideInputs, action: TaskAction): FinalClearancePayload {
  return {
    caseInfo: inputs.caseInfo,
    decision: action,
    workerNotes: inputs.workerDecision.workerNotes.trim()
  };
}

function buildStatusUpdate(inputs: ClearanceOverrideInputs, action: TaskAction) {
  if (action === "ReturnForResearch") {
    return {
      currentStatus: inputs.caseInfo.currentStatus,
      currentStage: "Clearance Research",
      clearanceReviewNeeded: true,
      nextRecommendedStep: "Complete clearance research"
    };
  }

  if (action === "Cancel") {
    return {
      currentStatus: inputs.caseInfo.currentStatus,
      currentStage: inputs.caseInfo.currentStage,
      clearanceReviewNeeded: true,
      nextRecommendedStep: "No task outcome committed"
    };
  }

  return {
    currentStatus: "In Progress",
    currentStage: "Case Review",
    clearanceReviewNeeded: false,
    nextRecommendedStep: "Run Case Readiness Evaluator"
  };
}
