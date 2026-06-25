import type {
  HeuristicResult,
  NormalizedDetermineInterviewNeedInput,
  Priority,
} from "../types/determineInterviewNeedTypes";
import {
  createMissingItemId,
  derivePriorityFromDueDate,
  normalizeInterviewMethod,
  normalizePriority,
} from "../utils/formatters";

function addReason(result: HeuristicResult, reasonCode: string): void {
  if (!result.reasonCodes.includes(reasonCode)) {
    result.reasonCodes.push(reasonCode);
  }
}

function addAction(result: HeuristicResult, action: string): void {
  if (!result.recommendedWorkerActions.includes(action)) {
    result.recommendedWorkerActions.push(action);
  }
}

export function determineInterviewNeedHeuristics(
  inputs: NormalizedDetermineInterviewNeedInput,
): HeuristicResult {
  const {
    taskContext,
    caseInfo,
    applicationExtraction,
    intakeRuleResult,
    expeditedScreeningResult,
    priorInterviewState,
    policyConfig,
  } = inputs;

  const result: HeuristicResult = {
    interviewNeeded: false,
    recommendedInterviewMethod: normalizeInterviewMethod(
      applicationExtraction.preferredInterviewMethod,
      String(policyConfig.defaultInterviewMethod || "Phone"),
      policyConfig.allowInPersonIfRequested,
    ),
    recommendedPriority: normalizePriority(String(taskContext.priority || "Normal")),
    shouldCreateHumanTask: false,
    shouldRekickInterviewTask: false,
    blockingReasons: [],
    reasonCodes: [],
    missingInfoItems: [],
    recommendedWorkerActions: [],
    nextRecommendedStep: "Continue standard SNAP processing",
  };

  if (!intakeRuleResult.filingAccepted) {
    result.interviewNeeded = false;
    result.shouldCreateHumanTask = false;
    result.nextRecommendedStep = "Resolve intake filing issue";
    addReason(result, "INTAKE_NOT_READY");
    addAction(
      result,
      "Resolve intake filing issue before creating an interview task.",
    );
    return result;
  }

  let taskCreationBlocked = false;

  if (priorInterviewState.interviewTaskAlreadyOpen) {
    taskCreationBlocked = true;
    result.shouldCreateHumanTask = false;
    addReason(result, "INTERVIEW_TASK_ALREADY_OPEN");
    addAction(result, "Do not create duplicate task.");
  }

  if (priorInterviewState.applicantResponsePending) {
    taskCreationBlocked = true;
    result.shouldCreateHumanTask = false;
    addReason(result, "APPLICANT_RESPONSE_PENDING");
    addAction(result, "Wait for applicant response before creating another task.");
  }

  if (
    policyConfig.snapInterviewGenerallyRequired &&
    !priorInterviewState.lastInterviewCompleted
  ) {
    result.interviewNeeded = true;
    result.shouldCreateHumanTask = !taskCreationBlocked;
    result.nextRecommendedStep = taskCreationBlocked
      ? "Use existing interview or applicant response workflow"
      : "Create Interview and Missing Info human task";
    addReason(result, "SNAP_INTERVIEW_REQUIRED");
    addAction(result, "Create Interview and Missing Info human task.");
  }

  if (inputs.invocationInfo.isRekickEvaluation && result.interviewNeeded) {
    result.shouldRekickInterviewTask =
      !taskCreationBlocked && !result.shouldCreateHumanTask;
  }

  if (
    expeditedScreeningResult.expeditedFlag &&
    policyConfig.expeditedInterviewPriority
  ) {
    result.recommendedPriority = "Critical";
    addReason(result, "EXPEDITED_INTERVIEW_PRIORITY");
    addAction(result, "Prioritize interview scheduling for expedited screening.");
  }

  const incomeNeedingConfirmation = applicationExtraction.income.filter(
    (income) => income.requiresWorkerConfirmation,
  );
  if (incomeNeedingConfirmation.length > 0) {
    addReason(result, "INCOME_CONFIRMATION_NEEDED");
    result.missingInfoItems.push({
      itemId: createMissingItemId("Income", "Income", 1),
      label: "Confirm fluctuating part-time income",
      category: "Income",
      required: true,
      source: "applicationExtraction",
    });
    addAction(result, "Confirm income details during phone interview.");
  }

  if (applicationExtraction.requestedAccommodation) {
    addReason(result, "ACCOMMODATION_REVIEW");
    addAction(result, "Confirm accommodation needs before interview scheduling.");
  }

  if (caseInfo.clearancePossibleMatch) {
    addReason(result, "CLEARANCE_CAN_RUN_SEPARATELY");
    addAction(
      result,
      "Clearance can run separately, but interview completion should still be tracked.",
    );
  }

  if (result.missingInfoItems.length > 0 && !taskCreationBlocked) {
    result.shouldCreateHumanTask = true;
    if (!result.interviewNeeded) {
      result.nextRecommendedStep = "Create missing information human task";
    }
  }

  const priorityBeforeDueDate = result.recommendedPriority;
  result.recommendedPriority = derivePriorityFromDueDate(
    result.recommendedPriority as Priority,
    caseInfo.eligibilityDueDate,
    policyConfig.dueSoonDays,
    taskContext.createdAtUtc,
  );

  if (result.recommendedPriority !== priorityBeforeDueDate) {
    addReason(result, "DUE_SOON_PRIORITY");
  }

  if (result.shouldCreateHumanTask) {
    result.nextRecommendedStep = "Create Interview and Missing Info human task";
  }

  if (!result.interviewNeeded && result.reasonCodes.length === 0) {
    addReason(result, "INTERVIEW_NOT_REQUIRED_YET");
    result.nextRecommendedStep = "Continue standard SNAP processing";
  }

  return result;
}
