import type { UiPathSDKConfig } from '@uipath/uipath-typescript';

export type UiPathDefaults = {
  clientId?: string;
  orgName?: string;
  tenantName?: string;
  baseUrl?: string;
  portalBaseUrl?: string;
  redirectUri?: string;
  scope?: string;
};

declare const __UIPATH_DEFAULTS__: UiPathDefaults;

const runtimeDefaults: UiPathDefaults =
  typeof __UIPATH_DEFAULTS__ === 'undefined' ? {} : __UIPATH_DEFAULTS__;

export const UIPATH_SCOPES = [
  'OR.Execution',
  'OR.Execution.Read',
  'OR.Jobs',
  'OR.Tasks',
  'PIMS',
  'DataFabric.Schema.Read',
  'DataFabric.Data.Read',
  'DataFabric.Data.Write',
  'OR.Administration.Read',
  'OR.Folders.Read',
].join(' ');

export type LiveActionAppTab =
  | 'Summary'
  | 'Interview / Missing Info'
  | 'Documents'
  | 'Clearance'
  | 'External Validation'
  | 'Budget';

export type ActionAppDefinition = {
  id: string;
  appId: string;
  name: string;
  appName: string;
  process: string;
  lane: string;
  tab: LiveActionAppTab;
  editUrl: string;
  keywords: string[];
};

export const IES_WORKFLOW_CONFIG = {
  appName: 'ies-maestro-poc',
  orgName: 'itsmaestropoc',
  tenantName: 'IES',
  orgId: '8bd44258-7207-432b-8222-2b5313027bd7',
  tenantId: '9bba8602-b19d-49c6-a843-df81b184f363',
  baseUrl: 'https://api.uipath.com',
  portalBaseUrl: 'https://cloud.uipath.com',
  deployedAppUrl: 'https://itsmaestropoc.uipath.host/ies-maestro-poc',
  orchestratorFolderId: 426806,
  orchestratorFolderName: 'IES Maestro/IES - Maestro POC',
  applicationPdfBucket: {
    bucketId: 3595,
    folderId: 423686,
    folderName: 'IES Maestro',
    fileName: 'Fake_SNAP_App_Completed.pdf',
    path: 'Fake_SNAP_App_Completed.pdf',
    staticReadUrl: '',
    browseUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/buckets/3595/browse?tid=113337&fid=423686',
    readUriExpiryInMinutes: 10,
  },
  documentEvidenceBucket: {
    bucketId: 3596,
    folderId: 423686,
    folderName: 'IES Maestro',
    browseUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/buckets/3596/browse?tid=113337&fid=423686',
    readUriExpiryInMinutes: 10,
    documents: [
      {
        id: 'drivers-license',
        fileName: 'fake-license.jpg',
        path: '/fake-license.jpg',
        staticReadUrl: '',
        mimeType: 'image/jpeg',
      },
      {
        id: 'paystub',
        fileName: 'Michael_Motorist_Pay_Stub_SAMPLE.pdf',
        path: '/Michael_Motorist_Pay_Stub_SAMPLE.pdf',
        staticReadUrl: '',
        mimeType: 'application/pdf',
      },
      {
        id: 'proof-of-residency',
        fileName: 'Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
        path: '/Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
        staticReadUrl: '',
        mimeType: 'application/pdf',
      },
    ],
  },
  deploymentFolderKey: 'ea6104f1-dc94-4d8d-a169-2a2990165bb4',
  maestroProcessKey: 'ef3e477e-dadf-434a-a034-0633dcf13a09',
  maestroFolderKey: 'ea6104f1-dc94-4d8d-a169-2a2990165bb4',
  dataFabricEntityId: 'e2a63ed3-4e6b-f111-ac9a-7c1e5201b318',
  assignmentDataFabric: {
    taskAssignment: {
      entityId: 'c493eb17-556b-f111-ac9a-7c1e5201b318',
      entityUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/datafabric_/entities/c493eb17-556b-f111-ac9a-7c1e5201b318',
      fields: ['User', 'TaskId', 'MaestroProcessId'],
    },
    workerPto: {
      entityId: '391a0236-556b-f111-ac9a-7c1e5201b318',
      entityUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/datafabric_/entities/391a0236-556b-f111-ac9a-7c1e5201b318',
      fields: ['User', 'StartDate', 'EndDate'],
    },
  },
  assignmentProcesses: {
    workerPto: {
      releaseId: 100635,
      processName: 'Worker PTO',
      editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/processes/100635/edit?tid=113337&fid=426806',
      startUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/processes/100635/jobs/start?tid=113337&fid=426806',
      inputFields: ['endDate_In', 'startDate_In', 'workerEmail_In', 'recordID_In'],
    },
    taskAssignment: {
      releaseId: 100648,
      processName: 'Task Assignment',
      editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/processes/100648/edit?tid=113337&fid=426806',
      startUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/processes/100648/jobs/start?tid=113337&fid=426806',
      inputFields: ['user', 'taskId'],
    },
  },
  dataFabricConnectionId: readValue(
    import.meta.env.VITE_UIPATH_DATA_FABRIC_CONNECTION_ID,
  ),
  dataFabricConnectionFallbackEnabled:
    import.meta.env.VITE_UIPATH_ENABLE_CONNECTION_FALLBACK === 'true',
  dataFabricConnectionName: 'IES DF Connection',
  dataFabricConnectionFolderKey: 'ea6104f1-dc94-4d8d-a169-2a2990165bb4',
  dataFabricConnectorKey: 'uipath-uipath-dataservice',
  dataFabricResourceName: readValue(
    import.meta.env.VITE_UIPATH_DATA_FABRIC_RESOURCE_NAME,
    'IESCaseManagement',
  ),
  defaultApplicantEmail: 'sohail.ghatnekar@uipath.com',
};

