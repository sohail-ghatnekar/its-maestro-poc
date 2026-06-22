import { CodedActionAppService, MessageSeverity } from "@uipath/coded-action-app";
import { mockReviewBudgetResultsTask } from "../data/mockReviewBudgetResultsTask";
import type {
  ActionCenterLoadResult,
  FinalAction,
  LocalToastMessage,
  ReviewBudgetResultsInputs
} from "../types/reviewBudgetResultsTypes";

type CompletionListener = (payload: { action: FinalAction; data: unknown }) => void;
type MessageListener = (message: LocalToastMessage) => void;

type SdkTaskEnvelope = {
  data?: unknown;
  taskData?: unknown;
  [key: string]: unknown;
};

type TaskCompleteResponse = {
  success?: boolean;
  errorCode?: number | null;
  errorMessage?: string | null;
};

const TASK_LOAD_TIMEOUT_MS = 1800;

function cloneInputs(inputs: ReviewBudgetResultsInputs): ReviewBudgetResultsInputs {
  if (typeof structuredClone === "function") {
    return structuredClone(inputs);
  }

  return JSON.parse(JSON.stringify(inputs)) as ReviewBudgetResultsInputs;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
  defaults: ReviewBudgetResultsInputs["caseInfo"],
  value: unknown
): ReviewBudgetResultsInputs["caseInfo"] {
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
  defaults: ReviewBudgetResultsInputs["taskContext"],
  value: unknown
): ReviewBudgetResultsInputs["taskContext"] {
  const record = objectInput<Record<string, unknown>>(value);

  return {
    ...defaults,
    ...record,
    taskId: stringInput(record.taskId ?? record.TaskId ?? record.MaestroProcessID ?? record.Id) ?? defaults.taskId,
    createdAtUtc: stringInput(record.createdAtUtc ?? record.CreateTime) ?? defaults.createdAtUtc,
    assignedWorker: stringInput(record.assignedWorker ?? record.AssignedWorker) ?? defaults.assignedWorker,
    priority: (priorityInput(record.priority ?? record.Priority) ??
      defaults.priority) as ReviewBudgetResultsInputs["taskContext"]["priority"],
    isReadOnly: typeof record.isReadOnly === "boolean" ? record.isReadOnly : defaults.isReadOnly
  };
}

function isReviewBudgetResultsInputs(value: unknown): value is ReviewBudgetResultsInputs {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isRecord(value.taskContext) &&
    isRecord(value.caseInfo) &&
    isRecord(value.readinessResult) &&
    isRecord(value.budgetInputSummary) &&
    isRecord(value.ableBudgetResult) &&
    isRecord(value.workerReview) &&
    isRecord(value.auditInfo)
  );
}

function unwrapTaskData(rawTask: unknown): ReviewBudgetResultsInputs {
  const envelope = rawTask as SdkTaskEnvelope;
  const dataEnvelope = isRecord(envelope.data) ? (envelope.data as SdkTaskEnvelope) : null;
  const candidates = [
    envelope.data,
    envelope.taskData,
    dataEnvelope?.data,
    dataEnvelope?.taskData,
    rawTask
  ];
  for (const candidate of candidates) {
    const parsed = parseMaybeJson(candidate);

    if (isReviewBudgetResultsInputs(parsed)) {
      return cloneInputs(parsed);
    }

    const minimalInputs = composeFromMinimalInputs(parsed);
    if (minimalInputs) {
      return minimalInputs;
    }
  }

  throw new Error("Action Center task payload does not match the Review Budget Results input contract.");
}

function composeFromMinimalInputs(value: unknown): ReviewBudgetResultsInputs | null {
  if (!isRecord(value) || !isRecord(value.caseInfo)) {
    return null;
  }

  const defaults = cloneInputs(mockReviewBudgetResultsTask);
  const documentInfo = objectInput<Record<string, unknown>>(value.documentInfo);
  const budgetInputSummary = objectInput<typeof defaults.budgetInputSummary>(documentInfo.budgetInputSummary);

  return {
    ...defaults,
    taskContext: normalizeTaskContext(defaults.taskContext, value.caseInfo),
    caseInfo: normalizeCaseInfo(defaults.caseInfo, value.caseInfo),
    readinessResult: {
      ...defaults.readinessResult,
      ...objectInput<typeof defaults.readinessResult>(documentInfo.readinessResult)
    },
    budgetInputSummary: {
      ...defaults.budgetInputSummary,
      ...budgetInputSummary,
      earnedIncomeSources: arrayInput(
        budgetInputSummary.earnedIncomeSources ?? documentInfo.earnedIncomeSources,
        defaults.budgetInputSummary.earnedIncomeSources
      )
    },
    ableBudgetResult: {
      ...defaults.ableBudgetResult,
      ...objectInput<typeof defaults.ableBudgetResult>(documentInfo.ableBudgetResult)
    },
    workerReview: {
      ...defaults.workerReview,
      ...objectInput<typeof defaults.workerReview>(documentInfo.workerReview)
    },
    auditInfo: {
      ...defaults.auditInfo,
      ...objectInput<typeof defaults.auditInfo>(documentInfo.auditInfo)
    }
  };
}

