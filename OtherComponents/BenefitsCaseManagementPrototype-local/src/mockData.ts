export type Role =
  | 'Case Worker'
  | 'Document Reviewer'
  | 'Eligibility Specialist'
  | 'Supervisor'
  | 'Auditor'
  | 'Admin / Operations';

export type CaseStatus =
  | 'Pending Review'
  | 'Missing Information'
  | 'Document Review'
  | 'Clearance Review'
  | 'Ready for Budget'
  | 'Approved'
  | 'Denied'
  | 'Withdrawn';

export type Priority = 'Critical' | 'High' | 'Medium' | 'Normal';

export type ExceptionType =
  | 'Missing Info'
  | 'OCR Review'
  | 'Clearance Match'
  | 'Due Soon'
  | 'Supervisor Review'
  | 'WMS Pending'
  | 'None';

export type ChecklistStatus = 'Complete' | 'Needs Review' | 'Blocked' | 'Not Started';

export type DocumentStatus =
  | 'Uploaded'
  | 'Needs Review'
  | 'Verified'
  | 'Insufficient'
  | 'Replacement Requested'
  | 'Replaced';

export type ValidationStatus =
  | 'Not Started'
  | 'Running'
  | 'Complete'
  | 'Discrepancy Found'
  | 'Worker Review Required';

export type TransactionStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Batch Pending'
  | 'Accepted'
  | 'Rejected'
  | 'Corrected'
  | 'Finalized';

export type AuditCategory =
  | 'Worker actions'
  | 'System actions'
  | 'Supervisor actions'
  | 'Document events'
  | 'Notice events'
  | 'Transaction events';

export interface HouseholdMember {
  name: string;
  relationship: string;
  age: number;
  applying: boolean;
  identifierStatus: string;
}

export interface IncomeEntry {
  source: string;
  person: string;
  frequency: string;
  grossAmount: string;
  verified: boolean;
}

export interface ExpenseEntry {
  type: string;
  amount: string;
  frequency: string;
  verified: boolean;
}

export type DocumentMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export interface UiPathDocumentReference {
  repository: string;
  folderPath: string;
  documentId: string;
  resolver: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  person: string;
  receivedDate: string;
  reusable: boolean;
  confidence: number;
  status: DocumentStatus;
  extractedValues: {
    name: string;
    date: string;
    amount: string;
    employer: string;
    address: string;
    confidenceScore: number;
  };
  notes: string[];
  mimeType?: DocumentMimeType;
  caseFileUrl?: string;
  localFallbackUrl?: string;
  localSourcePath?: string;
  uiPathDocumentRef?: UiPathDocumentReference;
}

export interface ClearanceScenario {
  id: string;
  title: string;
  householdMember: string;
  candidate: string;
  identifier: string;
  matchScore: number;
  criteria: string[];
  mismatches: string[];
  recommendedAction: string;
  status: 'Open' | 'Accepted' | 'Rejected' | 'New identifier assigned';
}

export interface ValidationResult {
  name: string;
  status: ValidationStatus;
  summary: string;
  lastRun: string;
}

export interface NoticeRecord {
  id: string;
  reasonCode: string;
  requiresText: boolean;
  dynamicText: string;
  status: 'Draft' | 'Preview Generated' | 'Approved' | 'Sent' | 'Printed';
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  eventType: string;
  actor: string;
  role: Role | 'System';
  statusBefore: string;
  statusAfter: string;
  notes: string;
  duration: string;
  relatedScreen: string;
  category: AuditCategory;
}

export interface BenefitCase {
  id: string;
  mybNumber: string;
  applicantName: string;
  description: string;
  county: string;
  region: string;
  filingDate: string;
  eligibilityDueDate: string;
  status: CaseStatus;
  currentStage: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: Priority;
  exception: ExceptionType;
  expedited: boolean;
  program: string;
  currentBlockers: string[];
  applicant: {
    email: string;
    phone: string;
    address: string;
    preferredLanguage: string;
    contactPreference: string;
  };
  household: HouseholdMember[];
  income: IncomeEntry[];
  expenses: ExpenseEntry[];
  checklist: Array<{ label: string; status: ChecklistStatus }>;
  application: {
    signatureStatus: string;
    responses: Array<{ label: string; value: string }>;
    submittedDocumentsSummary: string;
    mimeType?: DocumentMimeType;
    caseFileUrl?: string;
    localFallbackUrl?: string;
    localSourcePath?: string;
    uiPathDocumentRef?: UiPathDocumentReference;
  };
  interview: {
    status: string;
    method: string;
    scheduledAt: string;
    missingFields: string[];
    workerNotes: string[];
    applicantContactStatus: string;
    applicantResponseStatus: string;
    mockEmailState: 'Drafted' | 'Sent' | 'Waiting for Response' | 'Response Received';
  };
  documents: DocumentRecord[];
  clearance: ClearanceScenario[];
  validations: ValidationResult[];
  budget: {
    readiness: Array<{ label: string; status: ChecklistStatus }>;
    incomeUsed: string;
    expensesUsed: string;
    mockBenefitAmount: string;
    status: string;
    notes: string[];
  };
  notices: NoticeRecord[];
  transaction: {
    readiness: string;
    submissionStatus: TransactionStatus;
    batchStatus: string;
    finalStatus: string;
    lastUpdated: string;
  };
  timeline: TimelineEvent[];
}

export const roles: Role[] = [
  'Case Worker',
  'Document Reviewer',
  'Eligibility Specialist',
  'Supervisor',
  'Auditor',
  'Admin / Operations',
];

export const statusOptions: CaseStatus[] = [
  'Pending Review',
  'Missing Information',
  'Document Review',
  'Clearance Review',
  'Ready for Budget',
  'Approved',
  'Denied',
  'Withdrawn',
];

export const priorityOptions: Priority[] = ['Critical', 'High', 'Medium', 'Normal'];

export const exceptionOptions: ExceptionType[] = [
  'Missing Info',
  'OCR Review',
  'Clearance Match',
  'Due Soon',
  'Supervisor Review',
  'WMS Pending',
  'None',
];

export const countyOptions = ['Albany', 'Erie', 'Hamilton', 'Monroe', 'Queens'];

export const regionOptions = ['Capital', 'Finger Lakes', 'North Country', 'NYC', 'Western'];

export const assignedGroups = [
  'Eligibility Review',
  'Document Review',
  'Clearance Unit',
  'Budget Unit',
  'Supervisor Queue',
  'Operations',
];

export const workerUsers = [
  'Avery Johnson',
  'Maya Rivera',
  'Noah Chen',
  'Priya Shah',
  'Jordan Lee',
  'Sohail Ghatnekar',
];

const baseChecklist: Array<{ label: string; status: ChecklistStatus }> = [
  { label: 'Application reviewed', status: 'Needs Review' },
  { label: 'Interview complete', status: 'Not Started' },
  { label: 'Documents reviewed', status: 'Needs Review' },
  { label: 'Clearance reviewed', status: 'Not Started' },
  { label: 'External validations reviewed', status: 'Not Started' },
  { label: 'Budget reviewed', status: 'Not Started' },
  { label: 'Notice prepared', status: 'Not Started' },
  { label: 'Transaction submitted', status: 'Not Started' },
];

function createTimeline(caseId: string, applicantName: string, status: CaseStatus): TimelineEvent[] {
  return [
    {
      id: `${caseId}-event-1`,
      timestamp: '2026-05-24T09:14:00',
      eventType: 'Application Received',
      actor: 'Intake Portal',
      role: 'System',
      statusBefore: 'New',
      statusAfter: status,
      notes: `${applicantName} submitted a benefits application.`,
      duration: '1 min',
      relatedScreen: 'Application',
      category: 'System actions',
    },
    {
      id: `${caseId}-event-2`,
      timestamp: '2026-05-24T10:05:00',
      eventType: 'Worker Opened Case',
      actor: 'Avery Johnson',
      role: 'Case Worker',
      statusBefore: status,
      statusAfter: status,
      notes: 'Initial triage started in the local prototype.',
      duration: '5 min',
      relatedScreen: 'Summary',
      category: 'Worker actions',
    },
  ];
}

