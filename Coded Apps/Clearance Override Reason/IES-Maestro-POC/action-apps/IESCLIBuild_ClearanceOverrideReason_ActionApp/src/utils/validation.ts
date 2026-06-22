import type {
  CandidateMatch,
  ClearanceOverrideInputs,
  CompletionTaskAction,
  ValidationError,
  ValidationResult,
  WorkerDecision
} from "../types/clearanceOverrideTypes";

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isLowConfidence(candidate: CandidateMatch | undefined): boolean {
  if (!candidate) {
    return false;
  }

  return candidate.matchScore < 95 || candidate.matchType.toLowerCase().includes("low");
}

function hasPossibleMatches(inputs: ClearanceOverrideInputs): boolean {
  return inputs.candidateMatches.some((candidate) => {
    const type = candidate.matchType.toLowerCase();
    return !type.includes("no match");
  });
}

function isHighConfidenceAcceptRecommendation(inputs: ClearanceOverrideInputs): boolean {
  const action = inputs.clearanceSearch.recommendedAction.toLowerCase();
  const recommendedCandidate = inputs.candidateMatches.find(
    (candidate) => candidate.candidateId === inputs.clearanceSearch.recommendedCandidateId
  );

  return (
    (action.includes("accept") && action.includes("high")) ||
    (action === "acceptmatch" && Boolean(recommendedCandidate && recommendedCandidate.matchScore >= 105))
  );
}

function withAction(
  inputs: ClearanceOverrideInputs,
  selectedAction: CompletionTaskAction
): ClearanceOverrideInputs {
  return {
    ...inputs,
    workerDecision: {
      ...inputs.workerDecision,
      selectedAction
    }
  };
}

function isOverrideActive(inputs: ClearanceOverrideInputs): boolean {
  return inputs.workerDecision.overrideUsed || isOverrideRequired(inputs);
}

function validateForAction(
  inputs: ClearanceOverrideInputs,
  selectedAction: CompletionTaskAction | ""
): ValidationError[] {
  const errors: ValidationError[] = [];
  const { workerDecision } = inputs;
  const selectedCandidate = getSelectedCandidate(inputs.candidateMatches, workerDecision);
  const needsCandidate = false;
  const needsAttestation = false;
  const needsNotes = false;

  if (!selectedAction) {
    errors.push({
      field: "selectedAction",
      message: "Select an action before completing the task."
    });
  }

  if (needsCandidate && !workerDecision.selectedCandidateId) {
    errors.push({
      field: "selectedCandidateId",
      message: "Select a candidate for this decision."
    });
  }

  if (needsCandidate && workerDecision.selectedCandidateId && !selectedCandidate) {
    errors.push({
      field: "selectedCandidateId",
      message: "The selected candidate is not available in the match results."
    });
  }

  if (needsNotes && !hasText(workerDecision.workerNotes)) {
    errors.push({
      field: "workerNotes",
      message: "Enter worker notes for the clearance decision."
    });
  }

  if (needsAttestation && !workerDecision.attestation) {
    errors.push({
      field: "attestation",
      message: "Confirm the attestation before completing the task."
    });
  }

  if (isOverrideActive(inputs) && !hasText(workerDecision.overrideReason)) {
    errors.push({
      field: "overrideReason",
      message: "Enter an override reason for this decision."
    });
  }

  if (selectedAction === "AcceptMatch" && isLowConfidence(selectedCandidate) && !hasText(workerDecision.overrideReason)) {
    errors.push({
      field: "overrideReason",
      message: "Accepting a match score below 95 requires an override reason."
    });
  }

  return errors;
}

export function getSelectedCandidate(
  candidateMatches: CandidateMatch[],
  workerDecision: WorkerDecision
): CandidateMatch | undefined {
  return candidateMatches.find((candidate) => candidate.candidateId === workerDecision.selectedCandidateId);
}

export function isOverrideRequired(inputs: ClearanceOverrideInputs): boolean {
  const { clearanceSearch, workerDecision } = inputs;
  const selectedCandidate = getSelectedCandidate(inputs.candidateMatches, workerDecision);

  if (!workerDecision.selectedAction) {
    return false;
  }

  if (
    workerDecision.selectedAction === "RejectMatch" &&
    workerDecision.selectedCandidateId === clearanceSearch.recommendedCandidateId
  ) {
    return true;
  }

  if (workerDecision.selectedAction === "AssignNewCinSin" && hasPossibleMatches(inputs)) {
    return true;
  }

  if (
    workerDecision.selectedAction === "AcceptMatch" &&
    Boolean(workerDecision.selectedCandidateId) &&
    workerDecision.selectedCandidateId !== clearanceSearch.recommendedCandidateId
  ) {
    return true;
  }

  if (workerDecision.selectedAction === "AcceptMatch" && isLowConfidence(selectedCandidate)) {
    return true;
  }

  if (workerDecision.selectedAction === "ReturnForResearch" && isHighConfidenceAcceptRecommendation(inputs)) {
    return true;
  }

  return false;
}

export function validateClearanceDecision(inputs: ClearanceOverrideInputs): ValidationResult {
  const errors = validateForAction(inputs, inputs.workerDecision.selectedAction);

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function canAcceptMatch(inputs: ClearanceOverrideInputs): boolean {
  return validateForAction(withAction(inputs, "AcceptMatch"), "AcceptMatch").length === 0;
}

export function canRejectMatch(inputs: ClearanceOverrideInputs): boolean {
  return validateForAction(withAction(inputs, "RejectMatch"), "RejectMatch").length === 0;
}

export function canAssignNewCinSin(inputs: ClearanceOverrideInputs): boolean {
  return validateForAction(withAction(inputs, "AssignNewCinSin"), "AssignNewCinSin").length === 0;
}

export function canReturnForResearch(inputs: ClearanceOverrideInputs): boolean {
  return validateForAction(withAction(inputs, "ReturnForResearch"), "ReturnForResearch").length === 0;
}
