import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
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
  Priority,
  Role,
  TimelineEvent,
  TransactionStatus,
  UiPathDocumentReference,
  ValidationStatus,
} from './mockData';
import {
  demoCoachTips,
  exceptionExplanations,
  faqs,
  glossary,
  helpCategories,
  helpContent,
  roleHelp,
  tooltips,
} from './helpContent';
import type { HelpCategory, HelpContextId } from './helpContent';

type Screen = 'inbox' | 'detail' | 'operations' | 'testing' | 'settings' | 'helpCenter';
type DetailTab =
  | 'Summary'
  | 'Application'
  | 'Interview / Missing Info'
  | 'Documents'
  | 'Clearance'
  | 'External Validation'
  | 'Budget'
  | 'Forms & Notices'
  | 'Transaction Status'
  | 'Timeline / Audit'
  | 'Raw Case JSON';

type ToastTone = 'success' | 'info' | 'warning' | 'error';

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

interface ConfirmActionOptions {
  title: string;
  guidance: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface DocumentSourceCandidate {
  mimeType?: string;
  caseFileUrl?: string;
  localFallbackUrl?: string;
  localSourcePath?: string;
  uiPathDocumentRef?: UiPathDocumentReference;
}

interface ResolvedDocumentSource {
  url: string;
  mimeType: string;
  sourceLabel: 'Case-associated file' | 'Local fallback';
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

const detailTabs: DetailTab[] = [
  'Summary',
  'Application',
  'Interview / Missing Info',
  'Documents',
  'Clearance',
  'External Validation',
  'Budget',
  'Forms & Notices',
  'Transaction Status',
  'Timeline / Audit',
  'Raw Case JSON',
];

const reasonCodeOptions = [
  'Approval notice',
  'Missing information notice',
  'Denial notice',
  'Q21 dynamic text example',
  'Q22 dynamic text example',
];

const auditCategories: AuditCategory[] = [
  'Worker actions',
  'System actions',
  'Supervisor actions',
  'Document events',
  'Notice events',
  'Transaction events',
];

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
  const localFallbackUrl = candidate.localFallbackUrl?.trim();
  const url = caseFileUrl || localFallbackUrl;

  if (!url) {
    return null;
  }

