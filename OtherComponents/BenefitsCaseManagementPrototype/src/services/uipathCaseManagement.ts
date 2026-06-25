import { Entities } from '@uipath/uipath-typescript/entities';
import { Processes, JobPriority, StartStrategy } from '@uipath/uipath-typescript/processes';
import { CaseInstances } from '@uipath/uipath-typescript/cases';
import type { CaseInstanceExecutionHistoryResponse } from '@uipath/uipath-typescript/cases';
import { ProcessInstances } from '@uipath/uipath-typescript/maestro-processes';
import { Tasks, TaskType } from '@uipath/uipath-typescript/tasks';
import { Buckets } from '@uipath/uipath-typescript/buckets';
import type {
  EntityRecord,
  PaginatedResponse,
  NonPaginatedResponse,
  ProcessInstanceExecutionHistoryResponse,
  ProcessInstanceGetResponse,
  ProcessInstanceGetVariablesResponse,
  ProcessIncidentGetResponse,
  ProcessStartResponse,
  TaskGetResponse,
  UiPath,
} from '@uipath/uipath-typescript';
import type { BenefitCase } from '../mockData';
import {
  ACTION_APP_DEFINITIONS,
  IES_WORKFLOW_CONFIG,
} from '../config/uipath';
import type { ActionAppDefinition, LiveActionAppTab } from '../config/uipath';

export type LiveCaseRecord = EntityRecord;
export type LiveTaskAssignmentRecord = EntityRecord;

export type CaseStartInput = {
  caseIn: {
    ApplicantEmail: string;
    ApplicantName: string;
    myBNumber: string;
    RawCaseJSON: string;
  };
  email: string;
};

export type WorkerPtoProcessInput = {
  endDate_In: string;
  startDate_In: string;
  workerEmail_In: string;
  recordID_In?: string;
};

export type TaskAssignmentProcessInput = {
  user: string;
  taskId: number;
};

export type LiveTaskSummary = {
  id: number;
  key: string;
  title: string;
  status: string;
  type: TaskType;
  action: string | null;
  actionLabel: string | null;
  actionAppId: string | null;
  appDefinition: ActionAppDefinition | null;
  createdTime: string;
  completedTime: string | null;
  assignedTo: string | null;
  traceId: string | null;
  searchText: string;
  originalTask: TaskGetResponse;
};

export type LiveRecordActionTaskReferences = {
  instanceIds: string[];
  taskIds: number[];
};

export type LiveMaestroContext = {
  instance: ProcessInstanceGetResponse | null;
  variables: ProcessInstanceGetVariablesResponse | null;
  executionHistory: ProcessInstanceExecutionHistoryResponse[];
};

export type LiveMaestroDiagram = {
  instance: ProcessInstanceGetResponse | null;
  bpmnXml: string;
  executionHistory: ProcessInstanceExecutionHistoryResponse[];
  incidents: ProcessIncidentGetResponse[];
};

export type StartCaseResult = {
  jobs: ProcessStartResponse[];
  instanceId: string | null;
  input: CaseStartInput;
};

export type ProcessLaunchResult<TInput> = {
  jobs: ProcessStartResponse[];
  input: TInput;
  releaseId: number;
  releaseKey: string;
  processName: string;
};

export type ApplicationPdfBucketSource = {
  url: string;
  objectUrl: boolean;
  sourceMode: 'orchestrator-get-read-uri' | 'static-blob-fallback';
};

export type BucketDocumentRequest = {
  bucketId: number;
  folderId: number;
  path: string;
  staticReadUrl?: string;
  readUriExpiryInMinutes: number;
};

type MaybePaged<T> = T[] | NonPaginatedResponse<T> | PaginatedResponse<T>;
type RawStartJobResponse = Partial<ProcessStartResponse> & {
  Id?: number;
  Key?: string;
  PersistenceId?: string | null;
  OrganizationUnitId?: number;
  OrganizationUnitFullyQualifiedName?: string;
  StartTime?: string | null;
  EndTime?: string | null;
  State?: ProcessStartResponse['state'];
  Source?: string;
  SourceType?: string;
  BatchExecutionKey?: string;
  Info?: string | null;
  CreationTime?: string;
  ReleaseName?: string;
  Type?: ProcessStartResponse['type'];
  RuntimeType?: string;
  Reference?: string;
};

type TaskWithRuntimeMetadata = TaskGetResponse & {
  creatorJobKey?: string | null;
  waitJobKey?: string | null;
  appTasksMetadata?: {
    appId?: string | null;
    fpsContext?: {
      elementRunToken?: {
        instanceId?: string | null;
        runId?: string | null;
        elementId?: string | null;
      } | null;
    } | null;
  } | null;
  taskSource?: TaskGetResponse['taskSource'] & {
    jobId?: string | null;
    taskSourceMetadata?: {
      instanceId?: string | null;
      runId?: string | null;
      traceId?: string | null;
    };
  };
};

type RuntimeElementRun = {
  jobKey?: string | null;
  workflowId?: string | null;
  temporalExecutionId?: string | null;
};

type RuntimeElementExecution = Omit<CaseInstanceExecutionHistoryResponse['elementExecutions'][number], 'elementRuns'> & {
  elementType?: string | null;
  elementExtensionType?: string | null;
  jobKey?: string | null;
  externalLink?: string | null;
  maestroLink?: string | null;
  elementRuns?: Array<CaseInstanceExecutionHistoryResponse['elementExecutions'][number]['elementRuns'][number] & RuntimeElementRun>;
};

type MaestroElementRun = RuntimeElementRun & {
  status?: string | null;
  startedTimeUtc?: string | null;
  completedTimeUtc?: string | null;
  incomingFlowId?: string | null;
  incomingFlowIds?: string[];
  elementRunId?: string | null;
  markerItemIndex?: number | null;
  version?: number | null;
  parentElementRunId?: string | null;
};

type MaestroElementExecution = {
  completedTimeUtc?: string | null;
  elementId?: string | null;
  elementType?: string | null;
  elementExtensionType?: string | null;
  parentRunId?: string | null;
  parentElementId?: string | null;
  parentElementRunId?: string | null;
  runId?: string | null;
  startedTimeUtc?: string | null;
  status?: string | null;
  externalLink?: string | null;
  maestroLink?: string | null;
  elementRuns?: MaestroElementRun[];
  jobKey?: string | null;
};

type MaestroElementExecutionsResponse = {
  traceId?: string | null;
  elementExecutions?: MaestroElementExecution[];
};

type RuntimeTag = {
  value?: string;
  displayValue?: string;
  displayName?: string;
  name?: string;
};

type IntegrationServiceListResponse = {
  items?: LiveCaseRecord[];
  value?: LiveCaseRecord[];
  Records?: LiveCaseRecord[];
  Data?: {
    items?: LiveCaseRecord[];
    Records?: LiveCaseRecord[];
  };
};

const recordCaseKeys = [
  'myBNumber',
  'MyBNumber',
  'MYBNumber',
  'mybNumber',
  'caseNumber',
  'CaseNumber',
  'caseId',
  'CaseId',
  'applicationId',
  'ApplicationId',
];

const recordFolderKeys = [
  'folderId',
  'FolderID',
  'FolderId',
  'folderKey',
  'FolderKey',
  'orchestratorFolderKey',
  'OrchestratorFolderKey',
  'maestroFolderKey',
  'MaestroFolderKey',
];

const recordFolderKeyKeys = [
  'folderId',
  'FolderID',
  'FolderId',
  'folderKey',
  'FolderKey',
  'orchestratorFolderKey',
  'OrchestratorFolderKey',
  'maestroFolderKey',
  'MaestroFolderKey',
];

const recordProcessKeyKeys = [
  'maestroProcessInstanceKey',
  'MaestroProcessInstanceKey',
  'maestroProcessKey',
  'MaestroProcessKey',
  'processKey',
  'ProcessKey',
];

