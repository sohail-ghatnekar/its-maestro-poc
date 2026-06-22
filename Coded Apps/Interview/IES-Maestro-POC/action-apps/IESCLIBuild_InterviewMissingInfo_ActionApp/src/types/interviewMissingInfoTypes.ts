export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export type InterviewMethod = 'Phone' | 'In Person' | 'Not Required';

export type OutreachStatus = 'Not Sent' | 'Drafted' | 'Sent' | 'Not Needed';

export type ResponseStatus = 'Not Received' | 'Response Received' | 'Not Needed';

export type FinalAction =
  | 'SaveDraft'
  | 'CompleteInterview'
  | 'RequestMissingInformation'
  | 'PendForApplicantResponse'
  | 'ReturnToCaseReview'
  | 'Cancel';

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

export interface InvocationInfo {
  invocationId: string;
  invocationReason: string;
  isRekick: boolean;
  previousInvocationId: string;
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

export interface ApplicationExtraction {
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

export interface InterviewInfo {
  interviewRequired: boolean;
  interviewMethod: InterviewMethod;
  scheduledDateTime: string;
  completedDateTime: string;
  interviewCompleted: boolean;
  workerNotes: string;
  missingInfoStillRequired: boolean;
}

export interface MissingInfoItem {
  itemId: string;
  label: string;
  category: string;
  required: boolean;
  resolved: boolean;
  localOnly?: boolean;
}

export interface MissingInfo {
  missingItems: MissingInfoItem[];
  applicantMessageDraft: string;
  applicantEmail: string;
  outreachStatus: OutreachStatus;
  responseStatus: ResponseStatus;
}

export interface WorkerResponse {
  interviewCompleted: boolean;
  missingInfoStillRequired: boolean;
  selectedMissingItemIds: string[];
  applicantMessage: string;
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

export interface InterviewMissingInfoInputs {
  taskContext: TaskContext;
  invocationInfo: InvocationInfo;
  caseInfo: CaseInfo;
  applicationExtraction: ApplicationExtraction;
  interviewInfo: InterviewInfo;
  missingInfo: MissingInfo;
  workerResponse: WorkerResponse;
  auditInfo: AuditInfo;
}

export interface StatusUpdate {
  currentStatus: string;
  currentStage: string;
  nextRecommendedStep: string;
}

export interface FinalOutputPayload {
  caseInfo: CaseInfo;
  decision: FinalAction;
  workerNotes: string;
}


export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ValidationSummary {
  errors: string[];
  completeInterview: ValidationResult;
  requestMissingInformation: ValidationResult;
  pendForApplicantResponse: ValidationResult;
  returnToCaseReview: ValidationResult;
  saveDraft: ValidationResult;
}

export interface ActionCenterLoadResult {
  inputs: InterviewMissingInfoInputs;
  isLocalDemoMode: boolean;
  rawTask?: unknown;
}

export interface LocalToastMessage {
  id: string;
  message: string;
  severity: 'success' | 'warning' | 'error' | 'info';
}
