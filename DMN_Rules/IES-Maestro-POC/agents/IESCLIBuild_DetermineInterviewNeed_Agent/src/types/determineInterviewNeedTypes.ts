export type Priority = "Normal" | "High" | "Critical";

export type InterviewMethod = "Phone" | "In Person" | "Virtual" | "";

export interface CaseActor {
  Type?: number;
  Email?: string;
  IsActive?: boolean;
  CreateTime?: string;
  UpdateTime?: string;
  Id?: string;
  Name?: string;
}

export interface CaseData {
  ProofofResidenceFilePath?: string;
  LicenseFilePath?: string;
  MyBNumber: string;
  CreatedBy?: CaseActor;
  MaestroProcessID?: string;
  ApplicantEmail?: string;
  AssignedWorker?: string;
  CurrentStatus?: number | string;
  Priority?: number | string;
  AppFilePath?: string;
  CreateTime?: string;
  CurrentStage?: number | string;
  FolderID?: string;
  PaystubFilePath?: string;
  UpdatedBy?: CaseActor;
  RecordOwner?: CaseActor;
  FilingDate?: string;
  UpdateTime?: string;
  Id: string;
  ApplicantName?: string;
  County?: string;
  EligibilityDueDate?: string;
  PreferredInterviewMethod?: InterviewMethod | string;
  RequestedAccommodation?: boolean;
  ClearancePossibleMatch?: boolean;
  [key: string]: unknown;
}

export interface ExpeditedScreeningResult {
  expeditedDecision?: string;
  expeditedFlag: boolean;
  slaDays?: number;
  priority?: Priority | string;
  reasonCode?: string;
  recommendedAction?: string;
  [key: string]: unknown;
}

export interface ExtractedDocument {
  documentId?: string;
  documentType: string;
  status?: string;
  confidence?: number;
  reusable?: boolean;
  fileName?: string;
  requiresWorkerReview?: boolean;
}

export interface DocumentExtraction {
  documents: ExtractedDocument[];
  documentReviewNeeded?: boolean;
  lowestConfidence?: number;
  missingRequiredDocuments?: string[];
  insufficientDocuments?: string[];
}

export interface DetermineInterviewNeedInput {
  caseData: CaseData;
  expeditedScreeningResult: string;
  documentExtraction: DocumentExtraction;
}

export interface TaskContext {
  requestId: string;
  source: string;
  createdAtUtc: string;
  requestedBy: string;
  priority: Priority;
  isReevaluation: boolean;
}

export interface InvocationInfo {
  invocationId: string;
  invocationReason: string;
  previousInvocationId: string;
  isRekickEvaluation: boolean;
}

export interface CaseInfo {
  caseRecordNumber: string;
  caseId: string;
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
  expeditedFlag: boolean;
  assignedWorker?: string;
  folderId?: string;
  clearancePossibleMatch?: boolean;
}

export interface IncomeItem {
  requiresWorkerConfirmation: boolean;
}

export interface ApplicationExtraction {
  preferredInterviewMethod: InterviewMethod | string;
  requestedAccommodation: boolean;
  income: IncomeItem[];
}

export interface IntakeRuleResult {
  filingAccepted: boolean;
}

export interface PriorInterviewState {
  interviewTaskAlreadyOpen: boolean;
  lastInterviewCompleted: boolean;
  lastInterviewCompletedAtUtc: string;
  lastOutcome: string;
  lastMissingInfoItems: string[];
  applicantResponsePending: boolean;
}

export interface PolicyConfig {
  snapInterviewGenerallyRequired: boolean;
  defaultInterviewMethod: InterviewMethod | string;
  allowInPersonIfRequested: boolean;
  expeditedInterviewPriority: boolean;
  lowDocumentConfidenceThreshold: number;
  dueSoonDays: number;
}

export interface AuditEvent {
  eventType: string;
  timestampUtc: string;
  actor: string;
  actorType?: string;
  notes: string;
  myBNumber?: string;
  invocationId?: string;
}

export interface AuditInfo {
  events: AuditEvent[];
}

export interface NormalizedDetermineInterviewNeedInput {
  taskContext: TaskContext;
  invocationInfo: InvocationInfo;
  caseInfo: CaseInfo;
  applicationExtraction: ApplicationExtraction;
  intakeRuleResult: IntakeRuleResult;
  expeditedScreeningResult: ExpeditedScreeningResult;
  documentExtraction: DocumentExtraction;
  priorInterviewState: PriorInterviewState;
  policyConfig: PolicyConfig;
  auditInfo: AuditInfo;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AdvisoryReason {
  reasonCode: string;
  reasonText: string;
}

export interface MissingInfoItem {
  itemId: string;
  label: string;
  category: string;
  required: boolean;
  source: string;
}

export interface HeuristicResult {
  interviewNeeded: boolean;
  recommendedInterviewMethod: string;
  recommendedPriority: Priority;
  shouldCreateHumanTask: boolean;
  shouldRekickInterviewTask: boolean;
  blockingReasons: AdvisoryReason[];
  reasonCodes: string[];
  missingInfoItems: MissingInfoItem[];
  recommendedWorkerActions: string[];
  nextRecommendedStep: string;
}

export interface AgentReview {
  agentName: string;
  reviewType: string;
  advisoryOnly: true;
  interviewNeeded: boolean;
  recommendedInterviewMethod: string;
  recommendedPriority: Priority;
  shouldCreateHumanTask: boolean;
  shouldRekickInterviewTask: boolean;
  summary: string;
  reasons: AdvisoryReason[];
  missingInfoItems: MissingInfoItem[];
  recommendedWorkerActions: string[];
  suggestedApplicantMessage: string;
  confidence: number;
  workerApprovalRequired: true;
}

export interface HumanTaskRecommendation {
  taskName: string;
  taskType: "Human Task";
  assignedGroup: string;
  assignedWorker?: string;
  priority: Priority;
  invocationReason: string;
  formHints: {
    showInterviewFields: boolean;
    showMissingInfoChecklist: boolean;
    showApplicantOutreachDraft: boolean;
  };
}

export interface StatusUpdate {
  currentStatus: string;
  currentStage: string;
  nextRecommendedStep: string;
}

export interface DetermineInterviewNeedOutput {
  caseInfo: {
    caseRecordNumber: string;
    myBNumber: string;
  };
  invocationInfo: {
    invocationId: string;
    finalAction: "DetermineInterviewNeed";
  };
  agentReview: AgentReview;
  humanTaskRecommendation: HumanTaskRecommendation | null;
  statusUpdate: StatusUpdate;
  auditEvent: AuditEvent;
  errors: string[];
}

export interface MockScenario {
  scenarioId: string;
  description: string;
  inputs: DetermineInterviewNeedInput;
  expected: {
    shouldCreateHumanTask?: boolean;
    recommendedPriority?: Priority;
    reasonCodes?: string[];
    nextRecommendedStepIncludes?: string;
    workerActionIncludes?: string;
  };
}
