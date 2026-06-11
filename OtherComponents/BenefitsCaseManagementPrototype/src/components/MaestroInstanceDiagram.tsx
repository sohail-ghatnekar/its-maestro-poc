import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UiPath } from '@uipath/uipath-typescript';
import type {
  ProcessIncidentGetResponse,
  ProcessInstanceExecutionHistoryResponse,
} from '@uipath/uipath-typescript';
import BpmnViewer from 'bpmn-js/lib/Viewer';
import type Canvas from 'diagram-js/lib/core/Canvas';
import type ElementRegistry from 'diagram-js/lib/core/ElementRegistry';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-codes.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import {
  fetchMaestroInstanceDiagram,
} from '../services/uipathCaseManagement';
import type { LiveMaestroDiagram } from '../services/uipathCaseManagement';

type DiagramLoadState = 'idle' | 'loading' | 'ready' | 'error';
type MarkerStatus = 'completed' | 'inProgress' | 'faulted' | 'unknown';

type DiagramMarker = {
  elementId: string;
  status: MarkerStatus;
  label: string;
  source: 'Execution history' | 'Incident';
  timestamp: string | null;
  detail: string | null;
};

type LivePosition = {
  status: MarkerStatus;
  statusLabel: string;
  currentLabel: string;
  detail: string;
  matchedToBpmn: boolean;
};

type BpmnElementInfo = {
  name: string;
  type: string;
};

type InstanceStep = {
  id: string;
  name: string;
  taskType: string;
  status: MarkerStatus;
  executionId: string;
  executionLabel: string;
  elementId: string | null;
  startedAt: string | null;
  endedAt: string | null;
  durationLabel: string;
  completed: boolean;
  details: string | null;
};

type FilterOption = {
  value: string;
  label: string;
};

type MaestroInstanceDiagramProps = {
  sdk: UiPath;
  canUseUiPath: boolean;
  instanceId: string | null;
  folderKey: string;
  caseNumber: string;
  onOpenMaestro?: () => void;
};

type JsonRecord = Record<string, unknown>;

const markerClassByStatus: Record<MarkerStatus, string> = {
  completed: 'maestro-status-completed',
  inProgress: 'maestro-status-in-progress',
  faulted: 'maestro-status-faulted',
  unknown: 'maestro-status-unknown',
};

const markerLabelByStatus: Record<MarkerStatus, string> = {
  completed: 'Completed',
  inProgress: 'In progress',
  faulted: 'Faulted',
  unknown: 'Unknown',
};

const markerPillClassByStatus: Record<MarkerStatus, string> = {
  completed: 'bg-green-50 text-green-800 border-green-200',
  inProgress: 'bg-blue-50 text-blue-800 border-blue-200',
  faulted: 'bg-red-50 text-red-800 border-red-200',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200',
};

const markerPriority: Record<MarkerStatus, number> = {
  faulted: 4,
  inProgress: 3,
  completed: 2,
  unknown: 1,
};

const elementIdKeys = [
  'elementId',
  'bpmnElementId',
  'bpmnElementID',
  'flowNodeId',
  'activityId',
  'nodeId',
];

const executionIdKeys = [
  'runId',
  'executionId',
  'executionID',
  'elementRunId',
  'traceId',
  'workflowId',
  'temporalExecutionId',
];

const taskTypeKeys = [
  'taskType',
  'type',
  'activityType',
  'elementType',
  'elementExtensionType',
  'nodeType',
  'operationType',
];

const statusKeys = [
  'status',
  'state',
  'executionStatus',
  'activityStatus',
  'result',
  'outcome',
];

