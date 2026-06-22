import { CodedActionAppService, MessageSeverity as UiPathMessageSeverity } from "@uipath/coded-action-app";
import { createMockClearanceOverrideInputs } from "../data/mockClearanceOverrideTask";
import type {
  ClearanceOverrideInputs,
  FinalClearancePayload,
  MessageSeverity,
  TaskAction
} from "../types/clearanceOverrideTypes";

const actionCenter = new CodedActionAppService();

export interface LoadedActionTask {
  inputs: ClearanceOverrideInputs;
  isLocalMode: boolean;
  rawTask?: unknown;
}

export interface CompleteTaskResult {
  localPayload?: FinalClearancePayload;
}

export async function loadActionCenterTask(): Promise<LoadedActionTask> {
  try {
    const task = await actionCenter.getTask();
    const inputs = extractSeparatedInputs(task);

    if (!inputs) {
      return {
        inputs: createMockClearanceOverrideInputs(),
        isLocalMode: true,
        rawTask: task
      };
    }

    return {
      inputs,
      isLocalMode: false,
      rawTask: task
    };
  } catch {
    console.info("Local demo mode is active. Action Center task data is unavailable.");
    return {
      inputs: createMockClearanceOverrideInputs(),
      isLocalMode: true
    };
  }
}

export async function saveTaskData(inputs: ClearanceOverrideInputs, isLocalMode: boolean): Promise<void> {
  if (isLocalMode) {
    console.log("Local setTaskData payload", inputs);
    return;
  }

  actionCenter.setTaskData(inputs);
}

export async function completeActionTask(
  action: TaskAction,
  payload: FinalClearancePayload,
  isLocalMode: boolean
): Promise<CompleteTaskResult> {
  if (isLocalMode) {
    console.log("Local completeTask action", action);
    console.log("Local completeTask payload", payload);
    return {
      localPayload: payload
    };
  }

  const result = await actionCenter.completeTask(action, payload);

  if (!result.success) {
    throw new Error(result.errorMessage ?? `Action Center completion failed with code ${result.errorCode}.`);
  }

  return {};
}

export async function notify(message: string, severity: MessageSeverity): Promise<void> {
  try {
    actionCenter.showMessage(message, toUiPathSeverity(severity));
  } catch {
    console[severity === "error" ? "error" : "log"](`${severity.toUpperCase()}: ${message}`);
  }
}

function toUiPathSeverity(severity: MessageSeverity): UiPathMessageSeverity {
  switch (severity) {
    case "success":
      return UiPathMessageSeverity.Success;
    case "warning":
      return UiPathMessageSeverity.Warning;
    case "error":
      return UiPathMessageSeverity.Error;
    case "info":
    default:
      return UiPathMessageSeverity.Info;
  }
}

function extractSeparatedInputs(task: unknown): ClearanceOverrideInputs | null {
  const candidates = getTaskDataCandidates(task);

  for (const candidate of candidates) {
    const parsed = parseMaybeJson(candidate);

    if (hasSeparatedInputGroups(parsed)) {
      return parsed;
    }

    const minimalInputs = composeFromMinimalInputs(parsed);
    if (minimalInputs) {
      return minimalInputs;
    }
  }

  return null;
}