const recordInstanceKeys = [
  'maestroProcessId',
  'MaestroProcessID',
  'MaestroProcessId',
  'maestroProcessInstanceId',
  'MaestroProcessInstanceId',
  'maestroInstanceId',
  'MaestroInstanceId',
  'processInstanceId',
  'ProcessInstanceId',
  'instanceId',
  'InstanceId',
  'caseInstanceId',
  'CaseInstanceId',
  'maestroInstanceKey',
  'MaestroInstanceKey',
  'processInstanceKey',
  'ProcessInstanceKey',
  'maestroProcessInstanceKey',
  'MaestroProcessInstanceKey',
];

const recordTimestampKeys = [
  'UpdateTime',
  'updateTime',
  'UpdatedTime',
  'updatedTime',
  'LastModifiedTime',
  'lastModifiedTime',
  'CreateTime',
  'createTime',
  'CreatedTime',
  'createdTime',
  'CreationTime',
  'creationTime',
];

const recordSubprocessInstanceKeys = [
  'CP1MaestroInstanceId',
  'CP1ProcessInstanceId',
  'CP1SubprocessInstanceId',
  'CP1InstanceId',
  'InterviewMaestroInstanceId',
  'InterviewProcessInstanceId',
  'CP2MaestroInstanceId',
  'CP2ProcessInstanceId',
  'CP2SubprocessInstanceId',
  'CP2InstanceId',
  'DocumentVerificationMaestroInstanceId',
  'DocumentVerificationProcessInstanceId',
  'CP3MaestroInstanceId',
  'CP3ProcessInstanceId',
  'CP3SubprocessInstanceId',
  'CP3InstanceId',
  'ClearanceMaestroInstanceId',
  'ClearanceProcessInstanceId',
  'CINMatchingMaestroInstanceId',
  'CINMatchingProcessInstanceId',
  'CP4MaestroInstanceId',
  'CP4ProcessInstanceId',
  'CP4SubprocessInstanceId',
  'CP4InstanceId',
  'ExternalValidationMaestroInstanceId',
  'ExternalValidationProcessInstanceId',
  'BudgetMaestroInstanceId',
  'BudgetProcessInstanceId',
  'ReviewBudgetMaestroInstanceId',
  'ReviewBudgetProcessInstanceId',
  'WorkerFinalReviewMaestroInstanceId',
  'WorkerFinalReviewProcessInstanceId',
  'FinalReviewMaestroInstanceId',
  'FinalReviewProcessInstanceId',
  'SupervisorReviewMaestroInstanceId',
  'SupervisorReviewProcessInstanceId',
] as const;

const recordActionTaskIdKeys = [
  'CP1ActionTaskId',
  'CP1TaskId',
  'InterviewActionTaskId',
  'InterviewTaskId',
  'CP2ActionTaskId',
  'CP2TaskId',
  'DocumentVerificationActionTaskId',
  'DocumentVerificationTaskId',
  'CP3ActionTaskId',
  'CP3TaskId',
  'ClearanceActionTaskId',
  'ClearanceTaskId',
  'CINMatchingActionTaskId',
  'CINMatchingTaskId',
  'CP4ActionTaskId',
  'CP4TaskId',
  'ExternalValidationActionTaskId',
  'ExternalValidationTaskId',
  'BudgetActionTaskId',
  'BudgetTaskId',
  'ReviewBudgetActionTaskId',
  'ReviewBudgetTaskId',
  'WorkerFinalReviewActionTaskId',
  'WorkerFinalReviewTaskId',
  'FinalReviewActionTaskId',
  'FinalReviewTaskId',
  'SupervisorReviewActionTaskId',
  'SupervisorReviewTaskId',
] as const;

const taskAssignmentTaskIdKeys = [
  'TaskId',
  'TaskID',
  'taskId',
  'taskID',
  'task_id',
  'Task Id',
] as const;

const taskAssignmentMaestroProcessIdKeys = [
  'MaestroProcessId',
  'MaestroProcessID',
  'maestroProcessId',
  'maestroProcessID',
  'maestroProcessInstanceId',
  'MaestroProcessInstanceId',
  'processInstanceId',
  'ProcessInstanceId',
  'instanceId',
  'InstanceId',
] as const;

type FindTasksForInstanceOptions = {
  caseNumber?: string | null;
  explicitTaskIds?: number[];
  refreshTaskIds?: number[];
  relatedInstanceIds?: string[];
};

function extractItems<T>(response: MaybePaged<T>): T[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response.items)) {
    return response.items;
  }

  return [];
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeId(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/-/g, '').toLowerCase() : '';
}

function normalizeCaseReference(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/[\s_-]+/g, '').toLowerCase() : '';
}

function idMatches(candidate: unknown, target: string): boolean {
  const normalizedCandidate = normalizeId(candidate);
  const normalizedTarget = normalizeId(target);

  return Boolean(normalizedCandidate && normalizedTarget)
    && (normalizedCandidate === normalizedTarget || normalizedCandidate.includes(normalizedTarget));
}

function extractInstanceIdsFromText(value: unknown): string[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const ids = new Set<string>();
  const instancePathPattern = /\/instances\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi;
  const guidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  let match = instancePathPattern.exec(value);

  while (match) {
    ids.add(match[1]);
    match = instancePathPattern.exec(value);
  }

  match = guidPattern.exec(value);

  while (match) {
    ids.add(match[0]);
    match = guidPattern.exec(value);
  }

  return Array.from(ids);
}

function extractTaskIdsFromText(value: unknown): number[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  const ids = new Set<number>();
  const taskPathPattern = /\/tasks\/(\d+)/gi;
  let match = taskPathPattern.exec(value);

  while (match) {
    ids.add(Number(match[1]));
    match = taskPathPattern.exec(value);
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    ids.add(Number(trimmed));
  }

  return Array.from(ids).filter((id) => Number.isSafeInteger(id) && id > 0);
}

function extractInstanceIdsFromUnknown(value: unknown, depth = 0): string[] {
  if (depth > 3 || value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'string') {
    return extractInstanceIdsFromText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractInstanceIdsFromUnknown(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => extractInstanceIdsFromUnknown(item, depth + 1));
  }

  return [];
}

function extractTaskIdsFromUnknown(value: unknown, depth = 0): number[] {
  if (depth > 3 || value === null || value === undefined) {
    return [];
  }

  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0) {
    return [value];
  }

  if (typeof value === 'string') {
    return extractTaskIdsFromText(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => extractTaskIdsFromUnknown(item, depth + 1));
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .flatMap((item) => extractTaskIdsFromUnknown(item, depth + 1));
  }

  return [];
}

function recordKeyLooksLikeSubprocessInstance(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  const hasInstanceTerm = ['instance', 'maestro', 'process'].some((term) => normalizedKey.includes(term));
  const hasSubprocessTerm = [
    'cp1',
    'cp2',
    'cp3',
    'cp4',
    'subprocess',
    'child',
    'interview',
    'document',
    'clearance',
    'cin',
    'external',
    'validation',
    'budget',
    'final',
    'supervisor',
    'review',
  ].some((term) => normalizedKey.includes(term));

  return hasInstanceTerm && hasSubprocessTerm;
}

function recordKeyLooksLikeActionTaskId(key: string): boolean {
  const normalizedKey = key.toLowerCase();
  const hasTaskTerm = normalizedKey.includes('task');
  const hasIdTerm = ['id', 'url', 'link'].some((term) => normalizedKey.includes(term));
  const hasActionTerm = [
    'action',
    'hitl',
    'cp1',
    'cp2',
    'cp3',
    'cp4',
    'interview',
    'document',
    'clearance',
    'cin',
    'external',
    'validation',
    'budget',
    'final',
    'supervisor',
    'review',
  ].some((term) => normalizedKey.includes(term));

  return hasTaskTerm && hasIdTerm && hasActionTerm;
}

function isUsableMaestroInstanceId(value: string): boolean {
  const normalized = normalizeText(value);

  return Boolean(normalized)
    && normalized !== normalizeText(IES_WORKFLOW_CONFIG.maestroProcessKey)
    && normalized !== normalizeText(IES_WORKFLOW_CONFIG.maestroFolderKey)
    && normalized !== normalizeText(IES_WORKFLOW_CONFIG.deploymentFolderKey);
}