function standardDocuments(caseId: string, applicantName: string, paystubConfidence = 88): DocumentRecord[] {
  return [
    {
      id: `${caseId}-doc-id`,
      name: "Driver's License",
      type: 'Identity',
      person: applicantName,
      receivedDate: '2026-05-24',
      reusable: true,
      confidence: 94,
      status: 'Verified',
      extractedValues: {
        name: applicantName,
        date: '2029-08-31',
        amount: 'N/A',
        employer: 'N/A',
        address: '120 Market Street, Albany, NY',
        confidenceScore: 94,
      },
      notes: ['Reusable identity document matched the applicant profile.'],
    },
    {
      id: `${caseId}-doc-paystub`,
      name: 'Paystub',
      type: 'Income',
      person: applicantName,
      receivedDate: '2026-05-24',
      reusable: false,
      confidence: paystubConfidence,
      status: paystubConfidence < 70 ? 'Needs Review' : 'Uploaded',
      extractedValues: {
        name: applicantName,
        date: '2026-05-17',
        amount: '$1,188.00',
        employer: 'River Market Foods',
        address: '88 Payroll Way, Buffalo, NY',
        confidenceScore: paystubConfidence,
      },
      notes: paystubConfidence < 70 ? ['OCR confidence is low. Worker review is required.'] : ['Income document ready for review.'],
    },
    {
      id: `${caseId}-doc-lease`,
      name: 'Lease / Rent Proof',
      type: 'Housing',
      person: applicantName,
      receivedDate: '2026-05-24',
      reusable: false,
      confidence: 82,
      status: 'Uploaded',
      extractedValues: {
        name: applicantName,
        date: '2026-03-01',
        amount: '$1,075.00',
        employer: 'N/A',
        address: '120 Market Street, Albany, NY',
        confidenceScore: 82,
      },
      notes: ['Lease amount extracted for housing expense review.'],
    },
    {
      id: `${caseId}-doc-birth`,
      name: 'Birth Certificate',
      type: 'Identity / Citizenship',
      person: 'Household child',
      receivedDate: '2026-05-24',
      reusable: true,
      confidence: 91,
      status: 'Uploaded',
      extractedValues: {
        name: 'Household child',
        date: '2018-11-02',
        amount: 'N/A',
        employer: 'N/A',
        address: 'N/A',
        confidenceScore: 91,
      },
      notes: ['Reusable citizenship evidence for household member.'],
    },
  ];
}

function motoristDocuments(caseId: string): DocumentRecord[] {
  return [
    {
      id: `${caseId}-doc-id`,
      name: "Driver's License",
      type: 'Identity',
      person: 'Michael M. Motorist',
      receivedDate: '2026-05-26',
      reusable: true,
      confidence: 96,
      status: 'Verified',
      extractedValues: {
        name: 'Michael M. Motorist',
        date: '2029-08-31',
        amount: 'N/A',
        employer: 'N/A',
        address: '2345 Anywhere Street Apt 2B, Your City, NY 12345',
        confidenceScore: 96,
      },
      notes: ['Identity evidence matches Michael M. Motorist and SSN suffix 6565.'],
      mimeType: 'image/jpeg',
      localFallbackUrl: '/mock-documents/fake-license.jpg',
      localSourcePath: '/Users/sohail.ghatnekar/Downloads/Fake data/fake-license.jpg',
      uiPathDocumentRef: {
        repository: 'UiPath Document Repository',
        folderPath: '/benefits-demo/MYB-1004/identity',
        documentId: 'placeholder-driver-license',
        resolver: 'Future UiPath document lookup by case and document type',
      },
    },
    {
      id: `${caseId}-doc-paystub`,
      name: 'Paystub',
      type: 'Income',
      person: 'Michael M. Motorist',
      receivedDate: '2026-05-26',
      reusable: false,
      confidence: 95,
      status: 'Uploaded',
      extractedValues: {
        name: 'Michael M. Motorist',
        date: '05/26/26',
        amount: '$1,000.00',
        employer: 'Sample Company Name',
        address: 'Sample Company Address, 95220',
        confidenceScore: 95,
      },
      notes: [
        'Pay period 05/19/26-05/25/26; rate $25.00; 40.00 hours.',
        'Total deductions $290.26; net pay $709.74; YTD gross $21,000.00.',
      ],
      mimeType: 'application/pdf',
      localFallbackUrl: '/mock-documents/Michael_Motorist_Pay_Stub_SAMPLE.pdf',
      localSourcePath: '/Users/sohail.ghatnekar/Desktop/Michael_Motorist_Pay_Stub_SAMPLE.pdf',
      uiPathDocumentRef: {
        repository: 'UiPath Document Repository',
        folderPath: '/benefits-demo/MYB-1004/income',
        documentId: 'placeholder-paystub',
        resolver: 'Future UiPath document lookup by case and document type',
      },
    },
    {
      id: `${caseId}-doc-utility`,
      name: 'National Grid Utility Bill',
      type: 'Utility / HEAP',
      person: 'Michael M. Motorist',
      receivedDate: '2026-05-26',
      reusable: false,
      confidence: 94,
      status: 'Needs Review',
      extractedValues: {
        name: 'Michael M. Motorist',
        date: 'Jun 6, 2026',
        amount: '$189.68',
        employer: 'National Grid',
        address: '2345 Anywhere Street Apt 2B, Your City, NY 12345',
        confidenceScore: 94,
      },
      notes: [
        'Billing period Apr 12, 2026 to May 11, 2026.',
        'Electric total $76.30; gas total $113.38; current charges $189.68.',
      ],
      mimeType: 'application/pdf',
      localFallbackUrl: '/mock-documents/Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
      localSourcePath: '/Users/sohail.ghatnekar/Desktop/Michael_Motorist_National_Grid_Utility_SAMPLE.pdf',
      uiPathDocumentRef: {
        repository: 'UiPath Document Repository',
        folderPath: '/benefits-demo/MYB-1004/utility',
        documentId: 'placeholder-national-grid-utility',
        resolver: 'Future UiPath document lookup by case and document type',
      },
    },
  ];
}

function defaultClearance(caseId: string, applicantName: string): ClearanceScenario[] {
  return [
    {
      id: `${caseId}-match-high`,
      title: 'High-confidence match',
      householdMember: applicantName,
      candidate: applicantName,
      identifier: 'CIN-441029',
      matchScore: 96,
      criteria: ['Name', 'Date of birth', 'Address', 'Last four SSN'],
      mismatches: [],
      recommendedAction: 'Accept match',
      status: 'Open',
    },
    {
      id: `${caseId}-match-possible`,
      title: 'Possible match',
      householdMember: 'Household child',
      candidate: 'Similar household member',
      identifier: 'SIN-883110',
      matchScore: 72,
      criteria: ['Date of birth', 'County'],
      mismatches: ['Middle initial', 'Prior address'],
      recommendedAction: 'View details and add override reason if accepted',
      status: 'Open',
    },
    {
      id: `${caseId}-match-multiple`,
      title: 'Multiple matches',
      householdMember: 'Secondary adult',
      candidate: 'Two candidates returned',
      identifier: 'Multiple',
      matchScore: 68,
      criteria: ['Name', 'County'],
      mismatches: ['Date of birth requires review'],
      recommendedAction: 'Reject incorrect candidates',
      status: 'Open',
    },
    {
      id: `${caseId}-match-none`,
      title: 'No match / assign new identifier',
      householdMember: 'New household member',
      candidate: 'No candidate found',
      identifier: 'Unassigned',
      matchScore: 0,
      criteria: [],
      mismatches: ['No matching record'],
      recommendedAction: 'Assign new CIN / SIN',
      status: 'Open',
    },
  ];
}

