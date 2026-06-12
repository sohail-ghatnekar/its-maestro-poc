import { useCallback, useEffect, useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import { MaestroInstanceDiagram } from './components/MaestroInstanceDiagram';
import {
  ACTION_APP_DEFINITIONS,
  IES_WORKFLOW_CONFIG,
  getUiPathApiBaseUrl,
  getUiPathConfigurationError,
} from './config/uipath';
import type { ActionAppDefinition, LiveActionAppTab } from './config/uipath';
import { useAuth } from './hooks/useAuth';
import {
  buildMaestroInstanceUrl,
  buildMaestroProcessUrl,
  buildTaskLink,
  convertTaskLinkToEmbedUrl,
  fetchApplicationPdfFromBucket,
  fetchDocumentFromBucket,
  fetchLiveCaseRecords,
  fetchMaestroInstanceContext,
  findMatchingLiveRecord,
  findPendingTasksForInstance,
  getLiveRecordActionTaskReferences,
  getLiveRecordFolderKey,
  getLiveRecordInstanceId,
  getTasksForTab,
  startMaestroCase,
  startTaskAssignmentProcess,
  startWorkerPtoProcess,
} from './services/uipathCaseManagement';
import type {
  LiveCaseRecord,
  LiveMaestroContext,
  LiveTaskSummary,
} from './services/uipathCaseManagement';
import {
  assignedGroups,
  countyOptions,
  exceptionOptions,
  initialCases,
  priorityOptions,
  regionOptions,
  roles,
  statusOptions,
} from './mockData';
import type {
  AuditCategory,
  BenefitCase,
  CaseStatus,
  ChecklistStatus,
  ClearanceScenario,
  DocumentRecord,
  ExceptionType,
  Priority,
  Role,
  TimelineEvent,
  UiPathDocumentReference,
} from './mockData';
import {
  demoCoachTips,
  faqs,
  glossary,
  helpCategories,
  helpContent,
  roleHelp,
  tooltips,
} from './helpContent';
import type { HelpCategory, HelpContextId } from './helpContent';
import uiPathLogoUrl from './assets/uipath-logo-digital-rgb-b.svg';

type Screen = 'inbox' | 'detail' | 'operations' | 'assignment' | 'testing' | 'settings' | 'helpCenter';
type OperationsSubtab = 'Operations Summary' | 'IES SNAP Dash';
type DetailTab =
  | 'Summary'
  | 'Actions'
  | 'Application'
  | 'Interview / Missing Info'
  | 'Documents'
  | 'Clearance'
  | 'External Validation'
  | 'Budget'
  | 'Forms & Notices'
  | 'Timeline / Audit'
  | 'Raw Case JSON';

type ToastTone = 'success' | 'info' | 'warning' | 'error';
type LiveLoadState = 'idle' | 'loading' | 'ready' | 'error';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ModalState {
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
}

interface TaskEmbedState {
  taskId: number;
  title: string;
  taskLink: string;
  embedUrl: string;
  tab?: LiveActionAppTab;
}

interface RefreshLiveTasksOptions {
  preserveVisibleTasks?: boolean;
}

interface ConfirmActionOptions {
  title: string;
  guidance: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface DocumentSourceCandidate {
  mimeType?: string;
  caseFileUrl?: string;
  localSourcePath?: string;
  uiPathDocumentRef?: UiPathDocumentReference;
}

type BucketDocumentSourceMode = 'orchestrator-get-read-uri' | 'static-blob-fallback';

interface ResolvedDocumentSource {
  url: string;
  mimeType: string;
  sourceLabel: string;
  sourceMode?: BucketDocumentSourceMode;
  localSourcePath?: string;
  uiPathDocumentRef?: UiPathDocumentReference;
}

interface Filters {
  search: string;
  county: string;
  region: string;
  status: string;
  priority: string;
  exception: string;
  dueSoon: boolean;
  expedited: boolean;
  assignedGroup: string;
}

type LocalAssignmentTaskStatus = 'Ready' | 'Queued' | 'Completed';
type AssignmentSubtab = 'Task Assignments' | 'PTO Calendar' | 'My Team';
type AssignmentRoutingMode = 'User' | 'Workload based' | 'All users of group' | 'Round robin';

interface LocalAssignmentUser {
  name: string;
  email: string;
  assignedGroup: string;
}

interface LocalAssignmentOverride {
  assignedTo: string;
  assignedGroup: string;
}

interface LocalPtoEntry {
  id: string;
  userName: string;
  workerEmail: string;
  assignedGroup: string;
  startDate: string;
  endDate: string;
  reason: string;
}

interface LocalPtoCalendarDay {
  date: string;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  entries: LocalPtoEntry[];
}

interface LocalAssignmentTask {
  id: string;
  caseId: string;
  caseNumber: string;
  applicantName: string;
  county: string;
  priority: Priority;
  taskName: string;
  appName: string;
  taskId?: number;
  process: string;
  lane: string;
  tab: LiveActionAppTab;
  status: LocalAssignmentTaskStatus;
  assignedTo: string;
  assignedGroup: string;
  dueDate: string;
  isAssignedUserOnPto: boolean;
  actionDefinition?: ActionAppDefinition;
}

const emptyFilters: Filters = {
  search: '',
  county: 'all',
  region: 'all',
  status: 'all',
  priority: 'all',
  exception: 'all',
  dueSoon: false,
  expedited: false,
  assignedGroup: 'all',
};

const defaultAssignmentUsers: LocalAssignmentUser[] = [
  {
    name: 'Sohail Ghatnekar',
    email: IES_WORKFLOW_CONFIG.defaultApplicantEmail,
    assignedGroup: 'Eligibility Review',
  },
  {
    name: 'Maya Rivera',
    email: 'maya.rivera@uipath.com',
    assignedGroup: 'Document Review',
  },
  {
    name: 'Noah Chen',
    email: 'noah.chen@uipath.com',
    assignedGroup: 'Clearance Unit',
  },
  {
    name: 'Priya Shah',
    email: 'priya.shah@uipath.com',
    assignedGroup: 'Budget Unit',
  },
];

const assignmentTaskStatusOptions: Array<LocalAssignmentTaskStatus | 'all'> = [
  'all',
  'Ready',
  'Queued',
  'Completed',
];

const defaultAssignmentTaskStatusFilter: LocalAssignmentTaskStatus | 'all' = 'Ready';

const operationsSubtabOptions: OperationsSubtab[] = ['Operations Summary', 'IES SNAP Dash'];
const assignmentSubtabOptions: AssignmentSubtab[] = ['Task Assignments', 'PTO Calendar', 'My Team'];
const caseWorkerAssignmentSubtabOptions: AssignmentSubtab[] = ['PTO Calendar'];
const assignmentRoutingModeOptions: AssignmentRoutingMode[] = [
  'User',
  'Workload based',
  'All users of group',
  'Round robin',
];

const defaultTaskAssignmentEmail = 'sohail.ghatnekar@uipath.com';

const defaultAssignmentPtoEntries: LocalPtoEntry[] = [
  {
    id: 'pto-sohail-2026-06-10',
    userName: 'Sohail Ghatnekar',
    workerEmail: IES_WORKFLOW_CONFIG.defaultApplicantEmail,
    assignedGroup: 'Eligibility Review',
    startDate: '2026-06-10',
    endDate: '2026-06-12',
    reason: 'PTO',
  },
  {
    id: 'pto-maya-2026-06-16',
    userName: 'Maya Rivera',
    workerEmail: 'maya.rivera@uipath.com',
    assignedGroup: 'Document Review',
    startDate: '2026-06-16',
    endDate: '2026-06-17',
    reason: 'PTO',
  },
];

const demoOperationsMetrics = {
  averageCaseAge: '18 days',
  dueSoon: 11,
  missingInfo: 16,
  needingDocuments: 14,
  clearanceReview: 9,
  supervisorReview: 5,
};

const demoOperationsGroupedMetrics = {
  byCounty: [
    { label: 'Albany', value: 14 },
    { label: 'Erie', value: 17 },
    { label: 'Hamilton', value: 6 },
    { label: 'Monroe', value: 19 },
    { label: 'Queens', value: 23 },
  ],
  byRegion: [
    { label: 'Capital', value: 14 },
    { label: 'Finger Lakes', value: 19 },
    { label: 'North Country', value: 6 },
    { label: 'NYC', value: 23 },
    { label: 'Western', value: 17 },
  ],
  byStatus: [
    { label: 'Pending Review', value: 18 },
    { label: 'Missing Information', value: 16 },
    { label: 'Document Review', value: 14 },
    { label: 'Clearance Review', value: 9 },
    { label: 'Ready for Budget', value: 12 },
    { label: 'Approved', value: 10 },
  ],
  byGroup: [
    { label: 'Eligibility Review', value: 21 },
    { label: 'Document Review', value: 14 },
    { label: 'Clearance Unit', value: 9 },
    { label: 'Budget Unit', value: 12 },
    { label: 'Supervisor Queue', value: 5 },
    { label: 'Operations', value: 3 },
  ],
};

const demoOperationsBottlenecks = [
  {
    county: 'Albany',
    region: 'Capital',
    openCases: 14,
    dueSoon: 2,
    missingInfo: 3,
    documentReview: 4,
    clearanceReview: 1,
    averageAge: 16,
    primaryBottleneck: 'Document Review',
  },
  {
    county: 'Erie',
    region: 'Western',
    openCases: 17,
    dueSoon: 4,
    missingInfo: 5,
    documentReview: 2,
    clearanceReview: 3,
    averageAge: 22,
    primaryBottleneck: 'Missing Info',
  },
  {
    county: 'Hamilton',
    region: 'North Country',
    openCases: 6,
    dueSoon: 1,
    missingInfo: 1,
    documentReview: 1,
    clearanceReview: 0,
    averageAge: 11,
    primaryBottleneck: 'Balanced',
  },
  {
    county: 'Monroe',
    region: 'Finger Lakes',
    openCases: 19,
    dueSoon: 3,
    missingInfo: 4,
    documentReview: 5,
    clearanceReview: 2,
    averageAge: 19,
    primaryBottleneck: 'Document Review',
  },
  {
    county: 'Queens',
    region: 'NYC',
    openCases: 23,
    dueSoon: 1,
    missingInfo: 3,
    documentReview: 2,
    clearanceReview: 6,
    averageAge: 24,
    primaryBottleneck: 'Clearance Review',
  },
];

const detailTabs: DetailTab[] = [
  'Summary',
  'Actions',
  'Application',
  'Interview / Missing Info',
  'Documents',
  'Clearance',
  'External Validation',
  'Budget',
  'Forms & Notices',
  'Timeline / Audit',
  'Raw Case JSON',
];

const liveActionTabByDetailTab: Partial<Record<DetailTab, LiveActionAppTab>> = {
  Summary: 'Summary',
  'Interview / Missing Info': 'Interview / Missing Info',
  Documents: 'Documents',
  Clearance: 'Clearance',
  'External Validation': 'External Validation',
  Budget: 'Budget',
};

const subprocessTabByChecklistLabel: Partial<Record<string, LiveActionAppTab>> = {
  'Interview complete': 'Interview / Missing Info',
  'Documents reviewed': 'Documents',
  'Clearance reviewed': 'Clearance',
  'External validations reviewed': 'External Validation',
};

const summaryChecklistRows = [
  { sourceLabel: 'Application reviewed', label: 'Application reviewed' },
  { sourceLabel: 'Interview complete', label: 'Interview' },
  { sourceLabel: 'Documents reviewed', label: 'Documents Reviewed' },
  { sourceLabel: 'Clearance reviewed', label: 'Clearance Reviewed' },
  { sourceLabel: 'External validations reviewed', label: 'External validations reviewed' },
  { sourceLabel: 'Budget reviewed', label: 'Budget Reviewed' },
  { sourceLabel: 'Notice prepared', label: 'Notice prepared' },
];

const clearanceRevealEventTypes = [
  'Mock Clearance Search Run',
  'Clearance Match Accepted',
  'Clearance Match Rejected',
  'New Identifier Assigned',
];

const externalValidationRevealEventTypes = [
  'External Validation Completed',
  'Data Discrepancy Found',
  'Discrepancy Reviewed',
  'External Validations Reviewed',
];

const nysItsLogoUrl = 'https://its.ny.gov/profiles/custom/webny/themes/custom/webny_theme/images/nygov-logo.png';

function getErrorMessage(error: unknown): string {
  const details = error as {
    statusCode?: number;
    requestId?: string;
    type?: string;
  };

  if (error instanceof Error && error.message) {
    return [
      error.message,
      details.statusCode ? `Status: ${details.statusCode}.` : null,
      details.requestId ? `Request ID: ${details.requestId}.` : null,
    ].filter(Boolean).join(' ');
  }

  return 'UiPath request failed.';
}

function inferMimeType(url: string) {
  const normalizedUrl = url.toLowerCase();

  if (normalizedUrl.endsWith('.pdf')) {
    return 'application/pdf';
  }

  if (normalizedUrl.endsWith('.jpg') || normalizedUrl.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (normalizedUrl.endsWith('.png')) {
    return 'image/png';
  }

  return 'application/octet-stream';
}

function resolveDocumentSource(candidate: DocumentSourceCandidate): ResolvedDocumentSource | null {
  const caseFileUrl = candidate.caseFileUrl?.trim();

  if (!caseFileUrl) {
    return null;
  }

  return {
    url: caseFileUrl,
    mimeType: candidate.mimeType || inferMimeType(caseFileUrl),
    sourceLabel: 'Case-associated file',
    localSourcePath: candidate.localSourcePath,
    uiPathDocumentRef: candidate.uiPathDocumentRef,
  };
}

const applicationPdfDocumentRef: UiPathDocumentReference = {
  repository: 'UiPath Orchestrator Storage Bucket',
  folderPath: `${IES_WORKFLOW_CONFIG.applicationPdfBucket.folderId}:${IES_WORKFLOW_CONFIG.applicationPdfBucket.bucketId}`,
  documentId: IES_WORKFLOW_CONFIG.applicationPdfBucket.fileName,
  resolver: IES_WORKFLOW_CONFIG.applicationPdfBucket.browseUrl,
};

function getBucketSourceLabel(_sourceMode: BucketDocumentSourceMode): string {
  return 'Orchestrator storage bucket';
}

function getBucketSourceTag(sourceMode?: BucketDocumentSourceMode): { label: string; className: string } | null {
  if (sourceMode === 'orchestrator-get-read-uri') {
    return {
      label: 'Storage bucket',
      className: 'bg-blue-50 text-blue-800 border-blue-200',
    };
  }

  if (sourceMode === 'static-blob-fallback') {
    return {
      label: 'Blob',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  return null;
}

function buildApplicationPdfBucketSource(source: { url: string; sourceMode: BucketDocumentSourceMode }): ResolvedDocumentSource {
  return {
    url: source.url,
    mimeType: 'application/pdf',
    sourceLabel: getBucketSourceLabel(source.sourceMode),
    sourceMode: source.sourceMode,
    uiPathDocumentRef: applicationPdfDocumentRef,
  };
}

function getBucketDocumentRef(bucketId: number, fileName: string, resolver: string): UiPathDocumentReference {
  return {
    repository: 'UiPath Orchestrator Storage Bucket',
    folderPath: `${IES_WORKFLOW_CONFIG.documentEvidenceBucket.folderId}:${bucketId}`,
    documentId: fileName,
    resolver,
  };
}

function buildEvidenceBucketSource(
  source: { url: string; sourceMode: BucketDocumentSourceMode },
  bucketDocument: EvidenceBucketDocumentConfig,
): ResolvedDocumentSource {
  return {
    url: source.url,
    mimeType: bucketDocument.mimeType,
    sourceLabel: getBucketSourceLabel(source.sourceMode),
    sourceMode: source.sourceMode,
    uiPathDocumentRef: getBucketDocumentRef(
      IES_WORKFLOW_CONFIG.documentEvidenceBucket.bucketId,
      bucketDocument.fileName,
      IES_WORKFLOW_CONFIG.documentEvidenceBucket.browseUrl,
    ),
  };
}

type EvidenceBucketDocumentConfig = typeof IES_WORKFLOW_CONFIG.documentEvidenceBucket.documents[number];

function getEvidenceBucketDocumentConfig(documentItem: DocumentRecord): EvidenceBucketDocumentConfig | null {
  const documentId = documentItem.uiPathDocumentRef?.documentId;

  if (!documentId) {
    return null;
  }

  return IES_WORKFLOW_CONFIG.documentEvidenceBucket.documents.find((bucketDocument) =>
    bucketDocument.fileName === documentId
  ) || null;
}

const liveCaseFieldKeys = {
  id: ['Id', 'id'],
  mybNumber: ['MyBNumber', 'myBNumber', 'MYBNumber'],
  applicantName: ['ApplicantFullName', 'ApplicantName', 'applicantName'],
  applicantEmail: ['ApplicantEmail', 'applicantEmail', 'email'],
  county: ['County', 'county'],
  region: ['Region', 'region'],
  filingDate: ['FilingDate', 'filingDate'],
  eligibilityDueDate: ['EligibilityDueDate', 'eligibilityDueDate'],
  currentStatus: ['CurrentStatus', 'currentStatus', 'status'],
  currentStage: ['CurrentStage', 'currentStage'],
  currentStageLabel: ['CurrentStageLabel', 'currentStageLabel', 'StageName', 'stageName'],
  priority: ['Priority', 'priority'],
  assignedGroup: ['AssignedGroup', 'assignedGroup'],
  assignedWorker: ['AssignedWorker', 'assignedWorker'],
  expeditedFlag: ['ExpeditedFlag', 'expeditedFlag'],
  missingInformationFlag: ['MissingInformationFlag', 'missingInformationFlag'],
  missingInformationSummary: ['MissingInformationSummary', 'missingInformationSummary'],
  documentReviewNeeded: ['DocumentReviewNeeded', 'documentReviewNeeded'],
  clearanceReviewNeeded: ['ClearanceReviewNeeded', 'clearanceReviewNeeded'],
  externalValidationNeeded: ['ExternalValidationNeeded', 'externalValidationNeeded'],
  supervisorReviewRequired: ['SupervisorReviewRequired', 'supervisorReviewRequired'],
  householdSize: ['HouseholdSize', 'householdSize'],
  grossMonthlyIncome: ['GrossMonthlyIncome', 'grossMonthlyIncome'],
  benefitAmount: [
    'BenefitAmount',
    'benefitAmount',
    'CalculatedBenefitAmount',
    'calculatedBenefitAmount',
    'CalculatedAmount',
    'calculatedAmount',
    'BudgetAmount',
    'budgetAmount',
    'MonthlyBenefitAmount',
    'monthlyBenefitAmount',
  ],
  noticeStatus: ['NoticeStatus', 'noticeStatus'],
  lastAuditEvent: ['LastAuditEvent', 'lastAuditEvent'],
  rawCaseJson: ['RawCaseJSON', 'RawCaseJson', 'rawCaseJSON'],
  createTime: ['CreateTime', 'createTime', 'CreatedTime', 'createdTime', 'CreationTime', 'creationTime', 'CreatedOn', 'createdOn'],
  updateTime: ['UpdateTime', 'updateTime', 'UpdatedTime', 'updatedTime', 'LastModifiedTime', 'lastModifiedTime', 'ModifiedTime', 'modifiedTime', 'UpdatedOn', 'updatedOn'],
} as const;

const liveInterviewFieldKeys = {
  status: ['InterviewStatus', 'interviewStatus', 'InterviewOutcome', 'interviewOutcome'],
  method: ['InterviewMethod', 'interviewMethod'],
  scheduledAt: ['InterviewScheduledAt', 'interviewScheduledAt', 'InterviewScheduledDateTime', 'interviewScheduledDateTime'],
  completedAt: ['InterviewCompletedAt', 'interviewCompletedAt', 'InterviewConductedAt', 'interviewConductedAt', 'InterviewDate', 'interviewDate'],
  applicantContactStatus: ['ApplicantContactStatus', 'applicantContactStatus', 'InterviewContactStatus', 'interviewContactStatus'],
  applicantResponseStatus: ['ApplicantResponseStatus', 'applicantResponseStatus', 'InterviewResponseStatus', 'interviewResponseStatus'],
  missingFields: ['InterviewMissingFields', 'interviewMissingFields', 'MissingFields', 'missingFields'],
  workerNotes: ['InterviewWorkerNotes', 'interviewWorkerNotes', 'InterviewNotes', 'interviewNotes', 'WorkerNotes', 'workerNotes'],
} as const;

const liveCaseStatusByChoice: Record<string, CaseStatus> = {
  '1': 'Pending Review',
  '2': 'Missing Information',
  '3': 'Document Review',
  '4': 'Clearance Review',
  '5': 'Ready for Budget',
  '6': 'Approved',
  '7': 'Denied',
  '8': 'Withdrawn',
  '9': 'Pending Review',
};

const liveCaseStageByChoice: Record<string, string> = {
  '1': 'Application Intake',
  '2': 'Document Review',
  '3': 'Clearance Review',
  '4': 'External Validation',
  '5': 'Budget Review',
  '6': 'Maestro Intake',
  '7': 'Worker Review',
  '8': 'Notice Review',
  '9': 'Final Review',
};

const liveCasePriorityByChoice: Record<string, Priority> = {
  '1': 'Critical',
  '2': 'High',
  '3': 'Medium',
  '4': 'Normal',
};

const liveCaseStageOrderByChoice: Record<string, number> = {
  '1': 1,
  '2': 3,
  '3': 4,
  '4': 5,
  '5': 6,
  '6': 1,
  '7': 1,
  '8': 7,
  '9': 8,
};

const liveCaseStageOrderByLabel: Record<string, number> = {
  'application intake': 1,
  'maestro intake': 1,
  'worker review': 1,
  'interview': 2,
  'interview review': 2,
  'missing info': 2,
  'missing information': 2,
  'document review': 3,
  'clearance review': 4,
  'external validation': 5,
  'budget review': 6,
  'notice review': 7,
  'final review': 8,
};

const liveCountyByChoice: Record<string, string> = {
  '1': 'Albany',
  '2': 'Monroe',
  '3': 'Erie',
  '4': 'Queens',
  '5': 'Hamilton',
};

const countyRegionMap: Record<string, string> = {
  Albany: 'Capital',
  Erie: 'Western',
  Hamilton: 'North Country',
  Monroe: 'Finger Lakes',
  Queens: 'NYC',
};

function firstRecordValue(record: LiveCaseRecord, keys: readonly string[]): unknown {
  const source = record as Record<string, unknown>;

  for (const key of keys) {
    const value = source[key];

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function readRecordString(record: LiveCaseRecord, keys: readonly string[]): string | null {
  const value = firstRecordValue(record, keys);

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'object' && value) {
    const displayValue = value as Record<string, unknown>;
    const label = displayValue.displayName || displayValue.name || displayValue.value || displayValue.id;
    return typeof label === 'string' && label.trim() ? label.trim() : null;
  }

  return null;
}

function readRecordNumber(record: LiveCaseRecord, keys: readonly string[]): number | null {
  const value = firstRecordValue(record, keys);

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const normalizedValue = value.trim().replace(/[$,]/g, '');
    const parsed = Number(normalizedValue);
    if (Number.isFinite(parsed)) {
      return parsed;
    }

    const numericText = normalizedValue.match(/-?\d+(\.\d+)?/)?.[0];
    const parsedFromText = numericText ? Number(numericText) : Number.NaN;
    return Number.isFinite(parsedFromText) ? parsedFromText : null;
  }

  return null;
}

function readRecordBoolean(record: LiveCaseRecord, keys: readonly string[]): boolean {
  const value = firstRecordValue(record, keys);

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'y'].includes(value.trim().toLowerCase());
  }

  return false;
}

function readOptionalRecordBoolean(record: LiveCaseRecord, keys: readonly string[]): boolean | null {
  const value = firstRecordValue(record, keys);

  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'y'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'n'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function readChoiceLabel(
  record: LiveCaseRecord,
  keys: readonly string[],
  labelsByChoice: Record<string, string>,
): string | null {
  const raw = readRecordString(record, keys);

  if (!raw) {
    return null;
  }

  return labelsByChoice[raw] || raw;
}

function readDateString(record: LiveCaseRecord, keys: readonly string[]): string | null {
  const value = readRecordString(record, keys);

  if (!value) {
    return null;
  }

  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function splitRecordListValue(value: string): string[] {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return [];
  }

  if (trimmedValue.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmedValue);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => typeof item === 'string' ? item.trim() : '')
          .filter(Boolean);
      }
    } catch {
      // Fall through to plain text splitting.
    }
  }

  return trimmedValue
    .split(/\r?\n|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readRecordList(record: LiveCaseRecord, keys: readonly string[]): string[] {
  const value = firstRecordValue(record, keys);

  if (Array.isArray(value)) {
    return value
      .map((item) => typeof item === 'string' ? item.trim() : '')
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return splitRecordListValue(value);
  }

  return [];
}

function addMonths(value: string, months: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function asCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function coerceLiveStatus(record: LiveCaseRecord, fallback: CaseStatus = 'Pending Review'): CaseStatus {
  const status = readRecordString(record, liveCaseFieldKeys.currentStatus);

  if (!status) {
    return fallback;
  }

  if (statusOptions.includes(status as CaseStatus)) {
    return status as CaseStatus;
  }

  return liveCaseStatusByChoice[status] || fallback;
}

function coerceLivePriority(record: LiveCaseRecord, expedited: boolean, fallback: Priority): Priority {
  const priority = readRecordString(record, liveCaseFieldKeys.priority);
  const normalizedPriority = priority?.trim().toLowerCase();

  if (priority && priorityOptions.includes(priority as Priority)) {
    return priority as Priority;
  }

  const matchingPriority = priorityOptions.find((option) => option.toLowerCase() === normalizedPriority);

  if (matchingPriority) {
    return matchingPriority;
  }

  if (priority && liveCasePriorityByChoice[priority]) {
    return liveCasePriorityByChoice[priority];
  }

  return expedited && fallback === 'Normal' ? 'High' : fallback;
}

function parseRawCaseJson(record: LiveCaseRecord): Record<string, unknown> {
  const raw = readRecordString(record, liveCaseFieldKeys.rawCaseJson);

  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function deriveAssignedGroup(record: LiveCaseRecord, status: CaseStatus, fallback = 'Eligibility Review'): string {
  const assignedGroup = readRecordString(record, liveCaseFieldKeys.assignedGroup);

  if (assignedGroup) {
    return assignedGroup;
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.supervisorReviewRequired)) {
    return 'Supervisor Queue';
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.documentReviewNeeded) || status === 'Document Review') {
    return 'Document Review';
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.clearanceReviewNeeded) || status === 'Clearance Review') {
    return 'Clearance Unit';
  }

  if (status === 'Ready for Budget') {
    return 'Budget Unit';
  }

  return fallback || 'Eligibility Review';
}

function deriveLiveException(record: LiveCaseRecord, dueDate: string, fallback: ExceptionType = 'None'): ExceptionType {
  if (readRecordBoolean(record, liveCaseFieldKeys.supervisorReviewRequired)) {
    return 'Supervisor Review';
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.missingInformationFlag)) {
    return 'Missing Info';
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.documentReviewNeeded)) {
    return 'OCR Review';
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.clearanceReviewNeeded)) {
    return 'Clearance Match';
  }

  const days = daysUntil(dueDate);
  if (days >= 0 && days <= 5) {
    return 'Due Soon';
  }

  return fallback || 'None';
}

