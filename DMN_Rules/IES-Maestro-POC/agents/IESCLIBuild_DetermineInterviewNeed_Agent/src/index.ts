import { buildDetermineInterviewNeedReview } from "./agent/determineInterviewNeedAgent";
import { determineInterviewNeedHeuristics } from "./rules/interviewNeedHeuristics";
import type {
  AgentReview,
  DetermineInterviewNeedInput,
  DetermineInterviewNeedOutput,
  HeuristicResult,
  HumanTaskRecommendation,
  NormalizedDetermineInterviewNeedInput,
  Priority,
  StatusUpdate,
} from "./types/determineInterviewNeedTypes";
import { buildAuditEvent } from "./utils/audit";
import { normalizeDetermineInterviewNeedInput } from "./utils/inputNormalization";
import { validateInputs } from "./utils/validation";

function buildValidationFailureReview(
  inputs: Partial<NormalizedDetermineInterviewNeedInput>,
  errors: string[],
): AgentReview {
  return {
    agentName: "IESCLIBuild_DetermineInterviewNeedAgent",
    reviewType: "Determine Interview Need",
    advisoryOnly: true,
    interviewNeeded: false,
    recommendedInterviewMethod: "Phone",
    recommendedPriority: "High",
    shouldCreateHumanTask: false,
    shouldRekickInterviewTask: false,
    summary:
      "Input validation failed, so interview task creation is not recommended. This advisory does not approve or deny benefits, and the worker remains responsible for the case.",
    reasons: [
      {
        reasonCode: "INPUT_VALIDATION_FAILED",
        reasonText: errors.join(" "),
      },
    ],
    missingInfoItems: [],
    recommendedWorkerActions: [
      "Correct required input data before creating an interview task.",
    ],
    suggestedApplicantMessage:
      "Additional information may be needed before interview scheduling can be reviewed.",
    confidence: 0,
    workerApprovalRequired: true,
  };
}

function buildHumanTaskRecommendation(
  inputs: NormalizedDetermineInterviewNeedInput,
  heuristicResult: HeuristicResult,
): HumanTaskRecommendation | null {
  if (!heuristicResult.shouldCreateHumanTask) {
    return null;
  }

  const county = inputs.caseInfo.county.trim().replace(/[^A-Za-z0-9]+/g, "_");
  const hasMissingInfo = heuristicResult.missingInfoItems.length > 0;
  const recommendation: HumanTaskRecommendation = {
    taskName: "Interview and Missing Info",
    taskType: "Human Task",
    assignedGroup: `${county || "County"}_SNAP_Workers`,
    priority: heuristicResult.recommendedPriority as Priority,
    invocationReason:
      heuristicResult.interviewNeeded && hasMissingInfo
        ? "Interview required and missing information follow-up may be needed."
        : heuristicResult.interviewNeeded
          ? "Interview required for SNAP case processing."
          : "Missing information follow-up may be needed.",
    formHints: {
      showInterviewFields: heuristicResult.interviewNeeded,
      showMissingInfoChecklist: hasMissingInfo,
      showApplicantOutreachDraft: true,
    },
  };

  if (inputs.caseInfo.assignedWorker) {
    recommendation.assignedWorker = inputs.caseInfo.assignedWorker;
  }

  return recommendation;
}

function buildStatusUpdate(
  heuristicResult: HeuristicResult,
  currentStage: string,
): StatusUpdate {
  if (heuristicResult.reasonCodes.includes("INTAKE_NOT_READY")) {
    return {
      currentStatus: "Pending Correction",
      currentStage: "Intake",
      nextRecommendedStep: "Resolve intake filing issue",
    };
  }

  if (heuristicResult.reasonCodes.includes("APPLICANT_RESPONSE_PENDING")) {
    return {
      currentStatus: "Pending Applicant Response",
      currentStage: currentStage || "Interview",
      nextRecommendedStep: "Wait for applicant response",
    };
  }

  if (heuristicResult.reasonCodes.includes("INTERVIEW_TASK_ALREADY_OPEN")) {
    return {
      currentStatus: "In Progress",
      currentStage: "Interview",
      nextRecommendedStep: "Use existing Interview and Missing Info human task",
    };
  }

  if (heuristicResult.shouldCreateHumanTask) {
    return {
      currentStatus: "In Progress",
      currentStage: "Interview",
      nextRecommendedStep: "Create Interview and Missing Info human task",
    };
  }

  return {
    currentStatus: "Pending Review",
    currentStage: currentStage || "Intake",
    nextRecommendedStep: heuristicResult.nextRecommendedStep,
  };
}

export function determineInterviewNeed(
  inputs: DetermineInterviewNeedInput,
): DetermineInterviewNeedOutput {
  const normalizedInputs = normalizeDetermineInterviewNeedInput(inputs);
  const validation = validateInputs(inputs);
  const caseInfo = {
    caseRecordNumber: normalizedInputs.caseInfo.caseRecordNumber || "",
    myBNumber: normalizedInputs.caseInfo.myBNumber || "",
  };
  const invocationInfo = {
    invocationId: normalizedInputs.invocationInfo.invocationId || "",
    finalAction: "DetermineInterviewNeed" as const,
  };

  if (!validation.valid) {
    return {
      caseInfo,
      invocationInfo,
      agentReview: buildValidationFailureReview(
        normalizedInputs,
        validation.errors,
      ),
      humanTaskRecommendation: null,
      statusUpdate: {
        currentStatus: "Validation Failed",
        currentStage: normalizedInputs.caseInfo.currentStage || "Intake",
        nextRecommendedStep: "Correct required input data",
      },
      auditEvent: buildAuditEvent(
        "DetermineInterviewNeedValidationFailed",
        "agent",
        "Determine Interview Need agent could not complete advisory review due to invalid input.",
        {
          myBNumber: caseInfo.myBNumber,
          invocationId: invocationInfo.invocationId,
        },
      ),
      errors: validation.errors,
    };
  }

  const heuristicResult = determineInterviewNeedHeuristics(normalizedInputs);
  const agentReview = buildDetermineInterviewNeedReview(
    normalizedInputs,
    heuristicResult,
  );

  return {
    caseInfo,
    invocationInfo,
    agentReview,
    humanTaskRecommendation: buildHumanTaskRecommendation(
      normalizedInputs,
      heuristicResult,
    ),
    statusUpdate: buildStatusUpdate(
      heuristicResult,
      normalizedInputs.caseInfo.currentStage,
    ),
    auditEvent: buildAuditEvent(
      "DetermineInterviewNeedCompleted",
      "agent",
      "Determine Interview Need agent completed advisory review.",
      {
        myBNumber: normalizedInputs.caseInfo.myBNumber,
        invocationId: normalizedInputs.invocationInfo.invocationId,
      },
    ),
    errors: [],
  };
}

export { buildDetermineInterviewNeedReview, determineInterviewNeedHeuristics };
export type {
  DetermineInterviewNeedInput,
  DetermineInterviewNeedOutput,
  HeuristicResult,
};