function motoristClearance(caseId: string): ClearanceScenario[] {
  return [
    {
      id: `${caseId}-match-michael`,
      title: 'High-confidence match',
      householdMember: 'Michael M. Motorist',
      candidate: 'Michael M. Motorist',
      identifier: 'CIN-6565',
      matchScore: 97,
      criteria: ['Name', 'Date of birth', 'Address', 'Last four SSN'],
      mismatches: [],
      recommendedAction: 'Accept match',
      status: 'Open',
    },
    {
      id: `${caseId}-match-sarah`,
      title: 'Possible match',
      householdMember: 'Sarah A. Motorist',
      candidate: 'Sarah Motorist',
      identifier: 'CIN-1122',
      matchScore: 84,
      criteria: ['Name', 'Last four SSN', 'Household address'],
      mismatches: ['Prior county record needs worker confirmation'],
      recommendedAction: 'View details and accept match if household relationship is confirmed',
      status: 'Open',
    },
    {
      id: `${caseId}-match-emma`,
      title: 'High-confidence match',
      householdMember: 'Emma L. Motorist',
      candidate: 'Emma L. Motorist',
      identifier: 'SIN-3344',
      matchScore: 95,
      criteria: ['Name', 'Date of birth', 'School-aged dependent', 'Last four SSN'],
      mismatches: [],
      recommendedAction: 'Accept match',
      status: 'Open',
    },
    {
      id: `${caseId}-match-none`,
      title: 'No match / assign new identifier',
      householdMember: 'Additional household member',
      candidate: 'No candidate found',
      identifier: 'Unassigned',
      matchScore: 0,
      criteria: [],
      mismatches: ['No additional household member reported'],
      recommendedAction: 'No new identifier needed unless new member is added',
      status: 'Open',
    },
  ];
}

function defaultValidations(caseId: string): ValidationResult[] {
  const discrepancy = caseId === 'MYB-1004' || caseId === 'MYB-1002';

  return [
    {
      name: 'Employment / UIB Check',
      status: discrepancy ? 'Worker Review Required' : 'Complete',
      summary: discrepancy ? 'Employment source differs from paystub employer.' : 'Employment record aligns with applicant response.',
      lastRun: '2026-05-25 09:20 AM',
    },
    {
      name: 'Tax Record Check',
      status: 'Complete',
      summary: 'Prior tax household size was found for comparison.',
      lastRun: '2026-05-25 09:23 AM',
    },
    {
      name: 'Paystub Comparison',
      status: discrepancy ? 'Discrepancy Found' : 'Complete',
      summary: discrepancy ? 'Paystub amount requires worker review before budget.' : 'Paystub amount matches income entry.',
      lastRun: '2026-05-25 09:25 AM',
    },
    {
      name: 'Data Discrepancy Summary',
      status: discrepancy ? 'Discrepancy Found' : 'Complete',
      summary: discrepancy ? 'One discrepancy is open.' : 'No critical discrepancies detected.',
      lastRun: '2026-05-25 09:27 AM',
    },
  ];
}

function motoristValidations(): ValidationResult[] {
  return [
    {
      name: 'Employment / UIB Check',
      status: 'Worker Review Required',
      summary: 'Michael reports warehouse employment and Sarah reports fluctuating part-time retail income.',
      lastRun: '2026-05-26 02:10 PM',
    },
    {
      name: 'Tax Record Check',
      status: 'Complete',
      summary: 'Household composition found for Michael, Sarah, and Emma Motorist.',
      lastRun: '2026-05-26 02:12 PM',
    },
    {
      name: 'Paystub Comparison',
      status: 'Complete',
      summary: 'Michael paystub gross wages match the reported $1,000 weekly income.',
      lastRun: '2026-05-26 02:14 PM',
    },
    {
      name: 'Data Discrepancy Summary',
      status: 'Worker Review Required',
      summary: 'Review Sarah fluctuating income and National Grid utility expense before budget.',
      lastRun: '2026-05-26 02:16 PM',
    },
  ];
}

function defaultNotices(caseId: string): NoticeRecord[] {
  return [
    {
      id: `${caseId}-notice-approval`,
      reasonCode: 'Approval notice',
      requiresText: false,
      dynamicText: '',
      status: 'Draft',
    },
    {
      id: `${caseId}-notice-missing`,
      reasonCode: 'Missing information notice',
      requiresText: true,
      dynamicText: 'Please provide the requested verification within 10 calendar days.',
      status: 'Draft',
    },
  ];
}