function buildLiveBlockers(record: LiveCaseRecord, fallback: string[] = []): string[] {
  const blockers = [...fallback];
  const missingSummary = readRecordString(record, liveCaseFieldKeys.missingInformationSummary);

  if (missingSummary) {
    blockers.unshift(missingSummary);
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.documentReviewNeeded)) {
    blockers.unshift('Document review needed');
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.clearanceReviewNeeded)) {
    blockers.unshift('Clearance review needed');
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.externalValidationNeeded)) {
    blockers.unshift('External validation needed');
  }

  if (readRecordBoolean(record, liveCaseFieldKeys.supervisorReviewRequired)) {
    blockers.unshift('Supervisor review requested before final notice.');
  }

  return Array.from(new Set(blockers));
}

function matchesAny(value: string | null, terms: string[]): boolean {
  const normalized = value?.trim().toLowerCase() || '';
  return terms.some((term) => normalized.includes(term));
}

function getLiveStageNumber(record: LiveCaseRecord): number | null {
  const numericStage = readRecordNumber(record, liveCaseFieldKeys.currentStage);

  if (numericStage !== null) {
    return numericStage;
  }

  const stageChoice = readRecordString(record, liveCaseFieldKeys.currentStage);

  if (stageChoice && liveCaseStageOrderByChoice[stageChoice]) {
    return liveCaseStageOrderByChoice[stageChoice];
  }

  const stageLabel = readChoiceLabel(record, liveCaseFieldKeys.currentStage, liveCaseStageByChoice)
    || readRecordString(record, liveCaseFieldKeys.currentStageLabel);
  const normalizedStage = stageLabel?.trim().toLowerCase() || '';

  return liveCaseStageOrderByLabel[normalizedStage] || null;
}

function getLiveCurrentStage(record: LiveCaseRecord, status: CaseStatus): string {
  const liveStage = readChoiceLabel(record, liveCaseFieldKeys.currentStage, liveCaseStageByChoice)
    || readRecordString(record, liveCaseFieldKeys.currentStageLabel);

  if (liveStage) {
    return liveStage;
  }

  switch (status) {
    case 'Missing Information':
      return 'Interview Review';
    case 'Document Review':
      return 'Document Review';
    case 'Clearance Review':
      return 'Clearance Review';
    case 'Ready for Budget':
      return 'Budget Review';
    case 'Approved':
    case 'Denied':
    case 'Withdrawn':
      return 'Final Review';
    case 'Pending Review':
      return 'Maestro Intake';
  }
}

function buildLiveChecklist(record: LiveCaseRecord, status: CaseStatus): BenefitCase['checklist'] {
  const stageNumber = getLiveStageNumber(record);
  const missingInformation = readRecordBoolean(record, liveCaseFieldKeys.missingInformationFlag) || status === 'Missing Information';
  const documentReviewNeeded = readOptionalRecordBoolean(record, liveCaseFieldKeys.documentReviewNeeded);
  const clearanceReviewNeeded = readOptionalRecordBoolean(record, liveCaseFieldKeys.clearanceReviewNeeded);
  const externalValidationNeeded = readOptionalRecordBoolean(record, liveCaseFieldKeys.externalValidationNeeded);
  const benefitAmount = readRecordNumber(record, liveCaseFieldKeys.benefitAmount);
  const noticeStatus = readRecordString(record, liveCaseFieldKeys.noticeStatus);
  const stageProgress = (
    stage: number,
    needsReview = false,
    completed = false,
  ): ChecklistStatus => {
    if (completed) {
      return 'Completed';
    }

    if (needsReview) {
      return 'Needs Review';
    }

    if (stageNumber === stage) {
      return 'In Process';
    }

    return 'Not Started';
  };

  return [
    {
      label: 'Application reviewed',
      status: stageNumber === null || stageNumber <= 1 ? 'In Process' : 'Completed',
    },
    {
      label: 'Interview complete',
      status: missingInformation ? 'Needs Review' : stageProgress(2, false, stageNumber !== null && stageNumber > 2),
    },
    {
      label: 'Documents reviewed',
      status: stageProgress(3, documentReviewNeeded === true, documentReviewNeeded === false && stageNumber !== null && stageNumber > 3),
    },
    {
      label: 'Clearance reviewed',
      status: stageProgress(4, clearanceReviewNeeded === true, clearanceReviewNeeded === false && stageNumber !== null && stageNumber > 4),
    },
    {
      label: 'External validations reviewed',
      status: stageProgress(5, externalValidationNeeded === true, externalValidationNeeded === false && stageNumber !== null && stageNumber > 5),
    },
    {
      label: 'Budget reviewed',
      status: stageProgress(6, status === 'Ready for Budget', Boolean(benefitAmount)),
    },
    {
      label: 'Notice prepared',
      status: matchesAny(noticeStatus, ['sent', 'approved', 'printed', 'generated'])
        ? 'Completed'
        : noticeStatus ? 'Needs Review' : 'Not Started',
    },
  ];
}

function buildLiveInterview(record: LiveCaseRecord): BenefitCase['interview'] {
  const completedAt = readRecordString(record, liveInterviewFieldKeys.completedAt);
  const scheduledAt = readRecordString(record, liveInterviewFieldKeys.scheduledAt);
  const applicantResponseStatus = readRecordString(record, liveInterviewFieldKeys.applicantResponseStatus) || '';
  const explicitMissingFields = readRecordList(record, liveInterviewFieldKeys.missingFields);
  const missingInformationSummary = readRecordString(record, liveCaseFieldKeys.missingInformationSummary);
  const missingFields = explicitMissingFields.length > 0
    ? explicitMissingFields
    : missingInformationSummary ? splitRecordListValue(missingInformationSummary) : [];

  return {
    status: readRecordString(record, liveInterviewFieldKeys.status) || (completedAt ? 'Completed' : ''),
    method: readRecordString(record, liveInterviewFieldKeys.method) || '',
    scheduledAt: scheduledAt ? formatDateTime(scheduledAt) : '',
    missingFields,
    workerNotes: readRecordList(record, liveInterviewFieldKeys.workerNotes),
    applicantContactStatus: readRecordString(record, liveInterviewFieldKeys.applicantContactStatus) || '',
    applicantResponseStatus,
    mockEmailState: applicantResponseStatus === 'Response Received' ? 'Response Received' : 'Drafted',
  };
}

function getCaseNewestTime(caseItem: BenefitCase): number {
  const candidates = [
    caseItem.timeline[0]?.timestamp,
    caseItem.timeline[1]?.timestamp,
    caseItem.filingDate,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const timestamp = Date.parse(candidate.includes('T') ? candidate : `${candidate}T12:00:00`);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function compareCasesNewestFirst(left: BenefitCase, right: BenefitCase): number {
  const newestDelta = getCaseNewestTime(right) - getCaseNewestTime(left);

  if (newestDelta !== 0) {
    return newestDelta;
  }

  return right.mybNumber.localeCompare(left.mybNumber, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function mapLiveRecordToCase(record: LiveCaseRecord): BenefitCase {
  const rawCase = parseRawCaseJson(record);
  const recordId = readRecordString(record, liveCaseFieldKeys.id);
  const mybNumber = readRecordString(record, liveCaseFieldKeys.mybNumber)
    || (typeof rawCase.myBNumber === 'string' ? rawCase.myBNumber : null)
    || recordId
    || 'Data Fabric Case';
  const matchingTemplate = initialCases.find((caseItem) => caseItem.mybNumber === mybNumber);
  const applicationTemplate = initialCases.find((caseItem) => caseItem.mybNumber === 'MYB-1004')
    || initialCases[0];
  const template = matchingTemplate || applicationTemplate;
  const applicantEmail = readRecordString(record, liveCaseFieldKeys.applicantEmail) || '';
  const applicantName = readRecordString(record, liveCaseFieldKeys.applicantName)
    || (typeof rawCase.ApplicantName === 'string' ? rawCase.ApplicantName : null)
    || template.applicantName
    || applicantEmail
    || mybNumber;
  const county = readChoiceLabel(record, liveCaseFieldKeys.county, liveCountyByChoice) || template.county;
  const region = readChoiceLabel(record, liveCaseFieldKeys.region, countyRegionMap) || countyRegionMap[county] || template.region;
  const filingDate = readDateString(record, liveCaseFieldKeys.filingDate) || template.filingDate;
  const eligibilityDueDate = addMonths(filingDate, 2);
  const status = coerceLiveStatus(record, 'Pending Review');
  const currentStage = getLiveCurrentStage(record, status);
  const expedited = readRecordBoolean(record, liveCaseFieldKeys.expeditedFlag) || template.expedited;
  const priority = coerceLivePriority(record, expedited, expedited ? 'High' : 'Normal');
  const assignedGroup = deriveAssignedGroup(record, status);
  const assignedWorker = readRecordString(record, liveCaseFieldKeys.assignedWorker) || 'Unassigned';
  const exception = deriveLiveException(record, eligibilityDueDate);
  const lastAuditEvent = readRecordString(record, liveCaseFieldKeys.lastAuditEvent);
  const grossMonthlyIncome = readRecordNumber(record, liveCaseFieldKeys.grossMonthlyIncome);
  const benefitAmount = readRecordNumber(record, liveCaseFieldKeys.benefitAmount);
  const rawDocumentName = typeof rawCase.applicationDocumentName === 'string' ? rawCase.applicationDocumentName : null;
  const rawDocumentUri = typeof rawCase.applicationDocumentUri === 'string' ? rawCase.applicationDocumentUri : null;
  const description = typeof rawCase.demoScenario === 'string'
    ? rawCase.demoScenario
    : lastAuditEvent || `Live Data Fabric case ${mybNumber}`;
  const recordActivityTimestamp = readRecordString(record, liveCaseFieldKeys.updateTime)
    || readRecordString(record, liveCaseFieldKeys.createTime)
    || `${filingDate}T12:00:00`;
  const liveTimelineEvent: TimelineEvent = {
    id: `${recordId || mybNumber}-data-fabric-load`,
    timestamp: recordActivityTimestamp,
    eventType: 'Data Fabric Record Loaded',
    actor: 'UiPath Data Fabric',
    role: 'System',
    statusBefore: 'Live record',
    statusAfter: status,
    notes: lastAuditEvent || `Loaded ${mybNumber} from the IES Case Management entity.`,
    duration: 'Live sync',
    relatedScreen: 'Case Inbox',
    category: 'System actions',
  };

  return {
    ...template,
    id: recordId || template.id || mybNumber,
    mybNumber,
    applicantName,
    description,
    county,
    region,
    filingDate,
    eligibilityDueDate,
    status,
    currentStage,
    assignedGroup,
    assignedWorker,
    priority,
    exception,
    expedited,
    currentBlockers: buildLiveBlockers(record),
    checklist: buildLiveChecklist(record, status),
    applicant: {
      ...template.applicant,
      email: applicantEmail || 'Not updated in Data Fabric',
      phone: 'Not Listed',
      address: template.applicant.address,
      preferredLanguage: 'English',
      contactPreference: 'Email',
    },
    income: grossMonthlyIncome
      ? [{
        source: 'Data Fabric gross monthly income',
        person: applicantName,
        frequency: 'Monthly',
        grossAmount: asCurrency(grossMonthlyIncome),
        verified: false,
      }]
      : [],
    expenses: [],
    budget: {
      ...template.budget,
      incomeUsed: grossMonthlyIncome !== null ? asCurrency(grossMonthlyIncome) : '',
      expensesUsed: '',
      mockBenefitAmount: benefitAmount !== null ? `${asCurrency(benefitAmount)}/month` : '',
      status: benefitAmount !== null ? 'Calculation successful' : 'Awaiting budget calculation',
    },
    application: {
      ...template.application,
      submittedDocumentsSummary: rawDocumentName || template.application.submittedDocumentsSummary,
      caseFileUrl: rawDocumentUri && rawDocumentUri.startsWith('http') ? rawDocumentUri : template.application.caseFileUrl,
    },
    interview: buildLiveInterview(record),
    timeline: [liveTimelineEvent, ...template.timeline],
  };
}

const inboxPageSize = 10;

type MockTestProtocol = 'REST' | 'SOAP' | 'SFTP';

interface MockTestScenario {
  id: string;
  protocol: MockTestProtocol;
  title: string;
  summary: string;
  target: string;
  command: string;
  requestPreview?: string;
  returnInfo: string;
  expectedResult: string;
}

const mockTestScenarios: MockTestScenario[] = [
  {
    id: 'soap-eligibility',
    protocol: 'SOAP',
    title: 'SOAP Eligibility Inquiry',
    summary: 'Show a SOAP envelope placeholder for an eligibility inquiry and the static XML response.',
    target: 'mock://benefits-demo/soap/eligibility-inquiry',
    command: `curl -X POST "mock://benefits-demo/soap/eligibility-inquiry" \\
  -H "Content-Type: text/xml" \\
  -H "SOAPAction: EligibilityInquiry" \\
  --data-binary @mock-eligibility-inquiry.xml`,
    requestPreview: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ben="http://demo.uipath.com/benefits">
  <soapenv:Header/>
  <soapenv:Body>
    <ben:EligibilityInquiryRequest>
      <ben:CaseId>MYB-1004</ben:CaseId>
      <ben:Program>SNAP</ben:Program>
      <ben:DemoMode>true</ben:DemoMode>
    </ben:EligibilityInquiryRequest>
  </soapenv:Body>
</soapenv:Envelope>`,
    returnInfo: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ben="http://demo.uipath.com/benefits">
  <soapenv:Body>
    <ben:EligibilityInquiryResponse>
      <ben:CaseId>MYB-1004</ben:CaseId>
      <ben:Result>WorkerReviewRequired</ben:Result>
      <ben:Reason>UtilityAndFluctuatingIncomeReviewRequired</ben:Reason>
      <ben:Mock>true</ben:Mock>
    </ben:EligibilityInquiryResponse>
  </soapenv:Body>
</soapenv:Envelope>`,
    expectedResult: 'Worker review required',
  },
  {
    id: 'rest-case-lookup',
    protocol: 'REST',
    title: 'REST Case Lookup',
    summary: 'Copy a REST-style cURL command for a case lookup and show the static JSON return.',
    target: 'GET mock://benefits-demo/cases/MYB-1004',
    command: `curl -X GET "mock://benefits-demo/cases/MYB-1004" \\
  -H "Accept: application/json" \\
  -H "X-Demo-Mode: true"`,
    returnInfo: `{
  "status": 200,
  "caseId": "MYB-1004",
  "applicantName": "Michael M. Motorist",
  "county": "Monroe",
  "region": "Finger Lakes",
  "caseStatus": "Document Review",
  "currentStage": "Paystub and Utility Review",
  "assignedGroup": "Document Review",
  "program": "SNAP",
  "mock": true
}`,
    expectedResult: '200 OK',
  },
  {
    id: 'sftp-document-drop',
    protocol: 'SFTP',
    title: 'SFTP Document Drop',
    summary: 'Show the command pattern for placing a replacement document into a mocked SFTP intake folder.',
    target: 'sftp://mock-benefits-intake/replacements/MYB-1004/',
    command: `uip mock sftp upload \\
  --host mock-benefits-intake \\
  --target /replacements/MYB-1004/national-grid-utility-bill.pdf \\
  --source ./fixtures/national-grid-utility-bill.pdf \\
  --mode placeholder`,
    returnInfo: `Connection: simulated
Authentication: skipped for local demo
Target folder: /replacements/MYB-1004/
File: national-grid-utility-bill.pdf
Result: mock upload accepted
Message: Utility verification document was accepted into the placeholder SFTP intake folder.`,
    expectedResult: 'Mock upload accepted',
  },
];

const defaultTestCommands = mockTestScenarios.reduce<Record<string, string>>((commands, scenario) => {
  commands[scenario.id] = scenario.command;
  return commands;
}, {});

const testingWorkbenchExample = `uip mock automation run \\
  --name Motorist_SOAP_Eligibility_Test \\
  --input '{"caseId":"MYB-1004","demoMode":true}'`;

const today = new Date('2026-05-26T12:00:00');

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function dateToIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function getInclusiveDayCount(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function formatDateRange(startDate: string, endDate: string): string {
  return startDate === endDate ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(endDate)}`;
}

function formatDateTime(value: string): string {
  const parsed = Date.parse(value);

  if (!Number.isFinite(parsed)) {
    return value;
  }

  return new Date(parsed).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysUntil(value: string): number {
  const target = new Date(`${value}T12:00:00`);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

function isDueSoon(caseItem: BenefitCase): boolean {
  const days = daysUntil(caseItem.eligibilityDueDate);
  return days >= 0 && days <= 5;
}

function makeEventId(caseItem: BenefitCase): string {
  return `${caseItem.mybNumber}-event-${Date.now()}-${caseItem.timeline.length + 1}`;
}

function getToneClass(tone: ToastTone): string {
  switch (tone) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
  }
}

function getStatusClasses(status: string): string {
  switch (status) {
    case 'Approved':
    case 'Complete':
    case 'Completed':
    case 'Verified':
    case 'Accepted':
    case 'Response Received':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Denied':
    case 'Blocked':
    case 'Rejected':
    case 'Insufficient':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Pending Review':
    case 'Pending':
    case 'Missing Information':
    case 'Needs Review':
    case 'Worker Review Required':
    case 'Due Soon':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Document Review':
    case 'Clearance Review':
    case 'Ready for Budget':
    case 'Running':
    case 'In Process':
    case 'In Progress':
    case 'Processing':
    case 'Uploaded':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Critical':
    case 'High':
    case 'OCR Review':
    case 'Replacement Requested':
    case 'Discrepancy Found':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'Supervisor Review':
    case 'Mock':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getPriorityClasses(priority: Priority): string {
  if (priority === 'Critical') {
    return 'bg-red-100 text-red-800 border-red-200';
  }

  if (priority === 'High') {
    return 'bg-orange-100 text-orange-800 border-orange-200';
  }

  if (priority === 'Medium') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }

  return 'bg-gray-100 text-gray-800 border-gray-200';
}

function roleCanEdit(role: Role, area: DetailTab | Screen): boolean {
  if (role === 'Auditor') {
    return false;
  }

  if (area === 'assignment') {
    return role === 'Supervisor';
  }

  if (role === 'Admin / Operations') {
    return area === 'operations' || area === 'settings' || area === 'Raw Case JSON';
  }

  if (role === 'Document Reviewer') {
    return ['Documents', 'Interview / Missing Info', 'Timeline / Audit', 'Raw Case JSON'].includes(area);
  }

  if (role === 'Eligibility Specialist') {
    return ['Summary', 'Budget', 'Forms & Notices', 'External Validation', 'Timeline / Audit', 'Raw Case JSON'].includes(area);
  }

  return true;
}

function statusProgression(status: CaseStatus): CaseStatus {
  switch (status) {
    case 'Pending Review':
      return 'Document Review';
    case 'Missing Information':
      return 'Pending Review';
    case 'Document Review':
      return 'Clearance Review';
    case 'Clearance Review':
      return 'Ready for Budget';
    case 'Ready for Budget':
      return 'Approved';
    case 'Approved':
    case 'Denied':
    case 'Withdrawn':
      return status;
  }
}

function Pill({ label, className = '' }: { label: string; className?: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${className || getStatusClasses(label)}`}>
      {label}
    </span>
  );
}

function TooltipIcon({ text }: { text: string }) {
  return (
    <span className="relative inline-flex items-center group">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full border border-gray-300 text-[10px] font-bold text-gray-500 bg-white cursor-help">
        ?
      </span>
      <span className="pointer-events-none absolute left-1/2 top-6 z-30 hidden w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-xs font-normal leading-5 text-gray-700 shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function UserTaskIcon() {
  return (
    <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700">
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15.75 7.5a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.5 20.25a7.5 7.5 0 0 1 15 0" />
      </svg>
    </span>
  );
}

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {help && <TooltipIcon text={help} />}
    </span>
  );
}

function getChecklistDisplayStatus(status: ChecklistStatus): string {
  if (status === 'Complete') {
    return 'Completed';
  }

  if (status === 'Blocked') {
    return 'Needs Review';
  }

  if (status === 'In Process') {
    return 'In Progress';
  }

  return status;
}

function caseHasTimelineEvent(caseItem: BenefitCase, eventTypes: string[]): boolean {
  return caseItem.timeline.some((event) => eventTypes.includes(event.eventType));
}

function checklistItemIsCompleted(caseItem: BenefitCase, label: string): boolean {
  const item = caseItem.checklist.find((checklistItem) => checklistItem.label === label);

  if (!item) {
    return false;
  }

  return getChecklistDisplayStatus(item.status) === 'Completed';
}

function getCaseStageOrder(caseItem: BenefitCase): number | null {
  const normalizedStage = caseItem.currentStage.trim().toLowerCase();

  return liveCaseStageOrderByLabel[normalizedStage] || null;
}

function caseHasMovedPastStage(caseItem: BenefitCase, stageOrder: number): boolean {
  const currentStageOrder = getCaseStageOrder(caseItem);

  if (currentStageOrder !== null && currentStageOrder > stageOrder) {
    return true;
  }

  return ['Ready for Budget', 'Approved', 'Denied', 'Withdrawn'].includes(caseItem.status);
}

function getEffectiveCaseStageOrder(caseItem: BenefitCase): number {
  const stageOrder = getCaseStageOrder(caseItem);

  if (stageOrder !== null) {
    return stageOrder;
  }

  switch (caseItem.status) {
    case 'Missing Information':
      return 2;
    case 'Document Review':
      return 3;
    case 'Clearance Review':
      return 4;
    case 'Ready for Budget':
      return 6;
    case 'Approved':
    case 'Denied':
    case 'Withdrawn':
      return 8;
    case 'Pending Review':
      return 1;
  }
}

function getAssignmentTaskStageOrder(definition: ActionAppDefinition): number {
  if (definition.id === 'main-supervisor-review') {
    return 8;
  }

  switch (definition.tab) {
    case 'Interview / Missing Info':
      return 2;
    case 'Documents':
      return 3;
    case 'Clearance':
      return 4;
    case 'External Validation':
      return 5;
    case 'Budget':
      return 6;
    case 'Summary':
      return 8;
  }
}

function getDefaultAssignmentGroup(definition: ActionAppDefinition, caseItem: BenefitCase): string {
  if (definition.lane === 'Supervisor' || definition.id === 'main-supervisor-review') {
    return 'Supervisor Queue';
  }

  switch (definition.tab) {
    case 'Documents':
      return 'Document Review';
    case 'Clearance':
      return 'Clearance Unit';
    case 'Budget':
      return 'Budget Unit';
    case 'External Validation':
      return caseItem.assignedGroup === 'Operations' ? 'Operations' : 'Eligibility Review';
    case 'Interview / Missing Info':
    case 'Summary':
      return caseItem.assignedGroup || 'Eligibility Review';
  }
}

function getPtoEntriesForDate(userName: string, date: string, ptoEntries: LocalPtoEntry[]): LocalPtoEntry[] {
  return ptoEntries.filter((entry) =>
    entry.userName === userName
    && entry.startDate <= date
    && entry.endDate >= date
  );
}

function isUserOnPto(userName: string, date: string, ptoEntries: LocalPtoEntry[]): boolean {
  if (!userName || userName === 'Unassigned') {
    return false;
  }

  return getPtoEntriesForDate(userName, date, ptoEntries).length > 0;
}

function getAvailableAssignmentUsers(
  users: LocalAssignmentUser[],
  assignedGroup: string,
  dueDate: string,
  ptoEntries: LocalPtoEntry[],
): LocalAssignmentUser[] {
  const groupUsers = users.filter((user) => user.assignedGroup === assignedGroup);
  const candidateUsers = groupUsers.length ? groupUsers : users;
  const availableGroupUsers = candidateUsers.filter((user) => !isUserOnPto(user.name, dueDate, ptoEntries));

  if (availableGroupUsers.length > 0) {
    return availableGroupUsers;
  }

  return users.filter((user) => !isUserOnPto(user.name, dueDate, ptoEntries));
}

function buildLocalPtoCalendarDays(monthValue: string, ptoEntries: LocalPtoEntry[]): LocalPtoCalendarDay[] {
  const monthStart = new Date(`${monthValue}-01T12:00:00`);
  const calendarStart = new Date(monthStart);
  calendarStart.setDate(monthStart.getDate() - monthStart.getDay());
  const currentMonth = monthStart.getMonth();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    const isoDate = dateToIso(date);

    return {
      date: isoDate,
      dayOfMonth: date.getDate(),
      isCurrentMonth: date.getMonth() === currentMonth,
      entries: ptoEntries.filter((entry) => entry.startDate <= isoDate && entry.endDate >= isoDate),
    };
  });
}