export const ACTION_APP_DEFINITIONS: ActionAppDefinition[] = [
  {
    id: 'cp1-3-conduct-interview',
    appId: 'IDd3fa709a69a142678597c1deee137f79',
    name: 'CP1.3 Conduct interview / collect missing facts',
    appName: 'CP1 Interview',
    process: 'CP1 Interview',
    lane: 'Case Worker',
    tab: 'Interview / Missing Info',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/27887b64-1820-4656-8e2b-7a52bc5b1391/edit?tid=113337&fid=426806',
    keywords: [
      'cp1.3',
      'conduct interview',
      'collect missing facts',
      'interview collect',
      'missing facts',
      'interview',
      'interview and missing info',
      'TASK-INT',
      'CP1_Conduct',
    ],
  },
  {
    id: 'cp1-6-complete-interview',
    appId: 'IDd3fa709a69a142678597c1deee137f79',
    name: 'CP1.6 Complete interview',
    appName: 'CP1 Interview',
    process: 'CP1 Interview',
    lane: 'Case Worker',
    tab: 'Interview / Missing Info',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/27887b64-1820-4656-8e2b-7a52bc5b1391/edit?tid=113337&fid=426806',
    keywords: ['cp1.6', 'complete interview', 'interview complete', 'CP1_Complete'],
  },
  {
    id: 'cp2-4-review-low-confidence-document',
    appId: 'IDe9d4ff23b8274f03840e614210b1b2ad',
    name: 'CP2.4 Review low-confidence document',
    appName: 'Documents Review',
    process: 'CP2 Document Verification',
    lane: 'Case Worker',
    tab: 'Documents',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/1739c2bc-4f98-4815-b401-a949bf6ed225/edit?tid=113337&fid=426806',
    keywords: ['cp2.4', 'review low-confidence document', 'low confidence document', 'low-confidence document'],
  },
  {
    id: 'cp2-5-mark-document-verified',
    appId: 'IDe9d4ff23b8274f03840e614210b1b2ad',
    name: 'CP2.5 Mark document verified',
    appName: 'Documents Review',
    process: 'CP2 Document Verification',
    lane: 'Case Worker',
    tab: 'Documents',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/1739c2bc-4f98-4815-b401-a949bf6ed225/edit?tid=113337&fid=426806',
    keywords: [
      'cp2.5',
      'mark document verified',
      'document verified',
      'verified document',
      'approve and verify documents',
      'appove and verify documents',
      'CP2_Verify',
    ],
  },
  {
    id: 'cp3-5-assign-request-new-cin',
    appId: 'ID6f924930b9f64354b8df105c1564a461',
    name: 'CP3.5 Assign / request new CIN',
    appName: 'CP3 CIN Matching Override',
    process: 'CP3 CIN Matching',
    lane: 'Case Worker',
    tab: 'Clearance',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/2bb8ea92-bbd4-4fd2-8623-dbab4da19666/edit?tid=113337&fid=426806',
    keywords: ['cp3.5', 'assign request new cin', 'assign/request new cin', 'request new cin', 'assign new cin'],
  },
  {
    id: 'cp3-6-capture-override-reason',
    appId: 'ID6f924930b9f64354b8df105c1564a461',
    name: 'CP3.6 Capture override reason',
    appName: 'CP3 CIN Matching Override',
    process: 'CP3 CIN Matching',
    lane: 'Case Worker',
    tab: 'Clearance',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/2bb8ea92-bbd4-4fd2-8623-dbab4da19666/edit?tid=113337&fid=426806',
    keywords: [
      'cp3.6',
      'capture override reason',
      'override reason',
      'override',
      'cin override',
      'CP3_OverrideReason',
    ],
  },
  {
    id: 'cp4-5-review-discrepancy',
    appId: 'ID111ccc4f867547bfbaa3a04986702965',
    name: 'CP4.5 Review discrepancy',
    appName: 'CP4 External Validation Review',
    process: 'CP4 External Validation',
    lane: 'Case Worker',
    tab: 'External Validation',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/651382c0-6edf-45eb-a996-948e624167c2/edit?tid=113337&fid=426806',
    keywords: [
      'cp4.5',
      'review discrepancy',
      'validation discrepancy',
      'external validation discrepancy',
      'external validation bundle',
      'TASK-VAL',
      'CP4_Review',
    ],
  },
  {
    id: 'main-review-budget-results',
    appId: 'ID8e630343b9714fa785dbd0af33c5571f',
    name: 'Review Budget Task',
    appName: 'Budget Review',
    process: 'IES Main BPMN',
    lane: 'Case Worker',
    tab: 'Budget',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/80c85461-55a1-44ae-822f-72980c0b1c16/edit?tid=113337&fid=426806',
    keywords: [
      'review budget task',
      'review budget',
      'review budget results',
      'budget task',
      'budget review task',
      'budget review',
      'eligibility calculation',
      'benefit amount',
    ],
  },
  {
    id: 'main-worker-final-review',
    appId: 'ID197796420e1c46beadbb7781d330818f',
    name: 'Worker Final Review Task',
    appName: 'Final Worker Review',
    process: 'IES Main BPMN',
    lane: 'Case Worker',
    tab: 'Summary',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/077b7d72-d91d-4f01-af92-0dee9911a488/edit?tid=113337&fid=426806',
    keywords: [
      'worker final review task',
      'worker final review',
      'final review task',
      'final worker review',
      'worker review',
      'case review',
      'determination',
    ],
  },
  {
    id: 'main-supervisor-review',
    appId: 'ID02d3d373da2e40f3b361f1210591e0e3',
    name: 'Supervisor Review Task',
    appName: 'Simple Approval',
    process: 'IES Main BPMN',
    lane: 'Supervisor',
    tab: 'Summary',
    editUrl: 'https://cloud.uipath.com/itsmaestropoc/IES/orchestrator_/apps/0fae8524-7977-4a30-a79c-5687bc3c6b5e/edit?tid=113337&fid=426806',
    keywords: [
      'supervisor review task',
      'supervisor review',
      'supervisor task',
      'approval',
      'approve',
      'simple approval',
    ],
  },
];

