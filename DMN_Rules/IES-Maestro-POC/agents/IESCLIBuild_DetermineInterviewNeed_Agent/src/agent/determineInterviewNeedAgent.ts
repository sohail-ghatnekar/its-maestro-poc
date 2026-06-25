import type {
  AdvisoryReason,
  AgentReview,
  HeuristicResult,
  NormalizedDetermineInterviewNeedInput,
  Priority,
} from "../types/determineInterviewNeedTypes";
import { safeJoinList } from "../utils/formatters";

const REASON_TEXT: Record<string, string> = {
  SNAP_INTERVIEW_REQUIRED:
    "SNAP application processing requires interview completion before eligibility determination.",
  EXPEDITED_INTERVIEW_PRIORITY:
    "Expedited screening indicates the interview should be prioritized without making a final eligibility decision.",
  INTAKE_NOT_READY:
    "The intake filing result is not ready for interview task creation.",
  INTERVIEW_TASK_ALREADY_OPEN:
    "An interview task is already open, so a duplicate task should not be created.",
  APPLICANT_RESPONSE_PENDING:
    "Applicant response is already pending, so another outreach task should not be created yet.",
  INCOME_CONFIRMATION_NEEDED:
    "Reported income includes an item that requires worker confirmation.",
  ACCOMMODATION_REVIEW:
    "The applicant requested an accommodation or alternate handling consideration.",
  CLEARANCE_CAN_RUN_SEPARATELY:
    "A clearance possible match can be handled separately while interview completion is still tracked.",
  DUE_SOON_PRIORITY:
    "The eligibility due date is within the configured due soon window.",
  INTERVIEW_NOT_REQUIRED_YET:
    "The available inputs do not yet support creating an interview human task.",
  INPUT_VALIDATION_FAILED:
    "The input data did not pass required validation.",
};

function reasonsFromCodes(reasonCodes: string[]): AdvisoryReason[] {
  return reasonCodes.map((reasonCode) => ({
    reasonCode,
    reasonText:
      REASON_TEXT[reasonCode] ||
      "The deterministic review identified this advisory condition.",
  }));
}

function buildSummary(
  inputs: NormalizedDetermineInterviewNeedInput,
  heuristicResult: HeuristicResult,
): string {
  if (heuristicResult.reasonCodes.includes("INTAKE_NOT_READY")) {
    return "Interview task creation is not recommended yet because the intake filing result must be corrected first. This advisory does not approve or deny benefits, and the worker remains responsible for the case.";
  }

  if (heuristicResult.reasonCodes.includes("INTERVIEW_TASK_ALREADY_OPEN")) {
    return "Interview completion still needs to be tracked, but a duplicate Interview and Missing Info human task is not recommended because one is already open. The worker remains responsible for next steps.";
  }

  if (heuristicResult.reasonCodes.includes("APPLICANT_RESPONSE_PENDING")) {
    return "A new Interview and Missing Info human task is not recommended yet because applicant response is already pending. The worker remains responsible for reviewing the response.";
  }

  const missingLabels = heuristicResult.missingInfoItems.map((item) => item.label);
  const missingPhrase =
    missingLabels.length > 0
      ? ` and missing information review is recommended for ${safeJoinList(missingLabels)}`
      : "";

  if (heuristicResult.interviewNeeded && heuristicResult.shouldCreateHumanTask) {
    return `Interview human task creation is recommended because SNAP interview completion is required${missingPhrase}. This is advisory only, and the worker remains responsible for the case.`;
  }

  if (heuristicResult.interviewNeeded) {
    return "Interview completion is recommended for tracking, but a new human task is not recommended at this moment. This is advisory only, and the worker remains responsible for the case.";
  }

  return `Interview human task creation is not recommended yet for ${inputs.caseInfo.myBNumber}. This is advisory only, and the worker remains responsible for the case.`;
}

function buildSuggestedApplicantMessage(
  heuristicResult: HeuristicResult,
): string {
  if (heuristicResult.reasonCodes.includes("INTAKE_NOT_READY")) {
    return "Additional filing information may be needed before the SNAP application can move to interview scheduling.";
  }

  if (heuristicResult.missingInfoItems.length > 0) {
    return "Additional information may be needed for your SNAP application. Please be prepared to confirm household income and provide clearer documents if requested.";
  }

  if (heuristicResult.interviewNeeded) {
    return "An interview may be needed for your SNAP application. Please be prepared to confirm application details with a worker.";
  }

  return "No applicant outreach message is recommended by this advisory review at this time.";
}

function buildConfidence(heuristicResult: HeuristicResult): number {
  let confidence = 0.93;

  if (heuristicResult.reasonCodes.includes("INCOME_CONFIRMATION_NEEDED")) {
    confidence -= 0.01;
  }

  if (heuristicResult.reasonCodes.includes("INTAKE_NOT_READY")) {
    confidence = 0.94;
  }

  if (heuristicResult.reasonCodes.includes("EXPEDITED_INTERVIEW_PRIORITY")) {
    confidence = Math.min(confidence, 0.91);
  }

  return Number(confidence.toFixed(2));
}

export function buildDetermineInterviewNeedReview(
  inputs: NormalizedDetermineInterviewNeedInput,
  heuristicResult: HeuristicResult,
): AgentReview {
  const recommendedPriority = heuristicResult.recommendedPriority as Priority;

  return {
    agentName: "IESCLIBuild_DetermineInterviewNeedAgent",
    reviewType: "Determine Interview Need",
    advisoryOnly: true,
    interviewNeeded: heuristicResult.interviewNeeded,
    recommendedInterviewMethod: heuristicResult.recommendedInterviewMethod,
    recommendedPriority,
    shouldCreateHumanTask: heuristicResult.shouldCreateHumanTask,
    shouldRekickInterviewTask: heuristicResult.shouldRekickInterviewTask,
    summary: buildSummary(inputs, heuristicResult),
    reasons: reasonsFromCodes(heuristicResult.reasonCodes),
    missingInfoItems: heuristicResult.missingInfoItems,
    recommendedWorkerActions: heuristicResult.recommendedWorkerActions,
    suggestedApplicantMessage: buildSuggestedApplicantMessage(heuristicResult),
    confidence: buildConfidence(heuristicResult),
    workerApprovalRequired: true,
  };
}
