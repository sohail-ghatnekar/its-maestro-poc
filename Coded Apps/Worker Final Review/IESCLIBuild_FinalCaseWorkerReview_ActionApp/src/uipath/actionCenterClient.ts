import { CodedActionAppService, MessageSeverity } from '@uipath/coded-action-app';
import { mockFinalReviewTask } from '../data/mockFinalReviewTask';
import { composeTaskDataFromActionInput } from '../utils/taskDataComposer';
import type {
  ActionCenterLoadResult,
  FinalAction,
  FinalReviewTaskData,
  LocalToastMessage,
} from '../types/finalReviewTypes';

type CompletionListener = (payload: { action: FinalAction; data: unknown }) => void;
type MessageListener = (message: LocalToastMessage) => void;

type SdkTaskEnvelope = {
  data?: unknown;
  [key: string]: unknown;
};

type TaskCompleteResponse = {
  success?: boolean;
  errorMessage?: string;
};

const TASK_LOAD_TIMEOUT_MS = 1800;

function cloneTaskData(data: FinalReviewTaskData): FinalReviewTaskData {
  if (typeof structuredClone === 'function') {
    return structuredClone(data);
  }

  return JSON.parse(JSON.stringify(data)) as FinalReviewTaskData;
}

function unwrapTaskData(rawTask: unknown): FinalReviewTaskData {
  const envelope = rawTask as SdkTaskEnvelope;
  const taskData = composeTaskDataFromActionInput(envelope.data) ?? composeTaskDataFromActionInput(rawTask);

  if (!taskData) {
    throw new Error('Action Center task payload does not match the final review input contract.');
  }

  return cloneTaskData(taskData);
}

class ActionCenterClient {
  private readonly service = new CodedActionAppService();
  private loadTaskPromise: Promise<ActionCenterLoadResult> | null = null;
  private isCompleting = false;
  private isLocalDemoMode = false;
  private localTaskData = cloneTaskData(mockFinalReviewTask);
  private lastLocalDraftToastAt = 0;
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

  async updateTaskData(data: FinalReviewTaskData): Promise<void> {
    if (this.isLocalDemoMode) {
      this.localTaskData = cloneTaskData(data);
      console.info('[Local Demo Mode] setTaskData', this.localTaskData);
      if (Date.now() - this.lastLocalDraftToastAt > 4000) {
        this.lastLocalDraftToastAt = Date.now();
        this.emitLocalMessage('Draft data updated locally.', 'info');
      }
      return;
    }

    try {
      await this.service.setTaskData(data);
    } catch (error) {
      console.error('setTaskData failed', error);
      this.showError('Unable to save draft changes to Action Center.');
    }
  }

  async completeTask(action: FinalAction, data: unknown): Promise<TaskCompleteResponse> {
    if (this.isCompleting) {
      const message = 'Task completion is already in progress.';
      this.showWarning(message);
      return { success: false, errorMessage: message };
    }

    this.isCompleting = true;

    try {
      if (this.isLocalDemoMode) {
        console.info('[Local Demo Mode] completeTask', { action, data });
        this.completionListeners.forEach((listener) => listener({ action, data }));
        this.emitLocalMessage('Task completed in local demo mode.', 'success');
        return { success: true };
      }

      const result = (await this.service.completeTask(action, data)) as TaskCompleteResponse;

      if (result && result.success === false) {
        const message = result.errorMessage || 'Action Center did not complete the task.';
        this.showError(message);
        return result;
      }

      this.showSuccess('Task completed.');
      return result ?? { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Task completion failed.';
      this.showError(message);
      return { success: false, errorMessage: message };
    } finally {
      this.isCompleting = false;
    }
  }

  showSuccess(message: string): void {
    this.showMessage(message, MessageSeverity.Success, 'success');
  }

  showWarning(message: string): void {
    this.showMessage(message, MessageSeverity.Warning, 'warning');
  }

  showError(message: string): void {
    this.showMessage(message, MessageSeverity.Error, 'error');
  }

  showInfo(message: string): void {
    this.showMessage(message, MessageSeverity.Info, 'info');
  }

  private async loadTaskInternal(): Promise<ActionCenterLoadResult> {
    try {
      const rawTask = await this.withTimeout(this.service.getTask(), TASK_LOAD_TIMEOUT_MS);
      const taskData = unwrapTaskData(rawTask);
      this.isLocalDemoMode = false;
      this.showInfo('Task loaded.');

      return {
        taskData,
        isLocalDemoMode: false,
        rawTask,
      };
    } catch (error) {
      this.isLocalDemoMode = true;
      this.localTaskData = cloneTaskData(mockFinalReviewTask);
      console.info('[Local Demo Mode] Action Center unavailable, loading mock task data.', error);
      this.emitLocalMessage('Local demo mode active.', 'warning');

      return {
        taskData: this.localTaskData,
        isLocalDemoMode: true,
      };
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        reject(new Error('Action Center task data was not available before the local fallback timeout.'));
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

  private showMessage(message: string, actionCenterSeverity: MessageSeverity, localSeverity: LocalToastMessage['severity']): void {
    if (this.isLocalDemoMode) {
      this.emitLocalMessage(message, localSeverity);
      return;
    }

    try {
      this.service.showMessage(message, actionCenterSeverity);
    } catch (error) {
      console.warn('Action Center showMessage failed, falling back to console.', error);
      console.info(`[${localSeverity}] ${message}`);
    }
  }

  private emitLocalMessage(message: string, severity: LocalToastMessage['severity']): void {
    const toast: LocalToastMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      message,
      severity,
    };

    this.messageListeners.forEach((listener) => listener(toast));
  }
}

export const actionCenterClient = new ActionCenterClient();