const liveRefreshOptions = [
  { label: 'Every 10 s', value: 10_000 },
  { label: 'Every 30 s', value: 30_000 },
  { label: 'Every 60 s', value: 60_000 },
];
const defaultLiveRefreshIntervalMs = 60_000;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readStringField(source: unknown, keys: string[]): string | null {
  if (!isRecord(source)) {
    return null;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function parseJsonRecord(value: unknown): JsonRecord | null {
  if (isRecord(value)) {
    return value;
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'The Maestro BPMN could not be loaded.';
}

function normalizeStatus(value: string): MarkerStatus | null {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, '');

  if (['completed', 'complete', 'success', 'succeeded', 'done'].some((item) => normalized.includes(item))) {
    return 'completed';
  }

  if (['running', 'inprogress', 'active', 'executing', 'pending', 'resuming', 'started'].some((item) => normalized.includes(item))) {
    return 'inProgress';
  }

  if (['faulted', 'failed', 'failure', 'error', 'exception'].some((item) => normalized.includes(item))) {
    return 'faulted';
  }

  if (['cancelled', 'canceled', 'unknown', 'skipped', 'terminated'].some((item) => normalized.includes(item))) {
    return 'unknown';
  }

  return null;
}

function getHistoryAttributes(historyItem: ProcessInstanceExecutionHistoryResponse): JsonRecord | null {
  const rawHistory = historyItem as unknown as JsonRecord;
  return parseJsonRecord(rawHistory.attributes);
}

function getHistoryElementId(historyItem: ProcessInstanceExecutionHistoryResponse): string | null {
  const rawHistory = historyItem as unknown as JsonRecord;
  const attributes = getHistoryAttributes(historyItem);

  return readStringField(rawHistory, elementIdKeys)
    || readStringField(attributes, elementIdKeys);
}

function getHistoryExecutionId(historyItem: ProcessInstanceExecutionHistoryResponse): string {
  const rawHistory = historyItem as unknown as JsonRecord;
  const attributes = getHistoryAttributes(historyItem);

  return readStringField(rawHistory, executionIdKeys)
    || readStringField(attributes, executionIdKeys)
    || historyItem.traceId
    || 'unassigned';
}

function formatElementType(value: string): string {
  return value
    .replace(/^bpmn:/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (letter) => letter.toUpperCase());
}

function parseBpmnElementInfo(bpmnXml: string): Map<string, BpmnElementInfo> {
  const elementInfo = new Map<string, BpmnElementInfo>();
  const xml = new DOMParser().parseFromString(bpmnXml, 'application/xml');

  Array.from(xml.querySelectorAll('[id]')).forEach((element) => {
    const namespace = element.namespaceURI || '';
    const isBpmnElement = element.prefix === 'bpmn' || namespace.includes('/BPMN/20100524/MODEL');

    if (!isBpmnElement) {
      return;
    }

    const elementId = element.getAttribute('id');

    if (!elementId) {
      return;
    }

    const name = element.getAttribute('name') || elementId;

    elementInfo.set(elementId, {
      name,
      type: formatElementType(element.localName),
    });
  });

  return elementInfo;
}

function getHistoryTaskType(
  historyItem: ProcessInstanceExecutionHistoryResponse,
  elementInfo: Map<string, BpmnElementInfo>,
): string {
  const rawHistory = historyItem as unknown as JsonRecord;
  const attributes = getHistoryAttributes(historyItem);
  const explicitType = readStringField(rawHistory, taskTypeKeys)
    || readStringField(attributes, taskTypeKeys);
  const elementId = getHistoryElementId(historyItem);
  const bpmnType = elementId ? elementInfo.get(elementId)?.type : null;

  return formatElementType(explicitType || bpmnType || 'Runtime event');
}

function getHistoryStatus(historyItem: ProcessInstanceExecutionHistoryResponse): MarkerStatus | null {
  const rawHistory = historyItem as unknown as JsonRecord;
  const attributes = getHistoryAttributes(historyItem);
  const explicitStatus = readStringField(rawHistory, statusKeys)
    || readStringField(attributes, statusKeys);

  if (explicitStatus) {
    return normalizeStatus(explicitStatus);
  }

  if (historyItem.endTime) {
    return 'completed';
  }

  if (historyItem.startedTime) {
    return 'inProgress';
  }

  return null;
}

function shouldReplaceMarker(current: DiagramMarker | undefined, next: DiagramMarker): boolean {
  return !current || markerPriority[next.status] > markerPriority[current.status];
}

function getMatchedElementId(elementId: string | null, elementRegistry: ElementRegistry): string | null {
  if (!elementId) {
    return null;
  }

  return elementRegistry.get(elementId) ? elementId : null;
}

function buildExecutionHistoryMarker(
  historyItem: ProcessInstanceExecutionHistoryResponse,
  elementRegistry: ElementRegistry,
): DiagramMarker | null {
  const elementId = getMatchedElementId(getHistoryElementId(historyItem), elementRegistry);
  const status = elementId ? getHistoryStatus(historyItem) : null;

  if (!elementId || !status) {
    return null;
  }

  return {
    elementId,
    status,
    label: historyItem.name || elementId,
    source: 'Execution history',
    timestamp: historyItem.endTime || historyItem.updatedTime || historyItem.startedTime || historyItem.createdTime || null,
    detail: null,
  };
}

function buildIncidentMarker(
  incident: ProcessIncidentGetResponse,
  elementRegistry: ElementRegistry,
): DiagramMarker | null {
  const elementId = getMatchedElementId(incident.elementId, elementRegistry);

  if (!elementId) {
    return null;
  }

  return {
    elementId,
    status: 'faulted',
    label: incident.incidentElementActivityName || elementId,
    source: 'Incident',
    timestamp: incident.errorTime || null,
    detail: incident.errorMessage || incident.errorCode || null,
  };
}

function buildDiagramMarkers(diagram: LiveMaestroDiagram, elementRegistry: ElementRegistry): DiagramMarker[] {
  const markersByElement = new Map<string, DiagramMarker>();

  for (const historyItem of diagram.executionHistory) {
    const marker = buildExecutionHistoryMarker(historyItem, elementRegistry);
    const currentMarker = marker ? markersByElement.get(marker.elementId) : undefined;

    if (marker && shouldReplaceMarker(currentMarker, marker)) {
      markersByElement.set(marker.elementId, marker);
    }
  }

  for (const incident of diagram.incidents) {
    const marker = buildIncidentMarker(incident, elementRegistry);
    const currentMarker = marker ? markersByElement.get(marker.elementId) : undefined;

    if (marker && shouldReplaceMarker(currentMarker, marker)) {
      markersByElement.set(marker.elementId, marker);
    }
  }

  return Array.from(markersByElement.values())
    .sort((left, right) => markerPriority[right.status] - markerPriority[left.status]);
}

function applyDiagramMarkers(canvas: Canvas, markers: DiagramMarker[]) {
  markers.forEach((marker) => {
    canvas.addMarker(marker.elementId, markerClassByStatus[marker.status]);
  });
}

function removeDiagramMarkers(canvas: Canvas, markers: DiagramMarker[]) {
  markers.forEach((marker) => {
    canvas.removeMarker(marker.elementId, markerClassByStatus[marker.status]);
  });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return 'No timestamp';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US');
}

function getRuntimeTimestamp(historyItem: ProcessInstanceExecutionHistoryResponse): number {
  const rawHistory = historyItem as unknown as JsonRecord;
  const candidate = historyItem.endTime
    || historyItem.updatedTime
    || historyItem.startedTime
    || historyItem.createdTime
    || (typeof rawHistory.startTime === 'string' ? rawHistory.startTime : null);

  if (!candidate) {
    return 0;
  }

  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatShortId(value: string): string {
  if (value === 'unassigned') {
    return 'Unassigned execution';
  }

  return value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) {
    return 'Not started';
  }

  const start = Date.parse(startedAt);
  const end = endedAt ? Date.parse(endedAt) : Date.now();

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return endedAt ? 'Completed' : 'In progress';
  }

  const totalSeconds = Math.round((end - start) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function buildInstanceSteps(diagram: LiveMaestroDiagram | null): InstanceStep[] {
  if (!diagram) {
    return [];
  }

  const elementInfo = parseBpmnElementInfo(diagram.bpmnXml);

  return diagram.executionHistory
    .map((historyItem) => {
      const elementId = getHistoryElementId(historyItem);
      const taskType = getHistoryTaskType(historyItem, elementInfo);
      const executionId = getHistoryExecutionId(historyItem);
      const bpmnElement = elementId ? elementInfo.get(elementId) : null;
      const status = getHistoryStatus(historyItem) || 'unknown';
      const startedAt = historyItem.startedTime || historyItem.createdTime || null;
      const endedAt = historyItem.endTime || null;

      return {
        id: historyItem.id || `${executionId}-${historyItem.name}-${startedAt || historyItem.createdTime}`,
        name: historyItem.name || bpmnElement?.name || elementId || 'Runtime event',
        taskType,
        status,
        executionId,
        executionLabel: formatShortId(executionId),
        elementId,
        startedAt,
        endedAt,
        durationLabel: formatDuration(startedAt, endedAt),
        completed: Boolean(endedAt),
        details: elementId
          ? `BPMN element ${elementId}`
          : 'No BPMN element ID returned',
      };
    })
    .sort((left, right) => {
      const leftTime = left.endedAt || left.startedAt || '';
      const rightTime = right.endedAt || right.startedAt || '';
      return Date.parse(rightTime) - Date.parse(leftTime);
    });
}

function uniqueFilterOptions(values: Array<{ value: string; label: string }>): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];

  values.forEach((item) => {
    if (seen.has(item.value)) {
      return;
    }

    seen.add(item.value);
    options.push(item);
  });

  return options;
}

function getLatestHistoryItems(history: ProcessInstanceExecutionHistoryResponse[], limit: number) {
  return history
    .slice()
    .sort((left, right) => getRuntimeTimestamp(right) - getRuntimeTimestamp(left))
    .slice(0, limit);
}

function getRunStatus(status: string | undefined | null): MarkerStatus {
  return status ? normalizeStatus(status) || 'unknown' : 'unknown';
}

function buildLivePosition(
  diagram: LiveMaestroDiagram | null,
  markers: DiagramMarker[],
): LivePosition {
  const statusLabel = diagram?.instance?.latestRunStatus || 'Unknown';
  const runStatus = getRunStatus(statusLabel);
  const faultedMarker = markers.find((marker) => marker.status === 'faulted');
  const activeMarker = markers.find((marker) => marker.status === 'inProgress');
  const latestMarker = activeMarker || faultedMarker || markers[0];
  const latestHistory = diagram ? getLatestHistoryItems(diagram.executionHistory, 1)[0] : null;

  if (latestMarker) {
    const verb = latestMarker.status === 'faulted'
      ? 'Faulted at'
      : latestMarker.status === 'completed'
        ? 'Last completed'
        : latestMarker.status === 'inProgress'
          ? 'Currently at'
          : 'Last matched';

    return {
      status: latestMarker.status === 'faulted' ? 'faulted' : runStatus,
      statusLabel,
      currentLabel: `${verb} ${latestMarker.label}`,
      detail: `Matched BPMN element ${latestMarker.elementId}.`,
      matchedToBpmn: true,
    };
  }

  if (latestHistory?.name) {
    return {
      status: runStatus,
      statusLabel,
      currentLabel: `Last observed ${latestHistory.name}`,
      detail: 'Runtime history did not include a BPMN element ID that could be matched to this diagram.',
      matchedToBpmn: false,
    };
  }

  return {
    status: runStatus,
    statusLabel,
    currentLabel: 'Waiting for runtime activity',
    detail: 'No execution events have been returned yet for this instance.',
    matchedToBpmn: false,
  };
}

function EmptyState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center bg-gray-50 px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500">
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4.5 12a7.5 7.5 0 0 1 15 0v4.5A1.5 1.5 0 0 1 18 18H6a1.5 1.5 0 0 1-1.5-1.5V12Z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M8.25 12h7.5M9 8.25h6" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-lg text-sm text-gray-600">{message}</p>
    </div>
  );
}

