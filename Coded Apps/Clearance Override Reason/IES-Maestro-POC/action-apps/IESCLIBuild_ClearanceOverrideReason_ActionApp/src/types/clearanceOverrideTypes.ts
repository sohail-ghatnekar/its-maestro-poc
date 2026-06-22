export type CompletionTaskAction =
  | "AcceptMatch"
  | "RejectMatch"
  | "AssignNewCinSin"
  | "ReturnForResearch";

export type TaskAction = CompletionTaskAction | "SaveDraft" | "Cancel";

export type DecisionAction = CompletionTaskAction | "";

export type MessageSeverity = "info" | "success" | "warning" | "error";

export interface TaskContext {
  taskId: string;
  taskName: string;
  taskType: string;
  createdAtUtc: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: string;
  isReadOnly: boolean;
}

export interface CaseInfo {
  caseRecordNumber: string;
  myBNumber: string;
  applicantName: string;
  applicantEmail: string;
  county: string;
  derivedRegion: string;
  filingDate: string;
  eligibilityDueDate: string;
  currentStatus: string;
  currentStage: string;
  statusCode: string;
}

export interface HouseholdMember {
  memberId: string;
  name: string;
  dateOfBirth: string;
  ssnLast4: string;
  relationship: string;
  applying: boolean;
}

export interface ClearanceSearch {
  searchRunAtUtc: string;
  algorithmProfile: string;
  recommendedAction: string;
  recommendedCandidateId: string;
  recommendationSummary: string;
}

export interface CandidateMatch {
  candidateId: string;
  candidateName: string;
  candidateCinSin: string;
  matchScore: number;
  matchType: string;
  matchedFields: string[];
  mismatchedFields: string[];
  notes: string;
}

export interface WorkerDecision {
  selectedAction: DecisionAction;
  selectedCandidateId: string;
  selectedCinSin: string;
  overrideUsed: boolean;
  overrideReason: string;
  workerNotes: string;
  attestation: boolean;
}

export interface AuditEvent {
  eventType: string;
  timestampUtc: string;
  actor: string;
  notes: string;
}

export interface AuditInfo {
  events: AuditEvent[];
}

export interface ClearanceOverrideInputs {
  taskContext: TaskContext;
  caseInfo: CaseInfo;
  householdMember: HouseholdMember;
  clearanceSearch: ClearanceSearch;
  candidateMatches: CandidateMatch[];
  workerDecision: WorkerDecision;
  auditInfo: AuditInfo;
}

export interface ClearanceResultOutput {
  selectedAction: TaskAction;
  selectedCandidateId: string;
  selectedCinSin: string;
  overrideUsed: boolean;
  overrideReason: string;
  workerNotes: string;
  matchScore: number | null;
}

export interface StatusUpdateOutput {
  currentStatus: string;
  currentStage: string;
  clearanceReviewNeeded: boolean;
  nextRecommendedStep: string;
}

export interface FinalClearancePayload {
  caseInfo: CaseInfo;
  decision: TaskAction;
  workerNotes: string;
}

export interface ValidationError {
  field: keyof WorkerDecision | "selectedAction" | "form";
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