const primaryCases: BenefitCase[] = [
  {
    id: 'case-1001',
    mybNumber: 'MYB-1001',
    applicantName: 'Adrian Miller',
    description: 'Complete application, ready for final review',
    county: 'Hamilton',
    region: 'North Country',
    filingDate: '2026-05-10',
    eligibilityDueDate: '2026-06-08',
    status: 'Ready for Budget',
    currentStage: 'Final Review',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Maya Rivera',
    priority: 'Normal',
    exception: 'Supervisor Review',
    expedited: false,
    program: 'SNAP',
    currentBlockers: ['Supervisor review requested before final notice.'],
    applicant: {
      email: 'adrian.miller@example.test',
      phone: '(518) 555-0101',
      address: '120 Market Street, Lake Pleasant, NY 12108',
      preferredLanguage: 'English',
      contactPreference: 'Email',
    },
    household: [
      { name: 'Adrian Miller', relationship: 'Self', age: 39, applying: true, identifierStatus: 'Matched CIN-441029' },
      { name: 'Mia Miller', relationship: 'Child', age: 8, applying: true, identifierStatus: 'Matched SIN-110294' },
    ],
    income: [
      { source: 'Retail wages', person: 'Adrian Miller', frequency: 'Biweekly', grossAmount: '$1,188.00', verified: true },
    ],
    expenses: [
      { type: 'Rent', amount: '$1,075.00', frequency: 'Monthly', verified: true },
      { type: 'Utilities', amount: '$165.00', frequency: 'Monthly', verified: true },
    ],
    checklist: baseChecklist.map((item) => ({
      ...item,
      status: ['Application reviewed', 'Interview complete', 'Documents reviewed', 'Clearance reviewed', 'External validations reviewed'].includes(item.label)
        ? 'Complete'
        : item.label === 'Budget reviewed'
          ? 'Needs Review'
          : item.status,
    })),
    application: {
      signatureStatus: 'Signed electronically',
      responses: [
        { label: 'Household changes', value: 'No changes since prior certification.' },
        { label: 'Shelter expense', value: 'Rent and utilities reported.' },
        { label: 'Employment', value: 'Currently employed part time.' },
      ],
      submittedDocumentsSummary: 'Application, identity, income, rent proof, and citizenship documents received.',
    },
    interview: {
      status: 'Complete',
      method: 'Phone',
      scheduledAt: '2026-05-15 10:30 AM',
      missingFields: [],
      workerNotes: ['Interview confirmed reported income and shelter costs.'],
      applicantContactStatus: 'Reached',
      applicantResponseStatus: 'Response Received',
      mockEmailState: 'Response Received',
    },
    documents: standardDocuments('MYB-1001', 'Adrian Miller', 88),
    clearance: defaultClearance('MYB-1001', 'Adrian Miller'),
    validations: defaultValidations('MYB-1001'),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Complete' },
        { label: 'Income verified', status: 'Complete' },
        { label: 'Expenses verified', status: 'Complete' },
        { label: 'Clearance resolved', status: 'Complete' },
      ],
      incomeUsed: '$2,376/month',
      expensesUsed: '$1,240/month',
      mockBenefitAmount: '$298/month',
      status: 'Ready for worker review',
      notes: ['Budget is ready for final eligibility review.'],
    },
    notices: defaultNotices('MYB-1001'),
    transaction: {
      readiness: 'Ready after notice approval',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-25 02:15 PM',
    },
    timeline: createTimeline('MYB-1001', 'Adrian Miller', 'Ready for Budget'),
  },
  {
    id: 'case-1002',
    mybNumber: 'MYB-1002',
    applicantName: 'Bianca Torres',
    description: 'Expedited candidate, high priority',
    county: 'Erie',
    region: 'Western',
    filingDate: '2026-05-24',
    eligibilityDueDate: '2026-05-27',
    status: 'Pending Review',
    currentStage: 'Expedited Screening',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Avery Johnson',
    priority: 'Critical',
    exception: 'Due Soon',
    expedited: true,
    program: 'SNAP Expedited',
    currentBlockers: ['Expedited review due within 7 days.'],
    applicant: {
      email: 'bianca.torres@example.test',
      phone: '(716) 555-0144',
      address: '44 Grant Street, Buffalo, NY 14213',
      preferredLanguage: 'Spanish',
      contactPreference: 'Phone',
    },
    household: [
      { name: 'Bianca Torres', relationship: 'Self', age: 27, applying: true, identifierStatus: 'Possible match' },
    ],
    income: [
      { source: 'Temporary work', person: 'Bianca Torres', frequency: 'Weekly', grossAmount: '$320.00', verified: false },
    ],
    expenses: [
      { type: 'Rent', amount: '$900.00', frequency: 'Monthly', verified: false },
    ],
    checklist: baseChecklist,
    application: {
      signatureStatus: 'Signed electronically',
      responses: [
        { label: 'Expedited need', value: 'Household reports less than $100 available cash.' },
        { label: 'Employment', value: 'Temporary work with variable hours.' },
        { label: 'Shelter expense', value: 'Rent due this week.' },
      ],
      submittedDocumentsSummary: 'Application and identity document received. Income review pending.',
    },
    interview: {
      status: 'Scheduled',
      method: 'Phone',
      scheduledAt: '2026-05-26 03:00 PM',
      missingFields: ['Recent income detail', 'Utility expense confirmation'],
      workerNotes: ['Prioritize expedited screen before standard queue.'],
      applicantContactStatus: 'Left voicemail',
      applicantResponseStatus: 'Waiting for Response',
      mockEmailState: 'Waiting for Response',
    },
    documents: standardDocuments('MYB-1002', 'Bianca Torres', 78),
    clearance: defaultClearance('MYB-1002', 'Bianca Torres'),
    validations: defaultValidations('MYB-1002'),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Needs Review' },
        { label: 'Income verified', status: 'Needs Review' },
        { label: 'Expenses verified', status: 'Needs Review' },
        { label: 'Clearance resolved', status: 'Not Started' },
      ],
      incomeUsed: '$1,280/month pending verification',
      expensesUsed: '$900/month pending verification',
      mockBenefitAmount: '$410/month',
      status: 'Not ready',
      notes: ['Expedited eligibility can proceed after missing fields are resolved.'],
    },
    notices: defaultNotices('MYB-1002'),
    transaction: {
      readiness: 'Blocked by expedited review',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-25 04:20 PM',
    },
    timeline: createTimeline('MYB-1002', 'Bianca Torres', 'Pending Review'),
  },
  {
    id: 'case-1003',
    mybNumber: 'MYB-1003',
    applicantName: 'Camila Reed',
    description: 'Missing signature or missing intake information',
    county: 'Albany',
    region: 'Capital',
    filingDate: '2026-05-18',
    eligibilityDueDate: '2026-06-16',
    status: 'Missing Information',
    currentStage: 'Intake Completion',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Noah Chen',
    priority: 'Medium',
    exception: 'Missing Info',
    expedited: false,
    program: 'SNAP',
    currentBlockers: ['Signature page is missing.', 'Household relationship question is unanswered.'],
    applicant: {
      email: 'camila.reed@example.test',
      phone: '(518) 555-0172',
      address: '19 Central Avenue, Albany, NY 12210',
      preferredLanguage: 'English',
      contactPreference: 'Email',
    },
    household: [
      { name: 'Camila Reed', relationship: 'Self', age: 45, applying: true, identifierStatus: 'Matched CIN-929400' },
      { name: 'Leo Reed', relationship: 'Spouse', age: 47, applying: true, identifierStatus: 'Not searched' },
    ],
    income: [
      { source: 'Seasonal wages', person: 'Leo Reed', frequency: 'Monthly', grossAmount: '$960.00', verified: false },
    ],
    expenses: [
      { type: 'Rent', amount: '$1,100.00', frequency: 'Monthly', verified: true },
    ],
    checklist: baseChecklist.map((item) => ({
      ...item,
      status: item.label === 'Application reviewed' ? 'Blocked' : item.status,
    })),
    application: {
      signatureStatus: 'Missing signature',
      responses: [
        { label: 'Household relationship', value: 'Missing' },
        { label: 'Resources', value: 'Applicant selected yes but did not describe resource.' },
        { label: 'Employment', value: 'Spouse seasonal wages reported.' },
      ],
      submittedDocumentsSummary: 'Application, lease, and identity documents received. Signature missing.',
    },
    interview: {
      status: 'Not Scheduled',
      method: 'Not selected',
      scheduledAt: 'Not scheduled',
      missingFields: ['Applicant signature', 'Household relationship detail', 'Resource explanation'],
      workerNotes: ['Send information request before interview can be completed.'],
      applicantContactStatus: 'Email drafted',
      applicantResponseStatus: 'Not Started',
      mockEmailState: 'Drafted',
    },
    documents: standardDocuments('MYB-1003', 'Camila Reed', 84),
    clearance: defaultClearance('MYB-1003', 'Camila Reed'),
    validations: defaultValidations('MYB-1003'),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Blocked' },
        { label: 'Income verified', status: 'Needs Review' },
        { label: 'Expenses verified', status: 'Complete' },
        { label: 'Clearance resolved', status: 'Not Started' },
      ],
      incomeUsed: '$960/month pending verification',
      expensesUsed: '$1,100/month',
      mockBenefitAmount: '$360/month',
      status: 'Blocked by missing information',
      notes: ['Budget cannot be finalized until signature is received.'],
    },
    notices: defaultNotices('MYB-1003'),
    transaction: {
      readiness: 'Blocked by missing signature',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-25 11:05 AM',
    },
    timeline: createTimeline('MYB-1003', 'Camila Reed', 'Missing Information'),
  },
  {
    id: 'case-1004',
    mybNumber: 'MYB-1004',
    applicantName: 'Michael M. Motorist',
    description: 'Motorist SNAP / HEAP application with paystub and National Grid utility review',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-05-26',
    eligibilityDueDate: '2026-06-24',
    status: 'Document Review',
    currentStage: 'Paystub and Utility Review',
    assignedGroup: 'Document Review',
    assignedWorker: 'Priya Shah',
    priority: 'High',
    exception: 'OCR Review',
    expedited: false,
    program: 'SNAP / HEAP',
    currentBlockers: [
      'National Grid utility bill needs worker review for HEAP-related expense handling.',
      'Sarah Motorist part-time income fluctuates and should be reviewed before budget.',
    ],
    applicant: {
      email: 'michael.motorist@example.test',
      phone: '(555) 555-1234',
      address: '2345 Anywhere Street Apt 2B, Your City, NY 12345',
      preferredLanguage: 'English',
      contactPreference: 'Phone',
    },
    household: [
      { name: 'Michael M. Motorist', relationship: 'Self', age: 47, applying: true, identifierStatus: 'SSN XXX-XX-6565; DOB 08/31/1978; married; applying' },
      { name: 'Sarah A. Motorist', relationship: 'Spouse', age: 46, applying: true, identifierStatus: 'SSN XXX-XX-1122; DOB 04/11/1980; married; applying' },
      { name: 'Emma L. Motorist', relationship: 'Daughter', age: 14, applying: true, identifierStatus: 'SSN XXX-XX-3344; DOB 02/15/2012; school-aged dependent' },
    ],
    income: [
      { source: 'Employment - Warehouse Associate', person: 'Michael Motorist', frequency: 'Weekly', grossAmount: '$1,000.00', verified: true },
      { source: 'Part-Time Retail', person: 'Sarah Motorist', frequency: 'Bi-Weekly', grossAmount: '$600.00', verified: false },
    ],
    expenses: [
      { type: 'Rent', amount: '$1,250.00', frequency: 'Monthly', verified: true },
      { type: 'Child / dependent care', amount: '$250.00', frequency: 'Monthly', verified: true },
      { type: 'National Grid utility charges', amount: '$189.68', frequency: 'Monthly', verified: false },
    ],
    checklist: baseChecklist.map((item) => ({
      ...item,
      status: item.label === 'Application reviewed'
        ? 'Complete'
        : item.label === 'Documents reviewed'
          ? 'Needs Review'
          : item.label === 'Interview complete'
            ? 'Complete'
          : item.status,
    })),
    application: {
      signatureStatus: 'Signed electronically',
      responses: [
        { label: 'Apply / Recertify', value: 'Apply' },
        { label: 'Legal Name', value: 'Michael M. Motorist; also known as Mike Motorist.' },
        { label: 'Telephone Numbers', value: 'Primary (555) 555-1234; other phone (555) 555-5678.' },
        { label: 'Residence Address', value: '2345 Anywhere Street Apt 2B, Your City, NY 12345.' },
        { label: 'Mailing Address', value: 'Same as residence.' },
        { label: 'Notices In', value: 'English Only.' },
        { label: 'Applicant Signature', value: 'Michael M. Motorist signed on 05/26/2026.' },
        { label: 'Household Members', value: 'Michael, spouse Sarah, and daughter Emma are applying and buy/prepare food together.' },
        { label: 'Citizenship', value: 'Everyone in household is a U.S. citizen.' },
        { label: 'SNAP / TA Elsewhere', value: 'No one is applying elsewhere for SNAP or TA.' },
        { label: 'Veteran / Facility Status', value: 'No veterans and no one in treatment or a group facility.' },
        { label: 'Michael Income', value: 'Warehouse Associate, 160 hours/month, weekly gross $1,000.00.' },
        { label: 'Sarah Income', value: 'Part-Time Retail, 80 hours/month, bi-weekly gross $600.00; schedule fluctuates.' },
        { label: 'Child Care', value: 'Emma Motorist child/dependent care cost is $250 monthly.' },
        { label: 'Job / Strike Questions', value: 'No recent job change, no potential income not received, and not participating in a strike.' },
        { label: 'Foster / Boarder Questions', value: 'No foster care at age 18 and no boarder/foster child/adult reported.' },
        { label: 'Cash / Accounts', value: '$2,412.17 belonging to Michael and Sarah Motorist.' },
        { label: 'Vehicle', value: '2018 Toyota Camry owned by Michael Motorist.' },
        { label: 'Property Transfers', value: 'No home/property ownership and no recent sale or transfer.' },
        { label: 'Education / Language', value: 'Michael education code 1, Sarah education code 2, primary language English.' },
        { label: 'Shelter', value: 'Renting; monthly rent $1,250; pays separately for heat, air conditioning, and utilities.' },
        { label: 'Heating', value: 'Gas heat with National Grid.' },
        { label: 'Expenses Paid By Others', value: 'No one else pays household expenses; no child support paid.' },
        { label: 'Disabled / 60+', value: 'No one is disabled or age 60+.' },
        { label: 'Medicaid Spenddown', value: 'No.' },
        { label: 'School Child', value: 'Emma Motorist is 16/17 school question marked Yes; Your City Middle School.' },
        { label: 'College / Training', value: 'No adults attending college or training.' },
        { label: 'Pregnancy / Work Limitation', value: 'No pregnancy and no medical conditions limiting work.' },
        { label: 'Legal / Disqualification Questions', value: 'No probation/parole violation, SNAP fraud disqualification, firearm/drug trade, sale over $500, or duplicate benefits fraud.' },
        { label: 'Final Signature', value: 'Michael M. Motorist signed final attestation on 05/26/2026.' },
        { label: 'Additional Info', value: 'Household applies for SNAP and HEAP assistance; Sarah income fluctuates; Emma is a minor dependent enrolled full time.' },
        { label: 'Voter Registration', value: 'No - already registered.' },
      ],
      submittedDocumentsSummary: 'SNAP application, driver license identity evidence, Michael paystub, and National Grid utility bill received. Birth certificate and lease proof are not required for this case because identity and utility evidence are already present.',
      mimeType: 'application/pdf',
      localFallbackUrl: '/mock-documents/Fake_SNAP_App_Completed.pdf',
      localSourcePath: '/Users/sohail.ghatnekar/Desktop/Fake_SNAP_App_Completed.pdf',
      uiPathDocumentRef: {
        repository: 'UiPath Document Repository',
        folderPath: '/benefits-demo/MYB-1004/application',
        documentId: 'placeholder-snap-application',
        resolver: 'Future UiPath document lookup by case and form type',
      },
    },
    interview: {
      status: 'Complete',
      method: 'Phone',
      scheduledAt: '2026-05-27 01:30 PM',
      missingFields: ['Confirm Sarah Motorist fluctuating part-time income', 'Review National Grid bill for utility / HEAP expense handling'],
      workerNotes: [
        'Michael confirmed SNAP application and HEAP assistance request.',
        'Sarah part-time retail income varies by schedule and should be reviewed before budget.',
      ],
      applicantContactStatus: 'Reached',
      applicantResponseStatus: 'Waiting for Response',
      mockEmailState: 'Drafted',
    },
    documents: motoristDocuments('MYB-1004'),
    clearance: motoristClearance('MYB-1004'),
    validations: motoristValidations(),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Complete' },
        { label: 'Income verified', status: 'Needs Review' },
        { label: 'Expenses verified', status: 'Needs Review' },
        { label: 'Clearance resolved', status: 'Needs Review' },
      ],
      incomeUsed: 'Michael $1,000 weekly; Sarah $600 bi-weekly; projected gross $5,633/month',
      expensesUsed: 'Rent $1,250/month; child care $250/month; National Grid $189.68',
      mockBenefitAmount: '$298/month',
      status: 'Needs worker review',
      notes: [
        'Paystub supports Michael warehouse wages for pay period 05/19/26-05/25/26.',
        'Utility bill shows $189.68 due by Jun 6, 2026 and should be reviewed for HEAP-related handling.',
      ],
    },
    notices: defaultNotices('MYB-1004'),
    transaction: {
      readiness: 'Pending document and budget review',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-27 03:40 PM',
    },
    timeline: [
      ...createTimeline('MYB-1004', 'Michael M. Motorist', 'Document Review'),
      {
        id: 'MYB-1004-event-3',
        timestamp: '2026-05-27T13:08:00',
        eventType: 'Document Review Started',
        actor: 'Priya Shah',
        role: 'Document Reviewer',
        statusBefore: 'Document Review',
        statusAfter: 'Document Review',
        notes: 'Michael Motorist paystub and National Grid utility bill queued for worker verification.',
        duration: '8 min',
        relatedScreen: 'Documents',
        category: 'Document events',
      },
    ],
  },
  {
    id: 'case-1005',
    mybNumber: 'MYB-1005',
    applicantName: 'Evelyn Park',
    description: 'Clearance possible match, identity review required',
    county: 'Queens',
    region: 'NYC',
    filingDate: '2026-05-20',
    eligibilityDueDate: '2026-06-04',
    status: 'Clearance Review',
    currentStage: 'Identity Match Review',
    assignedGroup: 'Clearance Unit',
    assignedWorker: 'Jordan Lee',
    priority: 'High',
    exception: 'Clearance Match',
    expedited: false,
    program: 'SNAP',
    currentBlockers: ['Possible identity match requires worker decision.'],
    applicant: {
      email: 'evelyn.park@example.test',
      phone: '(718) 555-0119',
      address: '87 Queens Boulevard, Queens, NY 11375',
      preferredLanguage: 'English',
      contactPreference: 'Email',
    },
    household: [
      { name: 'Evelyn Park', relationship: 'Self', age: 52, applying: true, identifierStatus: 'Possible match' },
      { name: 'Grace Park', relationship: 'Parent', age: 78, applying: true, identifierStatus: 'Multiple matches' },
    ],
    income: [
      { source: 'Caregiver wages', person: 'Evelyn Park', frequency: 'Biweekly', grossAmount: '$980.00', verified: true },
    ],
    expenses: [
      { type: 'Rent', amount: '$1,425.00', frequency: 'Monthly', verified: true },
      { type: 'Medical', amount: '$220.00', frequency: 'Monthly', verified: false },
    ],
    checklist: baseChecklist.map((item) => ({
      ...item,
      status: ['Application reviewed', 'Interview complete', 'Documents reviewed'].includes(item.label)
        ? 'Complete'
        : item.label === 'Clearance reviewed'
          ? 'Blocked'
          : item.status,
    })),
    application: {
      signatureStatus: 'Signed electronically',
      responses: [
        { label: 'Identity', value: 'Applicant reports prior case in another county.' },
        { label: 'Medical expense', value: 'Monthly out of pocket amount reported.' },
        { label: 'Employment', value: 'Caregiver wages reported.' },
      ],
      submittedDocumentsSummary: 'Application, identity, income, rent proof, and medical expense documents received.',
    },
    interview: {
      status: 'Complete',
      method: 'Video',
      scheduledAt: '2026-05-23 09:00 AM',
      missingFields: [],
      workerNotes: ['Identity history requires clearance review before budget.'],
      applicantContactStatus: 'Reached',
      applicantResponseStatus: 'Response Received',
      mockEmailState: 'Response Received',
    },
    documents: standardDocuments('MYB-1005', 'Evelyn Park', 86),
    clearance: defaultClearance('MYB-1005', 'Evelyn Park').map((scenario) => scenario.title === 'Possible match'
      ? { ...scenario, matchScore: 81, candidate: 'Evelyn P.', recommendedAction: 'View details before accepting match' }
      : scenario),
    validations: defaultValidations('MYB-1005'),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Complete' },
        { label: 'Income verified', status: 'Complete' },
        { label: 'Expenses verified', status: 'Needs Review' },
        { label: 'Clearance resolved', status: 'Blocked' },
      ],
      incomeUsed: '$1,960/month',
      expensesUsed: '$1,645/month pending medical review',
      mockBenefitAmount: '$342/month',
      status: 'Blocked by clearance',
      notes: ['Budget can be calculated after possible match decision.'],
    },
    notices: defaultNotices('MYB-1005'),
    transaction: {
      readiness: 'Blocked by clearance review',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-25 12:12 PM',
    },
    timeline: [
      ...createTimeline('MYB-1005', 'Evelyn Park', 'Clearance Review'),
      {
        id: 'MYB-1005-event-3',
        timestamp: '2026-05-25T10:22:00',
        eventType: 'Clearance Match Accepted',
        actor: 'System',
        role: 'System',
        statusBefore: 'Pending Review',
        statusAfter: 'Clearance Review',
        notes: 'Possible identity match routed to the Clearance Unit.',
        duration: '2 min',
        relatedScreen: 'Clearance',
        category: 'System actions',
      },
    ],
  },
];

