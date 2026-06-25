import { mockFinalReviewTask } from '../data/mockFinalReviewTask';
import type {
  AuditTrail,
  BudgetReview,
  CaseHeader,
  ClearanceReview,
  DocumentReview,
  ExternalValidation,
  ExtractedApplication,
  FinalReviewTaskData,
  PreviousWorkerReview,
  ReviewChecklist,
  SplitCaseInfoInput,
  SplitFinalReviewTaskInputs,
  TaskContext,
} from '../types/finalReviewTypes';

type InputEnvelope = {
  taskData?: unknown;
  isSupervisorReview?: unknown;
  supervisorFlag?: unknown;
  previousWorkerReview?: unknown;
  previousWorkerDecision?: unknown;
  previousWorkerNotes?: unknown;
  previousWorkerSubmittedBy?: unknown;
  previousWorkerSubmittedAtUtc?: unknown;
  previousWorkerReasonCode?: unknown;
  previousWorkerSupervisorReason?: unknown;
  previousWorkerRecommendedAction?: unknown;
  caseInfo?: unknown;
  documentInfo?: unknown;
  documentExtractionInfo?: unknown;
  documentReview?: unknown;
  clearanceReview?: unknown;
  externalValidation?: unknown;
  budget?: unknown;
  [key: string]: unknown;
};

function cloneTaskData(data: FinalReviewTaskData): FinalReviewTaskData {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as FinalReviewTaskData;
}

