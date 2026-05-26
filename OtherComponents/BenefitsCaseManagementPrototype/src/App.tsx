import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
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
  ValidationStatus,
} from './mockData';

type Screen = 'overview' | 'inbox' | 'detail' | 'operations' | 'settings';
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
  variant = 'secondary',
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
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
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors shadow-sm ${variants[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
    </div>
  );
}

function App() {
  const [cases, setCases] = useState<BenefitCase[]>(initialCases);
  const [screen, setScreen] = useState<Screen>('overview');
  const [selectedCaseId, setSelectedCaseId] = useState(initialCases[3]?.id || initialCases[0].id);
  const [activeTab, setActiveTab] = useState<DetailTab>('Summary');
  const [role, setRole] = useState<Role>('Case Worker');
  const [workerName, setWorkerName] = useState('Sohail Ghatnekar');
  const [countyScope, setCountyScope] = useState('All counties');
  const [regionScope, setRegionScope] = useState('All regions');
  const [showDemoBanner, setShowDemoBanner] = useState(true);
  const [showFutureFeatures, setShowFutureFeatures] = useState(true);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [auditFilters, setAuditFilters] = useState<AuditCategory[]>(auditCategories);
  const [reasonCodeDraft, setReasonCodeDraft] = useState(reasonCodeOptions[0]);

  const selectedCase = cases.find((caseItem) => caseItem.id === selectedCaseId) || cases[0];
  const selectedDocument = selectedCase.documents.find((documentItem) => documentItem.id === selectedDocumentId) || selectedCase.documents[0];

  const showToast = (message: string, tone: ToastTone = 'info') => {
    const id = Date.now();
    setToasts((current) => [...current, { id, tone, message }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3800);
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

  const Header = () => (
    <header className="bg-usda-green shadow-lg border-b border-gray-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center min-h-16 py-3 gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Benefits Case Management Dashboard</h1>
            <p className="text-xs text-blue-100 mt-1">Local click-through prototype</p>
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
          </div>
        </div>
      </div>
    </header>
  );

  const Navigation = () => {
    const items: Array<{ id: Screen; label: string }> = [
      { id: 'overview', label: 'Home / Overview' },
      { id: 'inbox', label: 'Case Inbox' },
      { id: 'detail', label: 'Case Detail' },
      { id: 'operations', label: 'Operations Dashboard' },
      { id: 'settings', label: 'Mock Settings / Role Switcher' },
    ];

    return (
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-2 overflow-x-auto py-3">
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
        <span>This is a local click-through prototype using mock data.</span>
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

  const OverviewScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total open applications" value={metrics.totalOpen} tone="blue" />
        <MetricCard label="Pending review cases" value={metrics.pendingReview} tone="yellow" />
        <MetricCard label="Cases needing documents" value={metrics.needingDocuments} tone="orange" />
        <MetricCard label="Cases nearing due date" value={metrics.dueSoon} tone="red" />
        <MetricCard label="Awaiting supervisor review" value={metrics.supervisorReview} tone="purple" />
        <MetricCard label="Completed today" value={metrics.completedToday} tone="green" />
        <MetricCard label="Average case age" value={metrics.averageCaseAge} tone="gray" />
        <MetricCard label="Current selected role" value={role} tone="blue" detail={workerName} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Demo Workflow">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Review a mock benefits application, move through document review, clearance, validations, budget, notices, transaction status, and audit history without touching real services.
            </p>
            <div className="flex flex-wrap gap-3">
              <ActionButton variant="primary" onClick={() => setScreen('inbox')}>Open Case Inbox</ActionButton>
              <ActionButton onClick={() => openCase(selectedCase, 'Documents')}>Continue MYB-1004</ActionButton>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Open Exceptions">
          <div className="space-y-3">
            {exceptionOptions.filter((option) => option !== 'None').map((exception) => {
              const count = cases.filter((caseItem) => caseItem.exception === exception).length;
              return (
                <button
                  key={exception}
                  onClick={() => {
                    setFilters({ ...emptyFilters, exception });
                    setScreen('inbox');
                  }}
                  className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm hover:bg-gray-50"
                >
                  <span>{exception}</span>
                  <Pill label={String(count)} className="bg-gray-100 text-gray-800 border-gray-200" />
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Future Placeholders">
          <div className="space-y-3 text-sm text-gray-600">
            <p><span className="font-medium text-gray-900">Authentication:</span> local role switcher only.</p>
            <p><span className="font-medium text-gray-900">Role-based views:</span> labels and disabled states only.</p>
            <p><span className="font-medium text-gray-900">Service wiring:</span> no real document, correspondence, transaction, or validation calls.</p>
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        Start from the inbox and open MYB-1004 to walk through the document replacement scenario.
      </HelpBox>
    </div>
  );

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
      <SectionCard
        title="Case Inbox"
        actions={<Pill label={`Showing ${filteredCases.length} of ${cases.length}`} className="bg-blue-100 text-blue-800 border-blue-200" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <label className="block md:col-span-2 xl:col-span-1">
              <span className="text-xs font-medium text-gray-600">Search by applicant or MyB number</span>
              <input
                className="mt-1 block w-full pl-3 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="MYB-1004 or Devon"
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

          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    'MyB Number',
                    'Applicant Name',
                    'County',
                    'Region',
                    'Filing Date',
                    'Eligibility Due Date',
                    'Status',
                    'Current Stage',
                    'Assigned Group',
                    'Assigned Worker',
                    'Priority',
                    'Exception',
                    'Actions',
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="px-6 py-12 text-center text-sm text-gray-500">
                      No mock cases match the current filters.
                    </td>
                  </tr>
                ) : filteredCases.map((caseItem) => (
                  <tr key={caseItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-blue-700">{caseItem.mybNumber}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{caseItem.applicantName}</div>
                      <div className="text-xs text-gray-500">{caseItem.description}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{caseItem.county}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{caseItem.region}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(caseItem.filingDate)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div>{formatDate(caseItem.eligibilityDueDate)}</div>
                      {isDueSoon(caseItem) && <Pill label="Due Soon" />}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap"><Pill label={caseItem.status} /></td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{caseItem.currentStage}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{caseItem.assignedGroup}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">{caseItem.assignedWorker}</td>
                    <td className="px-4 py-4 whitespace-nowrap"><Pill label={caseItem.priority} className={getPriorityClasses(caseItem.priority)} /></td>
                    <td className="px-4 py-4 whitespace-nowrap"><Pill label={caseItem.exception} /></td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        <ActionButton variant="primary" onClick={() => openCase(caseItem)}>Open Case</ActionButton>
                        <ActionButton onClick={() => assignToMe(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')}>Assign to Me</ActionButton>
                        <ActionButton onClick={() => markPriority(caseItem.id)} disabled={!roleCanEdit(role, 'inbox')}>Mark Priority</ActionButton>
                        <ActionButton onClick={() => openCase(caseItem, 'Timeline / Audit')}>View Timeline</ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
        <Field label="Filing Date" value={formatDate(selectedCase.filingDate)} />
        <Field label="Eligibility Due Date" value={formatDate(selectedCase.eligibilityDueDate)} />
        <Field label="Assigned Group" value={selectedCase.assignedGroup} />
        <Field label="Assigned Worker" value={selectedCase.assignedWorker} />
        <Field label="Current Stage" value={selectedCase.currentStage} />
        <Field label="Program" value={selectedCase.program} />
        <Field label="Selected Role" value={role} />
      </div>
    </SectionCard>
  );

  const TabBar = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto shadow-sm">
      <div className="flex min-w-max">
        {detailTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
      <div className="flex flex-wrap gap-3">
        <ActionButton variant="primary" disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Worker Opened Case', 'Review started from the summary tab.', (caseItem) => ({ ...caseItem, currentStage: 'Active Review' }))}>Start Review</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => assignToMe(selectedCase.id)}>Assign to Me</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setModal({
          title: 'Add Worker Note',
          body: 'A local worker note will be added to the audit timeline for this click-through.',
          confirmLabel: 'Add Note',
          onConfirm: () => appendAuditEvent(selectedCase.id, 'Worker Note Added', 'Worker added a local note from Summary.', 'Summary'),
        })}>Add Note</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Supervisor Review Requested', 'Case routed to supervisor queue.', (caseItem) => ({ ...caseItem, exception: 'Supervisor Review', assignedGroup: 'Supervisor Queue' }), 'Supervisor actions', 'Supervisor review requested locally.')}>Request Supervisor Review</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Summary', 'Marked Ready for Next Step', 'Case moved to the next local status.', (caseItem) => ({ ...caseItem, status: statusProgression(caseItem.status), currentStage: 'Next Step Ready' }), 'Worker actions', 'Case advanced locally.')}>Mark Ready for Next Step</ActionButton>
      </div>

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
      <div className="flex flex-wrap gap-3">
        {['View Full Application', 'Download PDF'].map((label) => (
          <ActionButton key={label} onClick={() => showToast(`${label} is mocked in this prototype.`, 'info')}>{label}</ActionButton>
        ))}
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Missing Field Flagged', 'Worker flagged a missing application field.', (caseItem) => ({ ...caseItem, exception: 'Missing Info', status: 'Missing Information' }), 'Worker actions', 'Missing field flagged locally.')}>Flag Missing Field</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Application', 'Worker Note Added', 'Application note added locally.')}>Add Worker Note</ActionButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Application PDF Preview">
          <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 min-h-80 flex flex-col items-center justify-center text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Application PDF Preview</h3>
            <p className="text-sm text-gray-500 mt-2">Placeholder viewer only. No real PDF renderer is connected.</p>
          </div>
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

        <SectionCard title="Submitted Documents Summary">
          <div className="space-y-4">
            <Field label="Signature Status" value={<Pill label={selectedCase.application.signatureStatus} />} />
            <p className="text-sm text-gray-700">{selectedCase.application.submittedDocumentsSummary}</p>
            <button className="text-sm text-blue-700 font-medium hover:text-blue-900" onClick={() => setActiveTab('Documents')}>
              Open document workspace
            </button>
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
        The application tab shows a static viewer and structured applicant responses. File viewing and downloads are placeholders.
      </HelpBox>
    </div>
  );

  const InterviewTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Interview Scheduled', 'Phone interview scheduled locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, status: 'Scheduled', scheduledAt: '2026-05-27 10:00 AM' } }))}>Schedule Interview</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Interview Completed', 'Interview marked complete locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, status: 'Complete' } }))}>Mark Interview Complete</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Missing Field Added', 'Worker added a missing field.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, missingFields: [...caseItem.interview.missingFields, 'Mock added field'] } }))}>Add Missing Field</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Missing Info Requested', 'Information request drafted locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Drafted' } }))}>Draft Information Request</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Mock Email Sent', 'Mock email shown as sent to sohail.ghatnekar@uipath.com.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Sent', applicantContactStatus: 'Mock email sent' } }))}>Send Mock Email</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Applicant Response Received', 'Applicant response simulated locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, mockEmailState: 'Response Received', applicantResponseStatus: 'Response Received' } }))}>Simulate Applicant Response</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Interview / Missing Info', 'Follow-Up Note Added', 'Follow-up note added locally.', (caseItem) => ({ ...caseItem, interview: { ...caseItem.interview, workerNotes: [...caseItem.interview.workerNotes, 'Follow-up note added in the local prototype.'] } }))}>Add Follow-Up Note</ActionButton>
      </div>

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

  const DocumentsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={() => selectedDocument && setModal({
          title: selectedDocument.name,
          body: (
            <div className="space-y-3">
              <p>This is a mock document viewer. No document repository is connected.</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs">{JSON.stringify(selectedDocument.extractedValues, null, 2)}</pre>
            </div>
          ),
        })}>View Document</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Verified' }), 'Document Verified', `${selectedDocument.name} marked verified.`)}>Mark Verified</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Insufficient' }), 'Document Marked Insufficient', `${selectedDocument.name} marked insufficient.`)}>Mark Insufficient</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Replacement Requested' }), 'Replacement Requested', `Replacement requested for ${selectedDocument.name}.`)}>Request Replacement</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, status: 'Replaced', confidence: 92, extractedValues: { ...documentItem.extractedValues, confidenceScore: 92 } }), 'Applicant Response Received', `Replacement uploaded for ${selectedDocument.name}.`)}>Simulate Replacement Upload</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateDocument(selectedDocument.id, (documentItem) => ({ ...documentItem, notes: [...documentItem.notes, 'Document note added in local prototype.'] }), 'Worker Note Added', `Document note added for ${selectedDocument.name}.`)}>Add Document Note</ActionButton>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <SectionCard title="Document Verification Workspace">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Document Name', 'Document Type', 'Person / Household Member', 'Received Date', 'Reusable?', 'Confidence', 'Status', 'Action'].map((heading) => (
                    <th key={heading} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedCase.documents.map((documentItem) => (
                  <tr key={documentItem.id} className={selectedDocument.id === documentItem.id ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{documentItem.name}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{documentItem.type}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{documentItem.person}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{formatDate(documentItem.receivedDate)}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{documentItem.reusable ? 'Reusable' : 'Case-specific'}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div className={`h-2 rounded-full ${documentItem.confidence < 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${documentItem.confidence}%` }} />
                        </div>
                        <span>{documentItem.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3"><Pill label={documentItem.status} /></td>
                    <td className="px-3 py-3">
                      <ActionButton onClick={() => setSelectedDocumentId(documentItem.id)}>View</ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Extracted Values">
          <div className="space-y-4">
            <Field label="Document" value={selectedDocument.name} />
            <Field label="Name" value={selectedDocument.extractedValues.name} />
            <Field label="Date" value={selectedDocument.extractedValues.date} />
            <Field label="Amount" value={selectedDocument.extractedValues.amount} />
            <Field label="Employer" value={selectedDocument.extractedValues.employer} />
            <Field label="Address" value={selectedDocument.extractedValues.address} />
            <Field label="Confidence Score" value={<Pill label={`${selectedDocument.extractedValues.confidenceScore}%`} />} />
          </div>
        </SectionCard>

        <SectionCard title="Mock Document Preview">
          <div className="bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 p-8 min-h-80 flex flex-col items-center justify-center text-center">
            <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">{selectedDocument.name}</h3>
            <p className="text-sm text-gray-500 mt-2">Static placeholder. OCR values are mock data.</p>
          </div>
        </SectionCard>
      </div>

      <HelpBox>
        MYB-1004 includes a low-confidence paystub. Mark it insufficient, request replacement, simulate upload, then mark it verified.
      </HelpBox>
    </div>
  );

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
      <div className="flex flex-wrap gap-3">
        <ActionButton variant="primary" onClick={() => runCaseAction('Clearance', 'Mock Clearance Search Run', 'CIN / SIN matching search simulated locally.', undefined, 'System actions', 'Mock search completed.')}>Run Mock Search</ActionButton>
        <ActionButton onClick={() => showToast('Identifier terminology is configurable for the demo.', 'info')}>Add Override Reason</ActionButton>
      </div>

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
                  <ActionButton onClick={() => setModal({ title: scenario.title, body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs">{JSON.stringify(scenario, null, 2)}</pre> })}>View Match Details</ActionButton>
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
      <div className="flex flex-wrap gap-3">
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Employment / UIB Check', 'Complete', 'Mock employment check completed.', 'External Validation Completed')}>Run Mock Employment Check</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Tax Record Check', 'Complete', 'Mock tax check completed.', 'External Validation Completed')}>Run Mock Tax Check</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Paystub Comparison', 'Discrepancy Found', 'Mock paystub discrepancy found.', 'Data Discrepancy Found')}>Compare Paystub</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => updateValidation('Data Discrepancy Summary', 'Worker Review Required', 'Discrepancy routed for worker review.', 'Discrepancy Reviewed')}>Review Discrepancy</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('External Validation', 'External Validations Reviewed', 'Worker marked validations complete.', (caseItem) => ({ ...caseItem, validations: caseItem.validations.map((validation) => ({ ...validation, status: 'Complete' })) }))}>Mark Validation Complete</ActionButton>
      </div>

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
      <div className="flex flex-wrap gap-3">
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Created', 'Mock budget created.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Budget created' } }))}>Create Budget</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Calculation Successful', 'Mock calculation succeeded.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Calculation successful', mockBenefitAmount: '$298/month' } }))}>Simulate Successful Calculation</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Calculation Error', 'Mock calculation error created.', (caseItem) => ({ ...caseItem, budget: { ...caseItem.budget, status: 'Calculation error' } }), 'System actions', 'Mock error state shown.')}>Simulate Error</ActionButton>
        <ActionButton onClick={() => setModal({ title: 'Budget Result', body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs">{JSON.stringify(selectedCase.budget, null, 2)}</pre> })}>Review Result</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Budget', 'Budget Reviewed', 'Worker marked budget reviewed.', (caseItem) => ({ ...caseItem, checklist: caseItem.checklist.map((item) => item.label === 'Budget reviewed' ? { ...item, status: 'Complete' } : item), status: 'Ready for Budget' }))}>Mark Budget Reviewed</ActionButton>
      </div>

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
        <div className="flex flex-wrap gap-3">
          <select
            value={reasonCodeDraft}
            onChange={(event) => setReasonCodeDraft(event.target.value)}
            className="px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {reasonCodeOptions.map((option) => <option key={option}>{option}</option>)}
          </select>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Reason Code Added', `${reasonCodeDraft} added locally.`, (caseItem) => ({ ...caseItem, notices: [...caseItem.notices, { id: `${caseItem.mybNumber}-notice-${Date.now()}`, reasonCode: reasonCodeDraft, requiresText: reasonCodeDraft.includes('dynamic') || reasonCodeDraft.includes('Missing'), dynamicText: '', status: 'Draft' }] }), 'Notice events')}>Add Reason Code</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Reason Code Removed', 'Last reason code removed locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.slice(0, Math.max(1, caseItem.notices.length - 1)) }), 'Notice events')}>Remove Reason Code</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Notice Generated', 'Notice preview generated locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Preview Generated' })) }), 'Notice events')}>Generate Notice Preview</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Notice Approved', 'Notice approved locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Approved' })) }), 'Notice events')}>Approve Notice</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Forms & Notices', 'Mock Notice Sent', 'Mock notice sent locally.', (caseItem) => ({ ...caseItem, notices: caseItem.notices.map((notice) => ({ ...notice, status: 'Sent' })) }), 'Notice events')}>Send Mock Notice</ActionButton>
          <ActionButton onClick={() => showToast('Print Form is mocked; no correspondence system is connected.', 'info')}>Print Form</ActionButton>
        </div>

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

  const TransactionTab = () => {
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

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Submitted', 'Queued for nightly batch', 'Open', 'Transaction Submitted')}>Submit Mock Transaction</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Batch Pending', 'Pending', 'Open', 'Transaction Batch Pending')}>Simulate Batch Pending</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Accepted', 'Accepted', 'Ready to finalize', 'Transaction Accepted')}>Simulate Accepted</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Rejected', 'Rejected', 'Correction required', 'Transaction Rejected')}>Simulate Rejected</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Corrected', 'Resubmitted', 'Open', 'Transaction Corrected')}>Correct and Resubmit</ActionButton>
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => setTransaction('Finalized', 'Accepted', 'Finalized', 'Case Finalized')}>Finalize Case</ActionButton>
        </div>

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
  };

  const TimelineTab = () => {
    const events = selectedCase.timeline.filter((event) => auditFilters.includes(event.category));

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => runCaseAction('Timeline / Audit', 'Mock Event Added', 'Manual mock event appended to the audit timeline.', undefined, 'Worker actions')}>Add Mock Event</ActionButton>
          <ActionButton onClick={() => setModal({ title: 'Audit JSON', body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs max-h-96">{JSON.stringify(selectedCase.timeline, null, 2)}</pre> })}>Export Audit JSON</ActionButton>
          <ActionButton onClick={() => events[0] && setModal({ title: events[0].eventType, body: <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 overflow-auto text-xs">{JSON.stringify(events[0], null, 2)}</pre> })}>View Details</ActionButton>
        </div>

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
      <div className="flex flex-wrap gap-3">
        <ActionButton onClick={() => void copyJson(selectedCase)}>Copy JSON</ActionButton>
        <ActionButton disabled={!roleCanEdit(role, activeTab)} onClick={() => {
          const original = initialCases.find((caseItem) => caseItem.id === selectedCase.id);
          if (original) {
            updateCase(selectedCase.id, () => original);
            showToast('Selected case reset locally.', 'success');
          }
        }}>Reset Case Data</ActionButton>
        <ActionButton onClick={() => exportJson(selectedCase)}>Download JSON</ActionButton>
      </div>
      <SectionCard title="Selected Mock Case JSON">
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto text-xs max-h-[34rem]">{JSON.stringify(selectedCase, null, 2)}</pre>
      </SectionCard>
      <HelpBox>
        Raw JSON exposes the local mock case object used by the screen. This is not a backend payload contract.
      </HelpBox>
    </div>
  );

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
        <div className="flex items-center justify-between gap-4">
          <button onClick={() => setScreen('inbox')} className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Case Inbox
          </button>
          <select
            value={selectedCaseId}
            onChange={(event) => {
              setSelectedCaseId(event.target.value);
              setActiveTab('Summary');
            }}
            className="px-3 py-2 border border-gray-300 bg-white rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {cases.map((caseItem) => <option key={caseItem.id} value={caseItem.id}>{caseItem.mybNumber} - {caseItem.applicantName}</option>)}
          </select>
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {['County', 'Region', 'Open Cases', 'Due Soon', 'Missing Info', 'Document Review', 'Clearance Review', 'Avg Case Age', 'Primary Bottleneck'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bottlenecks.map((row) => (
                <tr key={row.county} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-blue-700">
                    <button onClick={() => { setFilters({ ...emptyFilters, county: row.county }); setScreen('inbox'); }}>{row.county}</button>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.region}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.openCases}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.dueSoon}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.missingInfo}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.documentReview}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.clearanceReview}</td>
                  <td className="px-4 py-4 text-sm text-gray-700">{row.averageAge} days</td>
                  <td className="px-4 py-4">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <HelpBox>
        Operations dashboard metrics are derived from mock cases. Click a county, status bar, or bottleneck to filter the inbox.
      </HelpBox>
    </div>
  );

  const SettingsScreen = () => (
    <div className="space-y-6">
      <DemoBanner />
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
                <span className="text-sm text-gray-700">Toggle showing disabled future features</span>
                <input type="checkbox" checked={showFutureFeatures} onChange={(event) => setShowFutureFeatures(event.target.checked)} />
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

      {showFutureFeatures && (
        <SectionCard title="Future Wiring Placeholders">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">Authentication</p>
              <p className="text-gray-600 mt-2">Replace the local role switcher with real auth and user claims.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">Role-based Views</p>
              <p className="text-gray-600 mt-2">Map real groups to views, disabled actions, and queue filters.</p>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <p className="font-semibold text-gray-900">Service Wiring</p>
              <p className="text-gray-600 mt-2">Connect documents, validations, notices, transactions, and audit export later.</p>
            </div>
          </div>
        </SectionCard>
      )}

      <HelpBox>
        Role switching is intentionally local and not a security model. It changes visible labels and disabled affordances only.
      </HelpBox>
    </div>
  );

  const screenContent: Record<Screen, ReactNode> = {
    overview: <OverviewScreen />,
    inbox: <InboxScreen />,
    detail: <DetailScreen />,
    operations: <OperationsScreen />,
    settings: <SettingsScreen />,
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
    </div>
  );
}

export default App;