function hasMatchingFieldValue(
  source: Record<string, unknown>,
  keys: string[],
  target: string,
): boolean {
  const normalizedTarget = normalizeText(target);

  return keys.some((key) => normalizeText(source[key]) === normalizedTarget);
}

function getRecordTimestamp(record: LiveCaseRecord): number {
  for (const key of recordTimestampKeys) {
    const value = record[key];

    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }

    const timestamp = Date.parse(value);

    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function extractLiveRecordInstanceId(record: LiveCaseRecord): string | null {
  for (const key of recordInstanceKeys) {
    const value = record[key];

    for (const instanceId of extractInstanceIdsFromText(value)) {
      if (isUsableMaestroInstanceId(instanceId)) {
        return instanceId;
      }
    }
  }

  return null;
}

function compareLiveRecordRelevance(left: LiveCaseRecord, right: LiveCaseRecord): number {
  const leftFolderMatches = hasMatchingFieldValue(left, recordFolderKeys, IES_WORKFLOW_CONFIG.maestroFolderKey);
  const rightFolderMatches = hasMatchingFieldValue(right, recordFolderKeys, IES_WORKFLOW_CONFIG.maestroFolderKey);

  if (leftFolderMatches !== rightFolderMatches) {
    return leftFolderMatches ? -1 : 1;
  }

  const leftProcessMatches = hasMatchingFieldValue(left, recordProcessKeyKeys, IES_WORKFLOW_CONFIG.maestroProcessKey);
  const rightProcessMatches = hasMatchingFieldValue(right, recordProcessKeyKeys, IES_WORKFLOW_CONFIG.maestroProcessKey);

  if (leftProcessMatches !== rightProcessMatches) {
    return leftProcessMatches ? -1 : 1;
  }

  const leftHasInstance = Boolean(extractLiveRecordInstanceId(left));
  const rightHasInstance = Boolean(extractLiveRecordInstanceId(right));

  if (leftHasInstance !== rightHasInstance) {
    return leftHasInstance ? -1 : 1;
  }

  return getRecordTimestamp(right) - getRecordTimestamp(left);
}

function compareLiveRecordsNewestFirst(left: LiveCaseRecord, right: LiveCaseRecord): number {
  return getRecordTimestamp(right) - getRecordTimestamp(left);
}

function getAssignedTo(task: TaskGetResponse): string | null {
  const assigned = task.assignedToUser;
  if (!assigned) {
    return task.taskAssigneeName || null;
  }

  return assigned.displayName || assigned.emailAddress || assigned.userName || task.taskAssigneeName || null;
}

function stringifyTaskData(task: TaskGetResponse): string {
  if (!task.data) {
    return '';
  }

  try {
    return JSON.stringify(task.data);
  } catch {
    return '';
  }
}

function getTaskTraceId(task: TaskGetResponse): string | null {
  const taskWithMetadata = task as TaskWithRuntimeMetadata;
  const traceId = taskWithMetadata.taskSource?.taskSourceMetadata?.traceId;

  return typeof traceId === 'string' && traceId.trim() ? traceId.trim() : null;
}

function getTaskActionAppId(task: TaskGetResponse): string | null {
  const taskWithMetadata = task as TaskWithRuntimeMetadata;
  const candidates = [
    taskWithMetadata.appTasksMetadata?.appId,
    task.taskSource?.sourceId,
  ];

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.trim())?.trim() || null;
}

function taskBelongsToInstance(task: TaskGetResponse, instanceId: string): boolean {
  const taskWithMetadata = task as TaskWithRuntimeMetadata;
  const elementRunToken = taskWithMetadata.appTasksMetadata?.fpsContext?.elementRunToken;
  const candidates = [
    taskWithMetadata.taskSource?.taskSourceMetadata?.traceId,
    taskWithMetadata.taskSource?.taskSourceMetadata?.instanceId,
    taskWithMetadata.taskSource?.jobId,
    taskWithMetadata.creatorJobKey,
    taskWithMetadata.waitJobKey,
    elementRunToken?.instanceId,
    elementRunToken?.runId,
    elementRunToken?.elementId,
    ...((task.tags || []) as RuntimeTag[]).flatMap((tag) => [tag.value, tag.displayValue, tag.displayName]),
  ];

  return candidates.some((candidate) => idMatches(candidate, instanceId));
}

function getTaskSearchText(task: TaskGetResponse): string {
  const taskWithMetadata = task as TaskWithRuntimeMetadata;
  const elementRunToken = taskWithMetadata.appTasksMetadata?.fpsContext?.elementRunToken;
  const parts = [
    task.id,
    task.key,
    task.title,
    task.action,
    task.actionLabel,
    task.externalTag,
    task.taskSource?.sourceName,
    task.taskSource?.sourceId,
    taskWithMetadata.appTasksMetadata?.appId,
    taskWithMetadata.taskSource?.jobId,
    taskWithMetadata.taskSource?.taskSourceMetadata?.instanceId,
    taskWithMetadata.taskSource?.taskSourceMetadata?.traceId,
    elementRunToken?.instanceId,
    elementRunToken?.runId,
    elementRunToken?.elementId,
    stringifyTaskData(task),
    ...(((task.tags || []) as RuntimeTag[]).flatMap((tag) => [tag.value, tag.displayName, tag.displayValue, tag.name])),
  ];

  return parts.filter(Boolean).join(' ').toLowerCase();
}

function extractCpStepCode(value: string): string | null {
  const normalizedValue = value.toLowerCase();
  const match = normalizedValue.match(/\bcp\s*([0-9]+(?:\.[0-9]+)?)\b/);

  return match ? `cp${match[1]}` : null;
}

function getDefinitionCpStepCode(definition: ActionAppDefinition): string | null {
  return extractCpStepCode(definition.name);
}