function normalizeTaskData(data: FinalReviewTaskData): FinalReviewTaskData {
  const taskData = {
    ...cloneTaskData(data),
    previousWorkerReview: {
      ...mockFinalReviewTask.previousWorkerReview,
      ...data.previousWorkerReview,
    },
  };
  const isSupervisorReview = Boolean(taskData.taskContext.isSupervisorReview);
  const supervisorDecisionAllowed =
    taskData.workerDecision.decision === '' ||
    taskData.workerDecision.decision === 'Approve' ||
    taskData.workerDecision.decision === 'Pend';

  return {
    ...taskData,
    taskContext: {
      ...taskData.taskContext,
      isSupervisorReview,
    },
    workerDecision:
      isSupervisorReview && !supervisorDecisionAllowed
        ? {
            ...taskData.workerDecision,
            decision: '',
            sendToSupervisor: false,
          }
        : taskData.workerDecision,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function objectInput<T extends object>(value: unknown): Partial<T> {
  if (isRecord(value)) {
    return value as Partial<T>;
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return isRecord(parsed) ? (parsed as Partial<T>) : {};
    } catch {
      return {};
    }
  }

  return {};
}

function arrayInput<T>(value: unknown, fallback: T[]): T[] {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function booleanInput(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', 'yes', 'y', '1'].includes(normalized)) {
      return true;
    }

    if (['false', 'no', 'n', '0'].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

function stringInput(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function optionalStringInput(value: unknown): string {
  return stringInput(value) ?? '';
}

function dateInput(value: unknown): string | undefined {
  const date = stringInput(value);
  return date?.includes('T') ? date.slice(0, 10) : date;
}

function statusInput(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return (
      {
        0: 'Pending Review',
        1: 'In Progress',
        2: 'Approved',
        3: 'Denied',
        4: 'Missing Information',
        5: 'Supervisor Review',
        6: 'Withdrawn',
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function stageInput(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return (
      {
        1: 'Intake',
        2: 'Clearance',
        3: 'Interview',
        4: 'External Validation',
        5: 'Budget',
        6: 'Final Review',
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function priorityInput(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return value <= 1 ? 'Low' : 'High';
  }

  return stringInput(value);
}

function normalizeCaseInfoInput(
  caseInfo: SplitCaseInfoInput | undefined,
): SplitCaseInfoInput {
  const inputCaseInfo = caseInfo ?? {};
  const record = inputCaseInfo as Record<string, unknown>;
  const fallbackCaseInfo = {
    ...mockFinalReviewTask.taskContext,
    ...mockFinalReviewTask.caseHeader,
    reviewChecklist: mockFinalReviewTask.reviewChecklist,
    audit: mockFinalReviewTask.audit,
  };

  return {
    ...fallbackCaseInfo,
    ...inputCaseInfo,
    caseRecordNumber:
      stringInput(record.caseRecordNumber ?? record.CaseRecordNumber ?? record.Id) ??
      inputCaseInfo.caseRecordNumber ??
      fallbackCaseInfo.caseRecordNumber,
    myBNumber: stringInput(record.myBNumber ?? record.MyBNumber) ?? inputCaseInfo.myBNumber ?? fallbackCaseInfo.myBNumber,
    applicantName:
      stringInput(record.applicantName ?? record.ApplicantName) ??
      inputCaseInfo.applicantName ??
      fallbackCaseInfo.applicantName,
    applicantEmail:
      stringInput(record.applicantEmail ?? record.ApplicantEmail) ??
      inputCaseInfo.applicantEmail ??
      fallbackCaseInfo.applicantEmail,
    county: stringInput(record.county ?? record.County) ?? inputCaseInfo.county ?? fallbackCaseInfo.county,
    derivedRegion:
      stringInput(record.derivedRegion ?? record.DerivedRegion) ??
      inputCaseInfo.derivedRegion ??
      fallbackCaseInfo.derivedRegion,
    filingDate:
      dateInput(record.filingDate ?? record.FilingDate ?? record.CreateTime) ??
      inputCaseInfo.filingDate ??
      fallbackCaseInfo.filingDate,
    eligibilityDueDate:
      dateInput(record.eligibilityDueDate ?? record.EligibilityDueDate) ??
      inputCaseInfo.eligibilityDueDate ??
      fallbackCaseInfo.eligibilityDueDate,
    currentStatus:
      statusInput(record.currentStatus ?? record.CurrentStatus) ??
      inputCaseInfo.currentStatus ??
      fallbackCaseInfo.currentStatus,
    currentStage:
      stageInput(record.currentStage ?? record.CurrentStage) ??
      inputCaseInfo.currentStage ??
      fallbackCaseInfo.currentStage,
    statusCode:
      stringInput(record.statusCode ?? record.StatusCode) ?? inputCaseInfo.statusCode ?? fallbackCaseInfo.statusCode,
    taskId:
      stringInput(record.taskId ?? record.TaskId ?? record.MaestroProcessID ?? record.Id) ??
      inputCaseInfo.taskId ??
      fallbackCaseInfo.taskId,
    createdAtUtc:
      stringInput(record.createdAtUtc ?? record.CreateTime) ??
      inputCaseInfo.createdAtUtc ??
      fallbackCaseInfo.createdAtUtc,
    assignedWorker:
      stringInput(record.assignedWorker ?? record.AssignedWorker) ??
      inputCaseInfo.assignedWorker ??
      fallbackCaseInfo.assignedWorker,
    priority: (priorityInput(record.priority ?? record.Priority) ??
      inputCaseInfo.priority ??
      fallbackCaseInfo.priority) as SplitCaseInfoInput['priority'],
  };
}

function booleanFromStatus(value: unknown, completeWords: string[]): boolean | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toLowerCase();
  return completeWords.some((word) => normalized.includes(word));
}

function isFinalReviewTaskData(value: unknown): value is FinalReviewTaskData {
  return (
    isRecord(value) &&
    isRecord(value.taskContext) &&
    isRecord(value.caseHeader) &&
    isRecord(value.extractedApplication) &&
    isRecord(value.reviewChecklist) &&
    isRecord(value.workerDecision)
  );
}

function hasSplitInputs(value: unknown): value is InputEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  return (
    'caseInfo' in value ||
    'supervisorFlag' in value ||
    'previousWorkerReview' in value ||
    'previousWorkerDecision' in value ||
    'previousWorkerNotes' in value ||
    'documentInfo' in value ||
    'documentExtractionInfo' in value ||
    'documentReview' in value ||
    'clearanceReview' in value ||
    'externalValidation' in value ||
    'budget' in value
  );
}

function buildTaskContext(caseInfo: Partial<CaseHeader & TaskContext>, isSupervisorReview: boolean): TaskContext {
  return {
    ...mockFinalReviewTask.taskContext,
    taskId: caseInfo.taskId ?? mockFinalReviewTask.taskContext.taskId,
    taskName: caseInfo.taskName ?? mockFinalReviewTask.taskContext.taskName,
    taskType: caseInfo.taskType ?? mockFinalReviewTask.taskContext.taskType,
    source: caseInfo.source ?? mockFinalReviewTask.taskContext.source,
    createdAtUtc: caseInfo.createdAtUtc ?? mockFinalReviewTask.taskContext.createdAtUtc,
    assignedGroup: caseInfo.assignedGroup ?? mockFinalReviewTask.taskContext.assignedGroup,
    assignedWorker: caseInfo.assignedWorker ?? mockFinalReviewTask.taskContext.assignedWorker,
    priority: caseInfo.priority ?? mockFinalReviewTask.taskContext.priority,
    isReadOnly: caseInfo.isReadOnly ?? mockFinalReviewTask.taskContext.isReadOnly,
    isSupervisorReview,
  };
}

function buildCaseHeader(caseInfo: Partial<CaseHeader>): CaseHeader {
  return {
    ...mockFinalReviewTask.caseHeader,
    ...caseInfo,
  };
}

function buildExtractedApplication(documentExtractionInfo: Partial<ExtractedApplication>): ExtractedApplication {
  return {
    ...mockFinalReviewTask.extractedApplication,
    ...documentExtractionInfo,
    householdMembers: arrayInput(
      documentExtractionInfo.householdMembers,
      mockFinalReviewTask.extractedApplication.householdMembers,
    ),
    income: arrayInput(documentExtractionInfo.income, mockFinalReviewTask.extractedApplication.income),
  };
}

function buildDocumentReview(documentReview: Partial<DocumentReview>): DocumentReview {
  return {
    ...mockFinalReviewTask.documentReview,
    ...documentReview,
    documents: arrayInput(documentReview.documents, mockFinalReviewTask.documentReview.documents),
  };
}

function buildClearanceReview(clearanceReview: Partial<ClearanceReview>): ClearanceReview {
  return {
    ...mockFinalReviewTask.clearanceReview,
    ...clearanceReview,
  };
}

function buildExternalValidation(externalValidation: Partial<ExternalValidation>): ExternalValidation {
  return {
    ...mockFinalReviewTask.externalValidation,
    ...externalValidation,
  };
}

function buildBudget(budget: Partial<BudgetReview>): BudgetReview {
  return {
    ...mockFinalReviewTask.budget,
    ...budget,
  };
}

function normalizePreviousWorkerReview(
  previousWorkerReview: Partial<PreviousWorkerReview> | null | undefined,
  envelope?: InputEnvelope,
): PreviousWorkerReview {
  return {
    ...mockFinalReviewTask.previousWorkerReview,
    ...(previousWorkerReview ?? {}),
    decision:
      optionalStringInput(previousWorkerReview?.decision ?? envelope?.previousWorkerDecision),
    workerNotes:
      optionalStringInput(previousWorkerReview?.workerNotes ?? envelope?.previousWorkerNotes),
    submittedBy:
      stringInput(previousWorkerReview?.submittedBy ?? envelope?.previousWorkerSubmittedBy) ??
      mockFinalReviewTask.previousWorkerReview.submittedBy,
    submittedAtUtc:
      stringInput(previousWorkerReview?.submittedAtUtc ?? envelope?.previousWorkerSubmittedAtUtc) ??
      mockFinalReviewTask.previousWorkerReview.submittedAtUtc,
    reasonCode:
      stringInput(previousWorkerReview?.reasonCode ?? envelope?.previousWorkerReasonCode) ??
      mockFinalReviewTask.previousWorkerReview.reasonCode,
    supervisorReason:
      stringInput(previousWorkerReview?.supervisorReason ?? envelope?.previousWorkerSupervisorReason) ??
      mockFinalReviewTask.previousWorkerReview.supervisorReason,
    recommendedAction:
      stringInput(previousWorkerReview?.recommendedAction ?? envelope?.previousWorkerRecommendedAction) ??
      mockFinalReviewTask.previousWorkerReview.recommendedAction,
  };
}

function buildReviewChecklist(
  reviewChecklist: Partial<ReviewChecklist> | undefined,
  documentReview: DocumentReview,
  clearanceReview: ClearanceReview,
  externalValidation: ExternalValidation,
  budget: BudgetReview,
): ReviewChecklist {
  return {
    ...mockFinalReviewTask.reviewChecklist,
    documentsReviewed:
      reviewChecklist?.documentsReviewed ??
      booleanFromStatus(documentReview.status, ['complete', 'verified', 'reviewed']) ??
      mockFinalReviewTask.reviewChecklist.documentsReviewed,
    clearanceResolved:
      reviewChecklist?.clearanceResolved ??
      booleanFromStatus(clearanceReview.status, ['resolved', 'complete', 'accepted']) ??
      mockFinalReviewTask.reviewChecklist.clearanceResolved,
    externalValidationReviewed:
      reviewChecklist?.externalValidationReviewed ??
      externalValidation.workerReviewed ??
      booleanFromStatus(externalValidation.status, ['reviewed', 'complete']) ??
      mockFinalReviewTask.reviewChecklist.externalValidationReviewed,
    budgetReviewed: reviewChecklist?.budgetReviewed ?? budget.workerReviewed ?? false,
    noticeReady: reviewChecklist?.noticeReady ?? false,
    supervisorReviewRequired: reviewChecklist?.supervisorReviewRequired ?? false,
    intakeComplete: reviewChecklist?.intakeComplete ?? mockFinalReviewTask.reviewChecklist.intakeComplete,
    expeditedScreeningComplete:
      reviewChecklist?.expeditedScreeningComplete ?? mockFinalReviewTask.reviewChecklist.expeditedScreeningComplete,
    interviewComplete: reviewChecklist?.interviewComplete ?? mockFinalReviewTask.reviewChecklist.interviewComplete,
  };
}

function buildAudit(audit: AuditTrail | undefined): AuditTrail {
  return audit?.events?.length ? audit : mockFinalReviewTask.audit;
}

export function composeTaskDataFromSplitInputs(inputs: SplitFinalReviewTaskInputs, envelope?: InputEnvelope): FinalReviewTaskData {
  const documentReview = buildDocumentReview(inputs.documentReview);
  const clearanceReview = buildClearanceReview(inputs.clearanceReview);
  const externalValidation = buildExternalValidation(inputs.externalValidation);
  const budget = buildBudget(inputs.budget);
  const caseInfo = normalizeCaseInfoInput(inputs.caseInfo);
  const isSupervisorReview =
    inputs.supervisorFlag ??
    inputs.isSupervisorReview ??
    caseInfo.isSupervisorReview ??
    mockFinalReviewTask.taskContext.isSupervisorReview;

  return {
    taskContext: buildTaskContext(caseInfo, isSupervisorReview),
    caseHeader: buildCaseHeader(caseInfo),
    extractedApplication: buildExtractedApplication(inputs.documentExtractionInfo),
    reviewChecklist: buildReviewChecklist(
      caseInfo.reviewChecklist,
      documentReview,
      clearanceReview,
      externalValidation,
      budget,
    ),
    documentReview,
    clearanceReview,
    externalValidation,
    budget,
    notice: mockFinalReviewTask.notice,
    workerDecision: mockFinalReviewTask.workerDecision,
    previousWorkerReview: normalizePreviousWorkerReview(
      inputs.previousWorkerReview,
      envelope ?? (inputs as unknown as InputEnvelope),
    ),
    audit: buildAudit(caseInfo.audit),
  };
}

export function composeTaskDataFromActionInput(value: unknown): FinalReviewTaskData | null {
  if (isFinalReviewTaskData(value)) {
    return normalizeTaskData(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  const envelope = value as InputEnvelope;

  if (isFinalReviewTaskData(envelope.taskData)) {
    return normalizeTaskData(envelope.taskData);
  }

  if (typeof envelope.taskData === 'string') {
    const parsedTaskData = objectInput(envelope.taskData);
    if (isFinalReviewTaskData(parsedTaskData)) {
      return normalizeTaskData(parsedTaskData);
    }
  }

  if (!hasSplitInputs(envelope)) {
    return null;
  }

  const caseInfo = normalizeCaseInfoInput(objectInput<SplitCaseInfoInput>(envelope.caseInfo));
  const documentInfo = objectInput<Record<string, unknown>>(envelope.documentInfo);

  return composeTaskDataFromSplitInputs({
    supervisorFlag: booleanInput(envelope.supervisorFlag),
    isSupervisorReview:
      booleanInput(envelope.isSupervisorReview) ??
      booleanInput(caseInfo.isSupervisorReview) ??
      booleanInput(documentInfo.isSupervisorReview),
    caseInfo,
    documentExtractionInfo: objectInput<SplitFinalReviewTaskInputs['documentExtractionInfo']>(
      envelope.documentExtractionInfo ??
        documentInfo.documentExtractionInfo ??
        documentInfo.applicationExtraction ??
        documentInfo.extractedApplication,
    ),
    documentReview: objectInput<SplitFinalReviewTaskInputs['documentReview']>(
      envelope.documentReview ?? documentInfo.documentReview,
    ),
    clearanceReview: objectInput<SplitFinalReviewTaskInputs['clearanceReview']>(
      envelope.clearanceReview ?? documentInfo.clearanceReview,
    ),
    externalValidation: objectInput<SplitFinalReviewTaskInputs['externalValidation']>(
      envelope.externalValidation ?? documentInfo.externalValidation,
    ),
    budget: objectInput<SplitFinalReviewTaskInputs['budget']>(
      envelope.budget ?? documentInfo.budget ?? documentInfo.budgetReview,
    ),
    previousWorkerDecision: stringInput(envelope.previousWorkerDecision ?? documentInfo.previousWorkerDecision),
    previousWorkerNotes: stringInput(envelope.previousWorkerNotes ?? documentInfo.previousWorkerNotes),
    previousWorkerReview: objectInput<PreviousWorkerReview>(
      envelope.previousWorkerReview ?? documentInfo.previousWorkerReview,
    ),
  }, envelope);
}