  return {
    url,
    mimeType: candidate.mimeType || inferMimeType(url),
    sourceLabel: caseFileUrl ? 'Case-associated file' : 'Local fallback',
    localSourcePath: candidate.localSourcePath,
    uiPathDocumentRef: candidate.uiPathDocumentRef,
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
      <ben:Program>SNAP_HEAP</ben:Program>
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
  "program": "SNAP / HEAP",
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
    case 'Verified':
    case 'Accepted':
    case 'Finalized':
    case 'Response Received':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Denied':
    case 'Blocked':
    case 'Rejected':
    case 'Insufficient':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'Pending Review':
    case 'Missing Information':
    case 'Needs Review':
    case 'Worker Review Required':
    case 'Batch Pending':
    case 'Due Soon':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Document Review':
    case 'Clearance Review':
    case 'Ready for Budget':
    case 'Submitted':
    case 'Running':
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

  if (role === 'Admin / Operations') {
    return area === 'operations' || area === 'settings' || area === 'Raw Case JSON';
  }

  if (role === 'Document Reviewer') {
    return ['Documents', 'Interview / Missing Info', 'Timeline / Audit', 'Raw Case JSON'].includes(area);
  }

  if (role === 'Eligibility Specialist') {
    return ['Summary', 'Budget', 'Forms & Notices', 'Transaction Status', 'External Validation', 'Timeline / Audit', 'Raw Case JSON'].includes(area);
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

function LabelWithHelp({ label, help }: { label: string; help?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {help && <TooltipIcon text={help} />}
    </span>
  );
}

function ExceptionBadge({ exception }: { exception: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Pill label={exception} />
      <TooltipIcon text={exceptionExplanations[exception] || tooltips.exceptionBadge} />
    </span>
  );
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

function DocumentPreview({ source, title, compact = false }: { source: ResolvedDocumentSource | null; title: string; compact?: boolean }) {
  const previewHeight = compact ? 'h-80 md:h-96' : 'h-[36rem]';

  if (!source) {
    return (
      <div className={`bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 ${previewHeight} flex flex-col items-center justify-center text-center`}>
        <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">No case file is linked. A local fallback can be added for the demo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <p className="font-semibold text-gray-900">Current source</p>
          <p>{source.sourceLabel}</p>
          {source.localSourcePath && <p className="mt-1 break-all">Local path: {source.localSourcePath}</p>}
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
          <p className="font-semibold text-purple-900">Future UiPath source</p>
          {source.uiPathDocumentRef ? (
            <div className="mt-1 space-y-1 text-purple-900">
              <p>{source.uiPathDocumentRef.repository}</p>
              <p className="break-all">{source.uiPathDocumentRef.folderPath}</p>
              <p>{source.uiPathDocumentRef.resolver}</p>
            </div>
          ) : (
            <p className="mt-1 text-purple-900">Repository lookup placeholder not configured for this document.</p>
          )}
        </div>
      </div>
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
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
        <LabelWithHelp label={label} help={help} />
      </dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function App() {
  const [cases, setCases] = useState<BenefitCase[]>(initialCases);
  const [screen, setScreen] = useState<Screen>('inbox');
  const [selectedCaseId, setSelectedCaseId] = useState(initialCases[3]?.id || initialCases[0].id);
  const [activeTab, setActiveTab] = useState<DetailTab>('Summary');
  const [role, setRole] = useState<Role>('Case Worker');
  const [workerName, setWorkerName] = useState('Sohail Ghatnekar');
  const [countyScope, setCountyScope] = useState('All counties');
  const [regionScope, setRegionScope] = useState('All regions');
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [showDemoCoachTips, setShowDemoCoachTips] = useState(false);
  const [isHelpDrawerOpen, setIsHelpDrawerOpen] = useState(false);
  const [helpSearch, setHelpSearch] = useState('');
  const [helpCategory, setHelpCategory] = useState<HelpCategory | 'All'>('All');
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [inboxPage, setInboxPage] = useState(1);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState<AuditCategory[]>(auditCategories);
  const [reasonCodeDraft, setReasonCodeDraft] = useState(reasonCodeOptions[0]);
  const [activeTestScenarioId, setActiveTestScenarioId] = useState(mockTestScenarios[0].id);
  const [openCommandBoxId, setOpenCommandBoxId] = useState<string | null>(null);
  const [testCommands, setTestCommands] = useState<Record<string, string>>(defaultTestCommands);
  const [mockTestRuns, setMockTestRuns] = useState<Record<string, string>>({});
  const [mockTestReturns, setMockTestReturns] = useState<Record<string, string>>({});

  const selectedCase = cases.find((caseItem) => caseItem.id === selectedCaseId) || cases[0];
  const selectedDocument = selectedDocumentId
    ? selectedCase.documents.find((documentItem) => documentItem.id === selectedDocumentId) || null
    : null;
  const applicationDocumentSource = resolveDocumentSource(selectedCase.application);
  const selectedDocumentSource = selectedDocument ? resolveDocumentSource(selectedDocument) : null;
  const activeTestScenario = mockTestScenarios.find((scenario) => scenario.id === activeTestScenarioId) || mockTestScenarios[0];
  const activeTestCommand = testCommands[activeTestScenario.id] ?? activeTestScenario.command;
  const activeTestReturn = mockTestReturns[activeTestScenario.id] || '';
  const isCommandBoxOpen = openCommandBoxId === activeTestScenario.id;
  const lastMockTestRun = mockTestRuns[activeTestScenario.id] || 'Not run yet';
  const budgetReviewed = selectedCase.checklist.some((item) => item.label === 'Budget reviewed' && item.status === 'Complete');
  const budgetCreated = selectedCase.budget.status === 'Budget created'
    || selectedCase.budget.status === 'Calculation successful'
    || selectedCase.budget.status === 'Ready for worker review';
  const noticePreviewGenerated = selectedCase.notices.some((notice) => ['Preview Generated', 'Approved', 'Sent', 'Printed'].includes(notice.status));
  const transactionAccepted = selectedCase.transaction.submissionStatus === 'Accepted';
  const caseFinalized = selectedCase.transaction.submissionStatus === 'Finalized' || selectedCase.transaction.finalStatus === 'Finalized';

  const currentHelpContext: HelpContextId = screen === 'detail'
    ? activeTab === 'Summary'
      ? 'summary'
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
                    : activeTab === 'Transaction Status'
                      ? 'transaction'
                      : activeTab === 'Timeline / Audit'
                        ? 'timeline'
                        : 'json'
    : screen === 'helpCenter'
      ? 'helpCenter'
      : screen;

  const currentHelp = helpContent[currentHelpContext];
  const showToast = (message: string, tone: ToastTone = 'info') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3800);
  };

  const openDocumentPreview = (title: string, source: ResolvedDocumentSource | null, details?: ReactNode) => {
    if (!source) {
      showToast('No local or case-associated document file is available for this item.', 'warning');
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
            This is local guidance only. No real system, email, notice, or transaction is called.
          </div>
        </div>
      ),
      confirmLabel,
      onConfirm,
    });
  };

  const runCaseAction = (
    area: DetailTab,
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
    });
  }, [cases, filters]);

  useEffect(() => {
    setInboxPage(1);
  }, [filters]);

  const totalInboxPages = Math.max(1, Math.ceil(filteredCases.length / inboxPageSize));
  const currentInboxPage = Math.min(inboxPage, totalInboxPages);
  const inboxStartIndex = filteredCases.length ? (currentInboxPage - 1) * inboxPageSize : 0;
  const inboxEndIndex = Math.min(inboxStartIndex + inboxPageSize, filteredCases.length);
  const paginatedCases = filteredCases.slice(inboxStartIndex, inboxEndIndex);

  const metrics = useMemo(() => {
    const openCases = cases.filter((caseItem) => !['Approved', 'Denied', 'Withdrawn'].includes(caseItem.status));
    const totalAge = cases.reduce((sum, caseItem) => {
      const filed = new Date(`${caseItem.filingDate}T12:00:00`);
      return sum + Math.max(0, Math.ceil((today.getTime() - filed.getTime()) / 86_400_000));
    }, 0);

    return {
      totalOpen: openCases.length,
      pendingReview: cases.filter((caseItem) => caseItem.status === 'Pending Review').length,
      needingDocuments: cases.filter((caseItem) => caseItem.status === 'Document Review' || caseItem.exception === 'OCR Review').length,
      dueSoon: cases.filter(isDueSoon).length,
      supervisorReview: cases.filter((caseItem) => caseItem.exception === 'Supervisor Review').length,
      completedToday: 1,
      averageCaseAge: `${Math.round(totalAge / cases.length)} days`,
      missingInfo: cases.filter((caseItem) => caseItem.exception === 'Missing Info').length,
      clearanceReview: cases.filter((caseItem) => caseItem.status === 'Clearance Review' || caseItem.exception === 'Clearance Match').length,
      transactionPending: cases.filter((caseItem) => caseItem.transaction.submissionStatus !== 'Finalized').length,
    };
  }, [cases]);

