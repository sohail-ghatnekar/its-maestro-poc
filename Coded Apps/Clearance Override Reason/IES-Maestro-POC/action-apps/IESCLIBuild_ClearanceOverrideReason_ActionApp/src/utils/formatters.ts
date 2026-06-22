import type { CandidateMatch, CompletionTaskAction, DecisionAction, TaskAction } from "../types/clearanceOverrideTypes";

export function formatDate(value: string): string {
  if (!value) {
    return "Not provided";
  }

  const date = value.length === 10 ? new Date(`${value}T00:00:00Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(date);
}

export function formatDateTime(value: string): string {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

export function actionLabel(action: DecisionAction | TaskAction): string {
  switch (action) {
    case "AcceptMatch":
      return "Accept Existing CIN/SIN";
    case "RejectMatch":
      return "Reject Match";
    case "AssignNewCinSin":
      return "Assign New CIN/SIN";
    case "ReturnForResearch":
      return "Return For Research";
    case "SaveDraft":
      return "Save Draft";
    case "Cancel":
      return "Cancel";
    default:
      return "Select action";
  }
}

export function actionValueFromLabel(action: CompletionTaskAction): CompletionTaskAction {
  return action;
}

export function scoreAttentionLabel(score: number): string {
  if (score >= 105) {
    return "High Attention";
  }

  if (score >= 95) {
    return "Medium Attention";
  }

  return "Low Attention";
}

export function scoreAttentionClass(score: number): string {
  if (score >= 105) {
    return "score-high";
  }

  if (score >= 95) {
    return "score-medium";
  }

  return "score-low";
}

export function confidenceBadgeLabel(candidate: CandidateMatch): string {
  const matchType = candidate.matchType.toLowerCase();

  if (matchType.includes("high")) {
    return "High Confidence";
  }

  if (matchType.includes("possible")) {
    return "Possible Match";
  }

  if (matchType.includes("low")) {
    return "Low Confidence";
  }

  if (matchType.includes("no")) {
    return "No Match";
  }

  if (candidate.matchScore >= 105) {
    return "High Confidence";
  }

  if (candidate.matchScore >= 95) {
    return "Possible Match";
  }

  return "Low Confidence";
}

export function confidenceBadgeClass(candidate: CandidateMatch): string {
  const label = confidenceBadgeLabel(candidate);

  if (label === "High Confidence") {
    return "badge-green";
  }

  if (label === "Possible Match") {
    return "badge-amber";
  }

  if (label === "Low Confidence") {
    return "badge-red";
  }

  return "badge-gray";
}

export function candidateOptionLabel(candidate: CandidateMatch): string {
  return `${candidate.candidateId} - ${candidate.candidateName} - ${candidate.candidateCinSin}`;
}
