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
  appName: 'ies-case-management-poc',
  orgName: 'uipathlabs',
  tenantName: 'Playground',
  orgId: '82e69757-09ff-4e6d-83e7-d530f2ac4e7b',
  tenantId: 'bd829329-42ff-40aa-96dc-95a78168275a',
  baseUrl: 'https://staging.api.uipath.com',
  portalBaseUrl: 'https://staging.uipath.com',
  deployedAppUrl: 'https://uipathlabs.staging.uipath.host/ies-case-management-poc',
  insightsDashboards: {
    iesSnapDash: {
      name: 'IES SNAP Dash',
      url: 'https://staging.uipath.com/uipathlabs/playground/insights_/dashboard/15306',
    },
  },
  orchestratorFolderId: 3056236,
  orchestratorFolderName: 'AMER Presales/Public Sector/IES Maestro/IES - Maestro POC',
  applicationPdfBucket: {
    bucketId: 201429,
    folderId: 1930361,
    folderName: 'AMER Presales/Public Sector',
    fileName: 'Fake_SNAP_App_Completed.pdf',
    path: 'Fake_SNAP_App_Completed.pdf',
    staticReadUrl: 'https://crpabetaorch1nestg.blob.core.windows.net/orchestrator-bd829329-42ff-40aa-96dc-95a78168275a/BlobFilePersistence/3bfeade6-a2d1-4678-a937-0ae618f20bf2/Fake_SNAP_App_Completed.pdf?sv=2025-07-05&st=2026-06-11T19%3A25%3A54Z&se=2026-06-12T03%3A26%3A24Z&sr=b&sp=r&sig=7x2GjIVvpXhUG9WF09NE0XZiD%2BFoOQFymj%2B/pRrPek4%3D',
    browseUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/buckets/201429/browse?tid=555693&fid=1930361',
    readUriExpiryInMinutes: 10,
  },
  documentEvidenceBucket: {
    bucketId: 201429,
    folderId: 1930361,
    folderName: 'AMER Presales/Public Sector',
    browseUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/buckets/201429/browse?tid=555693&fid=1930361',
    readUriExpiryInMinutes: 10,
    documents: [
      {
        id: 'drivers-license',
        fileName: 'fake-license.jpg',
        path: '/fake-license.jpg',
        staticReadUrl: 'https://crpabetaorch1nestg.blob.core.windows.net/orchestrator-bd829329-42ff-40aa-96dc-95a78168275a/BlobFilePersistence/3bfeade6-a2d1-4678-a937-0ae618f20bf2/fake-license.jpg?sv=2025-07-05&st=2026-06-11T19%3A25%3A54Z&se=2026-06-12T03%3A26%3A24Z&sr=b&sp=r&sig=e1rzyJDsQ3GN3gDvGj2YrlIQwhrHgeqajdB7zrmwyJ4%3D',
        mimeType: 'image/jpeg',
      },
      {
        id: 'paystub',
        fileName: 'Michael_Motorist_Pay_Stub_SAMPLE.pdf',
        path: '/Michael_Motorist_Pay_Stub_SAMPLE.pdf',
        staticReadUrl: 'https://crpabetaorch1nestg.blob.core.windows.net/orchestrator-bd829329-42ff-40aa-96dc-95a78168275a/BlobFilePersistence/3bfeade6-a2d1-4678-a937-0ae618f20bf2/Michael_Motorist_Pay_Stub_SAMPLE.pdf?sv=2025-07-05&st=2026-06-11T19%3A25%3A54Z&se=2026-06-12T03%3A26%3A24Z&sr=b&sp=r&sig=m9zERzl7Sdszkqt89huzfVsjwuCQsq20qe7o4e2UR28%3D',
        mimeType: 'application/pdf',
      },
      {
        id: 'proof-of-residency',
        fileName: 'Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
        path: '/Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
        staticReadUrl: 'https://crpabetaorch1nestg.blob.core.windows.net/orchestrator-bd829329-42ff-40aa-96dc-95a78168275a/BlobFilePersistence/3bfeade6-a2d1-4678-a937-0ae618f20bf2/Michael_Motorist_National_Grid_Utility_SAMPLE.pdf?sv=2025-07-05&st=2026-06-11T19%3A25%3A54Z&se=2026-06-12T03%3A26%3A24Z&sr=b&sp=r&sig=ofNm3gj8zwlSQBL1h7D8YxQtlNA0X0IccXH7QyNbF2M%3D',
        mimeType: 'application/pdf',
      },
    ],
  },
  deploymentFolderKey: 'd64254b7-ddb3-47bb-980c-e89c036e328b',
  maestroProcessKey: '1b76b12d-a9ec-46d8-9842-7388c6e26ec5',
  maestroFolderKey: 'cc66160f-99dd-456a-83eb-a66114a74251',
  dataFabricEntityId: 'efc6ed21-ea59-f111-8fcb-000d3a45fabb',
  assignmentDataFabric: {
    taskAssignment: {
      entityId: 'fa33af77-0266-f111-8fcb-000d3ab1a7ac',
      entityUrl: 'https://staging.uipath.com/uipathlabs/Playground/datafabric_/entities/fa33af77-0266-f111-8fcb-000d3ab1a7ac',
      fields: ['User', 'TaskId', 'MaestroProcessId'],
    },
    workerPto: {
      entityId: 'f351523b-0266-f111-8fcb-000d3ab1a7ac',
      entityUrl: 'https://staging.uipath.com/uipathlabs/Playground/datafabric_/entities/f351523b-0266-f111-8fcb-000d3ab1a7ac',
      fields: ['User', 'StartDate', 'EndDate'],
    },
  },
  assignmentProcesses: {
    workerPto: {
      releaseId: 2190576,
      processName: 'Worker PTO',
      editUrl: 'https://staging.uipath.com/82e69757-09ff-4e6d-83e7-d530f2ac4e7b/bd829329-42ff-40aa-96dc-95a78168275a/orchestrator_/processes/2190576/edit?tid=555693&fid=3056236',
      startUrl: 'https://staging.uipath.com/82e69757-09ff-4e6d-83e7-d530f2ac4e7b/bd829329-42ff-40aa-96dc-95a78168275a/orchestrator_/processes/2190576/jobs/start?tid=555693&fid=3056236',
      inputFields: ['endDate_In', 'startDate_In', 'workerEmail_In', 'recordID_In'],
    },
    taskAssignment: {
      releaseId: 2190577,
      processName: 'Task Assignment',
      editUrl: 'https://staging.uipath.com/82e69757-09ff-4e6d-83e7-d530f2ac4e7b/bd829329-42ff-40aa-96dc-95a78168275a/orchestrator_/processes/2190577/edit?tid=555693&fid=3056236',
      startUrl: 'https://staging.uipath.com/82e69757-09ff-4e6d-83e7-d530f2ac4e7b/bd829329-42ff-40aa-96dc-95a78168275a/orchestrator_/processes/2190577/jobs/start?tid=555693&fid=3056236',
      inputFields: ['user', 'taskId'],
    },
  },
  dataFabricConnectionId: readValue(
    import.meta.env.VITE_UIPATH_DATA_FABRIC_CONNECTION_ID,
    '29ab41f0-e65a-43f2-83b4-fd2501ae10c7',
  ),
  dataFabricConnectionName: 'IES DF Connection',
  dataFabricConnectionFolderKey: 'cc66160f-99dd-456a-83eb-a66114a74251',
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
    appId: 'ID8e60fcaa76184b06be5a07ba7cfa88b9',
    name: 'CP1.3 Conduct interview / collect missing facts',
    appName: 'CP1 Interview',
    process: 'CP1 Interview',
    lane: 'Case Worker',
    tab: 'Interview / Missing Info',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/603dc525-028c-453e-b411-942b8dbf5e3b/edit?tid=555693&fid=3056236',
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
    appId: 'ID8e60fcaa76184b06be5a07ba7cfa88b9',
    name: 'CP1.6 Complete interview',
    appName: 'CP1 Interview',
    process: 'CP1 Interview',
    lane: 'Case Worker',
    tab: 'Interview / Missing Info',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/603dc525-028c-453e-b411-942b8dbf5e3b/edit?tid=555693&fid=3056236',
    keywords: ['cp1.6', 'complete interview', 'interview complete'],
  },
  {
    id: 'cp2-4-review-low-confidence-document',
    appId: 'ID47adb832701c43fd9a504106fcf737a6',
    name: 'CP2.4 Review low-confidence document',
    appName: 'Documents Review',
    process: 'CP2 Document Verification',
    lane: 'Case Worker',
    tab: 'Documents',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/9fccbcf7-7aa0-4fd2-a293-3864e614c44a/edit?tid=555693&fid=3056236',
    keywords: ['cp2.4', 'review low-confidence document', 'low confidence document', 'low-confidence document'],
  },
  {
    id: 'cp2-5-mark-document-verified',
    appId: 'ID47adb832701c43fd9a504106fcf737a6',
    name: 'CP2.5 Mark document verified',
    appName: 'Documents Review',
    process: 'CP2 Document Verification',
    lane: 'Case Worker',
    tab: 'Documents',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/9fccbcf7-7aa0-4fd2-a293-3864e614c44a/edit?tid=555693&fid=3056236',
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
    appId: 'ID9e6a4c0591564c44810f0d804dc6da28',
    name: 'CP3.5 Assign / request new CIN',
    appName: 'CP3 CIN Matching Override',
    process: 'CP3 CIN Matching',
    lane: 'Case Worker',
    tab: 'Clearance',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/86b9e500-0ff1-47ed-8c8c-a9b4e5215c7e/edit?tid=555693&fid=3056236',
    keywords: ['cp3.5', 'assign request new cin', 'assign/request new cin', 'request new cin', 'assign new cin'],
  },
  {
    id: 'cp3-6-capture-override-reason',
    appId: 'ID9e6a4c0591564c44810f0d804dc6da28',
    name: 'CP3.6 Capture override reason',
    appName: 'CP3 CIN Matching Override',
    process: 'CP3 CIN Matching',
    lane: 'Case Worker',
    tab: 'Clearance',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/86b9e500-0ff1-47ed-8c8c-a9b4e5215c7e/edit?tid=555693&fid=3056236',
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
    appId: 'IDe21f7b9c075e429483a1eaeed75b65e1',
    name: 'CP4.5 Review discrepancy',
    appName: 'CP4 External Validation Review',
    process: 'CP4 External Validation',
    lane: 'Case Worker',
    tab: 'External Validation',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/e35076bb-c8bc-492f-bd20-81bd2856382a/edit?tid=555693&fid=3056236',
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
    appId: '10cc2954-d47d-4d77-a9f0-deac04dd540f',
    name: 'Review Budget Task',
    appName: 'Budget Review',
    process: 'IES Main BPMN',
    lane: 'Case Worker',
    tab: 'Budget',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/10cc2954-d47d-4d77-a9f0-deac04dd540f/edit?tid=555693&fid=3056236',
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
    appId: '71d523fa-c838-40fe-9edf-7935b7e112f5',
    name: 'Worker Final Review Task',
    appName: 'Final Worker Review',
    process: 'IES Main BPMN',
    lane: 'Case Worker',
    tab: 'Summary',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/71d523fa-c838-40fe-9edf-7935b7e112f5/edit?tid=555693&fid=3056236',
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
    appId: '3427a040-6ac9-4622-a277-fe12eca7fe6a',
    name: 'Supervisor Review Task',
    appName: 'Simple Approval',
    process: 'IES Main BPMN',
    lane: 'Supervisor',
    tab: 'Summary',
    editUrl: 'https://staging.uipath.com/uipathlabs/Playground/orchestrator_/apps/3427a040-6ac9-4622-a277-fe12eca7fe6a/edit?tid=555693&fid=3056236',
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