export function inferActionAppDefinition(task: TaskGetResponse): ActionAppDefinition | null {
  const searchText = getTaskSearchText(task);
  const scoredDefinitions = ACTION_APP_DEFINITIONS
    .map((definition) => {
      const taskStepCode = extractCpStepCode(searchText);
      const definitionStepCode = getDefinitionCpStepCode(definition);

      if (taskStepCode && definitionStepCode && taskStepCode !== definitionStepCode) {
        return { definition, score: 0 };
      }

      const definitionsUsingSameApp = ACTION_APP_DEFINITIONS.filter((candidate) =>
        candidate.appId === definition.appId
      ).length;
      const appIdMatch = definition.appId && searchText.includes(definition.appId.toLowerCase())
        ? definitionsUsingSameApp > 1 ? 24 : 120
        : 0;
      const stepCodeMatch = taskStepCode && definitionStepCode && taskStepCode === definitionStepCode ? 90 : 0;
      const nameMatch = searchText.includes(definition.name.toLowerCase()) ? 80 : 0;
      const appNameMatch = searchText.includes(definition.appName.toLowerCase()) ? 12 : 0;
      const processMatch = searchText.includes(definition.process.toLowerCase()) ? 4 : 0;
      const keywordScore = definition.keywords.reduce((score, keyword) => {
        const normalizedKeyword = keyword.toLowerCase();

        if (!normalizedKeyword || !searchText.includes(normalizedKeyword)) {
          return score;
        }

        return score + 5 + normalizedKeyword.split(/\s+/).length;
      }, 0);

      return {
        definition,
        score: appIdMatch + stepCodeMatch + nameMatch + appNameMatch + processMatch + keywordScore,
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score);

  return scoredDefinitions[0]?.definition || null;
}

function normalizeTask(task: TaskGetResponse): LiveTaskSummary {
  const actionAppId = getTaskActionAppId(task);
  const searchText = getTaskSearchText(task);

  return {
    id: task.id,
    key: task.key,
    title: task.title,
    status: task.status,
    type: task.type,
    action: task.action,
    actionLabel: task.actionLabel || null,
    actionAppId,
    appDefinition: inferActionAppDefinition(task),
    createdTime: task.createdTime,
    completedTime: task.completedTime,
    assignedTo: getAssignedTo(task),
    traceId: getTaskTraceId(task),
    searchText,
    originalTask: task,
  };
}

function getVisibleTasks(tasks: TaskGetResponse[]): TaskGetResponse[] {
  return tasks.filter((task) => !task.isDeleted);
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'UiPath request failed.';
}

function normalizeStartedJob(job: RawStartJobResponse): ProcessStartResponse {
  return {
    ...job,
    id: job.id ?? job.Id ?? 0,
    key: job.key ?? job.Key ?? '',
    persistenceId: job.persistenceId ?? job.PersistenceId ?? null,
    folderId: job.folderId ?? job.OrganizationUnitId,
    folderName: job.folderName ?? job.OrganizationUnitFullyQualifiedName,
    startTime: job.startTime ?? job.StartTime ?? null,
    endTime: job.endTime ?? job.EndTime ?? null,
    state: job.state ?? job.State,
    source: job.source ?? job.Source ?? '',
    sourceType: job.sourceType ?? job.SourceType ?? '',
    batchExecutionKey: job.batchExecutionKey ?? job.BatchExecutionKey ?? '',
    info: job.info ?? job.Info ?? null,
    createdTime: job.createdTime ?? job.CreationTime ?? new Date().toISOString(),
    processName: job.processName ?? job.ReleaseName ?? '',
    type: job.type ?? job.Type,
    runtimeType: job.runtimeType ?? job.RuntimeType ?? '',
    reference: job.reference ?? job.Reference ?? '',
  } as ProcessStartResponse;
}

function extractStartedJobs(response: unknown): ProcessStartResponse[] {
  const value = (response as { value?: RawStartJobResponse[] })?.value;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(normalizeStartedJob).filter((job) => job.key || job.id);
}

type OrchestratorReleaseResponse = {
  Key?: string;
  key?: string;
  ProcessKey?: string;
  processKey?: string;
  Name?: string;
  name?: string;
};

type ConfiguredProcessLaunch = {
  releaseId: number;
  processName: string;
};

function getOrchestratorODataUrl(path: string): string {
  return `${IES_WORKFLOW_CONFIG.baseUrl}/${IES_WORKFLOW_CONFIG.orgId}/${IES_WORKFLOW_CONFIG.tenantId}/orchestrator_/odata/${path}`;
}

function getMaestroPimsApiUrl(path: string): string {
  return `${IES_WORKFLOW_CONFIG.baseUrl}/${IES_WORKFLOW_CONFIG.orgName}/${IES_WORKFLOW_CONFIG.tenantName}/pims_/api/v1/${path}`;
}

async function getProcessAuthToken(sdk: UiPath): Promise<string> {
  const processes = new Processes(sdk);

  return (processes as unknown as { getValidAuthToken: () => Promise<string> }).getValidAuthToken();
}

async function getMaestroAuthToken(sdk: UiPath): Promise<string> {
  const instances = new ProcessInstances(sdk);

  return (instances as unknown as { getValidAuthToken: () => Promise<string> }).getValidAuthToken();
}

async function resolveOrchestratorReleaseKey(token: string, processConfig: ConfiguredProcessLaunch): Promise<string> {
  const response = await fetch(getOrchestratorODataUrl(`Releases(${processConfig.releaseId})`), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-UIPATH-OrganizationUnitId': String(IES_WORKFLOW_CONFIG.orchestratorFolderId),
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Release lookup failed for ${processConfig.processName} (${response.status}): ${details || response.statusText}`);
  }

  const release = await response.json().catch(() => null) as OrchestratorReleaseResponse | null;
  const releaseKey = release?.Key || release?.key || release?.ProcessKey || release?.processKey;

  if (!releaseKey) {
    throw new Error(`Release ${processConfig.releaseId} for ${processConfig.processName} did not return a ReleaseKey.`);
  }

  return releaseKey;
}

async function startConfiguredOrchestratorProcess<TInput extends object>(
  sdk: UiPath,
  processConfig: ConfiguredProcessLaunch,
  input: TInput,
): Promise<ProcessLaunchResult<TInput>> {
  const token = await getProcessAuthToken(sdk);
  const releaseKey = await resolveOrchestratorReleaseKey(token, processConfig);
  const response = await fetch(getOrchestratorODataUrl('Jobs/UiPath.Server.Configuration.OData.StartJobs'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-UIPATH-OrganizationUnitId': String(IES_WORKFLOW_CONFIG.orchestratorFolderId),
    },
    body: JSON.stringify({
      startInfo: {
        ReleaseKey: releaseKey,
        Strategy: StartStrategy.ModernJobsCount,
        JobsCount: 1,
        RunAsMe: true,
        JobPriority: JobPriority.Normal,
        InputArguments: JSON.stringify(input),
        RequiresUserInteraction: false,
      },
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`${processConfig.processName} StartJobs failed (${response.status}): ${details || response.statusText}`);
  }

  return {
    jobs: extractStartedJobs(await response.json()),
    input,
    releaseId: processConfig.releaseId,
    releaseKey,
    processName: processConfig.processName,
  };
}

function extractIntegrationServiceRecords(response: unknown): LiveCaseRecord[] {
  if (Array.isArray(response)) {
    return response as LiveCaseRecord[];
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const body = response as IntegrationServiceListResponse;
  const candidates = [
    body.items,
    body.value,
    body.Records,
    body.Data?.items,
    body.Data?.Records,
  ];

  return (candidates.find(Array.isArray) || []) as LiveCaseRecord[];
}

function getIntegrationServiceResourcePath(): string {
  return IES_WORKFLOW_CONFIG.dataFabricResourceName.replace(/^\/+/, '');
}

function getIntegrationServiceRecordsBasePath(): string {
  const resourcePath = getIntegrationServiceResourcePath()
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
  const platformPath = `/${IES_WORKFLOW_CONFIG.orgId}/${IES_WORKFLOW_CONFIG.tenantId}/elements_/v3/element/instances/${IES_WORKFLOW_CONFIG.dataFabricConnectionId}/${resourcePath}`;

  if (import.meta.env.DEV) {
    return `/uipath-portal-api${platformPath}`;
  }

  return `${IES_WORKFLOW_CONFIG.portalBaseUrl}${platformPath}`;
}

async function getServiceAuthToken(sdk: UiPath): Promise<string> {
  const entities = new Entities(sdk);

  return (entities as unknown as { getValidAuthToken: () => Promise<string> }).getValidAuthToken();
}

const cachedBucketDocumentSources = new Map<string, ApplicationPdfBucketSource>();
const pendingBucketDocumentSources = new Map<string, Promise<ApplicationPdfBucketSource>>();

async function getBucketAuthToken(buckets: Buckets): Promise<string> {
  return (buckets as unknown as { getValidAuthToken: () => Promise<string> }).getValidAuthToken();
}

async function materializeBucketReadUri(buckets: Buckets, uriResponse: Awaited<ReturnType<Buckets['getReadUri']>>): Promise<ApplicationPdfBucketSource> {
  if (!uriResponse.uri) {
    throw new Error('UiPath bucket did not return a document read URI.');
  }

  const headers = { ...uriResponse.headers };

  if (!uriResponse.requiresAuth && Object.keys(headers).length === 0) {
    return {
      url: uriResponse.uri,
      objectUrl: false,
      sourceMode: 'orchestrator-get-read-uri',
    };
  }

  if (uriResponse.requiresAuth) {
    headers.Authorization = `Bearer ${await getBucketAuthToken(buckets)}`;
  }

  const response = await fetch(uriResponse.uri, { headers });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`UiPath bucket document download failed (${response.status}): ${details || response.statusText}`);
  }

  return {
    url: URL.createObjectURL(await response.blob()),
    objectUrl: true,
    sourceMode: 'orchestrator-get-read-uri',
  };
}

function getBucketDocumentCacheKey(request: BucketDocumentRequest): string {
  return `${request.folderId}:${request.bucketId}:${request.path}`;
}

function isStaticReadUrlUsable(url: string): boolean {
  try {
    const expiresAt = new URL(url).searchParams.get('se');

    if (!expiresAt) {
      return true;
    }

    const expiresAtMs = Date.parse(expiresAt);

    if (!Number.isFinite(expiresAtMs)) {
      return true;
    }

    return expiresAtMs > Date.now() + 60_000;
  } catch {
    return true;
  }
}

export async function fetchDocumentFromBucket(
  sdk: UiPath,
  request: BucketDocumentRequest,
): Promise<ApplicationPdfBucketSource> {
  const staticReadUrl = request.staticReadUrl?.trim();
  const cacheKey = getBucketDocumentCacheKey(request);
  const cachedSource = cachedBucketDocumentSources.get(cacheKey);

  if (cachedSource) {
    return cachedSource;
  }

  if (!pendingBucketDocumentSources.has(cacheKey)) {
    pendingBucketDocumentSources.set(cacheKey, (async (): Promise<ApplicationPdfBucketSource> => {
      const buckets = new Buckets(sdk);
      try {
        const readUri = await buckets.getReadUri({
          bucketId: request.bucketId,
          folderId: request.folderId,
          path: request.path,
          expiryInMinutes: request.readUriExpiryInMinutes,
        });
        const source = await materializeBucketReadUri(buckets, readUri);

        cachedBucketDocumentSources.set(cacheKey, source);
        return source;
      } catch (error) {
        if (staticReadUrl && isStaticReadUrlUsable(staticReadUrl)) {
          console.warn(`Falling back to static blob URL for ${request.path}.`, error);
          const source: ApplicationPdfBucketSource = {
            url: staticReadUrl,
            objectUrl: false,
            sourceMode: 'static-blob-fallback',
          };

          cachedBucketDocumentSources.set(cacheKey, source);
          return source;
        }

        if (staticReadUrl) {
          console.warn(`Static blob fallback for ${request.path} is expired or unusable.`, error);
        }

        throw error;
      }
    })().finally(() => {
      pendingBucketDocumentSources.delete(cacheKey);
    }));
  }

  return pendingBucketDocumentSources.get(cacheKey)!;
}

export async function fetchApplicationPdfFromBucket(sdk: UiPath): Promise<ApplicationPdfBucketSource> {
  return fetchDocumentFromBucket(sdk, {
    bucketId: IES_WORKFLOW_CONFIG.applicationPdfBucket.bucketId,
    folderId: IES_WORKFLOW_CONFIG.applicationPdfBucket.folderId,
    path: IES_WORKFLOW_CONFIG.applicationPdfBucket.path,
    staticReadUrl: IES_WORKFLOW_CONFIG.applicationPdfBucket.staticReadUrl,
    readUriExpiryInMinutes: IES_WORKFLOW_CONFIG.applicationPdfBucket.readUriExpiryInMinutes,
  });
}

async function startMaestroCaseWithRestFallback(sdk: UiPath, input: CaseStartInput): Promise<ProcessStartResponse[]> {
  const token = await getProcessAuthToken(sdk);
  const response = await fetch(
    getOrchestratorODataUrl('Jobs/UiPath.Server.Configuration.OData.StartJobs'),
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-UIPATH-OrganizationUnitId': String(IES_WORKFLOW_CONFIG.orchestratorFolderId),
      },
      body: JSON.stringify({
        startInfo: {
          ReleaseKey: IES_WORKFLOW_CONFIG.maestroProcessKey,
          Strategy: StartStrategy.ModernJobsCount,
          JobsCount: 1,
          RunAsMe: true,
          JobPriority: JobPriority.Normal,
          InputArguments: JSON.stringify(input),
          RequiresUserInteraction: false,
        },
      }),
    },
  );

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Direct StartJobs failed (${response.status}): ${details || response.statusText}`);
  }

  return extractStartedJobs(await response.json());
}

async function resolveStartedMaestroInstanceId(sdk: UiPath, jobs: ProcessStartResponse[]): Promise<string | null> {
  const candidateIds = jobs
    .flatMap((job) => [job.persistenceId, job.key])
    .filter((value): value is string => Boolean(value));

  const instances = new ProcessInstances(sdk);

  for (const candidateId of candidateIds) {
    const instance = await instances.getById(candidateId, IES_WORKFLOW_CONFIG.maestroFolderKey)
      .catch(() => null);

    if (instance?.instanceId) {
      return instance.instanceId;
    }
  }

  const startedJobIds = new Set(jobs.map((job) => String(job.id)).filter(Boolean));
  const latestInstances = await instances.getAll({
    processKey: IES_WORKFLOW_CONFIG.maestroProcessKey,
    pageSize: 25,
  }).catch(() => null);

  const matchedInstance = latestInstances
    ? extractItems(latestInstances).find((instance) => {
      const rawInstance = instance as ProcessInstanceGetResponse & { externalId?: string };

      return candidateIds.includes(rawInstance.instanceId)
        || (rawInstance.externalId ? startedJobIds.has(String(rawInstance.externalId)) : false);
    })
    : null;

  return matchedInstance?.instanceId || candidateIds[0] || null;
}

export function buildCaseStartInput(
  caseItem: BenefitCase,
  applicantEmail = IES_WORKFLOW_CONFIG.defaultApplicantEmail,
): CaseStartInput {
  const rawCase = caseItem.mybNumber === 'MYB-1004'
    ? {
      sourceSystem: 'BenefitsApp',
      applicationDocumentName: 'Fake_SNAP_App_Completed.pdf',
      applicationDocumentUri: 'mock://documents/MYB-1004/Fake_SNAP_App_Completed.pdf',
      receivedDateTimeUtc: '2026-05-26T14:00:00Z',
      demoScenario: 'Completed SNAP application PDF extraction',
      applicantEmail,
    }
    : {
      sourceSystem: 'BenefitsApp',
      applicationDocumentName: `${caseItem.mybNumber}_Application.pdf`,
      applicationDocumentUri: `mock://documents/${caseItem.mybNumber}/${caseItem.mybNumber}_Application.pdf`,
      receivedDateTimeUtc: `${caseItem.filingDate}T14:00:00Z`,
      demoScenario: caseItem.description,
      applicantEmail,
    };

  return {
    caseIn: {
      ApplicantEmail: applicantEmail,
      ApplicantName: caseItem.mybNumber === 'MYB-1004' ? 'Michael M. Motorist' : caseItem.applicantName,
      myBNumber: caseItem.mybNumber,
      RawCaseJSON: JSON.stringify(rawCase),
    },
    email: applicantEmail,
  };
}

export async function startMaestroCase(
  sdk: UiPath,
  caseItem: BenefitCase,
  applicantEmail = IES_WORKFLOW_CONFIG.defaultApplicantEmail,
): Promise<StartCaseResult> {
  const input = buildCaseStartInput(caseItem, applicantEmail);
  const processes = new Processes(sdk);
  let jobs: ProcessStartResponse[];

  try {
    jobs = await processes.start({
      processKey: IES_WORKFLOW_CONFIG.maestroProcessKey,
      strategy: StartStrategy.ModernJobsCount,
      jobsCount: 1,
      runAsMe: true,
      jobPriority: JobPriority.Normal,
      inputArguments: JSON.stringify(input),
      requiresUserInteraction: false,
    }, IES_WORKFLOW_CONFIG.orchestratorFolderId);
  } catch (error) {
    try {
      jobs = await startMaestroCaseWithRestFallback(sdk, input);
    } catch (fallbackError) {
      throw new Error(`Maestro start failed. SDK: ${formatErrorMessage(error)} Fallback: ${formatErrorMessage(fallbackError)}`);
    }
  }

  const instanceId = await resolveStartedMaestroInstanceId(sdk, jobs);

  return {
    jobs,
    instanceId,
    input,
  };
}

export async function startWorkerPtoProcess(
  sdk: UiPath,
  input: WorkerPtoProcessInput,
): Promise<ProcessLaunchResult<WorkerPtoProcessInput>> {
  return startConfiguredOrchestratorProcess(sdk, IES_WORKFLOW_CONFIG.assignmentProcesses.workerPto, input);
}

export async function startTaskAssignmentProcess(
  sdk: UiPath,
  input: TaskAssignmentProcessInput,
): Promise<ProcessLaunchResult<TaskAssignmentProcessInput>> {
  return startConfiguredOrchestratorProcess(sdk, IES_WORKFLOW_CONFIG.assignmentProcesses.taskAssignment, input);
}

async function fetchLiveCaseRecordsFromEntity(sdk: UiPath): Promise<LiveCaseRecord[]> {
  const entities = new Entities(sdk);
  const response = await entities.getAllRecords(IES_WORKFLOW_CONFIG.dataFabricEntityId, {
    pageSize: 100,
    expansionLevel: 1,
  });

  return extractItems(response);
}

async function fetchLiveCaseRecordsFromConnection(sdk: UiPath): Promise<LiveCaseRecord[]> {
  if (!IES_WORKFLOW_CONFIG.dataFabricConnectionId) {
    throw new Error('No Data Fabric connection ID is configured.');
  }

  const token = await getServiceAuthToken(sdk);
  const records: LiveCaseRecord[] = [];
  let nextPageToken: string | null = null;

  for (let page = 0; page < 10; page += 1) {
    const params = new URLSearchParams({
      limit: '100',
      expansionLevel: '1',
      fieldName: 'UpdateTime',
      idDescending: 'true',
    });

    if (nextPageToken) {
      params.set('nextPage', nextPageToken);
    }

    const response = await fetch(`${getIntegrationServiceRecordsBasePath()}?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-uipath-source': 'UiPath.CodedApp',
      },
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(`Connection read failed (${response.status}): ${details || response.statusText}`);
    }

    const body = await response.json().catch(() => null);
    records.push(...extractIntegrationServiceRecords(body));

    const hasMore = response.headers.get('elements-has-more')?.toLowerCase() === 'true';
    const next = response.headers.get('elements-next-page-token');

    if (!hasMore || !next) {
      break;
    }

    nextPageToken = next;
  }

  return records;
}

export async function fetchLiveCaseRecords(sdk: UiPath): Promise<LiveCaseRecord[]> {
  try {
    const records = await fetchLiveCaseRecordsFromEntity(sdk);

    return records.slice().sort(compareLiveRecordsNewestFirst);
  } catch (error) {
    if (
      !IES_WORKFLOW_CONFIG.dataFabricConnectionFallbackEnabled ||
      !IES_WORKFLOW_CONFIG.dataFabricConnectionId
    ) {
      throw error;
    }

    console.warn(
      `Data Fabric entity read failed; trying ${IES_WORKFLOW_CONFIG.dataFabricConnectionName}.`,
      error,
    );
  }

  const records = await fetchLiveCaseRecordsFromConnection(sdk);

  return records.slice().sort(compareLiveRecordsNewestFirst);
}

export async function fetchTaskAssignmentRecords(sdk: UiPath): Promise<LiveTaskAssignmentRecord[]> {
  const entities = new Entities(sdk);
  const response = await entities.getAllRecords(IES_WORKFLOW_CONFIG.assignmentDataFabric.taskAssignment.entityId, {
    pageSize: 500,
    expansionLevel: 1,
  });

  return extractItems(response);
}

function getTaskAssignmentTaskId(record: LiveTaskAssignmentRecord): number | null {
  const recordSource = record as Record<string, unknown>;

  for (const key of taskAssignmentTaskIdKeys) {
    const taskId = extractTaskIdsFromUnknown(recordSource[key])[0];

    if (taskId) {
      return taskId;
    }
  }

  return null;
}

function getTaskAssignmentMaestroProcessId(record: LiveTaskAssignmentRecord): string | null {
  const recordSource = record as Record<string, unknown>;

  for (const key of taskAssignmentMaestroProcessIdKeys) {
    const value = recordSource[key];
    const extractedId = extractInstanceIdsFromUnknown(value).find(isUsableMaestroInstanceId);

    if (extractedId) {
      return extractedId;
    }

    if (typeof value === 'string' && isUsableMaestroInstanceId(value.trim())) {
      return value.trim();
    }
  }

  return null;
}

export function getTaskAssignmentTaskIdsForInstances(
  records: LiveTaskAssignmentRecord[],
  instanceIds: string[],
): number[] {
  const normalizedInstanceIds = uniqueStrings(instanceIds.filter(Boolean));
  const taskIds = new Set<number>();

  if (normalizedInstanceIds.length === 0) {
    return [];
  }

  for (const record of records) {
    const maestroProcessId = getTaskAssignmentMaestroProcessId(record);
    const taskId = getTaskAssignmentTaskId(record);

    if (!maestroProcessId || !taskId) {
      continue;
    }

    const matchesCaseInstance = normalizedInstanceIds.some((instanceId) =>
      idMatches(maestroProcessId, instanceId) || idMatches(instanceId, maestroProcessId)
    );

    if (matchesCaseInstance) {
      taskIds.add(taskId);
    }
  }

  return Array.from(taskIds).sort((left, right) => left - right);
}

export function findMatchingLiveRecord(records: LiveCaseRecord[], caseItem: BenefitCase): LiveCaseRecord | null {
  const target = normalizeText(caseItem.mybNumber);

  const matches = records.filter((record) =>
    recordCaseKeys.some((key) => normalizeText(record[key]) === target)
  );

  return matches.sort(compareLiveRecordRelevance)[0] || null;
}

export function getLiveRecordInstanceId(record: LiveCaseRecord | null): string | null {
  if (!record) {
    return null;
  }

  return extractLiveRecordInstanceId(record);
}

export function getLiveRecordFolderKey(record: LiveCaseRecord | null): string {
  if (!record) {
    return IES_WORKFLOW_CONFIG.maestroFolderKey;
  }

  for (const key of recordFolderKeyKeys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return IES_WORKFLOW_CONFIG.maestroFolderKey;
}

export function getLiveRecordActionTaskReferences(record: LiveCaseRecord | null): LiveRecordActionTaskReferences {
  if (!record) {
    return {
      instanceIds: [],
      taskIds: [],
    };
  }

  const instanceIds = new Set<string>();
  const taskIds = new Set<number>();
  const recordSource = record as Record<string, unknown>;

  for (const key of recordSubprocessInstanceKeys) {
    for (const instanceId of extractInstanceIdsFromUnknown(recordSource[key])) {
      if (isUsableMaestroInstanceId(instanceId)) {
        instanceIds.add(instanceId);
      }
    }
  }

  for (const key of recordActionTaskIdKeys) {
    for (const taskId of extractTaskIdsFromUnknown(recordSource[key])) {
      taskIds.add(taskId);
    }
  }

  for (const [key, value] of Object.entries(recordSource)) {
    if (recordKeyLooksLikeSubprocessInstance(key)) {
      for (const instanceId of extractInstanceIdsFromUnknown(value)) {
        if (isUsableMaestroInstanceId(instanceId)) {
          instanceIds.add(instanceId);
        }
      }
    }

    if (recordKeyLooksLikeActionTaskId(key)) {
      for (const taskId of extractTaskIdsFromUnknown(value)) {
        taskIds.add(taskId);
      }
    }
  }

  return {
    instanceIds: uniqueStrings(Array.from(instanceIds)),
    taskIds: Array.from(taskIds).sort((left, right) => left - right),
  };
}

function normalizeUtcTimestamp(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
}

function getElementExecutionRun(execution: MaestroElementExecution): MaestroElementRun | null {
  if (!Array.isArray(execution.elementRuns) || execution.elementRuns.length === 0) {
    return null;
  }

  return execution.elementRuns[0] || null;
}

function mapElementExecutionToHistoryItem(
  execution: MaestroElementExecution,
  traceId: string | null | undefined,
): ProcessInstanceExecutionHistoryResponse {
  const run = getElementExecutionRun(execution);
  const elementId = execution.elementId || '';
  const elementRunId = run?.elementRunId || execution.runId || `${elementId}-${execution.startedTimeUtc || Date.now()}`;
  const startedTime = normalizeUtcTimestamp(execution.startedTimeUtc || run?.startedTimeUtc);
  const completedTime = normalizeUtcTimestamp(execution.completedTimeUtc || run?.completedTimeUtc);
  const updatedTime = completedTime || startedTime || new Date().toISOString();
  const attributes = {
    elementId,
    elementType: execution.elementType || null,
    elementExtensionType: execution.elementExtensionType || null,
    status: execution.status || run?.status || null,
    runId: execution.runId || null,
    elementRunId,
    workflowId: run?.workflowId || null,
    temporalExecutionId: run?.temporalExecutionId || null,
    jobKey: execution.jobKey || run?.jobKey || null,
    externalLink: execution.externalLink || null,
    maestroLink: execution.maestroLink || null,
  };

  return {
    id: elementRunId,
    traceId: traceId || run?.temporalExecutionId || elementRunId,
    parentId: execution.parentElementRunId || run?.parentElementRunId || execution.parentRunId || null,
    name: '',
    startedTime: startedTime || updatedTime,
    endTime: completedTime,
    attributes: JSON.stringify(attributes),
    createdTime: startedTime || updatedTime,
    updatedTime,
    expiredTime: null,
  };
}

async function fetchMaestroElementExecutionHistory(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<ProcessInstanceExecutionHistoryResponse[]> {
  const token = await getMaestroAuthToken(sdk);
  const response = await fetch(getMaestroPimsApiUrl(`instances/${instanceId}/element-executions`), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-UIPATH-FolderKey': folderKey,
    },
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`Maestro element executions failed (${response.status}): ${details || response.statusText}`);
  }

  const body = await response.json().catch(() => null) as MaestroElementExecutionsResponse | null;

  if (!Array.isArray(body?.elementExecutions)) {
    return [];
  }

  return body.elementExecutions.map((execution) => mapElementExecutionToHistoryItem(execution, body.traceId));
}

async function fetchMaestroExecutionHistory(
  sdk: UiPath,
  instances: ProcessInstances,
  instanceId: string,
  folderKey: string,
): Promise<ProcessInstanceExecutionHistoryResponse[]> {
  try {
    return await fetchMaestroElementExecutionHistory(sdk, instanceId, folderKey);
  } catch {
    return instances.getExecutionHistory(instanceId).catch(() => []);
  }
}

export async function fetchMaestroInstanceContext(
  sdk: UiPath,
  instanceId: string,
  folderKey = IES_WORKFLOW_CONFIG.maestroFolderKey,
): Promise<LiveMaestroContext> {
  const instances = new ProcessInstances(sdk);

  const [instance, variables, executionHistory] = await Promise.all([
    instances.getById(instanceId, folderKey).catch(() => null),
    instances.getVariables(instanceId, folderKey).catch(() => null),
    fetchMaestroExecutionHistory(sdk, instances, instanceId, folderKey),
  ]);

  return {
    instance,
    variables,
    executionHistory,
  };
}

export async function fetchMaestroInstanceDiagram(
  sdk: UiPath,
  instanceId: string,
  folderKey: string,
): Promise<LiveMaestroDiagram> {
  const instances = new ProcessInstances(sdk);

  const [instance, bpmnXml, executionHistory, incidents] = await Promise.all([
    instances.getById(instanceId, folderKey).catch(() => null),
    instances.getBpmn(instanceId, folderKey),
    fetchMaestroExecutionHistory(sdk, instances, instanceId, folderKey),
    instances.getIncidents(instanceId, folderKey).catch(() => []),
  ]);

  return {
    instance,
    bpmnXml,
    executionHistory,
    incidents,
  };
}

function taskBelongsToAnyInstance(task: TaskGetResponse, instanceIds: string[]): boolean {
  return instanceIds.some((instanceId) => taskBelongsToInstance(task, instanceId));
}

function taskReferencesCaseNumber(task: TaskGetResponse, caseNumber: string | null | undefined): boolean {
  const normalizedCaseNumber = normalizeCaseReference(caseNumber);

  if (!normalizedCaseNumber) {
    return false;
  }

  const taskWithMetadata = task as TaskWithRuntimeMetadata;
  const elementRunToken = taskWithMetadata.appTasksMetadata?.fpsContext?.elementRunToken;
  const candidates = [
    task.title,
    task.action,
    task.actionLabel,
    task.externalTag,
    task.taskSource?.sourceName,
    task.taskSource?.sourceId,
    taskWithMetadata.appTasksMetadata?.appId,
    taskWithMetadata.taskSource?.jobId,
    taskWithMetadata.taskSource?.taskSourceMetadata?.instanceId,
    taskWithMetadata.taskSource?.taskSourceMetadata?.traceId,
    elementRunToken?.instanceId,
    elementRunToken?.runId,
    elementRunToken?.elementId,
    stringifyTaskData(task),
    ...(((task.tags || []) as RuntimeTag[]).flatMap((tag) => [tag.value, tag.displayName, tag.displayValue, tag.name])),
  ];

  return candidates.some((candidate) => normalizeCaseReference(candidate).includes(normalizedCaseNumber));
}

function taskMatchesCaseContext(
  task: TaskGetResponse,
  caseNumber: string | null | undefined,
  relatedInstanceIds: string[],
  trustedTaskIds: Set<number> = new Set(),
): boolean {
  return trustedTaskIds.has(task.id)
    || taskBelongsToAnyInstance(task, relatedInstanceIds)
    || taskReferencesCaseNumber(task, caseNumber);
}

function sortTasksNewestFirst(tasks: TaskGetResponse[]): TaskGetResponse[] {
  return tasks.slice().sort((left, right) => Date.parse(right.createdTime) - Date.parse(left.createdTime));
}

function uniqueTasks(tasks: TaskGetResponse[]): TaskGetResponse[] {
  const seenTaskIds = new Set<number>();

  return tasks.filter((task) => {
    if (seenTaskIds.has(task.id)) {
      return false;
    }

    seenTaskIds.add(task.id);
    return true;
  });
}

function uniqueStrings(values: string[]): string[] {
  const seenValues = new Set<string>();

  return values.filter((value) => {
    const normalizedValue = normalizeId(value);

    if (!normalizedValue || seenValues.has(normalizedValue)) {
      return false;
    }

    seenValues.add(normalizedValue);
    return true;
  });
}

function normalizeTaskResults(tasks: TaskGetResponse[]): LiveTaskSummary[] {
  return sortTasksNewestFirst(uniqueTasks(getVisibleTasks(tasks))).map(normalizeTask);
}

async function enrichTasks(tasks: Tasks, taskSummaries: TaskGetResponse[]): Promise<TaskGetResponse[]> {
  return Promise.all(
    taskSummaries.map((task) =>
      tasks.getById(task.id, undefined, IES_WORKFLOW_CONFIG.orchestratorFolderId).catch(() => task)
    )
  );
}

function getChildInstanceIdsFromExecutionHistory(
  executionHistory: CaseInstanceExecutionHistoryResponse | null,
  parentInstanceId: string,
): string[] {
  const childInstanceIds = new Set<string>();

  for (const execution of executionHistory?.elementExecutions || []) {
    const runtimeExecution = execution as RuntimeElementExecution;
    const runtimeRuns = runtimeExecution.elementRuns || [];
    const possibleLinks = [
      runtimeExecution.externalLink,
      runtimeExecution.maestroLink,
      ...runtimeRuns.flatMap((run) => [run.workflowId, run.temporalExecutionId]),
    ];
    const isChildProcessCall = runtimeExecution.elementExtensionType === 'Orchestrator.StartAgenticProcess'
      || possibleLinks.some((link) => typeof link === 'string' && link.includes('/maestro_/processes/'));

    if (!isChildProcessCall) {
      continue;
    }

    const candidates = [
      runtimeExecution.jobKey,
      runtimeExecution.externalLink,
      runtimeExecution.maestroLink,
      ...runtimeRuns.flatMap((run) => [run.jobKey, run.workflowId, run.temporalExecutionId]),
    ];

    for (const candidate of candidates) {
      for (const instanceId of extractInstanceIdsFromText(candidate)) {
        if (!idMatches(instanceId, parentInstanceId) && isUsableMaestroInstanceId(instanceId)) {
          childInstanceIds.add(instanceId);
        }
      }
    }
  }

  return Array.from(childInstanceIds);
}

async function fetchChildInstanceIds(sdk: UiPath, instanceId: string): Promise<string[]> {
  const caseInstances = new CaseInstances(sdk);
  const executionHistory = await caseInstances
    .getExecutionHistory(instanceId, IES_WORKFLOW_CONFIG.maestroFolderKey)
    .catch(() => null);

  return getChildInstanceIdsFromExecutionHistory(executionHistory, instanceId);
}

async function findPendingTasksByIds(tasks: Tasks, taskIds: number[]): Promise<TaskGetResponse[]> {
  const uniqueTaskIds = Array.from(new Set(taskIds))
    .filter((taskId) => Number.isSafeInteger(taskId) && taskId > 0);

  if (uniqueTaskIds.length === 0) {
    return [];
  }

  const taskResults = await Promise.all(
    uniqueTaskIds.map((taskId) =>
      tasks.getById(taskId, undefined, IES_WORKFLOW_CONFIG.orchestratorFolderId).catch(() => null)
    )
  );

  return getVisibleTasks(taskResults.filter((task): task is TaskGetResponse => Boolean(task)));
}

async function findPendingFolderTasks(tasks: Tasks): Promise<TaskGetResponse[]> {
  const queryOptions = [
    { asTaskAdmin: true },
    { asTaskAdmin: false },
    { asTaskAdmin: true, filter: "Status ne 'Completed' and IsDeleted eq false" },
    { asTaskAdmin: false, filter: "Status ne 'Completed' and IsDeleted eq false" },
  ];

  for (const options of queryOptions) {
    const result = await tasks.getAll({
      folderId: IES_WORKFLOW_CONFIG.orchestratorFolderId,
      ...options,
      expand: 'AssignedToUser,Activities',
      pageSize: 500,
    }).then((response) => getVisibleTasks(extractItems(response))).catch(() => []);

    if (result.length > 0) {
      return result;
    }
  }

  return [];
}

export async function findPendingTasksForInstance(
  sdk: UiPath,
  instanceId: string,
  options: FindTasksForInstanceOptions = {},
): Promise<LiveTaskSummary[]> {
  const caseInstances = new CaseInstances(sdk);
  const tasks = new Tasks(sdk);
  const {
    caseNumber,
    explicitTaskIds = [],
    refreshTaskIds = [],
    relatedInstanceIds: knownRelatedInstanceIds = [],
  } = options;

  const caseTasks = await caseInstances.getActionTasks(instanceId, { pageSize: 50 })
    .then((response) => getVisibleTasks(extractItems(response)))
    .catch(() => []);

  const [enrichedCaseTasks, explicitTaskMatches, refreshTaskMatches, childInstanceIds] = await Promise.all([
    caseTasks.length > 0 ? enrichTasks(tasks, caseTasks) : Promise.resolve([]),
    findPendingTasksByIds(tasks, explicitTaskIds),
    findPendingTasksByIds(tasks, refreshTaskIds),
    fetchChildInstanceIds(sdk, instanceId),
  ]);
  const relatedInstanceIds = uniqueStrings([instanceId, ...knownRelatedInstanceIds, ...childInstanceIds]);
  const trustedTaskIds = new Set([...explicitTaskIds, ...refreshTaskIds]);
  const folderTasks = await findPendingFolderTasks(tasks);
  const enrichedTasks = await enrichTasks(tasks, folderTasks);
  const instanceTasks = getVisibleTasks(enrichedTasks)
    .filter((task) => taskMatchesCaseContext(task, caseNumber, relatedInstanceIds))
    .sort((left, right) => Date.parse(right.createdTime) - Date.parse(left.createdTime));
  const refreshedVisibleTasks = getVisibleTasks(refreshTaskMatches)
    .filter((task) => taskMatchesCaseContext(task, caseNumber, relatedInstanceIds, trustedTaskIds));

  return normalizeTaskResults([
    ...enrichedCaseTasks,
    ...explicitTaskMatches,
    ...refreshedVisibleTasks,
    ...instanceTasks,
  ]);
}

export async function completeLiveTask(sdk: UiPath, task: LiveTaskSummary) {
  const tasks = new Tasks(sdk);
  const latestTask = await tasks.getById(task.id, undefined, IES_WORKFLOW_CONFIG.orchestratorFolderId)
    .catch(() => task.originalTask);
  const action = latestTask.actionLabel || latestTask.action || 'submit';

  if (latestTask.type === TaskType.External) {
    return latestTask.complete({
      type: TaskType.External,
      data: latestTask.data ?? {},
      action,
    });
  }

  if (latestTask.type === TaskType.App) {
    return latestTask.complete({
      type: TaskType.App,
      data: latestTask.data ?? {},
      action,
    });
  }

  if (latestTask.type === TaskType.Form) {
    return latestTask.complete({
      type: TaskType.Form,
      data: latestTask.data ?? {},
      action,
    });
  }

  return latestTask.complete({
    type: latestTask.type,
    data: latestTask.data ?? {},
    action,
  });
}

export function getTasksForTab(tasks: LiveTaskSummary[], tab: LiveActionAppTab): LiveTaskSummary[] {
  return tasks.filter((task) => task.appDefinition?.tab === tab);
}

export function buildTaskLink(taskId: number): string {
  return `${IES_WORKFLOW_CONFIG.portalBaseUrl}/${IES_WORKFLOW_CONFIG.orgId}/${IES_WORKFLOW_CONFIG.tenantId}/actions_/tasks/${taskId}`;
}

export function convertTaskLinkToEmbedUrl(taskLink: string): string {
  const url = new URL(taskLink);
  const pathParts = url.pathname.split('/').filter((part) => part.length > 0);
  const orgId = pathParts[0] || IES_WORKFLOW_CONFIG.orgId;
  const tenantId = pathParts[1] || IES_WORKFLOW_CONFIG.tenantId;
  const actionsIndex = pathParts.findIndex((part) => part === 'actions_');
  const remainingPath = actionsIndex !== -1
    ? pathParts.slice(actionsIndex).join('/')
    : pathParts.slice(2).join('/');
  const currentTaskPath = remainingPath.replace('actions_/tasks', 'actions_/current-task/tasks');

  return `${url.origin}/embed_/${orgId}/${tenantId}/${currentTaskPath}`;
}

function buildMaestroPortalQuery(folderKey: string): string {
  const params = new URLSearchParams();

  if (folderKey.trim()) {
    params.set('folderKey', folderKey.trim());
  }

  return params.toString();
}

function buildMaestroPortalPath(path: string, folderKey = IES_WORKFLOW_CONFIG.maestroFolderKey): string {
  const query = buildMaestroPortalQuery(folderKey);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${IES_WORKFLOW_CONFIG.portalBaseUrl}/${IES_WORKFLOW_CONFIG.orgName}/${IES_WORKFLOW_CONFIG.tenantName}/maestro_${normalizedPath}${query ? `?${query}` : ''}`;
}

function normalizeMaestroUrlInstanceId(instanceId: string): string {
  return extractInstanceIdsFromText(instanceId).find(isUsableMaestroInstanceId)
    || instanceId.trim().replace(/@+$/g, '');
}

export function buildMaestroProcessUrl(folderKey = IES_WORKFLOW_CONFIG.maestroFolderKey): string {
  return buildMaestroPortalPath(`/processes/${IES_WORKFLOW_CONFIG.maestroProcessKey}`, folderKey);
}

export function buildMaestroInstanceUrl(
  instanceId: string,
  folderKey = IES_WORKFLOW_CONFIG.maestroFolderKey,
): string {
  const normalizedInstanceId = normalizeMaestroUrlInstanceId(instanceId);

  return buildMaestroPortalPath(
    `/processes/${IES_WORKFLOW_CONFIG.maestroProcessKey}/instances/${normalizedInstanceId}`,
    folderKey,
  );
}