function readValue(...values: Array<string | undefined>): string {
  for (const value of values) {
    const normalized = value?.trim();
    if (normalized) {
      return normalized;
    }
  }

  return '';
}

function normalizeApiBaseUrl(value: string): string {
  const trimmedValue = value.trim().replace(/\/+$/, '');
  const portalToApiBaseUrl: Record<string, string> = {
    'https://cloud.uipath.com': 'https://api.uipath.com',
    'https://staging.uipath.com': 'https://staging.api.uipath.com',
    'https://alpha.uipath.com': 'https://alpha.api.uipath.com',
  };

  return portalToApiBaseUrl[trimmedValue] || trimmedValue;
}

function getPlatformBaseUrl(): string {
  const configuredBaseUrl = readValue(
    import.meta.env.VITE_UIPATH_BASE_URL,
    runtimeDefaults.baseUrl,
    IES_WORKFLOW_CONFIG.baseUrl,
  );

  return configuredBaseUrl ? normalizeApiBaseUrl(configuredBaseUrl) : '';
}

export function getUiPathApiBaseUrl(): string {
  return getPlatformBaseUrl();
}

function getApiOrgName(platformBaseUrl: string): string {
  return platformBaseUrl.includes('api.uipath.com')
    ? IES_WORKFLOW_CONFIG.orgId
    : IES_WORKFLOW_CONFIG.orgName;
}