interface AdditionalCaseSeed {
  mybNumber: string;
  applicantName: string;
  description: string;
  county: string;
  region: string;
  filingDate: string;
  eligibilityDueDate: string;
  status: CaseStatus;
  currentStage: string;
  assignedGroup: string;
  assignedWorker: string;
  priority: Priority;
  exception: ExceptionType;
  expedited: boolean;
  program: string;
  householdSize: number;
  incomeSource: string;
  incomeAmount: string;
  rentAmount: string;
  blocker: string;
}

const additionalCaseSeeds: AdditionalCaseSeed[] = [
  {
    mybNumber: 'MYB-1006',
    applicantName: 'Farah Khan',
    description: 'Interview scheduled, income details pending',
    county: 'Albany',
    region: 'Capital',
    filingDate: '2026-05-14',
    eligibilityDueDate: '2026-06-12',
    status: 'Pending Review',
    currentStage: 'Interview Scheduling',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Avery Johnson',
    priority: 'Medium',
    exception: 'None',
    expedited: false,
    program: 'SNAP',
    householdSize: 3,
    incomeSource: 'Home care wages',
    incomeAmount: '$1,680.00',
    rentAmount: '$1,210.00',
    blocker: 'Interview confirmation is pending.',
  },
  {
    mybNumber: 'MYB-1007',
    applicantName: 'Jonah Ellis',
    description: 'Utility expense proof missing',
    county: 'Erie',
    region: 'Western',
    filingDate: '2026-05-12',
    eligibilityDueDate: '2026-06-10',
    status: 'Missing Information',
    currentStage: 'Information Request',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Noah Chen',
    priority: 'Normal',
    exception: 'Missing Info',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Restaurant wages',
    incomeAmount: '$1,240.00',
    rentAmount: '$875.00',
    blocker: 'Utility statement is missing.',
  },
  {
    mybNumber: 'MYB-1008',
    applicantName: 'Lena Ortiz',
    description: 'Supervisor review requested for denial reason',
    county: 'Queens',
    region: 'NYC',
    filingDate: '2026-05-08',
    eligibilityDueDate: '2026-06-06',
    status: 'Pending Review',
    currentStage: 'Supervisor Review',
    assignedGroup: 'Supervisor Queue',
    assignedWorker: 'Maya Rivera',
    priority: 'High',
    exception: 'Supervisor Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 1,
    incomeSource: 'Freelance income',
    incomeAmount: '$2,100.00',
    rentAmount: '$1,500.00',
    blocker: 'Supervisor needs to review the proposed reason code.',
  },
  {
    mybNumber: 'MYB-1009',
    applicantName: 'Marcus Green',
    description: 'Transaction submitted, batch pending',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-05-04',
    eligibilityDueDate: '2026-06-02',
    status: 'Approved',
    currentStage: 'Transaction Monitoring',
    assignedGroup: 'Budget Unit',
    assignedWorker: 'Priya Shah',
    priority: 'Normal',
    exception: 'WMS Pending',
    expedited: false,
    program: 'SNAP',
    householdSize: 4,
    incomeSource: 'Manufacturing wages',
    incomeAmount: '$2,350.00',
    rentAmount: '$1,325.00',
    blocker: 'Waiting for batch confirmation.',
  },
  {
    mybNumber: 'MYB-1010',
    applicantName: 'Nora Bennett',
    description: 'Clearance returned multiple possible matches',
    county: 'Hamilton',
    region: 'North Country',
    filingDate: '2026-05-22',
    eligibilityDueDate: '2026-06-05',
    status: 'Clearance Review',
    currentStage: 'Multiple Match Review',
    assignedGroup: 'Clearance Unit',
    assignedWorker: 'Jordan Lee',
    priority: 'High',
    exception: 'Clearance Match',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Child support',
    incomeAmount: '$540.00',
    rentAmount: '$710.00',
    blocker: 'Multiple identity candidates require decision.',
  },
  {
    mybNumber: 'MYB-1011',
    applicantName: 'Owen Patel',
    description: 'Expedited application with same-week due date',
    county: 'Albany',
    region: 'Capital',
    filingDate: '2026-05-25',
    eligibilityDueDate: '2026-05-28',
    status: 'Pending Review',
    currentStage: 'Expedited Screening',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Avery Johnson',
    priority: 'Critical',
    exception: 'Due Soon',
    expedited: true,
    program: 'SNAP Expedited',
    householdSize: 1,
    incomeSource: 'No current income',
    incomeAmount: '$0.00',
    rentAmount: '$650.00',
    blocker: 'Expedited eligibility screen must be completed this week.',
  },
  {
    mybNumber: 'MYB-1012',
    applicantName: 'Paige Simmons',
    description: 'Replacement lease proof received',
    county: 'Erie',
    region: 'Western',
    filingDate: '2026-05-11',
    eligibilityDueDate: '2026-06-09',
    status: 'Document Review',
    currentStage: 'Housing Document Review',
    assignedGroup: 'Document Review',
    assignedWorker: 'Priya Shah',
    priority: 'Medium',
    exception: 'OCR Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 5,
    incomeSource: 'Retail wages',
    incomeAmount: '$2,020.00',
    rentAmount: '$1,440.00',
    blocker: 'Replacement lease requires verification.',
  },
  {
    mybNumber: 'MYB-1013',
    applicantName: 'Quinn Foster',
    description: 'Ready for budget after validations completed',
    county: 'Queens',
    region: 'NYC',
    filingDate: '2026-05-02',
    eligibilityDueDate: '2026-05-31',
    status: 'Ready for Budget',
    currentStage: 'Budget Preparation',
    assignedGroup: 'Budget Unit',
    assignedWorker: 'Maya Rivera',
    priority: 'Normal',
    exception: 'None',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Office wages',
    incomeAmount: '$1,890.00',
    rentAmount: '$1,680.00',
    blocker: 'Budget review has not started.',
  },
  {
    mybNumber: 'MYB-1014',
    applicantName: 'Riley Moore',
    description: 'Denied case pending notice preview',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-04-30',
    eligibilityDueDate: '2026-05-29',
    status: 'Denied',
    currentStage: 'Notice Preparation',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Noah Chen',
    priority: 'Normal',
    exception: 'Supervisor Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 1,
    incomeSource: 'Full-time wages',
    incomeAmount: '$3,400.00',
    rentAmount: '$1,100.00',
    blocker: 'Denial notice text needs supervisor review.',
  },
  {
    mybNumber: 'MYB-1015',
    applicantName: 'Sasha Coleman',
    description: 'Applicant withdrew before interview',
    county: 'Hamilton',
    region: 'North Country',
    filingDate: '2026-05-01',
    eligibilityDueDate: '2026-05-30',
    status: 'Withdrawn',
    currentStage: 'Closure Review',
    assignedGroup: 'Operations',
    assignedWorker: 'Jordan Lee',
    priority: 'Normal',
    exception: 'None',
    expedited: false,
    program: 'SNAP',
    householdSize: 1,
    incomeSource: 'Part-time wages',
    incomeAmount: '$860.00',
    rentAmount: '$590.00',
    blocker: 'Closure reason should be confirmed.',
  },
  {
    mybNumber: 'MYB-1016',
    applicantName: 'Theo Wallace',
    description: 'Birth certificate replacement requested',
    county: 'Albany',
    region: 'Capital',
    filingDate: '2026-05-20',
    eligibilityDueDate: '2026-06-18',
    status: 'Document Review',
    currentStage: 'Citizenship Document Review',
    assignedGroup: 'Document Review',
    assignedWorker: 'Priya Shah',
    priority: 'Medium',
    exception: 'OCR Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 3,
    incomeSource: 'Warehouse wages',
    incomeAmount: '$1,940.00',
    rentAmount: '$1,020.00',
    blocker: 'Birth certificate image is partially cut off.',
  },
  {
    mybNumber: 'MYB-1017',
    applicantName: 'Uma Price',
    description: 'Due soon with open interview follow-up',
    county: 'Erie',
    region: 'Western',
    filingDate: '2026-05-05',
    eligibilityDueDate: '2026-05-27',
    status: 'Missing Information',
    currentStage: 'Follow-Up',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Avery Johnson',
    priority: 'High',
    exception: 'Due Soon',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'UIB',
    incomeAmount: '$780.00',
    rentAmount: '$825.00',
    blocker: 'Follow-up response is due before the eligibility date.',
  },
  {
    mybNumber: 'MYB-1018',
    applicantName: 'Victor Nguyen',
    description: 'Tax validation discrepancy needs review',
    county: 'Queens',
    region: 'NYC',
    filingDate: '2026-05-16',
    eligibilityDueDate: '2026-06-14',
    status: 'Pending Review',
    currentStage: 'External Validation',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Maya Rivera',
    priority: 'Medium',
    exception: 'WMS Pending',
    expedited: false,
    program: 'SNAP',
    householdSize: 4,
    incomeSource: 'Rideshare income',
    incomeAmount: '$2,260.00',
    rentAmount: '$1,850.00',
    blocker: 'Tax validation discrepancy needs worker review.',
  },
  {
    mybNumber: 'MYB-1019',
    applicantName: 'Willow Hart',
    description: 'Medical deduction review requested',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-05-09',
    eligibilityDueDate: '2026-06-07',
    status: 'Ready for Budget',
    currentStage: 'Budget Review',
    assignedGroup: 'Budget Unit',
    assignedWorker: 'Noah Chen',
    priority: 'Medium',
    exception: 'Supervisor Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 1,
    incomeSource: 'Retirement income',
    incomeAmount: '$1,320.00',
    rentAmount: '$940.00',
    blocker: 'Medical deduction needs final review.',
  },
  {
    mybNumber: 'MYB-1020',
    applicantName: 'Xavier Brooks',
    description: 'Identity match accepted, validations pending',
    county: 'Hamilton',
    region: 'North Country',
    filingDate: '2026-05-23',
    eligibilityDueDate: '2026-06-21',
    status: 'Pending Review',
    currentStage: 'Validation Queue',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Jordan Lee',
    priority: 'Normal',
    exception: 'None',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Seasonal work',
    incomeAmount: '$1,100.00',
    rentAmount: '$775.00',
    blocker: 'External validations have not started.',
  },
  {
    mybNumber: 'MYB-1021',
    applicantName: 'Yara Stone',
    description: 'Expedited candidate missing rent proof',
    county: 'Albany',
    region: 'Capital',
    filingDate: '2026-05-26',
    eligibilityDueDate: '2026-05-29',
    status: 'Missing Information',
    currentStage: 'Expedited Missing Info',
    assignedGroup: 'Eligibility Review',
    assignedWorker: 'Avery Johnson',
    priority: 'Critical',
    exception: 'Missing Info',
    expedited: true,
    program: 'SNAP Expedited',
    householdSize: 3,
    incomeSource: 'No current income',
    incomeAmount: '$0.00',
    rentAmount: '$1,050.00',
    blocker: 'Rent proof is missing for expedited review.',
  },
  {
    mybNumber: 'MYB-1022',
    applicantName: 'Zane Kim',
    description: 'Paystub replacement uploaded overnight',
    county: 'Erie',
    region: 'Western',
    filingDate: '2026-05-17',
    eligibilityDueDate: '2026-06-15',
    status: 'Document Review',
    currentStage: 'Replacement Review',
    assignedGroup: 'Document Review',
    assignedWorker: 'Priya Shah',
    priority: 'High',
    exception: 'OCR Review',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Grocery wages',
    incomeAmount: '$1,540.00',
    rentAmount: '$995.00',
    blocker: 'Replacement paystub is waiting for verification.',
  },
  {
    mybNumber: 'MYB-1023',
    applicantName: 'Amara Wilson',
    description: 'Household member no match found',
    county: 'Queens',
    region: 'NYC',
    filingDate: '2026-05-13',
    eligibilityDueDate: '2026-06-11',
    status: 'Clearance Review',
    currentStage: 'New Identifier Review',
    assignedGroup: 'Clearance Unit',
    assignedWorker: 'Jordan Lee',
    priority: 'Medium',
    exception: 'Clearance Match',
    expedited: false,
    program: 'SNAP',
    householdSize: 5,
    incomeSource: 'School aide wages',
    incomeAmount: '$1,760.00',
    rentAmount: '$1,900.00',
    blocker: 'Household member may need a new CIN / SIN.',
  },
  {
    mybNumber: 'MYB-1024',
    applicantName: 'Caleb Ross',
    description: 'Approved case awaiting finalization',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-04-28',
    eligibilityDueDate: '2026-05-27',
    status: 'Approved',
    currentStage: 'Finalize Case',
    assignedGroup: 'Operations',
    assignedWorker: 'Maya Rivera',
    priority: 'Normal',
    exception: 'WMS Pending',
    expedited: false,
    program: 'SNAP',
    householdSize: 2,
    incomeSource: 'Pension',
    incomeAmount: '$1,190.00',
    rentAmount: '$720.00',
    blocker: 'Transaction acceptance needs final closeout.',
  },
  {
    mybNumber: 'MYB-1025',
    applicantName: 'Daphne Young',
    description: 'Clean application entering budget queue',
    county: 'Hamilton',
    region: 'North Country',
    filingDate: '2026-05-19',
    eligibilityDueDate: '2026-06-17',
    status: 'Ready for Budget',
    currentStage: 'Budget Queue',
    assignedGroup: 'Budget Unit',
    assignedWorker: 'Noah Chen',
    priority: 'Normal',
    exception: 'None',
    expedited: false,
    program: 'SNAP',
    householdSize: 3,
    incomeSource: 'Bakery wages',
    incomeAmount: '$1,620.00',
    rentAmount: '$980.00',
    blocker: 'Awaiting budget worker pickup.',
  },
];