function getDefaultAssignmentUser(
  definition: ActionAppDefinition,
  caseItem: BenefitCase,
  users: LocalAssignmentUser[],
  ptoEntries: LocalPtoEntry[],
  fallbackIndex: number,
): string {
  const defaultGroup = getDefaultAssignmentGroup(definition, caseItem);
  const allowedUserNames = new Set(users.map((user) => user.name));

  if (
    caseItem.assignedWorker
    && caseItem.assignedWorker !== 'Group queue'
    && allowedUserNames.has(caseItem.assignedWorker)
    && caseItem.assignedGroup === defaultGroup
    && !isUserOnPto(caseItem.assignedWorker, caseItem.eligibilityDueDate, ptoEntries)
  ) {
    return caseItem.assignedWorker;
  }

  const candidateUsers = getAvailableAssignmentUsers(users, defaultGroup, caseItem.eligibilityDueDate, ptoEntries);

  return candidateUsers[fallbackIndex % Math.max(1, candidateUsers.length)]?.name || 'Unassigned';
}

function getAssignmentUserDisplayName(assignedTo: string | null, users: LocalAssignmentUser[]): string | null {
  if (!assignedTo) {
    return null;
  }

  const normalizedAssignedTo = assignedTo.trim().toLowerCase();
  const matchedUser = users.find((user) =>
    user.name.toLowerCase() === normalizedAssignedTo
    || user.email.toLowerCase() === normalizedAssignedTo
  );

  return matchedUser?.name || assignedTo;
}

function getLocalAssignmentTaskStatus(
  caseItem: BenefitCase,
  definition: ActionAppDefinition,
): LocalAssignmentTaskStatus {
  if (['Approved', 'Denied', 'Withdrawn'].includes(caseItem.status)) {
    return 'Completed';
  }

  if (definition.id === 'main-supervisor-review') {
    return caseItem.exception === 'Supervisor Review' ? 'Ready' : 'Queued';
  }

  if (
    definition.tab === 'Interview / Missing Info'
    && (caseItem.status === 'Missing Information' || caseItem.interview.missingFields.length > 0)
  ) {
    return caseItem.interview.applicantResponseStatus === 'Waiting for Response' ? 'Queued' : 'Ready';
  }

  if (
    definition.tab === 'Documents'
    && caseItem.documents.some((documentItem) => ['Needs Review', 'Insufficient', 'Uploaded'].includes(documentItem.status))
  ) {
    return 'Ready';
  }

  if (
    definition.tab === 'Clearance'
    && (caseItem.status === 'Clearance Review' || caseItem.exception === 'Clearance Match')
  ) {
    return 'Ready';
  }

  if (
    definition.tab === 'External Validation'
    && caseItem.validations.some((validation) => ['Discrepancy Found', 'Worker Review Required'].includes(validation.status))
  ) {
    return 'Ready';
  }

  if (definition.tab === 'Budget' && caseItem.status === 'Ready for Budget') {
    return 'Ready';
  }

  const caseStageOrder = getEffectiveCaseStageOrder(caseItem);
  const taskStageOrder = getAssignmentTaskStageOrder(definition);

  if (taskStageOrder < caseStageOrder) {
    return 'Completed';
  }

  if (taskStageOrder === caseStageOrder) {
    return 'Ready';
  }

  return 'Queued';
}

function buildLocalAssignmentTasks(
  caseItems: BenefitCase[],
  users: LocalAssignmentUser[],
  overrides: Record<string, LocalAssignmentOverride>,
  ptoEntries: LocalPtoEntry[],
  liveTasksByCaseId: Record<string, LiveTaskSummary[]> = {},
): LocalAssignmentTask[] {
  return caseItems.flatMap((caseItem, caseIndex) => {
    const liveTasksForCase = liveTasksByCaseId[caseItem.id] || [];
    const liveTaskRows = buildActionTaskRows(liveTasksForCase);
    const liveTaskByDefinitionId = new Map<string, LiveTaskSummary>();
    const matchedLiveTaskIds = new Set<number>();

    for (const row of liveTaskRows) {
      if (row.task) {
        liveTaskByDefinitionId.set(row.definition.id, row.task);
        matchedLiveTaskIds.add(row.task.id);
      }
    }

    const definitionRows: LocalAssignmentTask[] = ACTION_APP_DEFINITIONS.map((definition, definitionIndex) => {
      const id = `${caseItem.id}-${definition.id}`;
      const fallbackIndex = caseIndex + definitionIndex;
      const override = overrides[id];
      const assignedGroup = override?.assignedGroup || getDefaultAssignmentGroup(definition, caseItem);
      const liveTask = liveTaskByDefinitionId.get(definition.id);
      const liveAssignedTo = getAssignmentUserDisplayName(liveTask?.assignedTo || null, users);
      const assignedTo = override?.assignedTo
        || (liveTask ? liveAssignedTo || 'Unassigned' : null)
        || getDefaultAssignmentUser(definition, caseItem, users, ptoEntries, fallbackIndex);

      return {
        id,
        caseId: caseItem.id,
        caseNumber: caseItem.mybNumber,
        applicantName: caseItem.applicantName,
        county: caseItem.county,
        priority: caseItem.priority,
        taskName: definition.name,
        appName: definition.appName,
        taskId: liveTask?.id,
        process: definition.process,
        lane: definition.lane,
        tab: definition.tab,
        status: liveTask && !isLiveTaskCompleted(liveTask) ? 'Ready' : getLocalAssignmentTaskStatus(caseItem, definition),
        assignedTo,
        assignedGroup,
        dueDate: caseItem.eligibilityDueDate,
        isAssignedUserOnPto: isUserOnPto(assignedTo, caseItem.eligibilityDueDate, ptoEntries),
        actionDefinition: definition,
      };
    });

    const extraLiveTaskRows: LocalAssignmentTask[] = liveTasksForCase
      .filter((task) => !matchedLiveTaskIds.has(task.id))
      .map((task) => {
        const definition = task.appDefinition || undefined;
        const id = `${caseItem.id}-live-task-${task.id}`;
        const override = overrides[id];
        const assignedGroup = override?.assignedGroup
          || (definition ? getDefaultAssignmentGroup(definition, caseItem) : caseItem.assignedGroup || 'Eligibility Review');
        const liveAssignedTo = getAssignmentUserDisplayName(task.assignedTo, users);
        const assignedTo = override?.assignedTo || liveAssignedTo || 'Unassigned';

        const status: LocalAssignmentTaskStatus = isLiveTaskCompleted(task) ? 'Completed' : 'Ready';

        return {
          id,
          caseId: caseItem.id,
          caseNumber: caseItem.mybNumber,
          applicantName: caseItem.applicantName,
          county: caseItem.county,
          priority: caseItem.priority,
          taskName: definition?.name || task.title || `Action Center task ${task.id}`,
          appName: definition?.appName || task.actionLabel || task.action || 'Action Center',
          taskId: task.id,
          process: definition?.process || 'UiPath Action Center',
          lane: definition?.lane || 'Case Worker',
          tab: definition?.tab || 'Summary',
          status,
          assignedTo,
          assignedGroup,
          dueDate: caseItem.eligibilityDueDate,
          isAssignedUserOnPto: isUserOnPto(assignedTo, caseItem.eligibilityDueDate, ptoEntries),
          actionDefinition: definition,
        };
      });

    return [...definitionRows, ...extraLiveTaskRows];
  });
}

function shouldShowClearanceResults(caseItem: BenefitCase, hasPendingTask: boolean): boolean {
  if (hasPendingTask) {
    return false;
  }

  return caseHasTimelineEvent(caseItem, clearanceRevealEventTypes)
    || checklistItemIsCompleted(caseItem, 'Clearance reviewed')
    || caseHasMovedPastStage(caseItem, 4);
}

function shouldShowExternalValidationResults(caseItem: BenefitCase, hasPendingTask: boolean): boolean {
  if (hasPendingTask) {
    return false;
  }

  return caseHasTimelineEvent(caseItem, externalValidationRevealEventTypes)
    || checklistItemIsCompleted(caseItem, 'External validations reviewed')
    || caseHasMovedPastStage(caseItem, 5);
}

function scoreTaskForActionDefinition(task: LiveTaskSummary, definition: ActionAppDefinition): number {
  const searchText = task.searchText || [
    task.title,
    task.action,
    task.actionLabel,
    task.appDefinition?.name,
    task.appDefinition?.appName,
  ].filter(Boolean).join(' ').toLowerCase();
  const appId = definition.appId.toLowerCase();
  const sameActionApp = task.actionAppId?.toLowerCase() === appId
    || task.appDefinition?.appId === definition.appId
    || searchText.includes(appId);
  const exactStepMatch = searchText.includes(definition.name.toLowerCase()) ? 50 : 0;
  const appNameMatch = searchText.includes(definition.appName.toLowerCase()) ? 4 : 0;
  const keywordScore = definition.keywords.reduce((score, keyword) => {
    const normalizedKeyword = keyword.toLowerCase();

    if (!normalizedKeyword || !searchText.includes(normalizedKeyword)) {
      return score;
    }

    return score + 8 + normalizedKeyword.split(/\s+/).length;
  }, 0);

  if (!sameActionApp && exactStepMatch === 0 && appNameMatch === 0 && keywordScore === 0) {
    return 0;
  }

  return (sameActionApp ? 10 : 0) + exactStepMatch + appNameMatch + keywordScore;
}

function buildActionTaskRows(tasks: LiveTaskSummary[]) {
  const usedTaskIds = new Set<number>();

  return ACTION_APP_DEFINITIONS.map((definition) => {
    const candidates = tasks
      .filter((task) => !usedTaskIds.has(task.id))
      .map((task) => ({
        task,
        score: scoreTaskForActionDefinition(task, definition),
      }))
      .filter((candidate) => candidate.score > 0)
      .sort((left, right) => right.score - left.score);
    const task = candidates[0]?.task || null;

    if (task) {
      usedTaskIds.add(task.id);
    }

    return { definition, task };
  });
}

function isLiveTaskCompleted(task: LiveTaskSummary): boolean {
  return Boolean(task.completedTime) || task.status === 'Completed' || task.status === 'Complete';
}

function mergeVisibleLiveTasks(currentTasks: LiveTaskSummary[], refreshedTasks: LiveTaskSummary[]): LiveTaskSummary[] {
  const refreshedTaskIds = new Set(refreshedTasks.map((task) => task.id));
  const stillVisibleCurrentTasks = currentTasks.filter((task) =>
    !refreshedTaskIds.has(task.id) && !isLiveTaskCompleted(task)
  );

  return [...refreshedTasks, ...stillVisibleCurrentTasks];
}

const budgetCalculationTaskTerms = [
  'create budget',
  'review budget results',
  'budget review',
  'eligibility calculation',
  'benefit amount',
];

function normalizeRuntimeText(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function stringifyHistoryAttributes(value: unknown): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function getHistorySearchText(historyItem: LiveMaestroContext['executionHistory'][number]): string {
  const rawHistory = historyItem as unknown as Record<string, unknown>;
  return normalizeRuntimeText([
    historyItem.name,
    historyItem.id,
    historyItem.traceId,
    rawHistory.elementId,
    rawHistory.bpmnElementId,
    rawHistory.flowNodeId,
    rawHistory.activityId,
    rawHistory.elementExtensionType,
    stringifyHistoryAttributes(rawHistory.attributes),
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' '));
}

function isCompletedHistoryItem(historyItem: LiveMaestroContext['executionHistory'][number]): boolean {
  const rawHistory = historyItem as unknown as Record<string, unknown>;
  const statusText = normalizeRuntimeText([
    rawHistory.status,
    rawHistory.state,
    rawHistory.executionStatus,
    rawHistory.activityStatus,
    rawHistory.result,
    rawHistory.outcome,
  ].filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).join(' '));

  return Boolean(historyItem.endTime)
    || ['completed', 'complete', 'success', 'succeeded', 'done'].some((term) => statusText.includes(term));
}

function hasCompletedBudgetCalculationTask(context: LiveMaestroContext | null): boolean {
  if (!context) {
    return false;
  }

  return context.executionHistory.some((historyItem) => {
    if (!isCompletedHistoryItem(historyItem)) {
      return false;
    }

    const searchText = getHistorySearchText(historyItem);
    return budgetCalculationTaskTerms.some((term) => searchText.includes(term));
  });
}

function hasDisplayBudgetValue(value: string): boolean {
  return Boolean(value.trim()) && !value.toLowerCase().includes('not updated');
}

function shouldShowCalculatedBudgetAmount(
  caseItem: BenefitCase,
  isLiveCase: boolean,
  context: LiveMaestroContext | null,
): boolean {
  if (!hasDisplayBudgetValue(caseItem.budget.mockBenefitAmount)) {
    return false;
  }

  if (!isLiveCase) {
    return true;
  }

  return hasCompletedBudgetCalculationTask(context) || caseItem.budget.status === 'Calculation successful';
}

function SectionCard({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function CollapsibleSectionCard({
  title,
  children,
  isOpen,
  onToggle,
}: {
  title: string;
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Minimize' : 'Expand'} ${title}`}
          title={isOpen ? 'Minimize' : 'Expand'}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <svg
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {isOpen && <div className="p-5">{children}</div>}
    </section>
  );
}

function HelpBox({ children }: { children: ReactNode }) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800 flex gap-3">
      <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>{children}</div>
    </div>
  );
}

function BucketReadUriDetails({
  bucketId,
  folderId,
  folderName,
  fileName,
  path,
  expiryInMinutes,
  browseUrl,
}: {
  bucketId: number;
  folderId: number;
  folderName: string;
  fileName: string;
  path: string;
  expiryInMinutes: number;
  browseUrl: string;
}) {
  const apiBaseUrl = getUiPathApiBaseUrl();

  return (
    <div className="mt-3 rounded-md border border-red-200 bg-white/70 p-3 text-xs text-red-900">
      <p className="font-semibold">GetReadUri request details</p>
      <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[8rem_minmax(0,1fr)]">
        <dt className="font-medium">Bucket ID</dt>
        <dd className="break-all">{bucketId}</dd>
        <dt className="font-medium">Folder ID</dt>
        <dd className="break-all">{folderId}</dd>
        <dt className="font-medium">Folder</dt>
        <dd className="break-all">{folderName}</dd>
        <dt className="font-medium">File name</dt>
        <dd className="break-all">{fileName}</dd>
        <dt className="font-medium">Path</dt>
        <dd className="break-all">{path}</dd>
        <dt className="font-medium">Expiry</dt>
        <dd>{expiryInMinutes} minutes</dd>
        <dt className="font-medium">API base URL</dt>
        <dd className="break-all">{apiBaseUrl}</dd>
        <dt className="font-medium">GetReadUri API</dt>
        <dd className="break-all">
          {apiBaseUrl}/{IES_WORKFLOW_CONFIG.orgId}/{IES_WORKFLOW_CONFIG.tenantId}/orchestrator_/odata/Buckets({bucketId})/UiPath.Server.Configuration.OData.GetReadUri
        </dd>
        <dt className="font-medium">Portal browse URL</dt>
        <dd className="break-all">{browseUrl}</dd>
      </dl>
    </div>
  );
}

