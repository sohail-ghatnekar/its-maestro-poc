export type TaskPriority = "Low" | "Normal" | "High" | "Urgent";

export type TaskAction =
  | "ValidationComplete"
  | "RequestApplicantFollowUp"
  | "SendToSupervisor"
  | "ReturnForMoreInformation"
  | "SaveDraft"
  | "Cancel";

export interface TaskContext {
  taskId: string;
  taskName: string;
  taskType: string;
  createdAtUtc: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: TaskPriority;
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

export interface IncomeSource {
  person: string;
  source: string;
  frequency: string;
  grossAmount: number;
}

export interface DeclaredApplicationFacts {
  grossMonthlyIncome: number;
  rentMonthly: number;
  resourcesAmount: number;
  incomeSources: IncomeSource[];
}

export interface ExtractedDocument {
  documentId: string;
  documentType: string;
  status: string;
  confidence: number;
  extractedEmployer?: string;
  extractedGrossAmount?: number;
  receivedDate: string;
}

export interface DocumentExtraction {
  documents: ExtractedDocument[];
}

export interface ValidationSourceResult {
  sourceName: string;
  status: string;
  result: string;
  discrepancyFound: boolean;
  rawMessageAvailable: boolean;
  summary: string;
}

export interface PaystubComparisonResult extends ValidationSourceResult {
  declaredAmount: number;
  extractedAmount: number;
  confidence: number;
}

export interface ValidationResults {
  uibDol: ValidationSourceResult;
  taxRecords: ValidationSourceResult;
  paystubComparison: PaystubComparisonResult;
}

export interface AgentReview {
  agentName: string;
  advisoryOnly: boolean;
  summary: string;
  recommendedWorkerActions: string[];
  workerApprovalRequired: boolean;
}

export interface WorkerResolution {
  uibDolReviewed: boolean;
  taxReviewed: boolean;
  paystubComparisonReviewed: boolean;
  discrepancyResolved: boolean;
  resolutionReason: string;
  requestApplicantFollowUp: boolean;
  sendToSupervisor: boolean;
  supervisorReason: string;
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

export interface ExternalValidationInputs {
  taskContext: TaskContext;
  caseInfo: CaseInfo;
  discrepancySoap?: string;
  declaredApplicationFacts: DeclaredApplicationFacts;
  documentExtraction: DocumentExtraction;
  validationResults: ValidationResults;
  agentReview: AgentReview;
  workerResolution: WorkerResolution;
  auditInfo: AuditInfo;
}

export interface StatusUpdate {
  currentStatus: string;
  currentStage: string;
  externalValidationNeeded: boolean;
  nextRecommendedStep: string;
}

export interface FinalPayload {
  caseInfo: CaseInfo;
  decision: TaskAction;
  workerNotes: string;
}

export interface ValidationErrors {
  uibDolReviewed?: string;
  taxReviewed?: string;
  paystubComparisonReviewed?: string;
  discrepancyResolved?: string;
  resolutionReason?: string;
  workerNotes?: string;
  attestation?: string;
  supervisorReason?: string;
}

export type MessageSeverity = "info" | "success" | "warning" | "error";