function checklistForSeed(seed: AdditionalCaseSeed): Array<{ label: string; status: ChecklistStatus }> {
  return baseChecklist.map((item) => {
    if (seed.status === 'Approved' || seed.status === 'Denied' || seed.status === 'Withdrawn') {
      return { ...item, status: 'Complete' };
    }

    if (item.label === 'Application reviewed') {
      return { ...item, status: seed.status === 'Missing Information' ? 'Blocked' : 'Complete' };
    }

    if (item.label === 'Interview complete') {
      return { ...item, status: seed.currentStage.includes('Interview') || seed.status === 'Missing Information' ? 'Needs Review' : 'Complete' };
    }

    if (item.label === 'Documents reviewed') {
      return { ...item, status: seed.status === 'Document Review' ? 'Blocked' : seed.status === 'Pending Review' ? 'Needs Review' : 'Complete' };
    }

    if (item.label === 'Clearance reviewed') {
      return { ...item, status: seed.status === 'Clearance Review' ? 'Blocked' : seed.status === 'Ready for Budget' ? 'Complete' : 'Needs Review' };
    }

    if (item.label === 'External validations reviewed') {
      return { ...item, status: seed.currentStage.includes('Validation') ? 'Needs Review' : seed.status === 'Ready for Budget' ? 'Complete' : 'Not Started' };
    }

    if (item.label === 'Budget reviewed') {
      return { ...item, status: seed.status === 'Ready for Budget' ? 'Needs Review' : 'Not Started' };
    }

    return item;
  });
}