  const groupedMetrics = useMemo(() => {
    const byCounty = countyOptions.map((county) => ({
      label: county,
      value: cases.filter((caseItem) => caseItem.county === county).length,
    }));
    const byRegion = regionOptions.map((region) => ({
      label: region,
      value: cases.filter((caseItem) => caseItem.region === region).length,
    }));
    const byStatus = statusOptions.map((status) => ({
      label: status,
      value: cases.filter((caseItem) => caseItem.status === status).length,
    })).filter((item) => item.value > 0);
    const byGroup = assignedGroups.map((group) => ({
      label: group,
      value: cases.filter((caseItem) => caseItem.assignedGroup === group).length,
    })).filter((item) => item.value > 0);

    return { byCounty, byRegion, byStatus, byGroup };
  }, [cases]);

  const bottlenecks = useMemo(() => {
    return countyOptions.map((county) => {
      const countyCases = cases.filter((caseItem) => caseItem.county === county);
      const dueSoonCount = countyCases.filter(isDueSoon).length;
      const missingInfoCount = countyCases.filter((caseItem) => caseItem.exception === 'Missing Info').length;
      const documentReviewCount = countyCases.filter((caseItem) => caseItem.exception === 'OCR Review' || caseItem.status === 'Document Review').length;
      const clearanceReviewCount = countyCases.filter((caseItem) => caseItem.exception === 'Clearance Match' || caseItem.status === 'Clearance Review').length;
      const primaryBottleneck = [
        { label: 'Missing Info', value: missingInfoCount },
        { label: 'Document Review', value: documentReviewCount },
        { label: 'Clearance Review', value: clearanceReviewCount },
        { label: 'Due Soon', value: dueSoonCount },
      ].sort((a, b) => b.value - a.value)[0];
      const averageAge = countyCases.length
        ? Math.round(countyCases.reduce((sum, caseItem) => {
          const filed = new Date(`${caseItem.filingDate}T12:00:00`);
          return sum + Math.max(0, Math.ceil((today.getTime() - filed.getTime()) / 86_400_000));
        }, 0) / countyCases.length)
        : 0;

      return {
        county,
        region: countyCases[0]?.region || '-',
        openCases: countyCases.length,
        dueSoon: dueSoonCount,
        missingInfo: missingInfoCount,
        documentReview: documentReviewCount,
        clearanceReview: clearanceReviewCount,
        averageAge,
        primaryBottleneck: primaryBottleneck.value > 0 ? primaryBottleneck.label : 'Balanced',
      };
    });
  }, [cases]);

  const resetMockData = () => {
    setCases(initialCases);
    setSelectedCaseId(initialCases[3]?.id || initialCases[0].id);
    setActiveTab('Summary');
    showToast('Mock data reset to the original local seed.', 'success');
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

  const copyJson = async (caseItem: BenefitCase) => {
    await navigator.clipboard?.writeText(JSON.stringify(caseItem, null, 2));
    appendAuditEvent(caseItem.id, 'Export Audit JSON', 'Case JSON was copied to clipboard.', 'Raw Case JSON', 'System actions');
    showToast('JSON copied to clipboard.', 'success');
  };

  const copyText = (value: string, successMessage: string) => {
    const clipboardWrite = navigator.clipboard?.writeText(value);
    if (clipboardWrite) {
      void clipboardWrite.catch(() => undefined);
    }
    showToast(successMessage, 'success');
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
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>{role}</span>
            </div>
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
    const items: Array<{ id: Screen; label: string }> = [
      { id: 'inbox', label: 'Case Inbox' },
      { id: 'operations', label: 'Operations Dashboard' },
      { id: 'testing', label: 'Testing' },
      { id: 'settings', label: 'Mock Settings / Role Switcher' },
      { id: 'helpCenter', label: 'Help Center' },
    ];

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
        <span>Demo Mode uses local mock data only.</span>
      </div>
      <button className="text-purple-700 font-medium hover:text-purple-900" onClick={() => setShowDemoBanner(false)}>
        Hide
      </button>
    </div>
  ) : null;

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

  const InboxScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <ScreenGuidance context="inbox" />
      <SectionCard
        title="Case Inbox"
        actions={<Pill label={`Showing ${filteredCases.length ? `${inboxStartIndex + 1}-${inboxEndIndex}` : '0'} of ${filteredCases.length}`} className="bg-blue-100 text-blue-800 border-blue-200" />}
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
                No mock cases match the current filters.
              </div>
            ) : paginatedCases.map((caseItem) => (
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
                    <Pill label={caseItem.status} />
                    <Pill label={caseItem.priority} className={getPriorityClasses(caseItem.priority)} />
                    <ExceptionBadge exception={caseItem.exception} />
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
                  <Field label="Exception" value={<ExceptionBadge exception={caseItem.exception} />} help={tooltips.exceptionBadge} />
                </dl>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
                  <ActionButton variant="primary" onClick={() => openCase(caseItem)}>Open Case</ActionButton>
                  <ActionButton onClick={() => assignToMe(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')} disabledReason={editDisabledReason('inbox')}>Assign to Me</ActionButton>
                  <ActionButton onClick={() => markPriority(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')} disabledReason={editDisabledReason('inbox')}>Mark Priority</ActionButton>
                  <ActionButton onClick={() => openCase(caseItem, 'Timeline / Audit')}>View Timeline</ActionButton>
                </div>
              </article>
            ))}
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
          <Pill label={selectedCase.status} />
          <Pill label={selectedCase.priority} className={getPriorityClasses(selectedCase.priority)} />
          <Pill label={selectedCase.exception} />
        </div>
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <Field label="County / Region" value={`${selectedCase.county} / ${selectedCase.region}`} />
        <Field label="Filing Date" value={formatDate(selectedCase.filingDate)} help={tooltips.filingDate} />
        <Field label="Eligibility Due Date" value={formatDate(selectedCase.eligibilityDueDate)} help={tooltips.eligibilityDueDate} />
        <Field label="Assigned Group" value={selectedCase.assignedGroup} help={tooltips.assignedGroup} />
        <Field label="Assigned Worker" value={selectedCase.assignedWorker} />
        <Field label="Current Stage" value={selectedCase.currentStage} />
        <Field label="Program" value={selectedCase.program} />
        <Field label="Selected Role" value={role} />
      </div>
    </SectionCard>
  );

  const TabBar = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex flex-nowrap overflow-x-auto">
        {detailTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-none px-2.5 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
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
          <Pill label={item.status} />
        </div>
      ))}
    </div>
  );