function getTaskDataCandidates(task: unknown): unknown[] {
  if (!task || typeof task !== "object") {
    return [task];
  }

  const taskRecord = task as Record<string, unknown>;

  return [
    taskRecord.data,
    taskRecord.Data,
    taskRecord.taskData,
    taskRecord.TaskData,
    taskRecord.inputData,
    taskRecord.InputData,
    taskRecord.inputs,
    taskRecord.Inputs,
    task
  ];
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function hasSeparatedInputGroups(value: unknown): value is ClearanceOverrideInputs {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<Record<keyof ClearanceOverrideInputs, unknown>>;

  return Boolean(
    record.taskContext &&
      record.caseInfo &&
      record.householdMember &&
      record.clearanceSearch &&
      Array.isArray(record.candidateMatches) &&
      record.workerDecision &&
      record.auditInfo
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function objectInput<T extends object>(value: unknown): Partial<T> {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? (parsed as Partial<T>) : {};
}

function arrayInput<T>(value: unknown, fallback: T[]): T[] {
  const parsed = parseMaybeJson(value);
  return Array.isArray(parsed) ? (parsed as T[]) : fallback;
}

function stringInput(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function dateInput(value: unknown): string | undefined {
  const date = stringInput(value);
  return date?.includes("T") ? date.slice(0, 10) : date;
}

function statusInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return (
      {
        0: "Pending Review",
        1: "In Progress",
        2: "Approved",
        3: "Denied",
        4: "Missing Information",
        5: "Supervisor Review",
        6: "Withdrawn"
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function stageInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return (
      {
        1: "Intake",
        2: "Clearance",
        3: "Interview",
        4: "External Validation",
        5: "Budget",
        6: "Final Review"
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function priorityInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return value <= 1 ? "Low" : "High";
  }

  return stringInput(value);
}

function normalizeCaseInfo(
  defaults: ClearanceOverrideInputs["caseInfo"],
  value: unknown
): ClearanceOverrideInputs["caseInfo"] {
  const record = objectInput<Record<string, unknown>>(value);

  return {
    ...defaults,
    ...record,
    caseRecordNumber: stringInput(record.caseRecordNumber ?? record.CaseRecordNumber ?? record.Id) ?? defaults.caseRecordNumber,
    myBNumber: stringInput(record.myBNumber ?? record.MyBNumber) ?? defaults.myBNumber,
    applicantName: stringInput(record.applicantName ?? record.ApplicantName) ?? defaults.applicantName,
    applicantEmail: stringInput(record.applicantEmail ?? record.ApplicantEmail) ?? defaults.applicantEmail,
    county: stringInput(record.county ?? record.County) ?? defaults.county,
    derivedRegion: stringInput(record.derivedRegion ?? record.DerivedRegion) ?? defaults.derivedRegion,
    filingDate: dateInput(record.filingDate ?? record.FilingDate ?? record.CreateTime) ?? defaults.filingDate,
    eligibilityDueDate:
      dateInput(record.eligibilityDueDate ?? record.EligibilityDueDate) ?? defaults.eligibilityDueDate,
    currentStatus: statusInput(record.currentStatus ?? record.CurrentStatus) ?? defaults.currentStatus,
    currentStage: stageInput(record.currentStage ?? record.CurrentStage) ?? defaults.currentStage,
    statusCode: stringInput(record.statusCode ?? record.StatusCode) ?? defaults.statusCode
  };
}

function normalizeTaskContext(
  defaults: ClearanceOverrideInputs["taskContext"],
  value: unknown
): ClearanceOverrideInputs["taskContext"] {
  const record = objectInput<Record<string, unknown>>(value);

  return {
    ...defaults,
    ...record,
    taskId: stringInput(record.taskId ?? record.TaskId ?? record.MaestroProcessID ?? record.Id) ?? defaults.taskId,
    createdAtUtc: stringInput(record.createdAtUtc ?? record.CreateTime) ?? defaults.createdAtUtc,
    assignedWorker: stringInput(record.assignedWorker ?? record.AssignedWorker) ?? defaults.assignedWorker,
    priority: priorityInput(record.priority ?? record.Priority) ?? defaults.priority,
    isReadOnly: typeof record.isReadOnly === "boolean" ? record.isReadOnly : defaults.isReadOnly
  };
}

function composeFromMinimalInputs(value: unknown): ClearanceOverrideInputs | null {
  if (!isRecord(value) || !isRecord(value.caseInfo)) {
    return null;
  }

  const defaults = createMockClearanceOverrideInputs();
  const documentInfo = objectInput<Record<string, unknown>>(value.documentInfo);

  return {
    ...defaults,
    taskContext: normalizeTaskContext(defaults.taskContext, value.caseInfo),
    caseInfo: normalizeCaseInfo(defaults.caseInfo, value.caseInfo),
    householdMember: {
      ...defaults.householdMember,
      ...objectInput<typeof defaults.householdMember>(
        documentInfo.householdMember ?? documentInfo.applicant ?? documentInfo.primaryApplicant
      )
    },
    clearanceSearch: {
      ...defaults.clearanceSearch,
      ...objectInput<typeof defaults.clearanceSearch>(documentInfo.clearanceSearch)
    },
    candidateMatches: arrayInput(documentInfo.candidateMatches, defaults.candidateMatches),
    workerDecision: {
      ...defaults.workerDecision,
      ...objectInput<typeof defaults.workerDecision>(documentInfo.workerDecision)
    },
    auditInfo: {
      ...defaults.auditInfo,
      ...objectInput<typeof defaults.auditInfo>(documentInfo.auditInfo)
    }
  };
}
