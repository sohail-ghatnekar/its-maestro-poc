export type Priority = "Low" | "Normal" | "High" | "Urgent";

export type FinalAction =
  | "SaveDraft"
  | "BudgetReviewed"
  | "BudgetNeedsCorrection"
  | "RequestMoreInformation"
  | "SendToSupervisor"
  | "Cancel";

export type MessageSeverityName = "info" | "success" | "warning" | "error";

export interface TaskContext {
  taskId: string;
  taskName: string;
  taskType: string;
  createdAtUtc: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: Priority;
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

export interface ReadinessResult {
  readinessResult: string;
  isReadyForBudget: boolean;
  summary: string;
  blockingIssues: string[];
  warnings: string[];
  recommendedNextStep: string;
}

export interface EarnedIncomeSource {
  person: string;
  source: string;
  frequency: string;
  grossAmount: number;
}

export interface BudgetInputSummary {
  householdSize: number;
  grossMonthlyIncome: number;
  earnedIncomeSources: EarnedIncomeSource[];
  resourcesAmount: number;
  rentMonthly: number;
  utilityProvider: string;
  dependentCareMonthly: number;
  medicalExpenseMonthly: number;
  notes: string;
}

export interface AbleBudgetResult {
  ableRequestId: string;
  ableStatus: string;
  returnedAtUtc: string;
  mockBenefitAmount: number | null;
  benefitFrequency: string;
  calculationSummary: string;
  calculationWarnings: string[];
  calculationErrors: string[];
  rawResultAvailable: boolean;
  rawResult: Record<string, unknown>;
}

export interface WorkerReview {
  budgetReviewed: boolean;
  inputsAppearCorrect: boolean;
  correctionNeeded: boolean;
  requestMoreInformation: boolean;
  sendToSupervisor: boolean;
  correctionReason: string;
  moreInformationReason: string;
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

export interface ReviewBudgetResultsInputs {
  taskContext: TaskContext;
  caseInfo: CaseInfo;
  readinessResult: ReadinessResult;
  budgetInputSummary: BudgetInputSummary;
  ableBudgetResult: AbleBudgetResult;
  workerReview: WorkerReview;
  auditInfo: AuditInfo;
}

export interface BudgetReviewResultOutput {
  finalAction: FinalAction;
  ableRequestId: string;
  ableStatus: string;
  mockBenefitAmount: number | null;
  benefitFrequency: string;
  budgetReviewed: boolean;
  inputsAppearCorrect: boolean;
  correctionNeeded: boolean;
  requestMoreInformation: boolean;
  sendToSupervisor: boolean;
  correctionReason: string;
  moreInformationReason: string;
  supervisorReason: string;
  workerNotes: string;
  attestation: boolean;
}

export interface FinalPayload {
  caseInfo: CaseInfo;
  decision: FinalAction;
  workerNotes: string;
}


export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ActionCenterLoadResult {
  inputs: ReviewBudgetResultsInputs;
  isLocalDemoMode: boolean;
  rawTask?: unknown;
}

export interface LocalToastMessage {
  id: string;
  message: string;
  severity: MessageSeverityName;
}
