import type {
  AuditEvent,
  AuditInfo,
  ExternalValidationInputs,
  FinalPayload,
  StatusUpdate,
  TaskAction
} from "../types/externalValidationTypes";

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

function buildStatusUpdate(inputs: ExternalValidationInputs, action: TaskAction): StatusUpdate {
  if (action === "ValidationComplete") {
    return {
      currentStatus: "In Progress",
      currentStage: "Case Review",
      externalValidationNeeded: false,
      nextRecommendedStep: "Run Case Readiness Evaluator"
    };
  }

  if (action === "RequestApplicantFollowUp") {
    return {
      currentStatus: "Pending Applicant Follow-Up",
      currentStage: "External Validation",
      externalValidationNeeded: true,
      nextRecommendedStep: "Collect applicant follow-up information"
    };
  }

  if (action === "SendToSupervisor") {
    return {
      currentStatus: "Supervisor Review",
      currentStage: "External Validation",
      externalValidationNeeded: true,
      nextRecommendedStep: "Supervisor review of external validation discrepancy"
    };
  }

  if (action === "ReturnForMoreInformation") {
    return {
      currentStatus: "More Information Needed",
      currentStage: "External Validation",
      externalValidationNeeded: true,
      nextRecommendedStep: "Return task for additional information"
    };
  }

  return {
    currentStatus: inputs.caseInfo.currentStatus,
    currentStage: inputs.caseInfo.currentStage,
    externalValidationNeeded: true,
    nextRecommendedStep: "Resume external validation review"
  };
}

function buildCompletionAuditEvent(action: TaskAction): AuditEvent {
  if (action === "ValidationComplete") {
    return buildAuditEvent("ExternalValidationCompleted", "worker", "External validation review completed.");
  }

  if (action === "RequestApplicantFollowUp") {
    return buildAuditEvent(
      "ExternalValidationApplicantFollowUpRequested",
      "worker",
      "Applicant follow-up requested from external validation review."
    );
  }

  if (action === "SendToSupervisor") {
    return buildAuditEvent(
      "ExternalValidationSentToSupervisor",
      "worker",
      "External validation review sent to supervisor."
    );
  }

  if (action === "ReturnForMoreInformation") {
    return buildAuditEvent(
      "ExternalValidationReturnedForMoreInformation",
      "worker",
      "External validation review returned for more information."
    );
  }

  if (action === "Cancel") {
    return buildAuditEvent("ExternalValidationCanceled", "worker", "External validation action canceled.");
  }

  return buildAuditEvent("ExternalValidationDraftSaved", "worker", "External validation draft saved.");
}

export function buildFinalPayload(inputs: ExternalValidationInputs, action: TaskAction): FinalPayload {
  return {
    caseInfo: inputs.caseInfo,
    decision: action,
    workerNotes: inputs.workerResolution.workerNotes.trim()
  };
}
