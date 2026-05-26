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

export const initialCases: BenefitCase[] = [
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
    applicantName: 'Devon Brooks',
    description: 'Blurry paystub, document review required',
    county: 'Monroe',
    region: 'Finger Lakes',
    filingDate: '2026-05-21',
    eligibilityDueDate: '2026-05-29',
    status: 'Document Review',
    currentStage: 'Income Document Review',
    assignedGroup: 'Document Review',
    assignedWorker: 'Priya Shah',
    priority: 'High',
    exception: 'OCR Review',
    expedited: false,
    program: 'SNAP',
    currentBlockers: ['Paystub image is blurry and below confidence threshold.'],
    applicant: {
      email: 'devon.brooks@example.test',
      phone: '(585) 555-0198',
      address: '500 East Avenue, Rochester, NY 14607',
      preferredLanguage: 'English',
      contactPreference: 'Email',
    },
    household: [
      { name: 'Devon Brooks', relationship: 'Self', age: 31, applying: true, identifierStatus: 'Matched CIN-550903' },
      { name: 'Sam Brooks', relationship: 'Child', age: 4, applying: true, identifierStatus: 'Matched SIN-449100' },
    ],
    income: [
      { source: 'Warehouse wages', person: 'Devon Brooks', frequency: 'Biweekly', grossAmount: '$1,420.00', verified: false },
    ],
    expenses: [
      { type: 'Rent', amount: '$1,250.00', frequency: 'Monthly', verified: true },
      { type: 'Child care', amount: '$300.00', frequency: 'Monthly', verified: false },
    ],
    checklist: baseChecklist.map((item) => ({
      ...item,
      status: item.label === 'Application reviewed'
        ? 'Complete'
        : item.label === 'Documents reviewed'
          ? 'Blocked'
          : item.status,
    })),
    application: {
      signatureStatus: 'Signed electronically',
      responses: [
        { label: 'Employment', value: 'Warehouse wages with recent paystub uploaded.' },
        { label: 'Child care', value: 'Monthly child care expense reported.' },
        { label: 'Shelter expense', value: 'Rent and utilities reported.' },
      ],
      submittedDocumentsSummary: 'Application, identity, lease, birth certificate, and low-confidence paystub received.',
    },
    interview: {
      status: 'Complete',
      method: 'Phone',
      scheduledAt: '2026-05-22 01:30 PM',
      missingFields: ['Readable paystub replacement'],
      workerNotes: ['Applicant can provide replacement paystub by email for the prototype scenario.'],
      applicantContactStatus: 'Reached',
      applicantResponseStatus: 'Waiting for Response',
      mockEmailState: 'Drafted',
    },
    documents: standardDocuments('MYB-1004', 'Devon Brooks', 42),
    clearance: defaultClearance('MYB-1004', 'Devon Brooks'),
    validations: defaultValidations('MYB-1004'),
    budget: {
      readiness: [
        { label: 'Application complete', status: 'Complete' },
        { label: 'Income verified', status: 'Blocked' },
        { label: 'Expenses verified', status: 'Needs Review' },
        { label: 'Clearance resolved', status: 'Complete' },
      ],
      incomeUsed: '$2,840/month pending readable paystub',
      expensesUsed: '$1,550/month',
      mockBenefitAmount: '$298/month',
      status: 'Blocked by document review',
      notes: ['Income cannot be accepted until replacement paystub is verified.'],
    },
    notices: defaultNotices('MYB-1004'),
    transaction: {
      readiness: 'Blocked by document review',
      submissionStatus: 'Not Submitted',
      batchStatus: 'Not queued',
      finalStatus: 'Open',
      lastUpdated: '2026-05-25 03:40 PM',
    },
    timeline: [
      ...createTimeline('MYB-1004', 'Devon Brooks', 'Document Review'),
      {
        id: 'MYB-1004-event-3',
        timestamp: '2026-05-25T13:08:00',
        eventType: 'Missing Info Requested',
        actor: 'Priya Shah',
        role: 'Document Reviewer',
        statusBefore: 'Document Review',
        statusAfter: 'Document Review',
        notes: 'Paystub marked for OCR review due to low confidence.',
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