  const SummaryTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="summary" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Applicant Profile">
          <dl className="space-y-4">
            <Field label="Email" value={selectedCase.applicant.email} />
            <Field label="Phone" value={selectedCase.applicant.phone} />
            <Field label="Address" value={selectedCase.applicant.address} />
            <Field label="Language" value={selectedCase.applicant.preferredLanguage} />
            <Field label="Contact Preference" value={selectedCase.applicant.contactPreference} />
          </dl>
        </SectionCard>

        <SectionCard title="Household Summary">
          <div className="space-y-3">
            {selectedCase.household.map((member) => (
              <div key={member.name} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-500">{member.relationship}, age {member.age}</p>
                  </div>
                  <Pill label={member.applying ? 'Applying' : 'Not Applying'} />
                </div>
                <p className="text-xs text-gray-600 mt-2">{member.identifierStatus}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Due Date / SLA">
          <div className="space-y-4">
            <MetricCard label="Days until due" value={daysUntil(selectedCase.eligibilityDueDate)} tone={isDueSoon(selectedCase) ? 'red' : 'blue'} />
            <p className="text-sm text-gray-600">Eligibility due date is {formatDate(selectedCase.eligibilityDueDate)}.</p>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Income Summary">
          <div className="space-y-3">
            {selectedCase.income.map((income) => (
              <div key={`${income.person}-${income.source}`} className="flex justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span>{income.person} - {income.source}</span>
                <span className="font-medium">{income.grossAmount} {income.frequency}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Housing / Expense Summary">
          <div className="space-y-3">
            {selectedCase.expenses.map((expense) => (
              <div key={`${expense.type}-${expense.amount}`} className="flex justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <span>{expense.type}</span>
                <span className="font-medium">{expense.amount} {expense.frequency}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Program, Status, and Blockers">
          <div className="space-y-4">
            <Field label="Program Selected" value={selectedCase.program} />
            <Field label="Current Status" value={<Pill label={selectedCase.status} />} />
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
          <Checklist items={selectedCase.checklist} />
        </SectionCard>
      </div>

      <HelpBox>
        Summary is the worker launch point: review the applicant, check blockers, and move the case to the next local step.
      </HelpBox>
    </div>
  );

  const ApplicationTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="application" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Application PDF Preview">
          <DocumentPreview source={applicationDocumentSource} title="Application PDF Preview" compact />
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Signature Status">
            <Field label="Signature Status" value={<Pill label={selectedCase.application.signatureStatus} />} />
          </SectionCard>

          <SectionCard title="Applicant Responses">
            <div className="space-y-3">
              {selectedCase.application.responses.map((response) => (
                <div key={response.label} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{response.label}</p>
                  <p className="text-sm text-gray-900 mt-1">{response.value}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
        <SectionCard title="Housing Expenses">
          <div className="space-y-2">
            {selectedCase.expenses.map((expense) => (
              <div key={expense.type} className="text-sm border border-gray-200 rounded-lg p-3">{expense.type}: {expense.amount}</div>
            ))}
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        The application tab checks for a case-associated file first. If none exists, it shows the local SNAP application fallback file for the demo.
      </HelpBox>
    </div>
  );

  const InterviewTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="interview" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Interview Status">
          <dl className="space-y-4">
            <Field label="Status" value={<Pill label={selectedCase.interview.status} />} />
            <Field label="Method" value={selectedCase.interview.method} />
            <Field label="Scheduled Date/Time" value={selectedCase.interview.scheduledAt} />
            <Field label="Applicant Contact Status" value={selectedCase.interview.applicantContactStatus} />
            <Field label="Applicant Response Status" value={selectedCase.interview.applicantResponseStatus} />
          </dl>
        </SectionCard>

        <SectionCard title="Missing Fields">
          <div className="space-y-2">
            {selectedCase.interview.missingFields.length ? selectedCase.interview.missingFields.map((field) => (
              <div key={field} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">{field}</div>
            )) : <p className="text-sm text-gray-500">No missing fields recorded.</p>}
          </div>
        </SectionCard>

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
      </div>

      <SectionCard title="Worker Notes">
        <div className="space-y-2">
          {selectedCase.interview.workerNotes.map((note) => (
            <div key={note} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700">{note}</div>
          ))}
        </div>
      </SectionCard>

      <HelpBox>
        The email flow is a local state machine only. The recipient is displayed for demo purposes and no email is sent.
      </HelpBox>
    </div>
  );

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
    return (
      <div className="space-y-6">
        <ScreenGuidance context="documents" />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <SectionCard title="Document Verification Workspace">
            <div className="grid grid-cols-1 gap-3">
              {selectedCase.documents.map((documentItem) => {
                const documentSource = resolveDocumentSource(documentItem);

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
                        {documentSource && <Pill label={documentSource.sourceLabel} className="bg-purple-50 text-purple-800 border-purple-200" />}
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
                <DocumentPreview source={selectedDocumentSource} title={selectedDocument.name} />
              ) : (
                <div className="h-[36rem] rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center text-center p-8">
                  <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8M8 11h8m-8 4h5m-8 5h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">Select a document card</h3>
                  <p className="text-sm text-gray-500 mt-2 max-w-md">The local preview and file-source details appear here only after a worker selects a document.</p>
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
          MYB-1004 now shows only the required Michael Motorist documents: driver license, paystub, and National Grid utility bill. The license covers identity, so a birth certificate is not shown; the utility bill covers the utility / HEAP evidence, so lease proof is not shown.
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

  const ClearanceTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="clearance" />

      <SectionCard title="CIN / SIN Matching">
        <p className="text-sm text-gray-600 mb-5">Identifier terminology is configurable for the demo.</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Household Members</h3>
            {selectedCase.household.map((member) => (
              <div key={member.name} className="border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.relationship}</p>
                </div>
                <Pill label={member.identifierStatus} />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Match Candidates</h3>
            {selectedCase.clearance.map((scenario) => (
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
            ))}
          </div>
        </div>
      </SectionCard>

      <HelpBox>
        Clearance matching is mocked. Use candidate actions to demonstrate match scoring and worker override decisions.
      </HelpBox>
    </div>
  );

  const updateValidation = (name: string, status: ValidationStatus, summary: string, eventType: string) => {
    if (!roleCanEdit(role, 'External Validation')) {
      roleDisabledMessage();
      return;
    }

    updateCase(selectedCase.id, (caseItem) => ({
      ...caseItem,
      validations: caseItem.validations.map((validation) => validation.name === name ? { ...validation, status, summary, lastRun: '2026-05-26 12:00 PM' } : validation),
    }));
    appendAuditEvent(selectedCase.id, eventType, summary, 'External Validation', 'System actions');
    showToast('Validation state updated locally.', 'success');
  };

  const ExternalValidationTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="validation" />

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
    </div>
  );

  const BudgetTab = () => (
    <div className="space-y-6">
      <ScreenGuidance context="budget" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Budget Readiness Checklist">
          <Checklist items={selectedCase.budget.readiness} />
        </SectionCard>
        <SectionCard title="Inputs Used">
          <dl className="space-y-4">
            <Field label="Income Used" value={selectedCase.budget.incomeUsed} />
            <Field label="Expenses Used" value={selectedCase.budget.expensesUsed} />
            <Field label="Mock Calculated Benefit Amount" value={<span className="text-green-700 font-semibold">Mock benefit amount: {selectedCase.budget.mockBenefitAmount}</span>} />
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
        Budget values are static mock values. The tab demonstrates readiness, calculation states, review notes, and error handling.
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

  const setTransaction = (status: TransactionStatus, batchStatus: string, finalStatus: string, eventType: string) => {
    runCaseAction('Transaction Status', eventType, `Transaction status changed to ${status}.`, (caseItem) => ({
      ...caseItem,
      transaction: {
        ...caseItem.transaction,
        submissionStatus: status,
        batchStatus,
        finalStatus,
        lastUpdated: new Date().toLocaleString('en-US'),
      },
    }), 'Transaction events');
  };

  const TransactionTab = () => (
      <div className="space-y-6">
        <ScreenGuidance context="transaction" />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
          <MetricCard label="Transaction Readiness" value={selectedCase.transaction.readiness} tone="blue" />
          <MetricCard label="Submission Status" value={selectedCase.transaction.submissionStatus} tone="yellow" />
          <MetricCard label="Batch Status" value={selectedCase.transaction.batchStatus} tone="purple" />
          <MetricCard label="Final Status" value={selectedCase.transaction.finalStatus} tone="green" />
          <MetricCard label="Last Updated" value={selectedCase.transaction.lastUpdated} tone="gray" />
        </div>

        <SectionCard title="Mock Status Path">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {['Not Submitted', 'Submitted', 'Batch Pending', 'Accepted', 'Rejected', 'Corrected', 'Finalized'].map((status) => (
              <div key={status} className={`rounded-lg border p-3 text-sm text-center ${selectedCase.transaction.submissionStatus === status ? getStatusClasses(status) : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                {status}
              </div>
            ))}
          </div>
        </SectionCard>

        <HelpBox>
          Transaction buttons simulate the final submission lifecycle. No WMS or transaction service is called.
        </HelpBox>
      </div>
  );

  const TimelineTab = () => {
    const events = selectedCase.timeline.filter((event) => auditFilters.includes(event.category));

    return (
      <div className="space-y-6">
        <ScreenGuidance context="timeline" />

        <SectionCard title="Timeline Filters">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditCategories.map((category) => (
              <label key={category} className="flex items-center gap-2 text-sm text-gray-700 border border-gray-200 rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={auditFilters.includes(category)}
                  onChange={(event) => setAuditFilters((current) => event.target.checked ? [...current, category] : current.filter((item) => item !== category))}
                />
                {category}
              </label>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Audit Timeline">
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{event.eventType}</p>
                    <p className="text-xs text-gray-500">{new Date(event.timestamp).toLocaleString('en-US')}</p>
                  </div>
                  <Pill label={event.category} className="bg-gray-100 text-gray-800 border-gray-200" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
                  <Field label="Actor" value={event.actor} />
                  <Field label="Role" value={event.role} />
                  <Field label="Before" value={event.statusBefore} />
                  <Field label="After" value={event.statusAfter} />
                  <Field label="Duration" value={event.duration} />
                  <Field label="Related Screen/Tab" value={event.relatedScreen} />
                  <div className="md:col-span-2">
                    <Field label="Notes" value={event.notes} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <HelpBox>
          Timeline entries are seeded from mock data and appended by click-through actions during the current browser session.
        </HelpBox>
      </div>
    );
  };

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

  const DetailTopActions = () => {
    const selectDocumentReason = 'Select a document card first.';
    const documentEditDisabledReason = selectedDocument ? editDisabledReason('Documents') : selectDocumentReason;
    const canActOnDocument = Boolean(selectedDocument) && roleCanEdit(role, 'Documents');
    const visibleTimelineEvents = selectedCase.timeline.filter((event) => auditFilters.includes(event.category));

    const actionsByTab: Record<DetailTab, ReactNode> = {
      Summary: (
        <>
          <ActionButton variant="primary" disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Worker Opened Case', 'Review started from the summary tab.', (caseItem) => ({ ...caseItem, currentStage: 'Active Review' }))}>Start Review</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => assignToMe(selectedCase.id)}>Assign to Me</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setModal({ title: 'Add Note', body: <p>Worker note captured locally for {selectedCase.mybNumber}.</p>, confirmLabel: 'Save Note', onConfirm: () => runCaseAction('Summary', 'Worker Note Added', 'Summary note added locally.') })}>Add Note</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Supervisor Review Requested', 'Case routed to supervisor queue.', (caseItem) => ({ ...caseItem, exception: 'Supervisor Review', assignedGroup: 'Supervisor Queue' }), 'Supervisor actions', 'Supervisor review requested locally.')}>Request Supervisor Review</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Marked Ready for Next Step', 'Case moved to the next local status.', (caseItem) => ({ ...caseItem, status: statusProgression(caseItem.status), currentStage: 'Next Step Ready' }), 'Worker actions', 'Case advanced locally.')}>Mark Ready for Next Step</ActionButton>
        </>
      ),
      Application: (
        <>
          <ActionButton onClick={() => openDocumentPreview('Application PDF Preview', applicationDocumentSource)}>View Full Application</ActionButton>
          <ActionButton onClick={() => downloadDocumentFile(applicationDocumentSource, 'Application PDF')}>Download PDF</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Missing Field Flagged', 'Worker flagged a missing application field.', (caseItem) => ({ ...caseItem, exception: 'Missing Info', status: 'Missing Information' }), 'Worker actions', 'Missing field flagged locally.')}>Flag Missing Field</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Worker Note Added', 'Application note added locally.')}>Add Worker Note</ActionButton>
        </>
      ),
      'Interview / Missing Info': (
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
          <ActionButton disabled={!selectedDocument} disabledReason={selectDocumentReason} onClick={() => {
            if (!selectedDocument) {
              showToast(selectDocumentReason, 'warning');
              return;
            }

            openDocumentPreview(selectedDocument.name, selectedDocumentSource, (
              <div>
                <p className="text-sm font-semibold text-gray-900">Mock extracted values</p>
                <pre className="mt-2 bg-gray-900 text-gray-100 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(selectedDocument.extractedValues, null, 2)}</pre>
              </div>
            ));
          }}>View Document</ActionButton>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && confirmGuidedAction({ title: 'Mark Document Verified', guidance: 'Confirm you reviewed the document and the information is acceptable.', confirmLabel: 'Mark Verified', onConfirm: () => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Verified' }), 'Document Verified', `${selectedDocument.name} marked verified.`) })}>Mark Verified</ActionButton>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && confirmGuidedAction({ title: 'Mark Document Insufficient', guidance: 'Use this when the document is unreadable, incomplete, expired, or does not match the requested verification.', confirmLabel: 'Mark Insufficient', onConfirm: () => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Insufficient' }), 'Document Marked Insufficient', `${selectedDocument.name} marked insufficient.`) })}>Mark Insufficient</ActionButton>
          <ActionButton disabled={!canActOnDocument || caseFinalized} disabledReason={!selectedDocument ? selectDocumentReason : caseFinalized ? 'Request Replacement disabled because the case has already been finalized.' : editDisabledReason(activeTab)} onClick={() => selectedDocument && updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Replacement Requested' }), 'Replacement Requested', `Replacement requested for ${selectedDocument.name}.`)}>Request Replacement</ActionButton>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Replaced', confidence: 92, extractedValues: { ...documentItem.extractedValues, confidenceScore: 92 } }), 'Applicant Response Received', `Replacement uploaded for ${selectedDocument.name}.`)}>Simulate Replacement Upload</ActionButton>
          <ActionButton disabled={!canActOnDocument} disabledReason={documentEditDisabledReason} onClick={() => selectedDocument && updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, notes: [...documentItem.notes, 'Document note added in local prototype.'] }), 'Worker Note Added', `Document note added for ${selectedDocument.name}.`)}>Add Document Note</ActionButton>
        </>
      ),
      Clearance: (
        <>
          <ActionButton variant="primary" onClick={() => runCaseAction('Clearance', 'Mock Clearance Search Run', 'CIN / SIN matching search simulated locally.', undefined, 'System actions', 'Mock search completed.')}>Run Mock Search</ActionButton>
          <ActionButton onClick={() => showToast('Identifier terminology is configurable for the demo.', 'info')}>Add Override Reason</ActionButton>
        </>
      ),
      'External Validation': (
        <>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Employment / UIB Check', 'Complete', 'Mock employment check completed.', 'External Validation Completed')}>Run Mock Employment Check</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Tax Record Check', 'Complete', 'Mock tax check completed.', 'External Validation Completed')}>Run Mock Tax Check</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Paystub Comparison', 'Discrepancy Found', 'Mock paystub discrepancy found.', 'Data Discrepancy Found')}>Compare Paystub</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Data Discrepancy Summary', 'Worker Review Required', 'Discrepancy routed for worker review.', 'Discrepancy Reviewed')}>Review Discrepancy</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('External Validation', 'External Validations Reviewed', 'Worker marked validations complete.', (caseItem) => ({ ...caseItem, validations: caseItem.validations.map((validation) => ({ ...validation, status: 'Complete' })) }))}>Mark Validation Complete</ActionButton>
        </>
      ),
      Budget: (
        <>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Created', 'Mock budget created.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Budget created' } }))}>Create Budget</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Calculation Successful', 'Mock calculation succeeded.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Calculation successful', mockBenefitAmount: '$298/month' } }))}>Simulate Successful Calculation</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Calculation Error', 'Mock calculation error created.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Calculation error' } }), 'System actions', 'Mock error state shown.')}>Simulate Error</ActionButton>
          <ActionButton onClick={() => setModal({ title: 'Budget Result', body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(selectedCase.budget, null, 2)}</pre> })}>Review Result</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab) || !budgetCreated} disabledReason={!budgetCreated ? 'Mark Budget Reviewed disabled because a mock budget has not been created.' : editDisabledReason(activeTab)} onClick={() => runCaseAction('Budget', 'Budget Reviewed', 'Worker marked budget reviewed.', (caseItem) => ({ ...caseItem, checklist: caseItem.checklist.map((item) => item.label === 'Budget reviewed' ? { ...item, status: 'Complete' } : item), status: 'Ready for Budget' }))}>Mark Budget Reviewed</ActionButton>
        </>
      ),
      'Forms & Notices': (
        <>
          <select value={reasonCodeDraft} onChange={(event) => setReasonCodeDraft(event.target.value)} className="flex-none px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm" title={tooltips.reasonCode}>
            {reasonCodeOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Reason Code Added', `${reasonCodeDraft} added locally.`, (caseItem) => ({ ...caseItem, notices: [...caseItem.notices, { id: `${caseItem.mybNumber}-notice-${Date.now()}`, reasonCode: reasonCodeDraft, requiresText: reasonCodeDraft.includes('dynamic') || reasonCodeDraft.includes('Missing'), dynamicText: '', status: 'Draft' }] }), 'Notice events')}>Add Reason Code</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Reason Code Removed', 'Last reason code removed locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.slice(0, Math.max(1, caseItem.notices.length - 1)) }), 'Notice events')}>Remove Reason Code</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} disabledReason={editDisabledReason(activeTab)} onClick={() => confirmGuidedAction({ title: 'Generate Notice Preview', guidance: 'Review the selected reason codes and any dynamic text before approving the notice.', confirmLabel: 'Generate Preview', onConfirm: () => runCaseAction('Forms & Notices', 'Notice Generated', 'Notice preview generated locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Preview Generated' })) }), 'Notice events') })}>Generate Notice Preview</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab) || !noticePreviewGenerated} disabledReason={!noticePreviewGenerated ? 'Approve Notice disabled because a notice preview has not been generated.' : editDisabledReason(activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Notice Approved', 'Notice approved locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Approved' })) }), 'Notice events')}>Approve Notice</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Mock Notice Sent', 'Mock notice sent locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Sent' })) }), 'Notice events')}>Send Mock Notice</ActionButton>
          <ActionButton onClick={() => showToast('Print Form is mocked; no correspondence system is connected.', 'info')}>Print Form</ActionButton>
        </>
      ),
      'Transaction Status': (
        <>
          <ActionButton disabled={!roleCanEdit(role, activeTab) || !budgetReviewed} disabledReason={!budgetReviewed ? 'Submit Transaction disabled because budget has not been reviewed.' : editDisabledReason(activeTab)} onClick={() => confirmGuidedAction({ title: 'Submit Mock Transaction', guidance: 'This simulates final transaction submission. After this point, document replacement should be disabled in the click-through.', confirmLabel: 'Submit Mock Transaction', onConfirm: () => setTransaction('Submitted', 'Queued for nightly batch', 'Open', 'Transaction Submitted') })}>Submit Mock Transaction</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Batch Pending', 'Pending', 'Open', 'Transaction Batch Pending')}>Simulate Batch Pending</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Accepted', 'Accepted', 'Ready to finalize', 'Transaction Accepted')}>Simulate Accepted</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Rejected', 'Rejected', 'Correction required', 'Transaction Rejected')}>Simulate Rejected</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Corrected', 'Resubmitted', 'Open', 'Transaction Corrected')}>Correct and Resubmit</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab) || !transactionAccepted} disabledReason={!transactionAccepted ? 'Finalize Case disabled because transaction has not been accepted.' : editDisabledReason(activeTab)} onClick={() => setTransaction('Finalized', 'Accepted', 'Finalized', 'Case Finalized')}>Finalize Case</ActionButton>
        </>
      ),
      'Timeline / Audit': (
        <>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Timeline / Audit', 'Mock Event Added', 'Manual mock event appended to the audit timeline.', undefined, 'Worker actions')}>Add Mock Event</ActionButton>
          <ActionButton onClick={() => setModal({ title: 'Audit JSON', body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs max-h-96">{JSON.stringify(selectedCase.timeline, null, 2)}</pre> })}>Export Audit JSON</ActionButton>
          <ActionButton onClick={() => visibleTimelineEvents[0] && setModal({ title: visibleTimelineEvents[0].eventType, body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-y-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(visibleTimelineEvents[0], null, 2)}</pre> })}>View Details</ActionButton>
        </>
      ),
      'Raw Case JSON': (
        <>
          <ActionButton onClick={() => void copyJson(selectedCase)}>Copy JSON</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => {
            const original = initialCases.find((caseItem) => caseItem.id === selectedCase.id);
            if (original) {
              updateCase(selectedCase.id, () => original);
              showToast('Selected case reset locally.', 'success');
            }
          }}>Reset Case Data</ActionButton>
          <ActionButton onClick={() => exportJson(selectedCase)}>Download JSON</ActionButton>
        </>
      ),
    };

    return (
      <div className="flex min-w-0 flex-1 justify-end">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
          <ActionButton
            variant="primary"
            onClick={() => {
              appendAuditEvent(selectedCase.id, 'Maestro View Opened', 'Local Maestro placeholder opened from the case header.', 'Case Detail', 'System actions');
              setModal({
                title: 'View Maestro',
                body: (
                  <div className="space-y-4">
                    <p>This is a local placeholder for a future UiPath Maestro case view.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Case" value={`${selectedCase.mybNumber} - ${selectedCase.applicantName}`} />
                      <Field label="Current Stage" value={selectedCase.currentStage} />
                      <Field label="Status" value={<Pill label={selectedCase.status} />} />
                      <Field label="Placeholder State" value="No Maestro service connected" />
                    </div>
                    <HelpBox>
                      Future wiring can open the corresponding Maestro experience from UiPath. This prototype does not connect to live services or reference local Maestro artifacts.
                    </HelpBox>
                  </div>
                ),
              });
            }}
          >
            View Maestro
          </ActionButton>
          {actionsByTab[activeTab]}
        </div>
      </div>
    );
  };

  const DetailScreen = () => {
    const tabContent: Record<DetailTab, ReactNode> = {
      Summary: <SummaryTab />,
      Application: <ApplicationTab />,
      'Interview / Missing Info': <InterviewTab />,
      Documents: <DocumentsTab />,
      Clearance: <ClearanceTab />,
      'External Validation': <ExternalValidationTab />,
      Budget: <BudgetTab />,
      'Forms & Notices': <FormsNoticesTab />,
      'Transaction Status': <TransactionTab />,
      'Timeline / Audit': <TimelineTab />,
      'Raw Case JSON': <RawJsonTab />,
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
        {tabContent[activeTab]}
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
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Average case age" value={metrics.averageCaseAge} tone="gray" />
        <MetricCard label="Due soon count" value={metrics.dueSoon} tone="red" />
        <MetricCard label="Missing information count" value={metrics.missingInfo} tone="yellow" />
        <MetricCard label="Document review count" value={metrics.needingDocuments} tone="orange" />
        <MetricCard label="Clearance review count" value={metrics.clearanceReview} tone="purple" />
        <MetricCard label="Transaction pending count" value={metrics.transactionPending} tone="blue" />
        <MetricCard label="Supervisor review count" value={metrics.supervisorReview} tone="purple" />
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
        Operations dashboard metrics are derived from mock cases. Click a county, status bar, or bottleneck to filter the inbox.
      </HelpBox>
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
                  setRole(event.target.value as Role);
                  showToast(`Role switched to ${event.target.value}.`, 'info');
                }}
                className="mt-1 block w-full pl-3 pr-10 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                {roles.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Current worker name</span>
              <input
                value={workerName}
                onChange={(event) => setWorkerName(event.target.value)}
                className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </label>

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
            <p><span className="font-medium">Document Reviewer:</span> focuses on Documents and Missing Info tabs.</p>
            <p><span className="font-medium">Eligibility Specialist:</span> focuses on Budget, validations, notices, and transaction actions.</p>
            <p><span className="font-medium">Supervisor:</span> can approve, return, and reassign in local state.</p>
            <p><span className="font-medium">Auditor:</span> can view but edit actions are disabled.</p>
            <p><span className="font-medium">Admin / Operations:</span> can view dashboards and reset mock data.</p>
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        Role switching is intentionally local and not a security model. It changes visible labels and disabled affordances only.
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
              placeholder="Search reason code, document, transaction, clearance..."
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
            <p>2. Open MYB-1004 to demonstrate the Michael Motorist SNAP/HEAP review.</p>
            <p>3. Move from Documents to Interview, Clearance, Budget, Notices, Transaction, and Timeline.</p>
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
              'Generate a notice preview and simulate transaction acceptance.',
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
                  testing: 'testing',
                  settings: 'settings',
                  helpCenter: 'helpCenter',
                };
                const detailTabByContext: Partial<Record<HelpContextId, DetailTab>> = {
                  summary: 'Summary',
                  application: 'Application',
                  interview: 'Interview / Missing Info',
                  documents: 'Documents',
                  clearance: 'Clearance',
                  validation: 'External Validation',
                  budget: 'Budget',
                  notices: 'Forms & Notices',
                  transaction: 'Transaction Status',
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

  const screenContent: Record<Screen, ReactNode> = {
    inbox: <InboxScreen />,
    detail: <DetailScreen />,
    operations: <OperationsScreen />,
    testing: <TestingScreen />,
    settings: <SettingsScreen />,
    helpCenter: <HelpCenterScreen />,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {screenContent[screen]}
      </main>
      <ToastStack />
      <Modal />
      <HelpDrawer />
    </div>
  );
}

export default App;