function DocumentPreview({
  source,
  title,
  compact = false,
  heightClass,
  showSourceDetails = false,
}: {
  source: ResolvedDocumentSource | null;
  title: string;
  compact?: boolean;
  heightClass?: string;
  showSourceDetails?: boolean;
}) {
  const previewHeight = heightClass || (compact ? 'h-80 md:h-96' : 'h-[36rem]');
  const sourceTag = source ? getBucketSourceTag(source.sourceMode) : null;

  if (!source) {
    return (
      <div className={`bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 ${previewHeight} flex flex-col items-center justify-center text-center`}>
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">No UiPath Orchestrator bucket document is loaded for this file.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sourceTag && (
        <div className="flex justify-end">
          <Pill label={sourceTag.label} className={sourceTag.className} />
        </div>
      )}

      <div className={`bg-gray-100 rounded-lg border border-gray-200 overflow-hidden ${previewHeight}`}>
        {source.mimeType === 'application/pdf' ? (
          <iframe title={title} src={source.url} className="h-full w-full bg-white" />
        ) : source.mimeType.startsWith('image/') ? (
          <div className="h-full w-full flex items-center justify-center bg-white p-4">
            <img src={source.url} alt={`${title} preview`} className="max-h-full w-full object-contain" />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-2">This file type cannot be previewed inline.</p>
          </div>
        )}
      </div>

      {showSourceDetails && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
          <p className="font-semibold text-gray-900">Source</p>
          <div className="mt-1 space-y-1">
            <p>{source.sourceLabel}</p>
            {source.localSourcePath && <p className="mt-1 break-all">Local path: {source.localSourcePath}</p>}
            {source.uiPathDocumentRef && (
              <div className="space-y-1">
                <p>{source.uiPathDocumentRef.repository}</p>
                <p className="break-all">{source.uiPathDocumentRef.folderPath}</p>
                <p>{source.uiPathDocumentRef.resolver}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GuidedChecklist({ items }: { items: string[] }) {
  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm">
      <div className="px-4 py-3 border-b border-blue-100 bg-blue-50">
        <h3 className="text-sm font-semibold text-blue-900">What to do on this screen</h3>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
              ✓
            </span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DemoCoachCallout({ items }: { items: string[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-900">
      <div className="flex items-center gap-2 font-semibold">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Demo Coach Tip
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone = 'blue',
  detail,
}: {
  label: string;
  value: string | number;
  tone?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'gray';
  detail?: string;
}) {
  const toneClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    yellow: 'text-yellow-700 bg-yellow-50',
    red: 'text-red-600 bg-red-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg border border-gray-200">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`h-10 w-10 rounded-lg ${toneClasses[tone]} flex items-center justify-center`}>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="ml-4 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  disabledReason,
  variant = 'secondary',
  title,
}: {
  children: ReactNode;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  disabledReason?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  title?: string;
}) {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    success: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
  };

  return (
    <button
      onClick={(event) => {
        event.stopPropagation();
        onClick(event);
      }}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : title}
      aria-label={disabled && disabledReason ? `${children} disabled: ${disabledReason}` : undefined}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm whitespace-nowrap ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Field({ label, value, help }: { label: string; value: ReactNode; help?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        <LabelWithHelp label={label} help={help} />
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900 break-words">{value}</dd>
    </div>
  );
}

function AuthLandingScreen({
  isLoading,
  error,
  configurationError,
  onLogin,
}: {
  isLoading: boolean;
  error: string | null;
  configurationError: string | null;
  onLogin: () => void;
}) {
  const visibleError = configurationError || error;
  const features = [
    'Personnel assignment and grouping',
    'Maestro-driven case orchestration',
    'Embedded Action Center task review',
    'Supervisor assignment dashboard',
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 font-medium">Initializing UiPath SDK...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-full">
                <img
                  src={nysItsLogoUrl}
                  alt="New York State Office of Information Technology Services"
                  className="h-28 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              New York State Office of Information Technology Services
            </p>
            <h2 className="text-3xl font-bold text-gray-900 mt-2">IES Case Management POC</h2>
            <p className="text-gray-600 mt-2">Integrated Eligibility Services orchestration workspace</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm text-gray-700">
              Access the IES POC to simulate application intake, personnel assignment and grouping, Maestro reviews, and embedded UiPath Action Center tasks.
            </p>
          </div>

          {visibleError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 flex-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{visibleError}</p>
              </div>
            </div>
          )}

          <button
            onClick={onLogin}
            disabled={Boolean(configurationError)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Login with UiPath</span>
          </button>

          <div className="flex justify-center pt-4 border-t border-gray-100">
            <div className="bg-white p-3 rounded-lg">
              <img src={uiPathLogoUrl} alt="UiPath" className="h-24 w-auto object-contain" />
            </div>
          </div>

          <div className="text-center text-xs text-gray-500 pt-2">
            <p>Powered by UiPath TypeScript SDK</p>
            <p className="mt-1">Secure access for authorized users only</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">System Features</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              {features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    sdk,
    currentUserEmail,
    login,
    logout,
    error: authError,
    missingFields,
  } = useAuth();
  const [cases, setCases] = useState<BenefitCase[]>([]);
  const [screen, setScreen] = useState<Screen>('inbox');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [activeTab, setActiveTab] = useState<DetailTab>('Summary');
  const [role, setRole] = useState<Role>('Case Worker');
  const [workerName, setWorkerName] = useState('Case Worker');
  const [countyScope, setCountyScope] = useState('All counties');
  const [regionScope, setRegionScope] = useState('All regions');
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [showDemoCoachTips, setShowDemoCoachTips] = useState(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpCategory, setHelpCategory] = useState<HelpCategory | 'All'>('All');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [inboxPage, setInboxPage] = useState(1);
  const [activeOperationsSubtab, setActiveOperationsSubtab] = useState<OperationsSubtab>('Operations Summary');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [activeTestScenarioId, setActiveTestScenarioId] = useState(mockTestScenarios[0].id);
  const [openCommandBoxId, setOpenCommandBoxId] = useState<string | null>(null);
  const [testCommands, setTestCommands] = useState<Record<string, string>>(defaultTestCommands);
  const [mockTestRuns, setMockTestRuns] = useState<Record<string, string>>({});
  const [mockTestReturns, setMockTestReturns] = useState<Record<string, string>>({});
  const assignmentUsers = defaultAssignmentUsers;
  const [assignmentTaskOverrides, setAssignmentTaskOverrides] = useState<Record<string, LocalAssignmentOverride>>({});
  const [assignmentTaskStatusFilter, setAssignmentTaskStatusFilter] = useState<LocalAssignmentTaskStatus | 'all'>(defaultAssignmentTaskStatusFilter);
  const [assignmentTaskGroupFilter, setAssignmentTaskGroupFilter] = useState('all');
  const [assignmentRoutingMode, setAssignmentRoutingMode] = useState<AssignmentRoutingMode>('User');
  const [assignmentDialogTask, setAssignmentDialogTask] = useState<LocalAssignmentTask | null>(null);
  const [assignmentDialogEmail, setAssignmentDialogEmail] = useState(defaultTaskAssignmentEmail);
  const [assignmentDialogMode, setAssignmentDialogMode] = useState<AssignmentRoutingMode>('User');
  const [activeAssignmentSubtab, setActiveAssignmentSubtab] = useState<AssignmentSubtab>('Task Assignments');
  const [assignmentPtoEntries, setAssignmentPtoEntries] = useState<LocalPtoEntry[]>(defaultAssignmentPtoEntries);
  const [assignmentPtoMonth, setAssignmentPtoMonth] = useState('2026-06');
  const [newPtoUserName, setNewPtoUserName] = useState(defaultAssignmentUsers[0]?.name || '');
  const [newPtoWorkerEmail, setNewPtoWorkerEmail] = useState(defaultAssignmentUsers[0]?.email || IES_WORKFLOW_CONFIG.defaultApplicantEmail);
  const [newPtoStartDate, setNewPtoStartDate] = useState('2026-06-01');
  const [newPtoEndDate, setNewPtoEndDate] = useState('2026-06-01');
  const [newPtoReason, setNewPtoReason] = useState('PTO');
  const [isStartingWorkerPto, setIsStartingWorkerPto] = useState(false);
  const [startingTaskAssignmentId, setStartingTaskAssignmentId] = useState<string | null>(null);
  const [liveRecords, setLiveRecords] = useState<LiveCaseRecord[]>([]);
  const [liveDataStatus, setLiveDataStatus] = useState<LiveLoadState>('idle');
  const [liveDataError, setLiveDataError] = useState<string | null>(null);
  const [startedInstanceByCase, setStartedInstanceByCase] = useState<Record<string, string>>({});
  const [liveMaestroContext, setLiveMaestroContext] = useState<LiveMaestroContext | null>(null);
  const [liveTasks, setLiveTasks] = useState<LiveTaskSummary[]>([]);
  const [liveTaskStatus, setLiveTaskStatus] = useState<LiveLoadState>('idle');
  const [liveTaskError, setLiveTaskError] = useState<string | null>(null);
  const [assignmentLiveTasksByCaseId, setAssignmentLiveTasksByCaseId] = useState<Record<string, LiveTaskSummary[]>>({});
  const [assignmentLiveTaskStatus, setAssignmentLiveTaskStatus] = useState<LiveLoadState>('idle');
  const [assignmentLiveTaskError, setAssignmentLiveTaskError] = useState<string | null>(null);
  const [isStartingMaestro, setIsStartingMaestro] = useState(false);
  const [activeTaskEmbed, setActiveTaskEmbed] = useState<TaskEmbedState | null>(null);
  const [inlineTaskEmbed, setInlineTaskEmbed] = useState<TaskEmbedState | null>(null);
  const [applicationDocumentSource, setApplicationDocumentSource] = useState<ResolvedDocumentSource | null>(null);
  const [applicationDocumentError, setApplicationDocumentError] = useState<string | null>(null);
  const [documentBucketSources, setDocumentBucketSources] = useState<Record<string, ResolvedDocumentSource>>({});
  const [documentBucketErrors, setDocumentBucketErrors] = useState<Record<string, string>>({});
  const [isApplicantResponsesOpen, setIsApplicantResponsesOpen] = useState(true);
  const isTaskEmbedOpen = Boolean(activeTaskEmbed || inlineTaskEmbed);

  const selectedCase = cases.find((caseItem) => caseItem.id === selectedCaseId)
    || cases[0]
    || initialCases.find((caseItem) => caseItem.mybNumber === 'MYB-1004')
    || initialCases[0];
  const simulatedApplicationCase = cases.find((caseItem) => caseItem.mybNumber === 'MYB-1004')
    || initialCases.find((caseItem) => caseItem.mybNumber === 'MYB-1004')
    || selectedCase;
  const canManageTaskAssignments = role === 'Supervisor';
  const canSubmitWorkerPto = role === 'Case Worker' || canManageTaskAssignments;
  const canViewAssignmentDashboard = canSubmitWorkerPto;
  const visibleAssignmentSubtabs = canManageTaskAssignments ? assignmentSubtabOptions : caseWorkerAssignmentSubtabOptions;
  const assignmentNavLabel = role === 'Supervisor' ? 'Assignment Dashboard' : 'PTO Calendar';
  const visibleDetailTabs = detailTabs;
  const uiPathConfigError = getUiPathConfigurationError(missingFields);
  const canUseUiPath = isAuthenticated && !isAuthLoading && !uiPathConfigError;
  const uiPathDisabledReason = uiPathConfigError || (!isAuthenticated ? 'Sign in to UiPath first.' : undefined);
  const workerPtoDisabledReason = !canSubmitWorkerPto
    ? `${role} cannot submit worker PTO in this prototype.`
    : uiPathDisabledReason;
  const taskAssignmentDisabledReason = !canManageTaskAssignments
    ? `${role} cannot change task assignments in this prototype.`
    : uiPathDisabledReason;
  const matchedLiveRecord = useMemo(
    () => findMatchingLiveRecord(liveRecords, selectedCase),
    [liveRecords, selectedCase],
  );
  const liveRecordInstanceId = getLiveRecordInstanceId(matchedLiveRecord);
  const liveRecordActionTaskReferences = useMemo(
    () => getLiveRecordActionTaskReferences(matchedLiveRecord),
    [matchedLiveRecord],
  );
  const selectedInstanceId = liveRecordInstanceId || startedInstanceByCase[selectedCase.id];
  const selectedMaestroFolderKey = getLiveRecordFolderKey(matchedLiveRecord);
  const isMaestroLoaded = Boolean(selectedInstanceId);
  const selectedDocument = selectedDocumentId
    ? selectedCase.documents.find((documentItem) => documentItem.id === selectedDocumentId) || null
    : null;
  const selectedDocumentSource = selectedDocument
    ? documentBucketSources[selectedDocument.id] || resolveDocumentSource(selectedDocument)
    : null;
  const activeTestScenario = mockTestScenarios.find((scenario) => scenario.id === activeTestScenarioId) || mockTestScenarios[0];
  const activeTestCommand = testCommands[activeTestScenario.id] ?? activeTestScenario.command;
  const activeTestReturn = mockTestReturns[activeTestScenario.id] || '';
  const isCommandBoxOpen = openCommandBoxId === activeTestScenario.id;
  const lastMockTestRun = mockTestRuns[activeTestScenario.id] || 'Not run yet';
  const budgetCreated = selectedCase.budget.status === 'Budget created'
    || selectedCase.budget.status === 'Calculation successful'
    || selectedCase.budget.status === 'Ready for worker review';
  const showBudgetIncomeUsed = hasDisplayBudgetValue(selectedCase.budget.incomeUsed);
  const showCalculatedBudgetAmount = shouldShowCalculatedBudgetAmount(
    selectedCase,
    Boolean(matchedLiveRecord),
    liveMaestroContext,
  );
  const noticePreviewGenerated = selectedCase.notices.some((notice) => ['Preview Generated', 'Approved', 'Sent', 'Printed'].includes(notice.status));
  const currentHelpContext: HelpContextId = screen === 'detail'
    ? activeTab === 'Summary'
      ? 'summary'
      : activeTab === 'Actions'
        ? 'actions'
      : activeTab === 'Application'
        ? 'application'
        : activeTab === 'Interview / Missing Info'
          ? 'interview'
          : activeTab === 'Documents'
            ? 'documents'
            : activeTab === 'Clearance'
              ? 'clearance'
              : activeTab === 'External Validation'
                ? 'validation'
                : activeTab === 'Budget'
                  ? 'budget'
                  : activeTab === 'Forms & Notices'
                    ? 'notices'
                    : activeTab === 'Timeline / Audit'
                        ? 'timeline'
                        : 'json'
    : screen === 'assignment'
      ? 'assignment'
      : screen === 'helpCenter'
      ? 'helpCenter'
      : screen;

  const currentHelp = helpContent[currentHelpContext];
  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3800);
  }, []);

  useEffect(() => {
    if (!visibleAssignmentSubtabs.includes(activeAssignmentSubtab)) {
      setActiveAssignmentSubtab(visibleAssignmentSubtabs[0]);
    }
  }, [activeAssignmentSubtab, visibleAssignmentSubtabs]);

  useEffect(() => {
    const defaultRosterEmail = defaultAssignmentUsers[0]?.email || '';

    if (role === 'Case Worker' && currentUserEmail && newPtoWorkerEmail === defaultRosterEmail) {
      setNewPtoWorkerEmail(currentUserEmail);
    }
  }, [currentUserEmail, newPtoWorkerEmail, role]);

  useEffect(() => {
    let ignore = false;

    if (!canUseUiPath) {
      setApplicationDocumentSource(null);
      setApplicationDocumentError('Sign in to UiPath to load the SNAP application from Orchestrator storage.');
      return () => {
        ignore = true;
      };
    }

    fetchApplicationPdfFromBucket(sdk)
      .then((source) => {
        if (ignore) {
          return;
        }

        setApplicationDocumentSource(buildApplicationPdfBucketSource(source));
        setApplicationDocumentError(null);
      })
      .catch((error: unknown) => {
        if (ignore) {
          return;
        }

        const message = getErrorMessage(error);
        console.warn('Application PDF bucket read failed.', error);
        setApplicationDocumentSource(null);
        setApplicationDocumentError(message);
      });

    return () => {
      ignore = true;
    };
  }, [canUseUiPath, sdk]);

  useEffect(() => {
    let ignore = false;
    const documentRequests = selectedCase.documents
      .map((documentItem) => ({
        documentItem,
        bucketDocument: getEvidenceBucketDocumentConfig(documentItem),
      }))
      .filter((request): request is { documentItem: DocumentRecord; bucketDocument: EvidenceBucketDocumentConfig } =>
        Boolean(request.bucketDocument)
      );

    if (!canUseUiPath || documentRequests.length === 0) {
      setDocumentBucketSources({});
      setDocumentBucketErrors({});
      return () => {
        ignore = true;
      };
    }

    void Promise.all(documentRequests.map(async ({ documentItem, bucketDocument }) => {
      try {
        const source = await fetchDocumentFromBucket(sdk, {
          bucketId: IES_WORKFLOW_CONFIG.documentEvidenceBucket.bucketId,
          folderId: IES_WORKFLOW_CONFIG.documentEvidenceBucket.folderId,
          path: bucketDocument.path,
          staticReadUrl: bucketDocument.staticReadUrl,
          readUriExpiryInMinutes: IES_WORKFLOW_CONFIG.documentEvidenceBucket.readUriExpiryInMinutes,
        });

        return {
          documentId: documentItem.id,
          source: buildEvidenceBucketSource(source, bucketDocument),
        };
      } catch (error) {
        const message = getErrorMessage(error);
        console.warn(`Bucket read failed for ${bucketDocument.fileName}.`, error);
        return {
          documentId: documentItem.id,
          error: message,
        };
      }
    })).then((resolvedSources) => {
      if (ignore) {
        return;
      }

      const loadedSources: Record<string, ResolvedDocumentSource> = {};
      const loadErrors: Record<string, string> = {};

      for (const entry of resolvedSources) {
        if ('source' in entry && entry.source) {
          loadedSources[entry.documentId] = entry.source;
        } else if ('error' in entry) {
          loadErrors[entry.documentId] = entry.error;
        }
      }

      setDocumentBucketSources(loadedSources);
      setDocumentBucketErrors(loadErrors);
    });

    return () => {
      ignore = true;
    };
  }, [canUseUiPath, sdk, selectedCase.id, selectedCase.documents]);

  const openDocumentPreview = (title: string, source: ResolvedDocumentSource | null, details?: ReactNode) => {
    if (!source) {
      showToast('No document file is available for this item.', 'warning');
      return;
    }

    setModal({
      title,
      body: (
        <div className="space-y-4">
          <DocumentPreview source={source} title={title} />
          {details}
        </div>
      ),
    });
  };

  const downloadDocumentFile = (source: ResolvedDocumentSource | null, label: string) => {
    if (!source) {
      showToast(`No document file is available for ${label}.`, 'warning');
      return;
    }

    const link = document.createElement('a');
    link.href = source.url;
    link.download = source.url.split('/').pop() || label;
    link.click();
    showToast(`${label} downloaded from ${source.sourceLabel.toLowerCase()}.`, 'success');
  };

  const updateCase = (caseId: string, updater: (caseItem: BenefitCase) => BenefitCase) => {
    setCases((current) => current.map((caseItem) => (caseItem.id === caseId ? updater(caseItem) : caseItem)));
  };

  const appendAuditEvent = (
    caseId: string,
    eventType: string,
    notes: string,
    relatedScreen: string,
    category: AuditCategory = 'Worker actions',
    statusAfter?: string,
  ) => {
    setCases((current) => current.map((caseItem) => {
      if (caseItem.id !== caseId) {
        return caseItem;
      }

      const event: TimelineEvent = {
        id: makeEventId(caseItem),
        timestamp: new Date().toISOString(),
        eventType,
        actor: workerName,
        role,
        statusBefore: caseItem.status,
        statusAfter: statusAfter || caseItem.status,
        notes,
        duration: 'Mock action',
        relatedScreen,
        category,
      };

      return { ...caseItem, timeline: [event, ...caseItem.timeline] };
    }));
  };

  const openCase = (caseItem: BenefitCase, tab: DetailTab = 'Summary') => {
    setSelectedCaseId(caseItem.id);
    setActiveTab(tab);
    setScreen('detail');
    appendAuditEvent(caseItem.id, 'Worker Opened Case', `${workerName} opened ${caseItem.mybNumber}.`, tab);
  };

  const assignToMe = (caseId: string) => {
    updateCase(caseId, (caseItem) => ({ ...caseItem, assignedWorker: workerName }));
    appendAuditEvent(caseId, 'Case Assigned', `Case assigned to ${workerName}.`, 'Summary');
    showToast('Case assigned locally.', 'success');
  };

  const markPriority = (caseId: string) => {
    updateCase(caseId, (caseItem) => ({ ...caseItem, priority: caseItem.priority === 'Critical' ? 'High' : 'Critical' }));
    appendAuditEvent(caseId, 'Priority Updated', 'Priority was updated in local state.', 'Case Inbox');
    showToast('Priority updated for the click-through.', 'warning');
  };

  const roleDisabledMessage = () => {
    showToast(`${role} can view this area, but editing is disabled in the prototype.`, 'warning');
  };

  const editDisabledReason = (area: DetailTab | Screen) => roleCanEdit(role, area)
    ? undefined
    : `${role} has view-only access for this action in the local prototype.`;

  const confirmGuidedAction = ({ title, guidance, confirmLabel, onConfirm }: ConfirmActionOptions) => {
    setModal({
      title,
      body: (
        <div className="space-y-3">
          <p>{guidance}</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-blue-800">
            This is local guidance only. No real system, email, or notice service is called.
          </div>
        </div>
      ),
      confirmLabel,
      onConfirm,
    });
  };

  const runCaseAction = (
    area: DetailTab | Screen,
    eventType: string,
    notes: string,
    updater?: (caseItem: BenefitCase) => BenefitCase,
    category: AuditCategory = 'Worker actions',
    toast = 'Local state updated.',
  ) => {
    if (!roleCanEdit(role, area)) {
      roleDisabledMessage();
      return;
    }

    if (updater) {
      updateCase(selectedCase.id, updater);
    }

    appendAuditEvent(selectedCase.id, eventType, notes, area, category);
    showToast(toast, 'success');
  };

  const createPtoEntry = async () => {
    if (!canSubmitWorkerPto) {
      showToast(workerPtoDisabledReason || `${role} cannot submit worker PTO.`, 'warning');
      return;
    }

    if (!canUseUiPath) {
      showToast(workerPtoDisabledReason || 'Sign in to UiPath before setting PTO.', 'warning');
      return;
    }

    const user = assignmentUsers.find((candidate) => candidate.name === newPtoUserName);
    const normalizedWorkerEmail = newPtoWorkerEmail.trim().toLowerCase();
    const normalizedReason = newPtoReason.trim() || 'PTO';

    if (!user) {
      showToast('Select a local assignment user before setting PTO.', 'warning');
      return;
    }

    if (!normalizedWorkerEmail) {
      showToast('Enter the worker email before setting PTO.', 'warning');
      return;
    }

    if (newPtoEndDate < newPtoStartDate) {
      showToast('PTO end date must be on or after the start date.', 'warning');
      return;
    }

    setIsStartingWorkerPto(true);

    try {
      await startWorkerPtoProcess(sdk, {
        startDate_In: newPtoStartDate,
        endDate_In: newPtoEndDate,
        workerEmail_In: normalizedWorkerEmail,
      });

      const nextEntry: LocalPtoEntry = {
        id: `pto-${user.name.toLowerCase().replace(/\s+/g, '-')}-${newPtoStartDate}-${Date.now()}`,
        userName: user.name,
        workerEmail: normalizedWorkerEmail,
        assignedGroup: user.assignedGroup,
        startDate: newPtoStartDate,
        endDate: newPtoEndDate,
        reason: normalizedReason,
      };

      setAssignmentPtoEntries((current) => [...current, nextEntry]);
      setAssignmentPtoMonth(newPtoStartDate.slice(0, 7));
      showToast(`Worker PTO process started for ${user.name}.`, 'success');
    } catch (error) {
      console.warn('Worker PTO process start failed.', error);
      showToast(`Worker PTO process start failed: ${getErrorMessage(error)}`, 'error');
    } finally {
      setIsStartingWorkerPto(false);
    }
  };

  const removePtoEntry = (entryId: string) => {
    if (!canSubmitWorkerPto) {
      showToast(workerPtoDisabledReason || `${role} cannot remove worker PTO in this prototype.`, 'warning');
      return;
    }

    setAssignmentPtoEntries((current) => current.filter((entry) => entry.id !== entryId));
    showToast('PTO removed from the local calendar.', 'success');
  };

  const updateLocalTaskAssignment = (
    task: LocalAssignmentTask,
    patch: Partial<LocalAssignmentOverride>,
  ) => {
    if (!canManageTaskAssignments) {
      roleDisabledMessage();
      return;
    }

    const nextAssignedTo = patch.assignedTo ?? assignmentTaskOverrides[task.id]?.assignedTo ?? task.assignedTo;

    if (isUserOnPto(nextAssignedTo, task.dueDate, assignmentPtoEntries)) {
      showToast(`${nextAssignedTo} is on PTO on ${formatDate(task.dueDate)}. Choose an available user.`, 'warning');
      return;
    }

    setAssignmentTaskOverrides((current) => ({
      ...current,
      [task.id]: {
        assignedTo: nextAssignedTo,
        assignedGroup: patch.assignedGroup ?? current[task.id]?.assignedGroup ?? task.assignedGroup,
      },
    }));
  };

  const openTaskAssignmentDialog = (task: LocalAssignmentTask) => {
    setAssignmentDialogTask(task);
    setAssignmentDialogEmail(defaultTaskAssignmentEmail);
    setAssignmentDialogMode(assignmentRoutingMode);
  };

  const stageTaskTeamChange = async (
    task: LocalAssignmentTask,
    assignedUserEmailInput: string,
    assignmentMode: AssignmentRoutingMode,
  ) => {
    if (!canManageTaskAssignments) {
      showToast(taskAssignmentDisabledReason || `${role} cannot change task assignments.`, 'warning');
      return;
    }

    if (!canUseUiPath) {
      showToast(taskAssignmentDisabledReason || 'Sign in to UiPath before changing task assignment.', 'warning');
      return;
    }

    if (!task.taskId) {
      showToast(`No live Action Center task ID is loaded for this row yet. Open the case Actions tab, then return to ${assignmentNavLabel}.`, 'warning');
      return;
    }

    if (task.isAssignedUserOnPto) {
      showToast(`${task.assignedTo} is on PTO on ${formatDate(task.dueDate)}. Choose an available user before changing the assignment.`, 'warning');
      return;
    }

    const assignedUserEmail = assignedUserEmailInput.trim().toLowerCase();

    if (!assignedUserEmail) {
      showToast('Enter an assignee email before starting the assignment process.', 'warning');
      return;
    }

    setStartingTaskAssignmentId(task.id);

    try {
      await startTaskAssignmentProcess(sdk, {
        user: assignedUserEmail,
        taskId: task.taskId,
      });

      const assignedUserName = getAssignmentUserDisplayName(assignedUserEmail, assignmentUsers) || assignedUserEmail;
      setAssignmentTaskOverrides((current) => ({
        ...current,
        [task.id]: {
          assignedTo: assignedUserName,
          assignedGroup: current[task.id]?.assignedGroup ?? task.assignedGroup,
        },
      }));
      appendAuditEvent(
        task.caseId,
        'Task Assignment Changed',
        `${task.taskName} assigned by ${assignmentMode} to ${assignedUserName} (${assignedUserEmail}).`,
        'assignment',
        'Supervisor actions',
      );
      showToast(`Assign case worker to a task process started for task ${task.taskId}.`, 'success');
    } catch (error) {
      console.warn('Task assignment process start failed.', error);
      showToast(`Task assignment process start failed: ${getErrorMessage(error)}`, 'error');
    } finally {
      setStartingTaskAssignmentId(null);
    }
  };

  const openAssignmentTaskCase = (caseItem: BenefitCase) => {
    if (!cases.some((candidate) => candidate.id === caseItem.id)) {
      setCases(initialCases);
    }

    openCase(caseItem, 'Actions');
  };

  const assignmentSourceCases = cases.length ? cases : initialCases;

  const refreshAssignmentLiveTasks = useCallback(async () => {
    if (!canUseUiPath || !canManageTaskAssignments) {
      setAssignmentLiveTasksByCaseId({});
      setAssignmentLiveTaskStatus('idle');
      setAssignmentLiveTaskError(null);
      return;
    }

    const taskRequests = assignmentSourceCases
      .map((caseItem) => {
        const liveRecord = findMatchingLiveRecord(liveRecords, caseItem);
        const instanceId = getLiveRecordInstanceId(liveRecord)
          || startedInstanceByCase[caseItem.id]
          || null;

        if (!instanceId) {
          return null;
        }

        return {
          caseId: caseItem.id,
          instanceId,
          references: getLiveRecordActionTaskReferences(liveRecord),
        };
      })
      .filter((request): request is {
        caseId: string;
        instanceId: string;
        references: ReturnType<typeof getLiveRecordActionTaskReferences>;
      } => Boolean(request));

    if (taskRequests.length === 0) {
      setAssignmentLiveTasksByCaseId({});
      setAssignmentLiveTaskStatus('idle');
      setAssignmentLiveTaskError(null);
      return;
    }

    setAssignmentLiveTaskStatus('loading');
    setAssignmentLiveTaskError(null);

    try {
      const taskResults = await Promise.all(taskRequests.map(async (request) => {
        try {
          const tasks = await findPendingTasksForInstance(
            sdk,
            request.instanceId,
            request.references.instanceIds,
            request.references.taskIds,
          );

          return {
            caseId: request.caseId,
            tasks,
            error: null,
          };
        } catch (error) {
          return {
            caseId: request.caseId,
            tasks: [],
            error: getErrorMessage(error),
          };
        }
      }));

      setAssignmentLiveTasksByCaseId(Object.fromEntries(taskResults.map((result) => [result.caseId, result.tasks])));
      const errors = taskResults.filter((result) => result.error).map((result) => result.error);
      setAssignmentLiveTaskError(errors.length ? Array.from(new Set(errors)).join(' ') : null);
      setAssignmentLiveTaskStatus('ready');
    } catch (error) {
      const message = getErrorMessage(error);
      setAssignmentLiveTaskError(message);
      setAssignmentLiveTaskStatus('error');
    }
  }, [
    assignmentSourceCases,
    canManageTaskAssignments,
    canUseUiPath,
    liveRecords,
    sdk,
    startedInstanceByCase,
  ]);

  const localAssignmentTasks = useMemo(
    () => buildLocalAssignmentTasks(
      assignmentSourceCases,
      assignmentUsers,
      assignmentTaskOverrides,
      assignmentPtoEntries,
      assignmentLiveTasksByCaseId,
    ),
    [assignmentSourceCases, assignmentUsers, assignmentTaskOverrides, assignmentPtoEntries, assignmentLiveTasksByCaseId],
  );

  const filteredAssignmentTasks = useMemo(() => localAssignmentTasks.filter((task) =>
    (assignmentTaskStatusFilter === 'all' || task.status === assignmentTaskStatusFilter)
    && (assignmentTaskGroupFilter === 'all' || task.assignedGroup === assignmentTaskGroupFilter)
  ), [localAssignmentTasks, assignmentTaskStatusFilter, assignmentTaskGroupFilter]);

  const assignmentStatusCounts = useMemo(() => assignmentTaskStatusOptions.reduce<Record<LocalAssignmentTaskStatus | 'all', number>>(
    (counts, status) => ({
      ...counts,
      [status]: status === 'all'
        ? localAssignmentTasks.length
        : localAssignmentTasks.filter((task) => task.status === status).length,
    }),
    {
      all: 0,
      Ready: 0,
      Queued: 0,
      Completed: 0,
    },
  ), [localAssignmentTasks]);

  const assignmentTaskMetrics = useMemo(() => ({
    total: assignmentStatusCounts.all,
    ready: assignmentStatusCounts.Ready,
    queued: assignmentStatusCounts.Queued,
    completed: assignmentStatusCounts.Completed,
    ptoConflicts: localAssignmentTasks.filter((task) => task.isAssignedUserOnPto).length,
    users: assignmentUsers.length,
  }), [assignmentStatusCounts, assignmentUsers.length, localAssignmentTasks]);

  const sortedAssignmentPtoEntries = useMemo(
    () => assignmentPtoEntries.slice().sort((left, right) =>
      left.startDate.localeCompare(right.startDate) || left.userName.localeCompare(right.userName)
    ),
    [assignmentPtoEntries],
  );

  const assignmentPtoCalendarDays = useMemo(
    () => buildLocalPtoCalendarDays(assignmentPtoMonth, assignmentPtoEntries),
    [assignmentPtoEntries, assignmentPtoMonth],
  );

  const assignmentPtoMetrics = useMemo(() => {
    const todayIso = dateToIso(today);
    const userNamesOutThisMonth = new Set(
      assignmentPtoEntries
        .filter((entry) => entry.startDate.slice(0, 7) <= assignmentPtoMonth && entry.endDate.slice(0, 7) >= assignmentPtoMonth)
        .map((entry) => entry.userName),
    );

    return {
      entries: assignmentPtoEntries.length,
      usersOutThisMonth: userNamesOutThisMonth.size,
      daysScheduled: assignmentPtoEntries.reduce((total, entry) => total + getInclusiveDayCount(entry.startDate, entry.endDate), 0),
      outToday: assignmentPtoEntries.filter((entry) => entry.startDate <= todayIso && entry.endDate >= todayIso).length,
    };
  }, [assignmentPtoEntries, assignmentPtoMonth]);

  const filteredCases = useMemo(() => {
    return cases.filter((caseItem) => {
      const search = filters.search.trim().toLowerCase();
      const matchesSearch = !search
        || caseItem.applicantName.toLowerCase().includes(search)
        || caseItem.mybNumber.toLowerCase().includes(search);

      return matchesSearch
        && (filters.county === 'all' || caseItem.county === filters.county)
        && (filters.region === 'all' || caseItem.region === filters.region)
        && (filters.status === 'all' || caseItem.status === filters.status)
        && (filters.priority === 'all' || caseItem.priority === filters.priority)
        && (filters.exception === 'all' || caseItem.exception === filters.exception)
        && (!filters.dueSoon || isDueSoon(caseItem))
        && (!filters.expedited || caseItem.expedited)
        && (filters.assignedGroup === 'all' || caseItem.assignedGroup === filters.assignedGroup);
    }).sort(compareCasesNewestFirst);
  }, [cases, filters]);

  useEffect(() => {
    setInboxPage(1);
  }, [filters]);

  const totalInboxPages = Math.max(1, Math.ceil(filteredCases.length / inboxPageSize));
  const currentInboxPage = Math.min(inboxPage, totalInboxPages);
  const inboxStartIndex = filteredCases.length ? (currentInboxPage - 1) * inboxPageSize : 0;
  const inboxEndIndex = Math.min(inboxStartIndex + inboxPageSize, filteredCases.length);
  const paginatedCases = filteredCases.slice(inboxStartIndex, inboxEndIndex);

  const operationsMetrics = demoOperationsMetrics;
  const groupedMetrics = demoOperationsGroupedMetrics;
  const bottlenecks = demoOperationsBottlenecks;

  const resetMockData = () => {
    setCases([]);
    setSelectedCaseId('');
    setLiveRecords([]);
    setLiveDataStatus('idle');
    setLiveDataError(null);
    setActiveTab('Summary');
    showToast('Live Data Fabric cases cleared locally. Refresh to load the entity again.', 'success');
  };

  const exportJson = (caseItem: BenefitCase) => {
    const blob = new Blob([JSON.stringify(caseItem, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${caseItem.mybNumber}.json`;
    link.click();
    URL.revokeObjectURL(url);
    appendAuditEvent(caseItem.id, 'Export Audit JSON', 'Case JSON was downloaded locally.', 'Raw Case JSON', 'System actions');
    showToast('JSON download started locally.', 'success');
  };

  const copyText = (value: string, successMessage: string) => {
    const clipboardWrite = navigator.clipboard?.writeText(value);
    if (clipboardWrite) {
      void clipboardWrite.catch(() => undefined);
    }
    showToast(successMessage, 'success');
  };

  const refreshLiveRecords = useCallback(async () => {
    if (!canUseUiPath) {
      setLiveRecords([]);
      setCases([]);
      setSelectedCaseId('');
      setLiveDataStatus('idle');
      setLiveDataError(null);
      return;
    }

    setLiveDataStatus('loading');
    setLiveDataError(null);

    try {
      const records = await fetchLiveCaseRecords(sdk);
      const mappedCases = records.map(mapLiveRecordToCase).sort(compareCasesNewestFirst);
      setLiveRecords(records);
      setCases(mappedCases);
      setSelectedCaseId((current) => (
        mappedCases.some((caseItem) => caseItem.id === current)
          ? current
          : mappedCases[0]?.id || ''
      ));
      setLiveDataStatus('ready');
    } catch (error) {
      const message = getErrorMessage(error);
      setCases([]);
      setSelectedCaseId('');
      setLiveDataError(message);
      setLiveDataStatus('error');
    }
  }, [canUseUiPath, sdk]);

  const refreshLiveTasks = useCallback(async (options: RefreshLiveTasksOptions = {}) => {
    const preserveVisibleTasks = options.preserveVisibleTasks === true;

    if (!canUseUiPath || !selectedInstanceId) {
      setLiveTasks([]);
      setLiveMaestroContext(null);
      setLiveTaskStatus('idle');
      setLiveTaskError(null);
      return;
    }

    setLiveTaskStatus('loading');
    setLiveTaskError(null);

    try {
      const [context, tasks] = await Promise.all([
        fetchMaestroInstanceContext(sdk, selectedInstanceId, selectedMaestroFolderKey).catch(() => null),
        findPendingTasksForInstance(
          sdk,
          selectedInstanceId,
          liveRecordActionTaskReferences.instanceIds,
          liveRecordActionTaskReferences.taskIds,
        ),
      ]);
      setLiveMaestroContext(context);
      setLiveTasks((currentTasks) => (
        preserveVisibleTasks
          ? mergeVisibleLiveTasks(currentTasks, tasks)
          : tasks
      ));
      setLiveTaskStatus('ready');
    } catch (error) {
      const message = getErrorMessage(error);
      setLiveTasks((currentTasks) => (
        preserveVisibleTasks && currentTasks.length > 0
          ? currentTasks
          : []
      ));
      setLiveTaskError(message);
      setLiveTaskStatus('error');
    }
  }, [canUseUiPath, sdk, selectedInstanceId, selectedMaestroFolderKey, liveRecordActionTaskReferences]);

  useEffect(() => {
    void refreshLiveRecords();
  }, [refreshLiveRecords]);

  useEffect(() => {
    setLiveTasks([]);
    setLiveMaestroContext(null);
    setLiveTaskError(null);
    setLiveTaskStatus(selectedInstanceId ? 'loading' : 'idle');
  }, [selectedInstanceId]);

  useEffect(() => {
    void refreshLiveTasks({ preserveVisibleTasks: true });
  }, [refreshLiveTasks]);

  useEffect(() => {
    void refreshAssignmentLiveTasks();
  }, [refreshAssignmentLiveTasks]);

  useEffect(() => {
    if (!selectedCase?.id || liveTasks.length === 0) {
      return;
    }

    setAssignmentLiveTasksByCaseId((current) => ({
      ...current,
      [selectedCase.id]: mergeVisibleLiveTasks(current[selectedCase.id] || [], liveTasks),
    }));
  }, [liveTasks, selectedCase?.id]);

  useEffect(() => {
    if (!canUseUiPath || !selectedInstanceId || isTaskEmbedOpen) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      void refreshLiveRecords();
      void refreshLiveTasks({ preserveVisibleTasks: true });
      void refreshAssignmentLiveTasks();
    }, 12_000);

    return () => window.clearInterval(intervalId);
  }, [canUseUiPath, selectedInstanceId, isTaskEmbedOpen, refreshLiveRecords, refreshLiveTasks, refreshAssignmentLiveTasks]);

  const handleStartMaestroCase = async (
    caseItem: BenefitCase = simulatedApplicationCase,
    relatedScreen = 'Case Detail',
  ) => {
    if (!canUseUiPath) {
      showToast(uiPathDisabledReason || 'UiPath sign-in is required.', 'warning');
      return;
    }

    setIsStartingMaestro(true);
    setSelectedCaseId(caseItem.id);

    try {
      const result = await startMaestroCase(sdk, caseItem);

      if (result.instanceId) {
        setStartedInstanceByCase((current) => ({
          ...current,
          [caseItem.id]: result.instanceId!,
        }));
      }

      appendAuditEvent(
        caseItem.id,
        'Maestro Case Started',
        `Started UiPath Maestro process ${IES_WORKFLOW_CONFIG.maestroProcessKey} for ${caseItem.mybNumber}.`,
        relatedScreen,
        'System actions',
      );
      showToast('New Application Created', 'success');
      window.setTimeout(() => {
        void refreshLiveRecords();
      }, 4000);
    } catch (error) {
      showToast(getErrorMessage(error), 'error');
    } finally {
      setIsStartingMaestro(false);
    }
  };

  const handleOpenMaestro = () => {
    const url = selectedInstanceId
      ? buildMaestroInstanceUrl(selectedInstanceId)
      : buildMaestroProcessUrl();

    window.open(url, '_blank', 'noopener,noreferrer');
    appendAuditEvent(
      selectedCase.id,
      selectedInstanceId ? 'Maestro Instance Opened' : 'Maestro Process Opened',
      selectedInstanceId
        ? `Opened live Maestro instance ${selectedInstanceId}.`
        : 'Opened the configured Maestro process.',
      'Case Detail',
      'System actions',
    );
  };

  const getCaseMaestroInstanceId = (caseItem: BenefitCase): string | null => {
    const liveRecord = findMatchingLiveRecord(liveRecords, caseItem);
    return getLiveRecordInstanceId(liveRecord)
      || startedInstanceByCase[caseItem.id]
      || null;
  };

  const handleOpenMaestroForCase = (caseItem: BenefitCase, relatedScreen: string) => {
    const instanceId = getCaseMaestroInstanceId(caseItem);

    if (!instanceId) {
      showToast(`No Maestro instance is linked to ${caseItem.mybNumber} yet.`, 'warning');
      return;
    }

    window.open(buildMaestroInstanceUrl(instanceId), '_blank', 'noopener,noreferrer');
    appendAuditEvent(
      caseItem.id,
      'Maestro Instance Opened',
      `Opened live Maestro instance ${instanceId}.`,
      relatedScreen,
      'System actions',
    );
  };

  const handleOpenTask = (
    task: LiveTaskSummary,
    mode: 'modal' | 'inline' = 'modal',
    definition?: ActionAppDefinition,
  ) => {
    const taskLink = buildTaskLink(task.id);
    const taskEmbed: TaskEmbedState = {
      taskId: task.id,
      title: definition?.name || task.appDefinition?.name || task.title,
      taskLink,
      embedUrl: convertTaskLinkToEmbedUrl(taskLink),
      tab: definition?.tab || task.appDefinition?.tab,
    };

    if (mode === 'inline') {
      setInlineTaskEmbed(taskEmbed);
    } else {
      setActiveTaskEmbed(taskEmbed);
    }
    appendAuditEvent(
      selectedCase.id,
      'UiPath Action Opened',
      `Opened Action Center task ${task.id}: ${task.title}.`,
      'Case Detail',
      'Worker actions',
    );
  };

  const handleCloseTaskEmbed = () => {
    setActiveTaskEmbed(null);
    setScreen('detail');
    setActiveTab('Actions');
    void refreshLiveTasks({ preserveVisibleTasks: true });
  };

  const handleCloseInlineTaskEmbed = () => {
    setInlineTaskEmbed(null);
    void refreshLiveTasks({ preserveVisibleTasks: true });
  };

  const Header = () => (
    <header className="bg-usda-green shadow-lg border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-3 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Benefits Case Management Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-2 text-sm text-white">
              <span className={`w-2 h-2 rounded-full ${canUseUiPath ? 'bg-green-400' : 'bg-yellow-300'}`}></span>
              <span>{role}</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs text-white/90 max-w-xs truncate">
              <span className="font-medium">UiPath</span>
              <span>{canUseUiPath ? currentUserEmail || 'Connected' : uiPathConfigError ? 'OAuth setup needed' : 'Signed out'}</span>
            </div>
            {authError && (
              <span className="max-w-xs truncate text-xs text-yellow-100" title={authError}>
                {authError}
              </span>
            )}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  logout();
                  return;
                }

                void login();
              }}
              disabled={isAuthLoading || Boolean(uiPathConfigError)}
              title={uiPathConfigError || undefined}
              className="bg-white hover:bg-blue-50 text-usda-green px-4 py-2 rounded-lg font-medium transition-colors border border-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAuthLoading ? 'Checking UiPath' : isAuthenticated ? 'Sign Out' : 'Sign In'}
            </button>
            <button
              onClick={() => setScreen('settings')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Mock Settings
            </button>
            <button
              onClick={() => setIsHelpDrawerOpen(true)}
              className="bg-white hover:bg-blue-50 text-usda-green px-4 py-2 rounded-lg font-medium transition-colors border border-white"
            >
              Help
            </button>
          </div>
        </div>
      </div>
    </header>
  );

  const Navigation = () => {
    const items = ([
      { id: 'inbox', label: 'Case Inbox' },
      { id: 'operations', label: 'Operations Dashboard' },
      { id: 'assignment', label: assignmentNavLabel },
      { id: 'settings', label: 'Mock Settings / Role Switcher' },
      { id: 'helpCenter', label: 'Help Center' },
    ] satisfies Array<{ id: Screen; label: string }>).filter((item) => item.id !== 'assignment' || canViewAssignmentDashboard);

    return (
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 flex-wrap py-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setScreen(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  screen === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    );
  };

  const DemoBanner = () => showDemoBanner ? (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-sm text-purple-800 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Pill label="Demo Mode" className="bg-purple-100 text-purple-800 border-purple-200" />
        <span>Demo Mode uses local mock data with optional live UiPath actions.</span>
      </div>
      <button className="text-purple-700 font-medium hover:text-purple-900" onClick={() => setShowDemoBanner(false)}>
        Hide
      </button>
    </div>
  ) : null;

  const LiveActionPanel = () => {
    const taskRows = buildActionTaskRows(liveTasks)
      .filter(({ task }) => Boolean(task)) as Array<{ definition: ActionAppDefinition; task: LiveTaskSummary }>;
    const matchedTaskIds = new Set(
      taskRows
        .map(({ task }) => task.id),
    );
    const unmatchedTasks = liveTasks.filter((task) => !matchedTaskIds.has(task.id));
    const hasVisibleTasks = taskRows.length > 0 || unmatchedTasks.length > 0;
    const uiPathStatus = canUseUiPath
      ? currentUserEmail || 'Connected'
      : uiPathConfigError || 'Signed out';
    const instanceStatus = liveMaestroContext?.instance
      ? 'Loaded'
      : selectedInstanceId
        ? 'Linked'
        : 'Not linked';
    const missingInstanceReason = 'No Maestro instance ID is linked to this case yet.';

    return (
      <SectionCard
        title="Human-in-the-Loop Action Tasks"
        actions={(
          <div className="flex flex-wrap gap-2">
            <ActionButton
              disabled={!canUseUiPath || !selectedInstanceId || liveTaskStatus === 'loading'}
              disabledReason={!selectedInstanceId ? 'Start or link a Maestro instance first.' : uiPathDisabledReason}
              onClick={() => void refreshLiveTasks()}
            >
              {liveTaskStatus === 'loading' ? 'Refreshing Actions' : 'Refresh Actions'}
            </ActionButton>
            <ActionButton
              disabled={!selectedInstanceId}
              disabledReason={missingInstanceReason}
              onClick={handleOpenMaestro}
            >
              Open Maestro Instance
            </ActionButton>
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="SDK Auth" value={uiPathStatus} />
            <Field label="Orchestrator Folder" value={IES_WORKFLOW_CONFIG.orchestratorFolderName} />
            <Field label="Available Tasks" value={liveTaskStatus === 'loading' && liveTasks.length === 0 ? 'Loading' : liveTasks.length} />
            <Field label="Maestro Instance" value={selectedInstanceId || instanceStatus} />
          </div>

          {(liveTaskError || authError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {liveTaskError || authError}
            </div>
          )}

          {taskRows.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-12 gap-3 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <span className="col-span-5">BPMN HITL Task</span>
                <span className="col-span-3">Live Task</span>
                <span className="col-span-4">Controls</span>
              </div>
              {taskRows.map(({ definition, task }) => (
                <div key={task.id} className="grid grid-cols-12 gap-3 items-center border-t border-gray-200 px-4 py-3 text-sm">
                  <div className="col-span-12 md:col-span-5 min-w-0">
                    <div className="flex items-start gap-3">
                      <UserTaskIcon />
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{definition.name}</p>
                        <p className="text-xs text-gray-500">{definition.process} - {definition.lane}</p>
                        <p className="text-xs text-gray-500">Action app: {definition.appName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-3 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">Task {task.id} - {task.assignedTo || task.status}</p>
                  </div>
                  <div className="col-span-12 md:col-span-4 flex flex-wrap items-center gap-2">
                    <ActionButton onClick={() => handleOpenTask(task, 'modal', definition)}>
                      Open Task
                    </ActionButton>
                    {isLiveTaskCompleted(task) && (
                      <Pill label="Completed" className="bg-green-100 text-green-800 border-green-200" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!hasVisibleTasks && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-6 text-sm">
              <p className="font-semibold text-gray-900">
                {liveTaskStatus === 'loading' ? 'Case Processing' : 'No tasks available'}
              </p>
              <p className="mt-1 text-gray-600">
                No assigned Action Center tasks are available for this case yet.
              </p>
            </div>
          )}

          {unmatchedTasks.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Additional Live HITL Tasks</p>
              {unmatchedTasks.map((task) => (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 border border-gray-200 rounded-lg px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">Task {task.id} - {task.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton onClick={() => handleOpenTask(task)}>Open Task</ActionButton>
                    {isLiveTaskCompleted(task) && (
                      <Pill label="Completed" className="bg-green-100 text-green-800 border-green-200" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    );
  };

  const liveTaskPanelTitles: Record<LiveActionAppTab, string> = {
    Summary: 'Summary Maestro Task',
    'Interview / Missing Info': 'Interview Maestro Task',
    Documents: 'Document Approval Workflow',
    Clearance: 'Clearance Maestro Task',
    'External Validation': 'External Validation Maestro Task',
    Budget: 'Budget Maestro Task',
  };

  const LiveTabTaskPanel = ({ tab }: { tab: LiveActionAppTab }) => {
    const tabTasks = getTasksForTab(liveTasks, tab);

    if (!isMaestroLoaded || tabTasks.length === 0) {
      return null;
    }

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-950">{liveTaskPanelTitles[tab]}</p>
            <p className="text-xs text-blue-800">
              {tabTasks.length === 1 ? `Task ${tabTasks[0].id} is ready.` : `${tabTasks.length} tasks are ready.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabTasks.map((task) => (
              <ActionButton key={task.id} variant="primary" onClick={() => handleOpenTask(task, 'inline')}>
                Open {task.appDefinition?.name || task.title}
              </ActionButton>
            ))}
            <ActionButton
              disabled={!canUseUiPath || liveTaskStatus === 'loading'}
              disabledReason={uiPathDisabledReason}
              onClick={() => void refreshLiveTasks()}
            >
              {liveTaskStatus === 'loading' ? 'Refreshing Actions' : 'Refresh Actions'}
            </ActionButton>
          </div>
        </div>
        {inlineTaskEmbed?.tab === tab && (
          <div className="border-t border-blue-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{inlineTaskEmbed.title}</p>
                <p className="text-xs text-gray-500">Task {inlineTaskEmbed.taskId}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => window.open(inlineTaskEmbed.taskLink, '_blank', 'noopener,noreferrer')}>
                  Open in Action Center
                </ActionButton>
                <ActionButton onClick={handleCloseInlineTaskEmbed}>Close</ActionButton>
              </div>
            </div>
            <iframe
              src={inlineTaskEmbed.embedUrl}
              title={inlineTaskEmbed.title}
              className="h-[72vh] min-h-[38rem] w-full border-0 bg-white"
            />
          </div>
        )}
      </div>
    );
  };

  const ToastStack = () => (
    <div className="fixed right-4 top-4 z-50 space-y-2 w-80 max-w-[calc(100vw-2rem)]">
      {toasts.map((toast) => (
        <div key={toast.id} className={`border rounded-lg shadow-lg p-4 text-sm ${getToneClass(toast.tone)}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );

  const Modal = () => modal ? (
    <div className="fixed inset-0 z-40 bg-gray-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl max-w-2xl w-full">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">{modal.title}</h2>
          <button className="text-gray-500 hover:text-gray-900" onClick={() => setModal(null)} aria-label="Close modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 text-sm text-gray-700">{modal.body}</div>
        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
          <ActionButton onClick={() => setModal(null)}>Close</ActionButton>
          {modal.onConfirm && modal.confirmLabel && (
            <ActionButton
              variant="primary"
              onClick={() => {
                modal.onConfirm?.();
                setModal(null);
              }}
            >
              {modal.confirmLabel}
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  ) : null;

  const TaskAssignmentDialog = () => {
    if (!assignmentDialogTask) {
      return null;
    }

    const task = assignmentDialogTask;
    const isStartingAssignment = startingTaskAssignmentId === task.id;

    return (
      <div className="fixed inset-0 z-40 bg-gray-900/50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-gray-200 shadow-xl max-w-xl w-full">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Change Task Assignment</h2>
              <p className="mt-1 text-sm text-gray-600">{task.caseNumber} / {task.taskName}</p>
            </div>
            <button className="text-gray-500 hover:text-gray-900" onClick={() => setAssignmentDialogTask(null)} aria-label="Close assignment dialog">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4 p-5 text-sm text-gray-700">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Current Assignment" value={task.assignedTo || 'Unassigned'} />
              <Field label="Task ID" value={task.taskId || 'Not loaded'} />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Task assignment choice</span>
              <select
                value={assignmentDialogMode}
                onChange={(event) => setAssignmentDialogMode(event.target.value as AssignmentRoutingMode)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                {assignmentRoutingModeOptions.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Assign to</span>
              <select
                value={assignmentDialogEmail}
                onChange={(event) => setAssignmentDialogEmail(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                {assignmentUsers.map((user) => (
                  <option key={user.email} value={user.email}>
                    {user.name} / {user.email} / {user.assignedGroup}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-3">
            <ActionButton onClick={() => setAssignmentDialogTask(null)}>Cancel</ActionButton>
            <ActionButton
              variant="primary"
              disabled={isStartingAssignment || !assignmentDialogEmail.trim()}
              disabledReason={!assignmentDialogEmail.trim() ? 'Enter an assignee email before changing assignment.' : undefined}
              onClick={() => {
                const email = assignmentDialogEmail;
                const mode = assignmentDialogMode;
                setAssignmentDialogTask(null);
                void stageTaskTeamChange(task, email, mode);
              }}
            >
              {isStartingAssignment ? 'Starting...' : 'Change Assignment'}
            </ActionButton>
          </div>
        </div>
      </div>
    );
  };

  const TaskEmbedModal = () => activeTaskEmbed ? (
    <div className="fixed inset-0 z-50 bg-gray-900/70 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-lg border border-gray-200 shadow-xl w-full h-[92vh] max-w-6xl flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{activeTaskEmbed.title}</h2>
            <p className="text-xs text-gray-500">Task {activeTaskEmbed.taskId}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ActionButton onClick={() => window.open(activeTaskEmbed.taskLink, '_blank', 'noopener,noreferrer')}>
              Open in Action Center
            </ActionButton>
            <ActionButton onClick={handleCloseTaskEmbed}>Close</ActionButton>
          </div>
        </div>
        <iframe
          src={activeTaskEmbed.embedUrl}
          title={activeTaskEmbed.title}
          className="w-full flex-1 border-0"
        />
      </div>
    </div>
  ) : null;

  const HelpDrawer = () => isHelpDrawerOpen ? (
    <div className="fixed inset-0 z-40 flex justify-end bg-gray-900/40">
      <aside className="h-full w-full max-w-xl bg-white shadow-xl border-l border-gray-200 flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Help & Guidance</p>
            <h2 className="text-xl font-semibold text-gray-900 mt-1">{currentHelp.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{currentHelp.summary}</p>
          </div>
          <button className="text-gray-500 hover:text-gray-900" onClick={() => setIsHelpDrawerOpen(false)} aria-label="Close help drawer">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Worker Guidance</h3>
            <ul className="space-y-2">
              {currentHelp.workerGuidance.map((item) => (
                <li key={item} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-blue-600">-</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Role Guidance: {role}</h3>
            <ul className="space-y-2">
              {roleHelp[role].map((item) => (
                <li key={item} className="text-sm text-gray-700">{item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">What to do here</h3>
            <div className="space-y-2">
              {currentHelp.checklist.map((item) => (
                <div key={item} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="mt-0.5 h-4 w-4 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-[10px] font-bold">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Key Terms</h3>
            <div className="space-y-3">
              {currentHelp.keyTerms.map((term) => (
                <div key={term.term} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900">{term.term}</p>
                  <p className="text-sm text-gray-600 mt-1">{term.definition}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Related Actions</h3>
            <div className="flex flex-wrap gap-2">
              {currentHelp.relatedActions.map((action) => (
                <Pill key={action} label={action} className="bg-blue-100 text-blue-800 border-blue-200" />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Reference Links</h3>
            <div className="space-y-2">
              {currentHelp.externalReferences.map((reference) => (
                <button
                  key={reference.label}
                  onClick={() => showToast(`${reference.label} is a placeholder reference in this prototype.`, 'info')}
                  className="w-full text-left border border-gray-200 rounded-lg px-3 py-2 text-sm text-blue-700 hover:bg-blue-50"
                >
                  {reference.label}
                </button>
              ))}
            </div>
          </section>

          <div className="pt-2 border-t border-gray-200">
            <ActionButton
              variant="primary"
              onClick={() => {
                setScreen('helpCenter');
                setIsHelpDrawerOpen(false);
              }}
            >
              Open Help Center
            </ActionButton>
          </div>
        </div>
      </aside>
    </div>
  ) : null;

  const ScreenGuidance = ({ context = currentHelpContext }: { context?: HelpContextId }) => {
    const help = helpContent[context];
    const coachTips = showDemoCoachTips ? demoCoachTips[context] || [] : [];

    return (
      <div className="space-y-3">
        <div className="flex justify-end">
          <button
            onClick={() => setIsHelpDrawerOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            <TooltipIcon text={`Open context help for ${help.title}.`} />
            Need help with this screen?
          </button>
        </div>
        <DemoCoachCallout items={coachTips} />
        <GuidedChecklist items={help.checklist} />
      </div>
    );
  };

  const FilterSelect = ({
    label,
    value,
    options,
    onChange,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
  }) => (
    <label className="block">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <select
        className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );

  const inboxEmptyMessage = !canUseUiPath
    ? uiPathDisabledReason || 'Sign in to UiPath to load Data Fabric cases.'
    : liveDataStatus === 'loading'
      ? 'Loading live Data Fabric cases.'
      : liveDataStatus === 'error'
        ? liveDataError || 'Data Fabric cases could not be loaded.'
        : 'No Data Fabric cases match the current filters.';

  const InboxScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="inbox" />
      <SectionCard
        title="Case Inbox"
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ActionButton
              variant="primary"
              disabled={!canUseUiPath || isStartingMaestro}
              disabledReason={uiPathDisabledReason}
              onClick={() => void handleStartMaestroCase(simulatedApplicationCase, 'Case Inbox')}
            >
              Simulate new Application
            </ActionButton>
            <ActionButton
              disabled={!canUseUiPath || liveDataStatus === 'loading'}
              disabledReason={uiPathDisabledReason}
              onClick={() => void refreshLiveRecords()}
            >
              Refresh Data Fabric
            </ActionButton>
            <Pill label={`Showing ${filteredCases.length ? `${inboxStartIndex + 1}-${inboxEndIndex}` : '0'} of ${filteredCases.length}`} className="bg-blue-100 text-blue-800 border-blue-200" />
          </div>
        )}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <label className="block md:col-span-2 xl:col-span-1">
              <span className="text-xs font-medium text-gray-600">Search by applicant or MyB number</span>
              <input
                className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="MYB-1004 or Michael"
              />
            </label>
            <FilterSelect label="County" value={filters.county} options={countyOptions} onChange={(value) => setFilters((current) => ({ ...current, county: value }))} />
            <FilterSelect label="Region" value={filters.region} options={regionOptions} onChange={(value) => setFilters((current) => ({ ...current, region: value }))} />
            <FilterSelect label="Status" value={filters.status} options={statusOptions} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} />
            <FilterSelect label="Priority" value={filters.priority} options={priorityOptions} onChange={(value) => setFilters((current) => ({ ...current, priority: value }))} />
            <FilterSelect label="Exception type" value={filters.exception} options={exceptionOptions} onChange={(value) => setFilters((current) => ({ ...current, exception: value }))} />
            <FilterSelect label="Assigned group" value={filters.assignedGroup} options={assignedGroups} onChange={(value) => setFilters((current) => ({ ...current, assignedGroup: value }))} />
            <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
              <input type="checkbox" checked={filters.dueSoon} onChange={(event) => setFilters((current) => ({ ...current, dueSoon: event.target.checked }))} />
              Due soon
            </label>
            <label className="flex items-center gap-2 mt-6 text-sm text-gray-700">
              <input type="checkbox" checked={filters.expedited} onChange={(event) => setFilters((current) => ({ ...current, expedited: event.target.checked }))} />
              Expedited
            </label>
            <div className="mt-5">
              <ActionButton onClick={() => setFilters(emptyFilters)}>Reset Filters</ActionButton>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredCases.length === 0 ? (
              <div className="border border-gray-200 rounded-lg px-6 py-12 text-center text-sm text-gray-500">
                {inboxEmptyMessage}
              </div>
            ) : paginatedCases.map((caseItem, index) => {
              const isMostRecentCase = inboxStartIndex === 0 && index === 0;

              return (
                <article
                  key={caseItem.id}
                  onClick={() => openCase(caseItem)}
                  className="border border-gray-200 rounded-lg bg-white p-4 shadow-sm hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                  title={`Open ${caseItem.mybNumber}`}
                >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="min-w-0">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        openCase(caseItem);
                      }}
                      className="text-blue-700 hover:text-blue-900 hover:underline text-base font-semibold"
                    >
                      <LabelWithHelp label={caseItem.mybNumber} help={tooltips.mybNumber} />
                    </button>
                    <h3 className="text-sm font-semibold text-gray-900 mt-1">{caseItem.applicantName}</h3>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{caseItem.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isMostRecentCase && <Pill label="Most Recent" className="bg-green-100 text-green-800 border-green-200" />}
                    <Pill label={caseItem.status} />
                    <Pill label={caseItem.priority} className={getPriorityClasses(caseItem.priority)} />
                    {caseItem.expedited && <Pill label="Expedited" className="bg-red-100 text-red-800 border-red-200" />}
                  </div>
                </div>

                <dl className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mt-4">
                  <Field label="County" value={caseItem.county} />
                  <Field label="Region" value={caseItem.region} />
                  <Field label="Filing Date" value={formatDate(caseItem.filingDate)} help={tooltips.filingDate} />
                  <Field
                    label="Eligibility Due Date"
                    value={<span>{formatDate(caseItem.eligibilityDueDate)} {isDueSoon(caseItem) && <Pill label="Due Soon" />}</span>}
                    help={tooltips.eligibilityDueDate}
                  />
                  <Field label="Current Stage" value={caseItem.currentStage} />
                  <Field label="Assigned Group" value={caseItem.assignedGroup} help={tooltips.assignedGroup} />
                  <Field label="Assigned Worker" value={caseItem.assignedWorker} />
                  <Field label="Status" value={<Pill label={caseItem.status} />} help={tooltips.status} />
                  <Field label="Priority" value={<Pill label={caseItem.priority} className={getPriorityClasses(caseItem.priority)} />} help={tooltips.priority} />
                </dl>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                  <ActionButton variant="primary" onClick={() => openCase(caseItem)}>Open Case</ActionButton>
                  <ActionButton
                    disabled={!getCaseMaestroInstanceId(caseItem)}
                    disabledReason="No Maestro instance is linked to this case yet."
                    onClick={() => handleOpenMaestroForCase(caseItem, 'Case Inbox')}
                  >
                    Open Maestro Instance
                  </ActionButton>
                  <ActionButton onClick={() => assignToMe(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')} disabledReason={editDisabledReason('inbox')}>Assign to Me</ActionButton>
                  <ActionButton onClick={() => markPriority(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')} disabledReason={editDisabledReason('inbox')}>Mark Priority</ActionButton>
                  <ActionButton onClick={() => openCase(caseItem, 'Timeline / Audit')}>View Flow</ActionButton>
                </div>
              </article>
              );
            })}
          </div>

          {filteredCases.length > inboxPageSize && (
            <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-600">
                Page {currentInboxPage} of {totalInboxPages}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setInboxPage((page) => Math.max(1, page - 1))}
                  disabled={currentInboxPage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {Array.from({ length: totalInboxPages }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setInboxPage(page)}
                    className={`min-w-10 px-3 py-2 rounded-lg border text-sm font-medium ${
                      page === currentInboxPage
                        ? 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                    aria-current={page === currentInboxPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setInboxPage((page) => Math.min(totalInboxPages, page + 1))}
                  disabled={currentInboxPage === totalInboxPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
      <HelpBox>
        Filters are local only. Use exception, due soon, or assigned group filters to shape the inbox before opening a case.
      </HelpBox>
    </div>
  );

  const DetailHeader = () => (
    <SectionCard
      title={`${selectedCase.mybNumber} - ${selectedCase.applicantName}`}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionButton
            disabled={!selectedInstanceId}
            disabledReason="No Maestro instance is linked to this case yet."
            onClick={() => handleOpenMaestroForCase(selectedCase, 'Case Dashboard')}
          >
            Open Maestro Instance
          </ActionButton>
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        <Field label="County / Region" value={`${selectedCase.county} / ${selectedCase.region}`} />
        <Field label="Filing Date" value={formatDate(selectedCase.filingDate)} help={tooltips.filingDate} />
        <Field label="Eligibility Due Date" value={formatDate(addMonths(selectedCase.filingDate, 2))} help={tooltips.eligibilityDueDate} />
        <Field label="Assigned Group" value={selectedCase.assignedGroup} help={tooltips.assignedGroup} />
        <Field label="Assigned Worker" value={<span className="block break-all leading-5">{selectedCase.assignedWorker}</span>} />
        <Field label="Current Stage" value={selectedCase.currentStage} />
        <Field label="Program" value={selectedCase.program} />
      </div>
    </SectionCard>
  );

  const TabBar = () => (
    <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex w-full flex-nowrap overflow-x-auto">
        {visibleDetailTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex min-w-max flex-1 basis-0 items-center justify-center px-3 py-3 text-center text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );

  const Checklist = ({ items }: { items: Array<{ label: string; status: ChecklistStatus }> }) => (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg px-3 py-2">
          <span className="text-sm text-gray-700">{item.label}</span>
          <Pill label={getChecklistDisplayStatus(item.status)} />
        </div>
      ))}
    </div>
  );

  const SummaryTab = () => {
    const usesExactSnapApplication = selectedCase.application.uiPathDocumentRef?.documentId === IES_WORKFLOW_CONFIG.applicationPdfBucket.fileName
      || applicationDocumentSource?.uiPathDocumentRef?.documentId === IES_WORKFLOW_CONFIG.applicationPdfBucket.fileName;
    const summaryEligibilityDueDate = addMonths(selectedCase.filingDate, 2);
    const summaryStatus = ['Approved', 'Denied', 'Withdrawn'].includes(selectedCase.status)
      ? selectedCase.status
      : 'Processing';
    const currentStageText = selectedCase.currentStage.toLowerCase();
    const hasAnyParallelSubprocessTask = [
      'Interview / Missing Info',
      'Documents',
      'Clearance',
      'External Validation',
    ].some((tab) => getTasksForTab(liveTasks, tab as LiveActionAppTab).length > 0);
    const parallelSubprocessesRunning = hasAnyParallelSubprocessTask
      || ['interview', 'document', 'clearance', 'external validation'].some((stage) => currentStageText.includes(stage));
    const checklistItems = summaryChecklistRows.map((row) => {
      const subprocessTab = subprocessTabByChecklistLabel[row.sourceLabel];
      const hasPendingSubprocessTask = subprocessTab
        ? getTasksForTab(liveTasks, subprocessTab).length > 0
        : false;
      let status: ChecklistStatus = 'Not Started';

      if (row.sourceLabel === 'Interview complete') {
        status = hasPendingSubprocessTask || parallelSubprocessesRunning ? 'Pending' : 'Not Started';
      } else if (['Documents reviewed', 'Clearance reviewed', 'External validations reviewed'].includes(row.sourceLabel)) {
        status = hasPendingSubprocessTask || parallelSubprocessesRunning ? 'In Progress' : 'Not Started';
      }

      return {
        label: row.label,
        status,
      };
    });
    const snapApplicationHousehold = [
      {
        name: 'Michael M. Motorist',
        relationship: 'Applicant',
        detail: 'Applying for SNAP assistance.',
      },
      {
        name: 'Sarah A. Motorist',
        relationship: 'Spouse',
        detail: 'Part-time income fluctuates based on schedule.',
      },
      {
        name: 'Emma L. Motorist',
        relationship: 'Child',
        detail: 'School listed as Your City Middle School.',
      },
    ];
    const snapApplicationHousingExpenses = [
      {
        type: 'Rent',
        amount: '$1,250.00',
        frequency: 'Monthly',
      },
      {
        type: 'Heating / Utility Provider',
        amount: 'National Grid gas heat',
        frequency: 'Reported separately',
      },
    ];
    const housingExpenseEntries = usesExactSnapApplication
      ? snapApplicationHousingExpenses
      : selectedCase.expenses;

    return (
      <div className="space-y-6">
        <ScreenGuidance context="summary" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Applicant Profile">
            <dl className="space-y-4">
              <Field label="Email" value={selectedCase.applicant.email} />
              <Field label="Phone" value={usesExactSnapApplication ? 'Not Listed' : selectedCase.applicant.phone} />
              <Field label="Address" value={selectedCase.applicant.address} />
              <Field label="Language" value={usesExactSnapApplication ? 'English' : selectedCase.applicant.preferredLanguage} />
              <Field label="Contact Preference" value={usesExactSnapApplication ? 'Email' : selectedCase.applicant.contactPreference} />
            </dl>
          </SectionCard>

        <SectionCard title="Household Summary">
          {usesExactSnapApplication ? (
            <div className="space-y-4">
              <div className="space-y-3">
                {snapApplicationHousehold.map((member) => (
                  <div key={member.name} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.relationship}</p>
                      </div>
                      <Pill label="Applying" />
                    </div>
                    <p className="text-xs text-gray-600 mt-2">{member.detail}</p>
                  </div>
                ))}
              </div>
              <dl className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-4">
                <Field label="Residence Address" value="2345 Anywhere Street, Your City, NY 12345" />
                <Field label="Marital Status" value="Married" />
                <Field label="Application Notes" value="Household applies for SNAP assistance." />
              </dl>
            </div>
          ) : selectedCase.household.length ? (
            <div className="space-y-3">
              {selectedCase.household.map((member) => (
                <div key={member.name} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.relationship}</p>
                    </div>
                    <Pill label={member.applying ? 'Applying' : 'Not Applying'} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No household details have been updated in Data Fabric yet.</p>
          )}
        </SectionCard>

        <SectionCard title="Due Date / SLA">
          <div className="space-y-4">
            <MetricCard label="Days until due" value={daysUntil(summaryEligibilityDueDate)} tone={isDueSoon({ ...selectedCase, eligibilityDueDate: summaryEligibilityDueDate }) ? 'red' : 'blue'} />
            <p className="text-sm text-gray-600">Eligibility due date is {formatDate(summaryEligibilityDueDate)}.</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <SectionCard title="Income Summary">
            {selectedCase.income.length ? (
              <div className="space-y-3">
                {selectedCase.income.map((income) => (
                  <div
                    key={`${income.person}-${income.source}`}
                    className="flex justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <span>{income.person} - {income.source}</span>
                    <span className="font-medium">{income.grossAmount} {income.frequency}</span>
                  </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No income values have been updated in Data Fabric yet.</p>
          )}
        </SectionCard>

          {housingExpenseEntries.length > 0 && (
            <SectionCard title="Housing / Expense Summary">
              <div className="space-y-3">
                {housingExpenseEntries.map((expense) => (
                  <div
                    key={`${expense.type}-${expense.amount}`}
                    className="flex justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <span>{expense.type}</span>
                    <span className="font-medium">{expense.amount} {expense.frequency}</span>
                  </div>
              ))}
            </div>
            </SectionCard>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Program, Status, and Blockers">
          <div className="space-y-4">
            <Field label="Program Selected" value={selectedCase.program} />
            <Field label="Current Status" value={<Pill label={summaryStatus} />} />
            <div>
              <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Blockers</h3>
              <ul className="mt-2 space-y-2">
                {selectedCase.currentBlockers.length ? selectedCase.currentBlockers.map((blocker) => (
                  <li key={blocker} className="text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded-lg p-2">{blocker}</li>
                )) : <li className="text-sm text-gray-500">No blockers recorded.</li>}
              </ul>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="Worker Checklist">
          <Checklist items={checklistItems} />
        </SectionCard>
      </div>

      <HelpBox>
        Summary is the worker launch point: review the applicant, check blockers, and move the case to the next local step.
      </HelpBox>
      </div>
    );
  };

  const AssignmentDashboardScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="assignment" />

      {canManageTaskAssignments ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <MetricCard label="Maestro tasks" value={assignmentTaskMetrics.total} tone="blue" />
          <MetricCard label="Ready tasks" value={assignmentTaskMetrics.ready} tone="green" />
          <MetricCard label="Queued tasks" value={assignmentTaskMetrics.queued} tone="yellow" />
          <MetricCard label="Completed tasks" value={assignmentTaskMetrics.completed} tone="gray" />
          <MetricCard label="PTO conflicts" value={assignmentTaskMetrics.ptoConflicts} tone="orange" />
          <MetricCard label="Assignable users" value={assignmentTaskMetrics.users} tone="purple" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="PTO entries" value={assignmentPtoMetrics.entries} tone="blue" />
          <MetricCard label="Users out this month" value={assignmentPtoMetrics.usersOutThisMonth} tone="purple" />
          <MetricCard label="Scheduled PTO days" value={assignmentPtoMetrics.daysScheduled} tone="green" />
          <MetricCard label="Out today" value={assignmentPtoMetrics.outToday} tone="orange" />
        </div>
      )}

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-3" aria-label="Assignment subtabs">
          {visibleAssignmentSubtabs.map((subtab) => {
            const isActiveSubtab = activeAssignmentSubtab === subtab;
            return (
              <button
                key={subtab}
                type="button"
                onClick={() => setActiveAssignmentSubtab(subtab)}
                className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
                  isActiveSubtab
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {subtab}
              </button>
            );
          })}
        </nav>
      </div>

      {activeAssignmentSubtab === 'Task Assignments' ? (
        <>
      <SectionCard
        title="Maestro Task Assignments"
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={IES_WORKFLOW_CONFIG.assignmentDataFabric.taskAssignment.entityUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:border-blue-300 hover:bg-blue-100"
            >
              TaskAssignment Entity
            </a>
            <ActionButton onClick={() => {
              setAssignmentTaskStatusFilter(defaultAssignmentTaskStatusFilter);
              setAssignmentTaskGroupFilter('all');
              setAssignmentRoutingMode('User');
            }}>
              Reset Filters
            </ActionButton>
            <ActionButton
              disabled={!canUseUiPath || assignmentLiveTaskStatus === 'loading'}
              disabledReason={uiPathDisabledReason}
              onClick={() => void refreshAssignmentLiveTasks()}
            >
              {assignmentLiveTaskStatus === 'loading' ? 'Refreshing...' : 'Refresh Tasks'}
            </ActionButton>
          </div>
        )}
      >
        <div className="mb-5 space-y-4">
          {assignmentLiveTaskStatus === 'loading' && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              Loading live Action Center tasks across Data Fabric cases.
            </div>
          )}
          {assignmentLiveTaskError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              Unable to load every live assignment task: {assignmentLiveTaskError}
            </div>
          )}
          <div>
            <span className="text-sm font-medium text-gray-700">Status Filter</span>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Task status filter">
              {assignmentTaskStatusOptions.map((status) => {
                const isActiveStatus = assignmentTaskStatusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={isActiveStatus}
                    onClick={() => setAssignmentTaskStatusFilter(status)}
                    className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm font-medium transition ${
                      isActiveStatus
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <span>{status === 'all' ? 'All' : status}</span>
                    <span className={`ml-3 rounded-full px-2 py-0.5 text-xs ${
                      isActiveStatus ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                    }`}
                    >
                      {assignmentStatusCounts[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Task Status</span>
              <select
                value={assignmentTaskStatusFilter}
                onChange={(event) => setAssignmentTaskStatusFilter(event.target.value as LocalAssignmentTaskStatus | 'all')}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                {assignmentTaskStatusOptions.map((status) => (
                  <option key={status} value={status}>{status === 'all' ? 'All statuses' : status}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Assigned Team</span>
              <select
                value={assignmentTaskGroupFilter}
                onChange={(event) => setAssignmentTaskGroupFilter(event.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                <option value="all">All teams</option>
                {assignedGroups.map((group) => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Task assignment choice</span>
              <select
                value={assignmentRoutingMode}
                onChange={(event) => setAssignmentRoutingMode(event.target.value as AssignmentRoutingMode)}
                className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              >
                {assignmentRoutingModeOptions.map((mode) => (
                  <option key={mode} value={mode}>{mode}</option>
                ))}
              </select>
            </label>
            <Field label="Visible Tasks" value={`${filteredAssignmentTasks.length} of ${localAssignmentTasks.length}`} />
          </div>
          {assignmentRoutingMode !== 'User' && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {assignmentRoutingMode} is shown as a routing choice for the demo. The current process still assigns the task to one email.
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Case</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Task</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Assigned Team</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Assigned User</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Availability</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Due</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredAssignmentTasks.map((task) => {
                const availableUsers = getAvailableAssignmentUsers(assignmentUsers, task.assignedGroup, task.dueDate, assignmentPtoEntries);
                const availableUserNames = availableUsers.map((user) => user.name);
                const shouldShowCurrentAssignee = task.assignedTo !== 'Unassigned' && !availableUserNames.includes(task.assignedTo);
                const isStartingAssignment = startingTaskAssignmentId === task.id;
                const assignmentActionDisabledReason = task.status === 'Completed'
                  ? 'Completed tasks are read-only locally.'
                  : task.isAssignedUserOnPto
                    ? 'Choose an available user before changing the assignment.'
                    : taskAssignmentDisabledReason
                      || (!task.taskId ? 'Open this case Actions tab to load its live Action Center task ID before starting the process.' : undefined);
                return (
                  <tr key={task.id} className="align-top hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const caseItem = assignmentSourceCases.find((candidate) => candidate.id === task.caseId);
                          if (caseItem) {
                            openAssignmentTaskCase(caseItem);
                          }
                        }}
                        className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                      >
                        {task.caseNumber}
                      </button>
                      <p className="mt-1 text-xs text-gray-500">{task.applicantName}</p>
                      <p className="mt-1 text-xs text-gray-500">{task.county} / {task.priority}</p>
                    </td>
                    <td className="px-4 py-3 min-w-[18rem]">
                      <p className="font-medium text-gray-900">{task.taskName}</p>
                      <p className="mt-1 text-xs text-gray-500">{task.process} / {task.appName}</p>
                      <p className={`mt-1 text-xs ${task.taskId ? 'text-gray-500' : 'text-orange-700'}`}>
                        Task ID: {task.taskId || 'not loaded'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">{task.lane}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Pill label={task.status} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.assignedGroup}
                        onChange={(event) => {
                          const nextGroup = event.target.value;
                          const nextAvailableUsers = getAvailableAssignmentUsers(assignmentUsers, nextGroup, task.dueDate, assignmentPtoEntries);
                          updateLocalTaskAssignment(task, {
                            assignedGroup: nextGroup,
                            assignedTo: nextAvailableUsers[0]?.name || 'Unassigned',
                          });
                        }}
                        disabled={!canManageTaskAssignments || task.status === 'Completed' || isStartingAssignment}
                        className="w-44 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        aria-label={`Assigned team for ${task.taskName}`}
                      >
                        {assignedGroups.map((group) => (
                          <option key={group} value={group}>{group}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={task.assignedTo}
                        onChange={(event) => updateLocalTaskAssignment(task, { assignedTo: event.target.value })}
                        disabled={!canManageTaskAssignments || task.status === 'Completed' || isStartingAssignment}
                        className="w-48 rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                        aria-label={`Assigned user for ${task.taskName}`}
                      >
                        {task.assignedTo === 'Unassigned' && (
                          <option value="Unassigned">Unassigned</option>
                        )}
                        {shouldShowCurrentAssignee && (
                          <option value={task.assignedTo}>{task.assignedTo} (PTO conflict)</option>
                        )}
                        {availableUsers.map((user) => (
                          <option key={user.name} value={user.name}>{user.name} ({user.email})</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {task.isAssignedUserOnPto ? (
                        <div className="space-y-1">
                          <Pill label="PTO Conflict" className="border-orange-200 bg-orange-50 text-orange-800" />
                          <p className="text-xs text-orange-700">Choose another user before changing the team.</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <Pill label="Available" className="border-green-200 bg-green-50 text-green-800" />
                          <p className="text-xs text-gray-500">{availableUsers.length} available for due date</p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDate(task.dueDate)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionButton
                        disabled={Boolean(assignmentActionDisabledReason) || isStartingAssignment}
                        disabledReason={assignmentActionDisabledReason}
                        onClick={() => openTaskAssignmentDialog(task)}
                      >
                        {isStartingAssignment ? 'Starting...' : 'Change Assignment'}
                      </ActionButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredAssignmentTasks.length === 0 && (
          <div className="rounded-lg border border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
            No Maestro task assignments match the current filters.
          </div>
        )}
      </SectionCard>

      <HelpBox>
        Supervisors can pick an assignment choice, then confirm the assignee email in the dialog. The current automation always sends one user email to the task assignment process.
      </HelpBox>
        </>
      ) : activeAssignmentSubtab === 'My Team' ? (
        <>
      <SectionCard
        title="My Team"
        actions={(
          <ActionButton onClick={() => showToast('Add a new Team Member is a placeholder for the future create-user automation.', 'info')}>
            Add a new Team Member
          </ActionButton>
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {assignmentUsers.map((user) => {
            const activeAssignments = localAssignmentTasks.filter((task) =>
              task.assignedTo === user.name && task.status !== 'Completed'
            ).length;
            const ptoToday = isUserOnPto(user.name, dateToIso(today), assignmentPtoEntries);

            return (
              <div key={user.email} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="mt-1 text-sm text-gray-600">{user.email}</p>
                  </div>
                  <Pill
                    label={ptoToday ? 'On PTO' : 'Available'}
                    className={ptoToday ? 'border-orange-200 bg-orange-50 text-orange-800' : 'border-green-200 bg-green-50 text-green-800'}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-1 gap-3">
                  <Field label="Team" value={user.assignedGroup} />
                  <Field label="Open Assignments" value={activeAssignments} />
                </dl>
              </div>
            );
          })}
        </div>
      </SectionCard>
        </>
      ) : (
        <>
      <SectionCard
        title="PTO Calendar"
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <a
              href={IES_WORKFLOW_CONFIG.assignmentDataFabric.workerPto.entityUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:border-blue-300 hover:bg-blue-100"
            >
              WorkerPTO Entity
            </a>
          </div>
        )}
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.45fr)]">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Calendar Month</span>
                <input
                  type="month"
                  value={assignmentPtoMonth}
                  onChange={(event) => setAssignmentPtoMonth(event.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">User</span>
                <select
                  value={newPtoUserName}
                  onChange={(event) => {
                    const selectedUserName = event.target.value;
                    const selectedUser = assignmentUsers.find((user) => user.name === selectedUserName);
                    setNewPtoUserName(selectedUserName);
                    if (selectedUser) {
                      setNewPtoWorkerEmail(selectedUser.email);
                    }
                  }}
                  disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                  className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  {assignmentUsers.map((user) => (
                    <option key={user.name} value={user.name}>{user.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Worker Email</span>
                <input
                  type="email"
                  value={newPtoWorkerEmail}
                  onChange={(event) => setNewPtoWorkerEmail(event.target.value)}
                  disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="worker@uipath.com"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Start Date</span>
                <input
                  type="date"
                  value={newPtoStartDate}
                  onChange={(event) => {
                    setNewPtoStartDate(event.target.value);
                    if (newPtoEndDate < event.target.value) {
                      setNewPtoEndDate(event.target.value);
                    }
                  }}
                  disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">End Date</span>
                <input
                  type="date"
                  value={newPtoEndDate}
                  min={newPtoStartDate}
                  onChange={(event) => setNewPtoEndDate(event.target.value)}
                  disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Reason</span>
                <input
                  value={newPtoReason}
                  onChange={(event) => setNewPtoReason(event.target.value)}
                  disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="PTO"
                />
              </label>
            </div>
            <ActionButton
              variant="primary"
              disabled={!canSubmitWorkerPto || !canUseUiPath || isStartingWorkerPto}
              disabledReason={workerPtoDisabledReason}
              onClick={createPtoEntry}
            >
              {isStartingWorkerPto ? 'Starting...' : 'Set PTO'}
            </ActionButton>

            <div className="rounded-lg border border-gray-200">
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
                  <div key={dayName} className="px-2 py-2 text-center">{dayName}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {assignmentPtoCalendarDays.map((day) => (
                  <div
                    key={day.date}
                    className={`min-h-28 border-b border-r border-gray-100 p-2 ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{day.dayOfMonth}</span>
                      {day.entries.length > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          {day.entries.length}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      {day.entries.slice(0, 3).map((entry) => (
                        <div
                          key={`${day.date}-${entry.id}`}
                          className="truncate rounded border border-blue-100 bg-blue-50 px-1.5 py-1 text-[11px] font-medium text-blue-800"
                          title={`${entry.userName} - ${entry.reason}`}
                        >
                          {entry.userName.split(' ')[0]} / {entry.reason}
                        </div>
                      ))}
                      {day.entries.length > 3 && (
                        <div className="text-[11px] font-medium text-gray-500">+{day.entries.length - 3} more</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-4 self-start rounded-lg border border-gray-200 bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-1">
            <Field label="PTO Entries" value={assignmentPtoMetrics.entries} />
            <Field label="Users Out This Month" value={assignmentPtoMetrics.usersOutThisMonth} />
            <Field label="Scheduled PTO Days" value={assignmentPtoMetrics.daysScheduled} />
            <Field label="Out Today" value={assignmentPtoMetrics.outToday} />
          </dl>
        </div>
      </SectionCard>

      <SectionCard title="All PTO Entries">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">User</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Worker Email</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Team</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Dates</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Days</th>
                <th scope="col" className="px-4 py-3 text-left font-semibold text-gray-600">Reason</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {sortedAssignmentPtoEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{entry.userName}</td>
                  <td className="px-4 py-3 text-gray-700">{entry.workerEmail}</td>
                  <td className="px-4 py-3 text-gray-700">{entry.assignedGroup}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDateRange(entry.startDate, entry.endDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{getInclusiveDayCount(entry.startDate, entry.endDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{entry.reason}</td>
                  <td className="px-4 py-3 text-right">
                    <ActionButton
                      disabled={!canSubmitWorkerPto || isStartingWorkerPto}
                      disabledReason={workerPtoDisabledReason}
                      onClick={() => removePtoEntry(entry.id)}
                    >
                      Remove
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedAssignmentPtoEntries.length === 0 && (
          <div className="rounded-lg border border-gray-200 px-6 py-10 text-center text-sm text-gray-500">
            No local PTO entries are scheduled.
          </div>
        )}
      </SectionCard>

      <HelpBox>
        PTO submission starts the Worker PTO process with start date, end date, and worker email. The calendar remains local demo state until WorkerPTO Data Fabric reads are wired in.
      </HelpBox>
        </>
      )}
    </div>
  );

  const ApplicationTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="application" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(24rem,0.75fr)] gap-5 items-start">
        <SectionCard title="Application PDF Preview">
          {applicationDocumentError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              Unable to load the SNAP application from Orchestrator bucket {IES_WORKFLOW_CONFIG.applicationPdfBucket.bucketId}
              {' '}at {IES_WORKFLOW_CONFIG.applicationPdfBucket.path}: {applicationDocumentError}
              <BucketReadUriDetails
                bucketId={IES_WORKFLOW_CONFIG.applicationPdfBucket.bucketId}
                folderId={IES_WORKFLOW_CONFIG.applicationPdfBucket.folderId}
                folderName={IES_WORKFLOW_CONFIG.applicationPdfBucket.folderName}
                fileName={IES_WORKFLOW_CONFIG.applicationPdfBucket.fileName}
                path={IES_WORKFLOW_CONFIG.applicationPdfBucket.path}
                expiryInMinutes={IES_WORKFLOW_CONFIG.applicationPdfBucket.readUriExpiryInMinutes}
                browseUrl={IES_WORKFLOW_CONFIG.applicationPdfBucket.browseUrl}
              />
            </div>
          )}
          <DocumentPreview
            source={applicationDocumentSource}
            title="Application PDF Preview"
            heightClass="h-[42rem] md:h-[52rem] xl:h-[60rem]"
            showSourceDetails
          />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Signature Status">
            <Field label="Signature Status" value={<Pill label={selectedCase.application.signatureStatus} />} />
          </SectionCard>

          <SectionCard title="Household Members">
            <div className="space-y-2">
              {selectedCase.household.map((member) => (
                <div key={member.name} className="text-sm border border-gray-200 rounded-lg p-3">{member.name} - {member.relationship}</div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Income Entries">
            <div className="space-y-2">
              {selectedCase.income.map((income) => (
                <div key={income.source} className="text-sm border border-gray-200 rounded-lg p-3">{income.source}: {income.grossAmount}</div>
              ))}
            </div>
          </SectionCard>

          <CollapsibleSectionCard
            title="Applicant Responses"
            isOpen={isApplicantResponsesOpen}
            onToggle={() => setIsApplicantResponsesOpen((current) => !current)}
          >
            <div className="space-y-3">
              {selectedCase.application.responses.map((response) => (
                <div key={response.label} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{response.label}</p>
                  <p className="text-sm text-gray-900 mt-1">{response.value}</p>
                </div>
              ))}
            </div>
          </CollapsibleSectionCard>
        </div>
      </div>

      <HelpBox>
        The application tab reads the SNAP application from UiPath Orchestrator bucket {IES_WORKFLOW_CONFIG.applicationPdfBucket.bucketId} at {IES_WORKFLOW_CONFIG.applicationPdfBucket.path}.
      </HelpBox>
    </div>
  );

  const InterviewTab = () => {
    const isLiveCase = Boolean(matchedLiveRecord);
    const interviewTasks = getTasksForTab(liveTasks, 'Interview / Missing Info');
    const conductedAt = matchedLiveRecord
      ? readRecordString(matchedLiveRecord, liveInterviewFieldKeys.completedAt)
      : null;
    const cp1ProcessInstanceKey = matchedLiveRecord
      ? readRecordString(matchedLiveRecord, ['CP1ProcessInstanceKey', 'CP1ProcessInstanceId', 'CP1MaestroInstanceId'])
      : null;
    const hasRecordedInterviewData = Boolean(
      selectedCase.interview.status
      || selectedCase.interview.method
      || selectedCase.interview.scheduledAt
      || conductedAt
      || selectedCase.interview.applicantContactStatus
      || selectedCase.interview.applicantResponseStatus
      || selectedCase.interview.missingFields.length
      || selectedCase.interview.workerNotes.length,
    );

    return (
      <div className="space-y-6">
        <ScreenGuidance context="interview" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Interview Status">
            <dl className="space-y-4">
              <Field label="Status" value={selectedCase.interview.status ? <Pill label={selectedCase.interview.status} /> : ''} />
              <Field label="Method" value={selectedCase.interview.method} />
              <Field label="Scheduled Date/Time" value={selectedCase.interview.scheduledAt} />
              <Field label="Conducted Date/Time" value={conductedAt ? formatDateTime(conductedAt) : ''} />
              <Field label="Applicant Contact Status" value={selectedCase.interview.applicantContactStatus} />
              <Field label="Applicant Response Status" value={selectedCase.interview.applicantResponseStatus} />
            </dl>
            {isLiveCase && !hasRecordedInterviewData && (
              <p className="mt-4 text-sm text-gray-500">No interview data recorded in Data Fabric yet.</p>
            )}
          </SectionCard>

          <SectionCard title="Missing Fields">
            <div className="space-y-2">
              {selectedCase.interview.missingFields.length ? selectedCase.interview.missingFields.map((field) => (
                <div key={field} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">{field}</div>
              )) : <p className="text-sm text-gray-500">No missing fields recorded.</p>}
            </div>
          </SectionCard>

          {isLiveCase ? (
            <SectionCard title="Live Interview Context">
              <dl className="space-y-4">
                <Field label="CP1 Process Instance" value={cp1ProcessInstanceKey || ''} />
                <Field label="Available Interview Tasks" value={interviewTasks.length} />
                <Field label="Data Source" value={hasRecordedInterviewData ? 'Data Fabric' : ''} />
              </dl>
            </SectionCard>
          ) : (
            <SectionCard title="Mock Email State">
              <div className="space-y-4">
                <Field label="Recipient" value="sohail.ghatnekar@uipath.com" />
                <Field label="Local State" value={<Pill label={selectedCase.interview.mockEmailState} />} />
                <div className="grid grid-cols-2 gap-2">
                  {['Drafted', 'Sent', 'Waiting for Response', 'Response Received'].map((state) => (
                    <div key={state} className={`rounded-lg border p-2 text-xs ${selectedCase.interview.mockEmailState === state ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 text-gray-500'}`}>
                      {state}
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        <SectionCard title="Worker Notes">
          <div className="space-y-2">
            {selectedCase.interview.workerNotes.length ? selectedCase.interview.workerNotes.map((note) => (
              <div key={note} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700">{note}</div>
            )) : <p className="text-sm text-gray-500">No interview notes recorded.</p>}
          </div>
        </SectionCard>

        {!isLiveCase && (
          <HelpBox>
            The email flow is a local state machine only. The recipient is displayed for demo purposes and no email is sent.
          </HelpBox>
        )}
      </div>
    );
  };

  const updateDocument = (documentId: string, updater: (document: DocumentRecord) => DocumentRecord, eventType: string, notes: string) => {
    if (!roleCanEdit(role, 'Documents')) {
      roleDisabledMessage();
      return;
    }

    updateCase(selectedCase.id, (caseItem) => ({
      ...caseItem,
      documents: caseItem.documents.map((documentItem) => documentItem.id === documentId ? updater(documentItem) : documentItem),
    }));
    appendAuditEvent(selectedCase.id, eventType, notes, 'Documents', 'Document events');
    showToast('Document state updated locally.', 'success');
  };

  const DocumentsTab = () => {
    const selectedBucketDocument = selectedDocument ? getEvidenceBucketDocumentConfig(selectedDocument) : null;

    return (
      <div className="space-y-6">
        <ScreenGuidance context="documents" />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <SectionCard title="Document Verification Workspace">
            <div className="grid grid-cols-1 gap-3">
              {selectedCase.documents.map((documentItem) => {
                const documentSource = documentBucketSources[documentItem.id] || resolveDocumentSource(documentItem);
                const bucketDocument = getEvidenceBucketDocumentConfig(documentItem);
                const bucketError = documentBucketErrors[documentItem.id];

                return (
                  <button
                    key={documentItem.id}
                    onClick={() => setSelectedDocumentId(documentItem.id)}
                    className={`text-left border rounded-lg p-4 transition-colors ${selectedDocument?.id === documentItem.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{documentItem.name}</p>
                        <p className="text-xs text-gray-500">{documentItem.type} - {documentItem.person}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Pill label={documentItem.status} />
                        <Pill label={documentItem.reusable ? 'Reusable' : 'Case-specific'} className="bg-gray-100 text-gray-800 border-gray-200" />
                        {documentSource ? (
                          <Pill label={documentSource.sourceLabel} className="bg-purple-50 text-purple-800 border-purple-200" />
                        ) : bucketError ? (
                          <Pill label="Bucket unavailable" className="bg-red-50 text-red-800 border-red-200" />
                        ) : bucketDocument ? (
                          <Pill label="Loading bucket file" className="bg-blue-50 text-blue-800 border-blue-200" />
                        ) : (
                          <Pill label="No bucket file" className="bg-gray-100 text-gray-800 border-gray-200" />
                        )}
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-3 mt-4">
                      <Field label="Received Date" value={formatDate(documentItem.receivedDate)} />
                      <Field label="Reusable Document" value={documentItem.reusable ? 'Yes' : 'No'} help={tooltips.reusableDocument} />
                      <Field
                        label="Confidence"
                        help={tooltips.confidence}
                        value={(
                          <span className="flex items-center gap-2">
                            <span className="w-20 bg-gray-200 rounded-full h-2">
                              <span className={`block h-2 rounded-full ${documentItem.confidence < 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${documentItem.confidence}%` }} />
                            </span>
                            <span>{documentItem.confidence}%</span>
                          </span>
                        )}
                      />
                      <Field label="Action" value={selectedDocument?.id === documentItem.id ? 'Selected' : 'Select to review'} />
                    </dl>
                  </button>
                );
              })}
            </div>
          </SectionCard>

          <div className="xl:col-span-2 space-y-5">
            <SectionCard title={selectedDocument ? `${selectedDocument.name} Preview` : 'Document Preview'}>
              {selectedDocument ? (
                <div className="space-y-3">
                  {documentBucketErrors[selectedDocument.id] && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      Unable to load this document from Orchestrator bucket {IES_WORKFLOW_CONFIG.documentEvidenceBucket.bucketId}: {documentBucketErrors[selectedDocument.id]}
                      {selectedBucketDocument && (
                        <BucketReadUriDetails
                          bucketId={IES_WORKFLOW_CONFIG.documentEvidenceBucket.bucketId}
                          folderId={IES_WORKFLOW_CONFIG.documentEvidenceBucket.folderId}
                          folderName={IES_WORKFLOW_CONFIG.documentEvidenceBucket.folderName}
                          fileName={selectedBucketDocument.fileName}
                          path={selectedBucketDocument.path}
                          expiryInMinutes={IES_WORKFLOW_CONFIG.documentEvidenceBucket.readUriExpiryInMinutes}
                          browseUrl={IES_WORKFLOW_CONFIG.documentEvidenceBucket.browseUrl}
                        />
                      )}
                    </div>
                  )}
                  <DocumentPreview source={selectedDocumentSource} title={selectedDocument.name} showSourceDetails />
                </div>
              ) : (
                <div className="h-[36rem] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-center p-8">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8M8 11h8m-8 4h5m-8 5h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Select a document card</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-md">The Orchestrator bucket preview and file-source details appear here after a worker selects a document.</p>
                </div>
              )}
            </SectionCard>

            <SectionCard title="Extracted Values">
              {selectedDocument ? (
                <dl className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  <Field label="Document" value={selectedDocument.name} />
                  <Field label="Name" value={selectedDocument.extractedValues.name} />
                  <Field label="Date" value={selectedDocument.extractedValues.date} />
                  <Field label="Amount" value={selectedDocument.extractedValues.amount} />
                  <Field label="Employer" value={selectedDocument.extractedValues.employer} />
                  <Field label="Address" value={selectedDocument.extractedValues.address} />
                  <Field label="Confidence Score" value={<Pill label={`${selectedDocument.extractedValues.confidenceScore}%`} />} />
                </dl>
              ) : (
                <p className="text-sm text-gray-500">Select a document card to view extracted mock values.</p>
              )}
            </SectionCard>
          </div>
        </div>

        <HelpBox>
          MYB-1004 now shows only the required Michael Motorist documents: driver license, paystub, and National Grid utility bill. The license covers identity, so a birth certificate is not shown; the utility bill covers the utility evidence, so lease proof is not shown.
        </HelpBox>
      </div>
    );
  };

  const updateClearance = (scenarioId: string, status: ClearanceScenario['status'], eventType: string) => {
    if (!roleCanEdit(role, 'Clearance')) {
      roleDisabledMessage();
      return;
    }

    updateCase(selectedCase.id, (caseItem) => ({
      ...caseItem,
      clearance: caseItem.clearance.map((scenario) => scenario.id === scenarioId ? { ...scenario, status } : scenario),
    }));
    appendAuditEvent(selectedCase.id, eventType, `Clearance scenario updated to ${status}.`, 'Clearance', 'Worker actions');
    showToast('Clearance decision recorded locally.', 'success');
  };

  const ClearanceTab = () => {
    const clearanceTasks = getTasksForTab(liveTasks, 'Clearance');
    const hasPendingClearanceTask = clearanceTasks.some((task) => !isLiveTaskCompleted(task));
    const showClearanceResults = shouldShowClearanceResults(selectedCase, hasPendingClearanceTask);
    const clearancePlaceholderStatus = hasPendingClearanceTask ? 'Awaiting Approval' : 'Not Started';

    return (
      <div className="space-y-6">
        <ScreenGuidance context="clearance" />

        <SectionCard title="CIN / SIN Matching">
          <p className="text-sm text-gray-600 mb-5">Identifier terminology is configurable for the demo.</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">Household Members</h3>
              {selectedCase.household.map((member) => (
                <div key={member.name} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.relationship}</p>
                  </div>
                  <Pill label={showClearanceResults ? member.identifierStatus : clearancePlaceholderStatus} />
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">{showClearanceResults ? 'Match Candidates' : 'Matching Status'}</h3>
              {!showClearanceResults ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill label={clearancePlaceholderStatus} />
                    {hasPendingClearanceTask && <span className="font-semibold text-gray-900">CIN matching is awaiting the user's approval.</span>}
                    {!hasPendingClearanceTask && <span className="font-semibold text-gray-900">CIN matching has not been performed yet.</span>}
                  </div>
                  <p className="mt-2 text-gray-600">
                    Match candidates will appear after the Maestro action is completed or a local clearance action is run.
                  </p>
                </div>
              ) : (
                selectedCase.clearance.map((scenario) => (
                  <div key={scenario.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{scenario.title}</p>
                        <p className="text-xs text-gray-500">{scenario.candidate} - {scenario.identifier}</p>
                      </div>
                      <Pill label={`${scenario.matchScore}%`} className={scenario.matchScore > 85 ? 'bg-green-100 text-green-800 border-green-200' : scenario.matchScore > 0 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-gray-100 text-gray-800 border-gray-200'} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Matching criteria</p>
                        <ul className="mt-1 space-y-1 text-gray-600">
                          {scenario.criteria.length ? scenario.criteria.map((criterion) => <li key={criterion}>✓ {criterion}</li>) : <li>No criteria matched.</li>}
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Mismatch indicators</p>
                        <ul className="mt-1 space-y-1 text-gray-600">
                          {scenario.mismatches.length ? scenario.mismatches.map((mismatch) => <li key={mismatch}>! {mismatch}</li>) : <li>No mismatches.</li>}
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700"><span className="font-medium">Recommended action:</span> {scenario.recommendedAction}</p>
                    <div className="flex flex-wrap gap-2">
                      <ActionButton onClick={() => setModal({ title: scenario.title, body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(scenario, null, 2)}</pre> })}>View Match Details</ActionButton>
                      <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateClearance(scenario.id, 'Accepted', 'Clearance Match Accepted')}>Accept Match</ActionButton>
                      <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateClearance(scenario.id, 'Rejected', 'Clearance Match Rejected')}>Reject Match</ActionButton>
                      <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateClearance(scenario.id, 'New identifier assigned', 'New Identifier Assigned')}>Assign New CIN / SIN</ActionButton>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>

        {showClearanceResults && (
          <HelpBox>
            Clearance matching is mocked. Use candidate actions to demonstrate match scoring and worker override decisions.
          </HelpBox>
        )}
      </div>
    );
  };

  const ExternalValidationTab = () => {
    const validationTasks = getTasksForTab(liveTasks, 'External Validation');
    const hasPendingValidationTask = validationTasks.some((task) => !isLiveTaskCompleted(task));
    const showValidationResults = shouldShowExternalValidationResults(selectedCase, hasPendingValidationTask);
    const validationPlaceholderStatus = hasPendingValidationTask ? 'Awaiting Approval' : 'Not Started';

    return (
      <div className="space-y-6">
        <ScreenGuidance context="validation" />

        {!showValidationResults ? (
          <SectionCard title="External Validation Status">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Pill label={validationPlaceholderStatus} />
                {hasPendingValidationTask && <span className="font-semibold text-gray-900">External validation is awaiting the user's approval.</span>}
                {!hasPendingValidationTask && <span className="font-semibold text-gray-900">External validation has not been performed yet.</span>}
              </div>
              <p className="mt-2 text-gray-600">
                Validation details will appear after the Maestro action is completed or a local validation action is run.
              </p>
            </div>
          </SectionCard>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {selectedCase.validations.map((validation) => (
                <SectionCard key={validation.name} title={validation.name}>
                  <div className="space-y-4">
                    <Field label="Status" value={<Pill label={validation.status} />} />
                    <Field label="Last Run" value={validation.lastRun} />
                    <p className="text-sm text-gray-700">{validation.summary}</p>
                  </div>
                </SectionCard>
              ))}
            </div>

            <HelpBox>
              External validation cards mimic employment, tax, paystub comparison, and discrepancy review states without live integrations.
            </HelpBox>
          </>
        )}
      </div>
    );
  };

  const BudgetTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="budget" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Budget Readiness Checklist">
          <Checklist items={selectedCase.budget.readiness} />
        </SectionCard>
        <SectionCard title="Budget Calculation">
          <dl className="space-y-4">
            {showBudgetIncomeUsed && <Field label="Income Used" value={selectedCase.budget.incomeUsed} />}
            {showCalculatedBudgetAmount && (
              <Field
                label="Calculated Benefit Amount"
                value={<span className="text-green-700 font-semibold">{selectedCase.budget.mockBenefitAmount}</span>}
              />
            )}
            <Field label="Budget Status" value={<Pill label={selectedCase.budget.status} />} />
          </dl>
        </SectionCard>
        <SectionCard title="Worker Review Notes">
          <div className="space-y-2">
            {selectedCase.budget.notes.map((note) => (
              <div key={note} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700">{note}</div>
            ))}
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        Budget values update from the live case record after Maestro reaches the budget calculation step.
      </HelpBox>
    </div>
  );

  const FormsNoticesTab = () => {
    const selectedNotice = selectedCase.notices.find((notice) => notice.requiresText);

    return (
      <div className="space-y-6">
        <ScreenGuidance context="notices" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Form Selection">
            <div className="space-y-3">
              {selectedCase.notices.map((notice) => (
                <div key={notice.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-gray-900">{notice.reasonCode}</p>
                    <Pill label={notice.status} />
                  </div>
                  {notice.requiresText && (
                    <textarea
                      value={notice.dynamicText}
                      onChange={(event) => updateCase(selectedCase.id, (caseItem) => ({
                        ...caseItem,
                        notices: caseItem.notices.map((item) => item.id === notice.id ? { ...item, dynamicText: event.target.value } : item),
                      }))}
                      className="mt-3 w-full min-h-24 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Dynamic text required"
                      title={tooltips.dynamicText}
                    />
                  )}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Dynamic Text Fields">
            {selectedNotice ? (
              <div className="space-y-4">
                <Field label="Selected Reason Code" value={selectedNotice.reasonCode} />
                <p className="text-sm text-gray-700">{selectedNotice.dynamicText || 'Dynamic text is required for this reason code.'}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No dynamic text currently required.</p>
            )}
          </SectionCard>

          <SectionCard title="Notice Preview">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 min-h-72">
              <p className="font-semibold text-gray-900">Notice Preview</p>
              <p className="mt-4">Applicant: {selectedCase.applicantName}</p>
              <p>Case: {selectedCase.mybNumber}</p>
              <p>Status: {selectedCase.status}</p>
              <div className="mt-4 space-y-2">
                {selectedCase.notices.map((notice) => (
                  <p key={notice.id}>- {notice.reasonCode}{notice.dynamicText ? `: ${notice.dynamicText}` : ''}</p>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <HelpBox>
          Forms and notices are local previews only. Dynamic text appears when a reason code requires worker-provided text.
        </HelpBox>
      </div>
    );
  };

  const TimelineTab = () => (
    <MaestroInstanceDiagram
      sdk={sdk}
      canUseUiPath={canUseUiPath}
      instanceId={selectedInstanceId || null}
      folderKey={selectedMaestroFolderKey}
      caseNumber={selectedCase.mybNumber}
      onOpenMaestro={handleOpenMaestro}
    />
  );

  const RawJsonTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="json" />
      <SectionCard title="Selected Mock Case JSON">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap break-words text-xs max-h-[34rem]">{JSON.stringify(selectedCase, null, 2)}</pre>
      </SectionCard>
      <HelpBox>
        Raw JSON exposes the local mock case object used by the screen. This is not a backend payload contract.
      </HelpBox>
    </div>
  );

  const ActionsTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="actions" />
      <LiveActionPanel />
      <HelpBox>
        Case actions are grouped here so workers can open Maestro Action Center tasks without leaving the case workspace.
      </HelpBox>
    </div>
  );

  const DetailTopActions = () => {
    const selectDocumentReason = 'Select a document card first.';
    const documentEditDisabledReason = selectedDocument ? editDisabledReason('Documents') : selectDocumentReason;
    const canActOnDocument = Boolean(selectedDocument) && roleCanEdit(role, 'Documents');
    const canCreateBudget = roleCanEdit(role, 'Budget') && !budgetCreated;
    const canReviewBudget = roleCanEdit(role, 'Budget') && budgetCreated;
    const viewAllActionsButton = (
      <ActionButton onClick={() => setActiveTab('Actions')}>
        View All Actions
      </ActionButton>
    );

    const actionsByTab: Record<DetailTab, ReactNode> = {
      Summary: (
        <>
          <ActionButton variant="primary" disabled={!roleCanEdit(role, activeTab)} onClick={() => setModal({ title: 'Add Note', body: <p>Worker note captured locally for {selectedCase.mybNumber}.</p>, confirmLabel: 'Save Note', onConfirm: () => runCaseAction('Summary', 'Worker Note Added', 'Summary note added locally.') })}>Add Note</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Supervisor Review Requested', 'Case routed to supervisor queue.', (caseItem) => ({ ...caseItem, exception: 'Supervisor Review', assignedGroup: 'Supervisor Queue' }), 'Supervisor actions', 'Supervisor review requested locally.')}>Request Supervisor Review</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Marked Ready for Next Step', 'Case moved to the next local status.', (caseItem) => ({ ...caseItem, status: statusProgression(caseItem.status), currentStage: 'Next Step Ready' }), 'Worker actions', 'Case advanced locally.')}>Mark Ready for Next Step</ActionButton>
        </>
      ),
      Actions: null,
      Application: (
        <>
          <ActionButton onClick={() => openDocumentPreview('Application PDF Preview', applicationDocumentSource)}>View Full Application</ActionButton>
          <ActionButton onClick={() => downloadDocumentFile(applicationDocumentSource, 'Application PDF')}>Download PDF</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Missing Field Flagged', 'Worker flagged a missing application field.', (caseItem) => ({ ...caseItem, exception: 'Missing Info', status: 'Missing Information' }), 'Worker actions', 'Missing field flagged locally.')}>Flag Missing Field</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Worker Note Added', 'Application note added locally.')}>Add Worker Note</ActionButton>
        </>
      ),
      'Interview / Missing Info': matchedLiveRecord ? null : (
        <>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Interview Scheduled', 'Phone interview scheduled locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, status: 'Scheduled', scheduledAt: '2026-05-27 10:00 AM' } }))}>Schedule Interview</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Interview Completed', 'Interview marked complete locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, status: 'Complete' } }))}>Mark Interview Complete</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Missing Field Added', 'Worker added a missing field.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, missingFields: [...caseItem.interview.missingFields, 'Mock added field'] } }))}>Add Missing Field</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Missing Info Requested', 'Information request drafted locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Drafted' } }))}>Draft Information Request</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} disabledReason={editDisabledReason(activeTab)} onClick={() => confirmGuidedAction({ title: 'Send Mock Email', guidance: 'This will not send a real email. It simulates an applicant information request.', confirmLabel: 'Send Mock Email', onConfirm: () => runCaseAction('Interview / Missing Info', 'Mock Email Sent', 'Mock email shown as sent to sohail.ghatnekar@uipath.com.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Sent', applicantContactStatus: 'Mock email sent' } })) })}>Send Mock Email</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Applicant Response Received', 'Applicant response simulated locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Response Received', applicantResponseStatus: 'Response Received' } }))}>Simulate Applicant Response</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Follow-Up Note Added', 'Follow-up note added locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, workerNotes: [...caseItem.interview.workerNotes, 'Follow-up note added in the local prototype.'] } }))}>Add Follow-Up Note</ActionButton>
        </>
      ),
      Documents: (
        <>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && confirmGuidedAction({ title: 'Mark Document Verified', guidance: 'Confirm you reviewed the document and the information is acceptable.', confirmLabel: 'Mark Verified', onConfirm: () => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Verified' }), 'Document Verified', `${selectedDocument.name} marked verified.`) })}>Mark Verified</ActionButton>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && confirmGuidedAction({ title: 'Mark Document Insufficient', guidance: 'Use this when the document is unreadable, incomplete, expired, or does not match the requested verification.', confirmLabel: 'Mark Insufficient', onConfirm: () => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Insufficient' }), 'Document Marked Insufficient', `${selectedDocument.name} marked insufficient.`) })}>Mark Insufficient</ActionButton>
        </>
      ),
      Clearance: (
        <>{viewAllActionsButton}</>
      ),
      'External Validation': (
        <>
          {viewAllActionsButton}
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('External Validation', 'External Validations Reviewed', 'Worker marked validations complete.', (caseItem) => ({ ...caseItem, validations: caseItem.validations.map((validation) => ({ ...validation, status: 'Complete' })) }))}>Mark Validation Complete</ActionButton>
        </>
      ),
      Budget: (
        <>
          {viewAllActionsButton}
          <ActionButton disabled={!canCreateBudget} disabledReason={budgetCreated ? 'Create Budget is unavailable because a budget already exists.' : editDisabledReason('Budget')} onClick={() => runCaseAction('Budget', 'Budget Created', 'Budget created locally.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Budget created' } }))}>Create Budget</ActionButton>
          <ActionButton disabled={!canReviewBudget} disabledReason={!budgetCreated ? 'Mark Budget Reviewed disabled because a budget has not been created.' : editDisabledReason('Budget')} onClick={() => runCaseAction('Budget', 'Budget Reviewed', 'Worker marked budget reviewed.', (caseItem) => ({ ...caseItem, checklist: caseItem.checklist.map((item) => item.label === 'Budget reviewed' ? { ...item, status: 'Complete' } : item), status: 'Ready for Budget' }))}>Mark Budget Reviewed</ActionButton>
        </>
      ),
      'Forms & Notices': (
        <>
          {viewAllActionsButton}
          <ActionButton disabled={!roleCanEdit(role, activeTab) || !noticePreviewGenerated} disabledReason={!noticePreviewGenerated ? 'Approve Notice disabled because a notice preview has not been generated.' : editDisabledReason(activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Notice Approved', 'Notice approved locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Approved' })) }), 'Notice events')}>Approve Notice</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Mock Notice Sent', 'Mock notice sent locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Sent' })) }), 'Notice events')}>Send Mock Notice</ActionButton>
        </>
      ),
      'Timeline / Audit': null,
      'Raw Case JSON': (
        <>
          {viewAllActionsButton}
          <ActionButton onClick={() => exportJson(selectedCase)}>Download JSON</ActionButton>
        </>
      ),
    };
    const activeActions = actionsByTab[activeTab];

    if (!activeActions) {
      return null;
    }

    return (
      <div className="flex min-w-0 flex-1 justify-end">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          {activeActions}
        </div>
      </div>
    );
  };

  const DetailScreen = () => {
    const activeLiveActionTab = liveActionTabByDetailTab[activeTab];
    const renderTabContent: Record<DetailTab, () => ReactNode> = {
      Summary: SummaryTab,
      Actions: ActionsTab,
      Application: ApplicationTab,
      'Interview / Missing Info': InterviewTab,
      Documents: DocumentsTab,
      Clearance: ClearanceTab,
      'External Validation': ExternalValidationTab,
      Budget: BudgetTab,
      'Forms & Notices': FormsNoticesTab,
      'Timeline / Audit': TimelineTab,
      'Raw Case JSON': RawJsonTab,
    };

    return (
      <div className="space-y-6">
        <DemoBanner />
        <div className="flex items-center gap-4">
          <button onClick={() => setScreen('inbox')} className="flex flex-none items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Case Inbox
          </button>
          <DetailTopActions />
        </div>
        <DetailHeader />
        <TabBar />
        {activeLiveActionTab && <LiveTabTaskPanel tab={activeLiveActionTab} />}
        {renderTabContent[activeTab]()}
      </div>
    );
  };

  const BarList = ({ title, items }: { title: string; items: Array<{ label: string; value: number }> }) => {
    const max = Math.max(1, ...items.map((item) => item.value));

    return (
      <SectionCard title={title}>
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                if (title.includes('county')) {
                  setFilters({ ...emptyFilters, county: item.label });
                  setScreen('inbox');
                } else if (title.includes('region')) {
                  setFilters({ ...emptyFilters, region: item.label });
                  setScreen('inbox');
                } else if (statusOptions.includes(item.label as CaseStatus)) {
                  setFilters({ ...emptyFilters, status: item.label });
                  setScreen('inbox');
                }
              }}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    );
  };

  const OperationsScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="operations" />

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-3" aria-label="Operations subtabs">
          {operationsSubtabOptions.map((subtab) => {
            const isActiveSubtab = activeOperationsSubtab === subtab;

            return (
              <button
                key={subtab}
                type="button"
                onClick={() => setActiveOperationsSubtab(subtab)}
                className={`border-b-2 px-1 pb-3 text-sm font-semibold ${
                  isActiveSubtab
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {subtab}
              </button>
            );
          })}
        </nav>
      </div>

      {activeOperationsSubtab === 'Operations Summary' ? (
        <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Average case age" value={operationsMetrics.averageCaseAge} tone="gray" detail="Sample data" />
        <MetricCard label="Due soon count" value={operationsMetrics.dueSoon} tone="red" detail="Sample data" />
        <MetricCard label="Missing information count" value={operationsMetrics.missingInfo} tone="yellow" detail="Sample data" />
        <MetricCard label="Document review count" value={operationsMetrics.needingDocuments} tone="orange" detail="Sample data" />
        <MetricCard label="Clearance review count" value={operationsMetrics.clearanceReview} tone="purple" detail="Sample data" />
        <MetricCard label="Supervisor review count" value={operationsMetrics.supervisorReview} tone="purple" detail="Sample data" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <BarList title="Cases by county" items={groupedMetrics.byCounty} />
        <BarList title="Cases by region" items={groupedMetrics.byRegion} />
        <BarList title="Cases by status" items={groupedMetrics.byStatus} />
        <BarList title="Open tasks by group" items={groupedMetrics.byGroup} />
      </div>

      <SectionCard
        title="County / Region Bottlenecks"
        actions={<ActionButton onClick={() => { setFilters(emptyFilters); setScreen('inbox'); }}>Reset Filters</ActionButton>}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bottlenecks.map((row) => (
            <article key={row.county} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <button
                    onClick={() => { setFilters({ ...emptyFilters, county: row.county }); setScreen('inbox'); }}
                    className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {row.county}
                  </button>
                  <p className="text-xs text-gray-500 mt-1">{row.region}</p>
                </div>
                <button
                  onClick={() => {
                    const nextFilters = { ...emptyFilters, county: row.county };
                    if (row.primaryBottleneck === 'Missing Info') {
                      nextFilters.exception = 'Missing Info';
                    } else if (row.primaryBottleneck === 'Document Review') {
                      nextFilters.exception = 'OCR Review';
                    } else if (row.primaryBottleneck === 'Clearance Review') {
                      nextFilters.exception = 'Clearance Match';
                    } else if (row.primaryBottleneck === 'Due Soon') {
                      nextFilters.dueSoon = true;
                    }
                    setFilters(nextFilters);
                    setScreen('inbox');
                  }}
                >
                  <Pill label={row.primaryBottleneck} />
                </button>
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <Field label="Open Cases" value={row.openCases} />
                <Field label="Due Soon" value={row.dueSoon} />
                <Field label="Missing Info" value={row.missingInfo} />
                <Field label="Document Review" value={row.documentReview} />
                <Field label="Clearance Review" value={row.clearanceReview} />
                <Field label="Avg Case Age" value={`${row.averageAge} days`} />
              </dl>
            </article>
          ))}
        </div>
      </SectionCard>

      <HelpBox>
        Operations dashboard metrics use fixed sample data for the demo. Click a county, status bar, or bottleneck to filter the inbox.
      </HelpBox>
        </>
      ) : (
        <>
      <SectionCard
        title={IES_WORKFLOW_CONFIG.insightsDashboards.iesSnapDash.name}
        actions={(
          <a
            href={IES_WORKFLOW_CONFIG.insightsDashboards.iesSnapDash.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-800 hover:border-blue-300 hover:bg-blue-100"
          >
            Open in UiPath Insights
          </a>
        )}
      >
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <iframe
            title={IES_WORKFLOW_CONFIG.insightsDashboards.iesSnapDash.name}
            src={IES_WORKFLOW_CONFIG.insightsDashboards.iesSnapDash.url}
            className="h-[72vh] min-h-[44rem] w-full bg-white"
            allow="fullscreen"
          />
        </div>
      </SectionCard>

      <HelpBox>
        This tab embeds the UiPath Insights dashboard when the tenant permits framing. Use Open in UiPath Insights if the browser blocks the embedded view.
      </HelpBox>
        </>
      )}
    </div>
  );

  const TestingScreen = () => {
    const runMockTest = () => {
      if (!isCommandBoxOpen) {
        showToast('Open the command text box before running a mock test.', 'warning');
        return;
      }

      const timestamp = new Date().toLocaleString('en-US');
      setMockTestRuns((current) => ({ ...current, [activeTestScenario.id]: timestamp }));
      setMockTestReturns((current) => ({ ...current, [activeTestScenario.id]: activeTestScenario.returnInfo }));
      appendAuditEvent(
        selectedCase.id,
        'Mock Test Run',
        `${activeTestScenario.title} displayed static ${activeTestScenario.protocol} return information for command: ${activeTestCommand}`,
        'Testing Workbench',
        'System actions',
      );
      showToast(`${activeTestScenario.title} mock test completed.`, 'success');
    };

    return (
      <div className="space-y-6">
        <DemoBanner />
        <ScreenGuidance context="testing" />

        <SectionCard
          title="Testing Workbench"
          actions={<Pill label="Static placeholder" className="bg-purple-100 text-purple-800 border-purple-200" />}
        >
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-blue-900">Example placeholder command pattern</p>
            <p className="text-sm text-blue-800 mt-1">Future functional tests can route these commands to UiPath Platform automations. This prototype still runs locally only.</p>
            <pre className="mt-3 bg-white text-blue-900 border border-blue-200 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs">{testingWorkbenchExample}</pre>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {mockTestScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setActiveTestScenarioId(scenario.id)}
                className={`text-left border rounded-lg p-4 transition-colors ${
                  activeTestScenario.id === scenario.id
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Pill label={scenario.protocol} className={scenario.protocol === 'SFTP' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200'} />
                  <Pill label={scenario.expectedResult} className="bg-gray-100 text-gray-700 border-gray-200" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mt-3">{scenario.title}</h3>
                <p className="text-sm text-gray-600 mt-2">{scenario.summary}</p>
              </button>
            ))}
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <SectionCard title="Selected Test">
            <dl className="space-y-4">
              <Field label="Protocol" value={<Pill label={activeTestScenario.protocol} />} />
              <Field label="Target" value={<span className="break-words">{activeTestScenario.target}</span>} />
              <Field label="Expected Result" value={activeTestScenario.expectedResult} />
              <Field label="Last Mock Run" value={lastMockTestRun} />
            </dl>
            <div className="flex flex-wrap gap-2 mt-5">
              <ActionButton onClick={() => void copyText(activeTestCommand, 'Command copied')}>Copy Command</ActionButton>
              <ActionButton
                disabled={!activeTestReturn}
                disabledReason="Copy Return is available after a mock return is populated."
                onClick={() => void copyText(activeTestReturn, 'Mock return copied')}
              >
                Copy Return
              </ActionButton>
            </div>
          </SectionCard>

          <SectionCard title="Command">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <LabelWithHelp label="Example command" help="Use the example as a starting point, then open the text box to edit the command for the selected mock test." />
            </div>
            <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap break-words text-xs max-h-60">{activeTestScenario.command}</pre>
            <div className="flex flex-wrap gap-2 mt-4">
              <ActionButton onClick={() => setOpenCommandBoxId(isCommandBoxOpen ? null : activeTestScenario.id)}>
                {isCommandBoxOpen ? 'Close Command Text Box' : 'Open Command Text Box'}
              </ActionButton>
              <ActionButton
                onClick={() => setTestCommands((current) => ({ ...current, [activeTestScenario.id]: activeTestScenario.command }))}
              >
                Reset Command
              </ActionButton>
            </div>
            {isCommandBoxOpen && (
              <label className="block mt-4">
                <span className="text-xs font-medium text-gray-600">Command text box</span>
                <textarea
                  value={activeTestCommand}
                  onChange={(event) => setTestCommands((current) => ({ ...current, [activeTestScenario.id]: event.target.value }))}
                  className="mt-1 block w-full min-h-40 rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </label>
            )}
            <div className="mt-4">
              <ActionButton
                variant="primary"
                disabled={!isCommandBoxOpen}
                disabledReason="Run Mock Test is enabled after the command text box is opened."
                onClick={runMockTest}
              >
                Run Mock Test
              </ActionButton>
            </div>
          </SectionCard>

          <SectionCard title="Return Information">
            <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
              <LabelWithHelp label="Mock return" help="The return area is blank until Run Mock Test is clicked. No real service is called." />
            </div>
            <div className="space-y-4">
              {activeTestReturn && activeTestScenario.requestPreview && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Mock SOAP request preview</p>
                  <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap break-words text-xs max-h-72">{activeTestScenario.requestPreview}</pre>
                </div>
              )}
              <div>
                {activeTestReturn && activeTestScenario.requestPreview && <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Mock return</p>}
                <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-y-auto whitespace-pre-wrap break-words text-xs min-h-40 max-h-96">{activeTestReturn}</pre>
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Testing Notes">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">REST</p>
              <p className="mt-2">Use for JSON-style request and response examples.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">SOAP</p>
              <p className="mt-2">Use for XML envelope request and response examples.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">SFTP</p>
              <p className="mt-2">Use for file-drop command patterns and intake results.</p>
            </div>
          </div>
        </SectionCard>

        <HelpBox>
          This screen is a copy-and-present placeholder only. Commands and returns are static text and no external test is executed.
        </HelpBox>
      </div>
    );
  };

  const SettingsScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="settings" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Mock Settings / Role Switcher">
          <div className="space-y-5">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Current role</span>
              <select
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value as Role;
                  setRole(nextRole);
                  setWorkerName(nextRole);
                  showToast(`User switched to ${nextRole}.`, 'info');
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {roles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <Field label="Current user" value={workerName} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">County scope</span>
                <select value={countyScope} onChange={(event) => setCountyScope(event.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option>All counties</option>
                  {countyOptions.map((county) => <option key={county}>{county}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-gray-700">Region scope</span>
                <select value={regionScope} onChange={(event) => setRegionScope(event.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option>All regions</option>
                  {regionOptions.map((region) => <option key={region}>{region}</option>)}
                </select>
              </label>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                <span className="text-sm text-gray-700">Toggle demo banners</span>
                <input type="checkbox" checked={showDemoBanner} onChange={(event) => setShowDemoBanner(event.target.checked)} />
              </label>
              <label className="flex items-center justify-between gap-3 border border-gray-200 rounded-lg p-3">
                <span className="text-sm text-gray-700">Show Demo Coach Tips</span>
                <input type="checkbox" checked={showDemoCoachTips} onChange={(event) => setShowDemoCoachTips(event.target.checked)} />
              </label>
            </div>

            <ActionButton variant="danger" onClick={resetMockData}>Mock Data Reset</ActionButton>
          </div>
        </SectionCard>

        <SectionCard title="Role Behavior">
          <div className="space-y-3 text-sm text-gray-700">
            <p><span className="font-medium">Case Worker:</span> can edit most case review fields.</p>
            <p><span className="font-medium">Supervisor:</span> can review all assignment rows and reassign loaded tasks to the Case Worker.</p>
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        User switching is intentionally local and not a security model. This prototype only exposes Case Worker and Supervisor.
      </HelpBox>
    </div>
  );

  const filteredHelpItems = Object.values(helpContent).filter((item) => {
    const search = helpSearch.trim().toLowerCase();
    const matchesCategory = helpCategory === 'All' || item.category === helpCategory;
    const searchable = [
      item.title,
      item.summary,
      item.category,
      ...item.workerGuidance,
      ...item.checklist,
      ...item.keyTerms.map((term) => `${term.term} ${term.definition}`),
      ...item.relatedActions,
    ].join(' ').toLowerCase();

    return matchesCategory && (!search || searchable.includes(search));
  });

  const filteredFaqs = faqs.filter((faq) => {
    const search = helpSearch.trim().toLowerCase();
    const matchesCategory = helpCategory === 'All' || faq.category === helpCategory;
    return matchesCategory && (!search || `${faq.question} ${faq.answer}`.toLowerCase().includes(search));
  });

  const filteredGlossary = glossary.filter((item) => {
    const search = helpSearch.trim().toLowerCase();
    return !search || `${item.term} ${item.definition}`.toLowerCase().includes(search);
  });

  const HelpCenterScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="helpCenter" />
      <SectionCard title="Help Center / Self-Help">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <label className="block lg:col-span-3">
            <span className="text-xs font-medium text-gray-600">Search help content</span>
            <input
              value={helpSearch}
              onChange={(event) => setHelpSearch(event.target.value)}
              className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search reason code, document, clearance..."
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-gray-600">Category</span>
            <select
              value={helpCategory}
              onChange={(event) => setHelpCategory(event.target.value as HelpCategory | 'All')}
              className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="All">All</option>
              {helpCategories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Worker Quick-Start Guide">
          <div className="space-y-3 text-sm text-gray-700">
            <p>1. Start in Case Inbox and sort mentally by priority, due date, expedited flag, and exception badge.</p>
            <p>2. Open MYB-1004 to demonstrate the Michael Motorist SNAP review.</p>
            <p>3. Move from Documents to Interview, Clearance, Budget, Notices, and Timeline.</p>
            <p>4. Use Operations Dashboard to show workload health and bottlenecks.</p>
          </div>
        </SectionCard>

        <SectionCard title="Demo Walkthrough Guide">
          <div className="space-y-2 text-sm text-gray-700">
            {[
              'Turn on Demo Coach Tips in Mock Settings.',
              'Open MYB-1004 for the Michael Motorist walkthrough.',
              'Use Documents help and hover Confidence.',
              'Review the paystub and National Grid utility bill.',
              'Generate a notice preview and review the live Maestro flow.',
            ].map((item) => (
              <div key={item} className="border border-gray-200 rounded-lg p-2">{item}</div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Role-Aware Guidance">
          <div className="space-y-2">
            {roleHelp[role].map((item) => (
              <div key={item} className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">{item}</div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Screen-by-Screen Guide">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredHelpItems.map((item) => (
            <button
              key={item.screenId}
              onClick={() => {
                const screenByContext: Partial<Record<HelpContextId, Screen>> = {
                  inbox: 'inbox',
                  operations: 'operations',
                  assignment: 'assignment',
                  testing: 'testing',
                  settings: 'settings',
                  helpCenter: 'helpCenter',
                };
                const detailTabByContext: Partial<Record<HelpContextId, DetailTab>> = {
                  summary: 'Summary',
                  actions: 'Actions',
                  application: 'Application',
                  interview: 'Interview / Missing Info',
                  documents: 'Documents',
                  clearance: 'Clearance',
                  validation: 'External Validation',
                  budget: 'Budget',
                  notices: 'Forms & Notices',
                  timeline: 'Timeline / Audit',
                  json: 'Raw Case JSON',
                };

                const targetScreen = screenByContext[item.screenId];
                const targetTab = detailTabByContext[item.screenId];

                if (targetScreen) {
                  setScreen(targetScreen);
                } else if (targetTab) {
                  setScreen('detail');
                  setActiveTab(targetTab);
                }
              }}
              className="text-left border border-gray-200 rounded-lg p-4 hover:bg-blue-50 hover:border-blue-200"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
                <Pill label={item.category} className="bg-gray-100 text-gray-800 border-gray-200" />
              </div>
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.summary}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Frequently Asked Questions">
          <div className="space-y-3">
            {filteredFaqs.map((faq) => (
              <details key={faq.question} className="border border-gray-200 rounded-lg p-3">
                <summary className="cursor-pointer text-sm font-semibold text-gray-900">{faq.question}</summary>
                <p className="text-sm text-gray-700 mt-2">{faq.answer}</p>
              </details>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Glossary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredGlossary.map((item) => (
              <div key={item.term} className="border border-gray-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-gray-900">{item.term}</p>
                <p className="text-sm text-gray-600 mt-1">{item.definition}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        Help Center content is static and mocked. Future production self-help could connect to policy references, procedure content, and role-specific knowledge sources.
      </HelpBox>
    </div>
  );

  const renderScreenContent: Record<Screen, () => ReactNode> = {
    inbox: InboxScreen,
    detail: DetailScreen,
    operations: OperationsScreen,
    assignment: AssignmentDashboardScreen,
    testing: TestingScreen,
    settings: SettingsScreen,
    helpCenter: HelpCenterScreen,
  };

  if (isAuthLoading || !isAuthenticated || uiPathConfigError) {
    return (
      <AuthLandingScreen
        isLoading={isAuthLoading}
        error={authError}
        configurationError={uiPathConfigError}
        onLogin={() => void login()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderScreenContent[screen]()}
      </main>
      <ToastStack />
      <Modal />
      <TaskAssignmentDialog />
      <TaskEmbedModal />
      <HelpDrawer />
    </div>
  );
}

export default App;
