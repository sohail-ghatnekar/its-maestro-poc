export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type CaseStatus =
  | 'Pending Review'
  | 'In Progress'
  | 'Approved'
  | 'Denied'
  | 'Missing Information'
  | 'Supervisor Review'
  | 'Withdrawn';

export type FinalDecision =
  | ''
  | 'Approve'
  | 'Deny'
  | 'Pend'
  | 'Withdraw'
  | 'Send to Supervisor';

export type FinalAction =
  | 'Approve'
  | 'Deny'
  | 'Pend'
  | 'Withdraw'
  | 'SendToSupervisor'
  | 'ReturnForMoreInformation';

export type NoticeType = 'Approval' | 'Missing Information' | 'Denial' | 'Withdrawal' | '';

export type ReasonCode =
  | 'APPROVED_STANDARD'
  | 'APPROVED_EXPEDITED'
  | 'DENIED_INCOME_OVER_LIMIT'
  | 'PENDING_MISSING_INFO'
  | 'Q21'
  | 'Q22'
  | 'WITHDRAWN_BY_APPLICANT';

export interface TaskContext {
  taskId: string;
  taskName: string;
  taskType: string;
  source: string;
  createdAtUtc: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: Priority;
  isReadOnly: boolean;
  isSupervisorReview: boolean;
}

export interface CaseHeader {
  caseRecordNumber: string;
  myBNumber: string;
  applicantName: string;
  applicantEmail: string;
  county: string;
  derivedRegion: string;
  filingDate: string;
  eligibilityDueDate: string;
  currentStatus: CaseStatus | string;
  currentStage: string;
  statusCode: string;
}

export interface HouseholdMember {
  name: string;
  relationship: string;
  dateOfBirth: string;
  applying: boolean;
}

export interface IncomeItem {
  person: string;
  source: string;
  frequency: string;
  grossAmount: number;
}

export interface ExtractedApplication {
  applicationDocumentName: string;
  applicationDocumentUri: string;
  legalName: string;
  phone: string;
  residenceAddress: string;
  signaturePresent: boolean;
  signatureDate: string;
  householdSize: number;
  householdMembers: HouseholdMember[];
  income: IncomeItem[];
  resourcesAmount: number;
  rentMonthly: number;
  utilityProvider: string;
}

export interface ReviewChecklist {
  intakeComplete: boolean;
  expeditedScreeningComplete: boolean;
  interviewComplete: boolean;
  documentsReviewed: boolean;
  clearanceResolved: boolean;
  externalValidationReviewed: boolean;
  budgetReviewed: boolean;
  noticeReady: boolean;
  supervisorReviewRequired: boolean;
}

export interface ReviewedDocument {
  documentId: string;
  documentType: string;
  status: string;
  confidence: number;
  reusable: boolean;
  receivedDate: string;
}

export interface DocumentReview {
  status: string;
  summary: string;
  documents: ReviewedDocument[];
  workerNotes?: string;
}

export interface ClearanceReview {
  status: string;
  matchType: string;
  matchScore: number;
  existingCinSin: string;
  workerNotes: string;
  overrideClearance?: boolean;
  overrideReason?: string;
}

export interface ExternalValidation {
  status: string;
  uibDolStatus: string;
  taxStatus: string;
  paystubComparisonStatus: string;
  discrepancyFound: boolean;
  summary: string;
  workerReviewed?: boolean;
}

export interface BudgetReview {
  status: string;
  mockBenefitAmount: number;
  budgetCreatedAtUtc: string;
  budgetSummary: string;
  workerReviewed: boolean;
}

export interface NoticeReview {
  status: string;
  availableNoticeTypes: NoticeType[];
  availableReasonCodes: ReasonCode[];
  selectedNoticeType: NoticeType;
  selectedReasonCodes: ReasonCode[];
  dynamicTextRequired: boolean;
  dynamicText: string;
  noticePreview: string;
}

export interface WorkerDecision {
  decision: FinalDecision;
  reasonCode: ReasonCode | '';
  workerNotes: string;
  sendToSupervisor: boolean;
  supervisorReason: string;
  attestation: boolean;
}

export interface PreviousWorkerReview {
  decision: string;
  workerNotes: string;
  submittedBy: string;
  submittedAtUtc: string;
  reasonCode: string;
  supervisorReason: string;
  recommendedAction: string;
}

export interface AuditEvent {
  eventType: string;
  timestampUtc: string;
  actor: string;
  notes: string;
}

export interface AuditTrail {
  events: AuditEvent[];
}

export interface FinalReviewTaskData {
  taskContext: TaskContext;
  caseHeader: CaseHeader;
  extractedApplication: ExtractedApplication;
  reviewChecklist: ReviewChecklist;
  documentReview: DocumentReview;
  clearanceReview: ClearanceReview;
  externalValidation: ExternalValidation;
  budget: BudgetReview;
  notice: NoticeReview;
  workerDecision: WorkerDecision;
  previousWorkerReview: PreviousWorkerReview;
  audit: AuditTrail;
}

export interface SplitFinalReviewTaskInputs {
  isSupervisorReview?: boolean;
  supervisorFlag?: boolean;
  caseInfo: Partial<CaseHeader & TaskContext> & {
    reviewChecklist?: Partial<ReviewChecklist>;
    audit?: AuditTrail;
  };
  documentInfo?: unknown;
  documentExtractionInfo: Partial<ExtractedApplication>;
  documentReview: Partial<DocumentReview>;
  clearanceReview: Partial<ClearanceReview>;
  externalValidation: Partial<ExternalValidation>;
  budget: Partial<BudgetReview>;
  previousWorkerDecision?: string;
  previousWorkerNotes?: string;
  previousWorkerReview?: Partial<PreviousWorkerReview>;
}

export interface StatusUpdate {
  currentStatus: string;
  currentStage: string;
  statusCode: string;
}

export interface FinalDecisionPayload {
  caseInfo: CaseHeader;
  decision: FinalAction;
  workerNotes: string;
}


export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ActionCenterLoadResult {
  taskData: FinalReviewTaskData;
  isLocalDemoMode: boolean;
  rawTask?: unknown;
}

export interface LocalToastMessage {
  id: string;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
}