function interviewForSeed(seed: AdditionalCaseSeed): BenefitCase['interview'] {
  const missingFields = seed.exception === 'Missing Info'
    ? ['Verification detail requested', seed.blocker]
    : seed.status === 'Document Review'
      ? ['Document replacement follow-up']
      : [];

  return {
    status: seed.currentStage.includes('Interview') ? 'Scheduled' : missingFields.length ? 'Follow-up Needed' : 'Complete',
    method: seed.currentStage.includes('Interview') ? 'Phone' : 'Phone',
    scheduledAt: seed.currentStage.includes('Interview') ? '2026-05-27 02:00 PM' : 'Completed or not required',
    missingFields,
    workerNotes: [seed.blocker],
    applicantContactStatus: missingFields.length ? 'Waiting on applicant' : 'Reached',
    applicantResponseStatus: missingFields.length ? 'Waiting for Response' : 'Response Received',
    mockEmailState: missingFields.length ? 'Waiting for Response' : 'Response Received',
  };
}

function documentsForSeed(seed: AdditionalCaseSeed): DocumentRecord[] {
  const confidence = seed.status === 'Document Review' || seed.exception === 'OCR Review' ? 55 : 87;
  const documents = standardDocuments(seed.mybNumber, seed.applicantName, confidence);

  if (seed.status === 'Document Review') {
    return documents.map((document) => document.name === 'Paystub'
      ? { ...document, status: 'Needs Review', notes: [...document.notes, seed.blocker] }
      : document);
  }

  return documents;
}