function getApiTenantName(platformBaseUrl: string): string {
  return platformBaseUrl.includes('api.uipath.com')
    ? IES_WORKFLOW_CONFIG.tenantId
    : IES_WORKFLOW_CONFIG.tenantName;
}

function getRedirectUri(): string {
  if (import.meta.env.DEV) {
    return readValue(
      import.meta.env.VITE_UIPATH_REDIRECT_URI,
      runtimeDefaults.redirectUri,
      window.location.origin,
    );
  }

  return readValue(
    import.meta.env.VITE_UIPATH_REDIRECT_URI,
    runtimeDefaults.redirectUri,
    IES_WORKFLOW_CONFIG.deployedAppUrl,
    window.location.origin,
  );
}

export type UiPathAuthSetup = {
  config: UiPathSDKConfig;
  platformBaseUrl: string;
  missingFields: string[];
};

export function getUiPathAuthSetup(): UiPathAuthSetup {
  const platformBaseUrl = getPlatformBaseUrl();
  const clientId = readValue(
    import.meta.env.VITE_UIPATH_CLIENT_ID,
    runtimeDefaults.clientId,
  );
  const orgName = readValue(
    import.meta.env.VITE_UIPATH_ORG_NAME,
    runtimeDefaults.orgName,
    getApiOrgName(platformBaseUrl),
  );
  const tenantName = readValue(
    import.meta.env.VITE_UIPATH_TENANT_NAME,
    runtimeDefaults.tenantName,
    getApiTenantName(platformBaseUrl),
  );
  const redirectUri = getRedirectUri();
  const scope = readValue(
    import.meta.env.VITE_UIPATH_SCOPE,
    import.meta.env.VITE_UIPATH_SCOPES,
    runtimeDefaults.scope,
    UIPATH_SCOPES,
  );

  const missingFields = [
    !clientId && 'VITE_UIPATH_CLIENT_ID',
    !orgName && 'VITE_UIPATH_ORG_NAME',
    !tenantName && 'VITE_UIPATH_TENANT_NAME',
    !platformBaseUrl && 'VITE_UIPATH_BASE_URL',
    !import.meta.env.DEV && !redirectUri && 'VITE_UIPATH_REDIRECT_URI',
    !scope && 'VITE_UIPATH_SCOPE',
  ].filter(Boolean) as string[];

  return {
    config: {
      clientId,
      orgName,
      tenantName,
      baseUrl: platformBaseUrl || window.location.origin,
      redirectUri,
      scope,
    },
    platformBaseUrl,
    missingFields,
  };
}

export function getUiPathConfigurationError(missingFields: string[]): string | null {
  if (missingFields.length === 0) {
    return null;
  }

  return `UiPath OAuth is missing ${missingFields.join(', ')}.`;
}