export function MaestroInstanceDiagram({
  sdk,
  canUseUiPath,
  instanceId,
  folderKey,
  caseNumber,
  onOpenMaestro,
}: MaestroInstanceDiagramProps) {
  const [containerElement, setContainerElement] = useState<HTMLDivElement | null>(null);
  const [loadState, setLoadState] = useState<DiagramLoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagram, setDiagram] = useState<LiveMaestroDiagram | null>(null);
  const [markers, setMarkers] = useState<DiagramMarker[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [executionFilter, setExecutionFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [liveRefreshIntervalMs, setLiveRefreshIntervalMs] = useState(defaultLiveRefreshIntervalMs);
  const [refreshToken, setRefreshToken] = useState(0);
  const canLoadDiagram = canUseUiPath && Boolean(instanceId);
  const livePosition = useMemo(() => buildLivePosition(diagram, markers), [diagram, markers]);
  const instanceSteps = useMemo(() => buildInstanceSteps(diagram), [diagram]);
  const executionOptions = useMemo(() => uniqueFilterOptions(
    instanceSteps.map((step) => ({
      value: step.executionId,
      label: step.executionLabel,
    })),
  ), [instanceSteps]);
  const taskTypeOptions = useMemo(() => uniqueFilterOptions(
    instanceSteps.map((step) => ({
      value: step.taskType,
      label: step.taskType,
    })).sort((left, right) => left.label.localeCompare(right.label)),
  ), [instanceSteps]);
  const filteredInstanceSteps = useMemo(() => instanceSteps.filter((step) => {
    const matchesExecution = executionFilter === 'all' || step.executionId === executionFilter;
    const matchesTaskType = taskTypeFilter === 'all' || step.taskType === taskTypeFilter;

    return matchesExecution && matchesTaskType;
  }), [executionFilter, instanceSteps, taskTypeFilter]);

  const refreshDiagram = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (executionFilter !== 'all' && !executionOptions.some((option) => option.value === executionFilter)) {
      setExecutionFilter('all');
    }

    if (taskTypeFilter !== 'all' && !taskTypeOptions.some((option) => option.value === taskTypeFilter)) {
      setTaskTypeFilter('all');
    }
  }, [executionFilter, executionOptions, taskTypeFilter, taskTypeOptions]);

  useEffect(() => {
    if (!canLoadDiagram || !instanceId || !containerElement) {
      setLoadState('idle');
      setErrorMessage(null);
      setDiagram(null);
      setMarkers([]);
      setIsRefreshing(false);
      setLastUpdatedAt(null);
      setExecutionFilter('all');
      setTaskTypeFilter('all');
      return undefined;
    }

    let isActive = true;
    let isLoadInFlight = false;
    let currentBpmnXml: string | null = null;
    let currentMarkers: DiagramMarker[] = [];
    const viewer = new BpmnViewer({
      container: containerElement,
    });

    const loadDiagram = async (isInitialLoad: boolean) => {
      if (isLoadInFlight) {
        return;
      }

      isLoadInFlight = true;

      if (isInitialLoad) {
        setLoadState('loading');
        setMarkers([]);
      } else {
        setIsRefreshing(true);
      }

      setErrorMessage(null);

      try {
        const nextDiagram = await fetchMaestroInstanceDiagram(sdk, instanceId, folderKey);

        if (!isActive) {
          return;
        }

        const shouldImportBpmn = currentBpmnXml !== nextDiagram.bpmnXml;

        if (shouldImportBpmn) {
          await viewer.importXML(nextDiagram.bpmnXml);
          currentBpmnXml = nextDiagram.bpmnXml;
        }

        if (!isActive) {
          return;
        }

        const canvas = viewer.get<Canvas>('canvas');
        const elementRegistry = viewer.get<ElementRegistry>('elementRegistry');
        const nextMarkers = buildDiagramMarkers(nextDiagram, elementRegistry);

        removeDiagramMarkers(canvas, currentMarkers);
        if (shouldImportBpmn) {
          canvas.zoom('fit-viewport');
        }
        applyDiagramMarkers(canvas, nextMarkers);
        currentMarkers = nextMarkers;
        setDiagram(nextDiagram);
        setMarkers(nextMarkers);
        setLastUpdatedAt(new Date().toISOString());
        setLoadState('ready');
      } catch (error) {
        if (!isActive) {
          return;
        }

        setErrorMessage(getErrorMessage(error));
        if (isInitialLoad) {
          setDiagram(null);
          setMarkers([]);
          setLastUpdatedAt(null);
          setLoadState('error');
        }
      } finally {
        isLoadInFlight = false;

        if (isActive) {
          setIsRefreshing(false);
        }
      }
    };

    void loadDiagram(true);
    const intervalId = window.setInterval(() => {
      void loadDiagram(false);
    }, liveRefreshIntervalMs);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      viewer.destroy();
    };
  }, [canLoadDiagram, containerElement, folderKey, instanceId, liveRefreshIntervalMs, refreshToken, sdk]);

  return (
    <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">Maestro Instance Flow</h2>
          <p className="mt-1 break-words text-sm text-gray-600">
            {caseNumber}
            {instanceId ? ` - Instance ${instanceId}` : ' - No linked Maestro instance'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onOpenMaestro && (
            <button
              type="button"
              onClick={onOpenMaestro}
              disabled={!instanceId}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Open Maestro
            </button>
          )}
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <span className="sr-only">Live update interval</span>
            <select
              value={liveRefreshIntervalMs}
              onChange={(event) => setLiveRefreshIntervalMs(Number(event.target.value))}
              disabled={!canLoadDiagram}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Live update interval"
            >
              {liveRefreshOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={refreshDiagram}
            disabled={!canLoadDiagram || loadState === 'loading'}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loadState === 'loading' || isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v6h6M20 20v-6h-6M5.5 14A7 7 0 0 0 17 18.5M18.5 10A7 7 0 0 0 7 5.5" />
            </svg>
            {isRefreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {!canUseUiPath && (
        <EmptyState
          title="UiPath sign-in required"
          message="Sign in to UiPath to load the exact Maestro BPMN for this application."
        />
      )}

      {canUseUiPath && !instanceId && (
        <EmptyState
          title="No Maestro instance linked"
          message="The selected application does not have a Maestro process instance ID in the current record."
        />
      )}

      {canLoadDiagram && (
        <>
          <div className="border-b border-gray-200 bg-white px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${markerPillClassByStatus[livePosition.status]}`}>
                    {livePosition.statusLabel}
                  </span>
                  <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
                    Live update every {Math.round(liveRefreshIntervalMs / 1000)}s
                  </span>
                  {livePosition.matchedToBpmn && (
                    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                      Matched to diagram
                    </span>
                  )}
                </div>
                <p className="mt-2 text-base font-semibold text-gray-900">{livePosition.currentLabel}</p>
                <p className="mt-1 text-sm text-gray-600">{livePosition.detail}</p>
                {errorMessage && loadState === 'ready' && (
                  <p className="mt-2 text-sm text-red-700">Latest live update failed: {errorMessage}</p>
                )}
              </div>
              <div className="text-sm text-gray-600 lg:text-right">
                <p className="font-medium text-gray-900">
                  {isRefreshing ? 'Updating now' : 'Live data current'}
                </p>
                <p className="mt-1">Last refresh: {formatDateTime(lastUpdatedAt)}</p>
              </div>
            </div>
          </div>

          <div className="relative h-[38rem] min-h-[30rem] bg-gray-50">
            <div
              ref={setContainerElement}
              className="maestro-bpmn-viewer h-full w-full"
              aria-label="Maestro BPMN flow diagram"
            />

            {loadState === 'loading' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80" aria-live="polite">
                <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm">
                  Loading Maestro flow...
                </div>
              </div>
            )}

            {loadState === 'error' && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/90 px-6" aria-live="assertive">
                <div className="max-w-xl rounded-lg border border-red-200 bg-red-50 p-5 text-center">
                  <h3 className="text-base font-semibold text-red-900">BPMN could not be loaded</h3>
                  <p className="mt-2 text-sm text-red-800">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={refreshDiagram}
                    className="mt-4 inline-flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-800 shadow-sm transition-colors hover:bg-red-100"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white px-5 py-4">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Folder Key</p>
                <p className="mt-1 break-words font-medium text-gray-900">{folderKey}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Execution Events</p>
                <p className="mt-1 font-medium text-gray-900">{diagram?.executionHistory.length ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Incidents</p>
                <p className="mt-1 font-medium text-gray-900">{diagram?.incidents.length ?? 0}</p>
              </div>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              {markers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {markers.slice(0, 12).map((marker) => (
                    <span
                      key={`${marker.elementId}-${marker.status}`}
                      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${markerPillClassByStatus[marker.status]}`}
                      title={[marker.source, marker.elementId, marker.detail].filter(Boolean).join(' - ')}
                    >
                      <span>{markerLabelByStatus[marker.status]}</span>
                      <span className="truncate">{marker.label}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  No reliable BPMN element status mapping was returned. The exact flow diagram is shown without status coloring.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Instance Step Information</p>
                  <p className="mt-1 text-sm text-gray-600">
                    Showing {filteredInstanceSteps.length} of {instanceSteps.length} returned execution steps.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">Execution</span>
                    <select
                      value={executionFilter}
                      onChange={(event) => setExecutionFilter(event.target.value)}
                      className="mt-1 block w-full min-w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All executions</option>
                      {executionOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-gray-600">Task type</span>
                    <select
                      value={taskTypeFilter}
                      onChange={(event) => setTaskTypeFilter(event.target.value)}
                      className="mt-1 block w-full min-w-48 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="all">All task types</option>
                      {taskTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {filteredInstanceSteps.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
                  <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.7fr)_minmax(8rem,0.7fr)_minmax(7rem,0.5fr)_minmax(9rem,0.7fr)] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500 lg:grid">
                    <span>Step</span>
                    <span>Task Type</span>
                    <span>Execution</span>
                    <span>Status</span>
                    <span>Completed</span>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {filteredInstanceSteps.map((step) => (
                      <div
                        key={step.id}
                        className="grid grid-cols-1 gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1.4fr)_minmax(8rem,0.7fr)_minmax(8rem,0.7fr)_minmax(7rem,0.5fr)_minmax(9rem,0.7fr)] lg:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{step.name}</p>
                          <p className="mt-1 text-xs text-gray-500">{step.details}</p>
                          <p className="mt-1 text-xs text-gray-500 lg:hidden">
                            {step.taskType} - Execution {step.executionLabel}
                          </p>
                        </div>
                        <div className="text-gray-700">{step.taskType}</div>
                        <div className="break-all text-gray-700" title={step.executionId}>{step.executionLabel}</div>
                        <div>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${markerPillClassByStatus[step.status]}`}>
                            {markerLabelByStatus[step.status]}
                          </span>
                        </div>
                        <div className="text-gray-700">
                          <p className="font-medium">{step.completed ? 'Yes' : 'No'}</p>
                          <p className="mt-1 text-xs text-gray-500">{step.completed ? formatDateTime(step.endedAt) : `Running ${step.durationLabel}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                  No instance steps match the selected filters.
                </div>
              )}
            </div>

            {diagram?.incidents.length ? (
              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Latest Incidents</p>
                <div className="mt-2 space-y-2">
                  {diagram.incidents.slice(0, 3).map((incident) => (
                    <div key={incident.incidentId} className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-red-900">
                          {incident.incidentElementActivityName || incident.elementId}
                        </p>
                        <p className="text-xs text-red-700">{formatDateTime(incident.errorTime)}</p>
                      </div>
                      <p className="mt-1 text-red-800">{incident.errorMessage || incident.errorCode}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}