function budgetReadinessForSeed(seed: AdditionalCaseSeed): Array<{ label: string; status: ChecklistStatus }> {
  return [
    { label: 'Application complete', status: seed.status === 'Missing Information' ? 'Blocked' : 'Complete' },
    { label: 'Income verified', status: seed.status === 'Document Review' ? 'Blocked' : seed.status === 'Ready for Budget' || seed.status === 'Approved' ? 'Complete' : 'Needs Review' },
    { label: 'Expenses verified', status: seed.exception === 'Missing Info' ? 'Needs Review' : 'Complete' },
    { label: 'Clearance resolved', status: seed.status === 'Clearance Review' ? 'Blocked' : 'Complete' },
  ];
}

function transactionForSeed(seed: AdditionalCaseSeed): BenefitCase['transaction'] {
  if (seed.status === 'Approved') {
    return {
      readiness: 'Ready for final transaction monitoring',
      submissionStatus: seed.exception === 'WMS Pending' ? 'Batch Pending' : 'Accepted',
      batchStatus: seed.exception === 'WMS Pending' ? 'Pending' : 'Accepted',
      finalStatus: 'Ready to finalize',
      lastUpdated: '2026-05-26 09:30 AM',
    };
  }

  if (seed.status === 'Denied' || seed.status === 'Withdrawn') {
    return {
      readiness: 'Closure notice pending',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: seed.status,
      lastUpdated: '2026-05-26 08:45 AM',
    };
  }

  return {
    readiness: `Blocked by ${seed.currentStage.toLowerCase()}`,
    submissionStatus: 'Not Submitted',
    batchStatus: 'Not queued',
    finalStatus: 'Open',
    lastUpdated: '2026-05-26 10:15 AM',
  };
}

function createAdditionalCase(seed: AdditionalCaseSeed, index: number): BenefitCase {
  const caseId = seed.mybNumber;
  const household: HouseholdMember[] = [
    {
      name: seed.applicantName,
      relationship: 'Self',
      age: 24 + (index % 39),
      applying: true,
      identifierStatus: seed.status === 'Clearance Review' ? 'Possible match' : `Matched CIN-${620000 + index}`,
    },
  ];

  if (seed.householdSize > 1) {
    household.push({
      name: `${seed.applicantName.split(' ')[0]} household member`,
      relationship: seed.householdSize > 3 ? 'Child' : 'Spouse',
      age: seed.householdSize > 3 ? 9 + (index % 7) : 31 + (index % 15),
      applying: true,
      identifierStatus: seed.status === 'Clearance Review' ? 'No match / assign new identifier' : `Matched SIN-${730000 + index}`,
    });
  }

  return {
    id: `case-${seed.mybNumber.replace('MYB-', '')}`,
    mybNumber: seed.mybNumber,
    applicantName: seed.applicantName,
    description: seed.description,
    county: seed.county,
    region: seed.region,
    filingDate: seed.filingDate,
    eligibilityDueDate: seed.eligibilityDueDate,
    status: seed.status,
    currentStage: seed.currentStage,
    assignedGroup: seed.assignedGroup,
    assignedWorker: seed.assignedWorker,
    priority: seed.priority,
    exception: seed.exception,
    expedited: seed.expedited,
    program: seed.program,
    currentBlockers: seed.blocker ? [seed.blocker] : [],
    applicant: {
      email: `${seed.applicantName.toLowerCase().replace(/\s+/g, '.')}@example.test`,
      phone: `(555) 01${String(index + 26).padStart(2, '0')}`,
      address: `${100 + index} Main Street, ${seed.county}, NY`,
      preferredLanguage: index % 5 === 0 ? 'Spanish' : 'English',
      contactPreference: index % 3 === 0 ? 'Phone' : 'Email',
    },
    household,
    income: [
      {
        source: seed.incomeSource,
        person: seed.applicantName,
        frequency: seed.incomeAmount === '$0.00' ? 'Monthly' : index % 2 === 0 ? 'Biweekly' : 'Monthly',
        grossAmount: seed.incomeAmount,
        verified: !['Document Review', 'Missing Information'].includes(seed.status),
      },
    ],
    expenses: [
      { type: 'Rent', amount: seed.rentAmount, frequency: 'Monthly', verified: seed.exception !== 'Missing Info' },
      { type: 'Utilities', amount: `$${145 + (index * 9)}.00`, frequency: 'Monthly', verified: index % 4 !== 0 },
    ],
    checklist: checklistForSeed(seed),
    application: {
      signatureStatus: seed.exception === 'Missing Info' ? 'Needs worker confirmation' : 'Signed electronically',
      responses: [
        { label: 'Household size', value: `${seed.householdSize} household member${seed.householdSize === 1 ? '' : 's'} reported.` },
        { label: 'Employment', value: `${seed.incomeSource} reported as current income source.` },
        { label: 'Shelter expense', value: `${seed.rentAmount} rent reported.` },
      ],
      submittedDocumentsSummary: 'Application, identity, income, and housing documents are represented with mock records.',
    },
    interview: interviewForSeed(seed),
    documents: documentsForSeed(seed),
    clearance: defaultClearance(caseId, seed.applicantName).map((scenario) => seed.status === 'Clearance Review' && scenario.title === 'Possible match'
      ? { ...scenario, matchScore: 78, status: 'Open' }
      : scenario),
    validations: defaultValidations(caseId).map((validation) => seed.currentStage.includes('Validation')
      ? { ...validation, status: validation.name === 'Data Discrepancy Summary' ? 'Worker Review Required' : 'Discrepancy Found' }
      : validation),
    budget: {
      readiness: budgetReadinessForSeed(seed),
      incomeUsed: `${seed.incomeAmount}/month mock input`,
      expensesUsed: `${seed.rentAmount}/month rent plus utilities`,
      mockBenefitAmount: `$${210 + (index * 13)}/month`,
      status: seed.status === 'Ready for Budget' ? 'Ready for worker review' : `Blocked by ${seed.currentStage}`,
      notes: [seed.blocker],
    },
    notices: defaultNotices(caseId),
    transaction: transactionForSeed(seed),
    timeline: createTimeline(caseId, seed.applicantName, seed.status),
  };
}

export const initialCases: BenefitCase[] = [
  ...primaryCases,
  ...additionalCaseSeeds.map(createAdditionalCase),
];