class ActionCenterClient {
  private readonly service = new CodedActionAppService();
  private loadTaskPromise: Promise<ActionCenterLoadResult> | null = null;
  private isCompleting = false;
  private isLocalDemoMode = false;
  private localInputs = cloneInputs(mockReviewBudgetResultsTask);
  private readonly messageListeners = new Set<MessageListener>();
  private readonly completionListeners = new Set<CompletionListener>();

  onLocalMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onLocalCompletion(listener: CompletionListener): () => void {
    this.completionListeners.add(listener);
    return () => this.completionListeners.delete(listener);
  }

  loadTask(): Promise<ActionCenterLoadResult> {
    if (!this.loadTaskPromise) {
      this.loadTaskPromise = this.loadTaskInternal();
    }

    return this.loadTaskPromise;
  }

  async updateTaskData(data: ReviewBudgetResultsInputs): Promise<void> {
    if (this.isLocalDemoMode) {
      this.localInputs = cloneInputs(data);
      console.info("[Local Demo Mode] setTaskData", this.localInputs);
      return;
    }

    try {
      this.service.setTaskData(data);
    } catch (error) {
      console.error("setTaskData failed", error);
      this.showError("Unable to save task data to Action Center.");
    }
  }

  async completeTaskWithPayload(action: FinalAction, payload: unknown): Promise<TaskCompleteResponse> {
    if (this.isCompleting) {
      const message = "Task completion is already in progress.";
      this.showWarning(message);
      return { success: false, errorMessage: message };
    }

    this.isCompleting = true;

    try {
      if (this.isLocalDemoMode) {
        console.info("[Local Demo Mode] completeTask", { action, payload });
        this.completionListeners.forEach((listener) => listener({ action, data: payload }));
        this.emitLocalMessage("Task completed in local demo mode.", "success");
        return { success: true };
      }

      const result = await this.service.completeTask(action, payload);

      if (result && result.success === false) {
        const message = result.errorMessage || "Action Center did not complete the task.";
        this.showError(message);
        return result;
      }

      this.showSuccess("Task completed.");
      return result ?? { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Task completion failed.";
      this.showError(message);
      return { success: false, errorMessage: message };
    } finally {
      this.isCompleting = false;
    }
  }

  showSuccess(message: string): void {
    this.showMessage(message, MessageSeverity.Success, "success");
  }

  showWarning(message: string): void {
    this.showMessage(message, MessageSeverity.Warning, "warning");
  }

  showError(message: string): void {
    this.showMessage(message, MessageSeverity.Error, "error");
  }

  showInfo(message: string): void {
    this.showMessage(message, MessageSeverity.Info, "info");
  }

  private async loadTaskInternal(): Promise<ActionCenterLoadResult> {
    try {
      const rawTask = await this.withTimeout(this.service.getTask(), TASK_LOAD_TIMEOUT_MS);
      const inputs = unwrapTaskData(rawTask);
      this.isLocalDemoMode = false;
      this.showInfo("Review Budget Results task loaded.");

      return {
        inputs,
        isLocalDemoMode: false,
        rawTask
      };
    } catch (error) {
      this.isLocalDemoMode = true;
      this.localInputs = cloneInputs(mockReviewBudgetResultsTask);
      console.info("[Local Demo Mode] Action Center task data unavailable; loading mock task data.", error);
      this.emitLocalMessage("Local demo mode active.", "warning");

      return {
        inputs: this.localInputs,
        isLocalDemoMode: true
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error("Action Center task data was not available before the local fallback timeout."));
      }, timeoutMs);

      promise
        .then((value) => {
          window.clearTimeout(timeout);
          resolve(value);
        })
        .catch((error) => {
          window.clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private showMessage(message: string, actionCenterSeverity: MessageSeverity, localSeverity: LocalToastMessage["severity"]): void {
    if (this.isLocalDemoMode) {
      this.emitLocalMessage(message, localSeverity);
      return;
    }

    try {
      this.service.showMessage(message, actionCenterSeverity);
    } catch (error) {
      console.warn("Action Center showMessage failed, falling back to console.", error);
      console.info(`[${localSeverity}] ${message}`);
    }
  }

  private emitLocalMessage(message: string, severity: LocalToastMessage["severity"]): void {
    const toast: LocalToastMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      severity
    };

    this.messageListeners.forEach((listener) => listener(toast));
  }
}

export const actionCenterClient = new ActionCenterClient();
