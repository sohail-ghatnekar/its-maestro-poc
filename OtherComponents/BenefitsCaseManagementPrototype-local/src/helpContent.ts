import type { Role } from './mockData';

export type HelpContextId =
  | 'overview'
  | 'inbox'
  | 'detail'
  | 'summary'
  | 'application'
  | 'interview'
  | 'documents'
  | 'clearance'
  | 'validation'
  | 'budget'
  | 'notices'
  | 'transaction'
  | 'timeline'
  | 'json'
  | 'operations'
  | 'testing'
  | 'settings'
  | 'helpCenter';

export type HelpCategory =
  | 'Getting Started'
  | 'Case Inbox'
  | 'Case Review'
  | 'Missing Information'
  | 'Documents'
  | 'Clearance / CIN or SIN Matching'
  | 'External Validation'
  | 'Budget'
  | 'Forms & Notices'
  | 'Transaction Status'
  | 'Dashboard & Metrics'
  | 'Testing'
  | 'Roles & Permissions'
  | 'Mock Data / Demo Mode';

export interface HelpContent {
  screenId: HelpContextId;
  category: HelpCategory;
  title: string;
  summary: string;
  workerGuidance: string[];
  checklist: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  relatedActions: string[];
  externalReferences: Array<{ label: string; type: 'placeholder' }>;
}

export const helpCategories: HelpCategory[] = [
  'Getting Started',
  'Case Inbox',
  'Case Review',
  'Missing Information',
  'Documents',
  'Clearance / CIN or SIN Matching',
  'External Validation',
  'Budget',
  'Forms & Notices',
  'Transaction Status',
  'Dashboard & Metrics',
  'Testing',
  'Roles & Permissions',
  'Mock Data / Demo Mode',
];

export const tooltips = {
  mybNumber: 'Unique application/case identifier shown in the worker inbox.',
  filingDate: 'Date used to track application processing timelines.',
  eligibilityDueDate: 'Date by which the case should be completed or acted upon.',
  status: 'Current case state, such as Pending Review, Approved, Missing Information, or Denied.',
  priority: 'Mock priority based on due date, exception type, and case state.',
  assignedGroup: 'Worker group currently responsible for the task.',
  exceptionBadge: 'Highlights the primary issue requiring attention.',
  reusableDocument: 'Indicates whether this document may be reused across future cases.',
  confidence: 'Mock confidence score for extracted document data.',
  reasonCode: 'Code that drives notice wording or case outcome handling.',
  dynamicText: 'Worker-entered text that may be included in a generated notice.',
  transactionStatus: 'Mock status of the final transaction submission.',
};

export const exceptionExplanations: Record<string, string> = {
  'Missing Info': 'This case has one or more unanswered or unresolved fields.',
  'OCR Review': 'A document has a low confidence value or requires worker review.',
  'Clearance Match': 'One or more people may match existing records and need worker confirmation.',
  'Due Soon': 'This case is approaching the eligibility due date.',
  'Supervisor Review': 'The case requires review before final action.',
  'WMS Pending': 'The transaction is waiting on a mock batch or callback result.',
  None: 'No primary exception is currently highlighted for this case.',
};

const commonReferences = [
  { label: 'Worker Procedure Reference', type: 'placeholder' as const },
  { label: 'Program Code Reference', type: 'placeholder' as const },
];

export const helpContent: Record<HelpContextId, HelpContent> = {
  overview: {
    screenId: 'overview',
    category: 'Getting Started',
    title: 'Overview Help',
    summary: 'Use the overview to understand today’s workload and decide where to start.',
    workerGuidance: [
      'Start with due-soon, expedited, and high-priority cases.',
      'Use the role selector to demonstrate how local views change.',
      'Open the inbox when you are ready to begin case work.',
    ],
    checklist: [
      'Review workload metrics.',
      'Check the current role.',
      'Open the inbox for case-level work.',
    ],
    keyTerms: [
      { term: 'Open applications', definition: 'Cases that have not reached final closure in the mock workflow.' },
      { term: 'Average case age', definition: 'Mock average number of days since filing.' },
    ],
    relatedActions: ['Open Case Inbox', 'Continue MYB-1004'],
    externalReferences: commonReferences,
  },
  inbox: {
    screenId: 'inbox',
    category: 'Case Inbox',
    title: 'Case Inbox Help',
    summary: 'Use the inbox to find, filter, triage, assign, and open worker cases.',
    workerGuidance: [
      'Review cases by priority and due date.',
      'Open the highest-risk case first.',
      'Look for exception badges before assigning work.',
      'Use filters to find missing information or document issues.',
    ],
    checklist: [
      'Review cases by priority and due date.',
      'Open the highest-risk case first.',
      'Look for exception badges.',
      'Use filters to find missing information or document issues.',
    ],
    keyTerms: [
      { term: 'MyB Number', definition: tooltips.mybNumber },
      { term: 'Assigned Group', definition: tooltips.assignedGroup },
      { term: 'Exception Badge', definition: tooltips.exceptionBadge },
    ],
    relatedActions: ['Open Case', 'Assign to Me', 'Mark Priority', 'View Timeline'],
    externalReferences: commonReferences,
  },
  detail: {
    screenId: 'detail',
    category: 'Case Review',
    title: 'Case Detail Help',
    summary: 'Use the case workspace tabs to complete a mock worker review end to end.',
    workerGuidance: [
      'Begin with Summary to understand blockers.',
      'Use tabs from left to right for a guided review path.',
      'Timeline / Audit records actions taken during the click-through.',
    ],
    checklist: ['Review case header.', 'Open Summary.', 'Move through tabs.', 'Check Timeline / Audit before finalizing.'],
    keyTerms: [
      { term: 'Current Stage', definition: 'The mock process stage that currently owns the case.' },
      { term: 'Priority', definition: tooltips.priority },
    ],
    relatedActions: ['Back to Case Inbox', 'Switch Case', 'Open Help Drawer'],
    externalReferences: commonReferences,
  },
  summary: {
    screenId: 'summary',
    category: 'Case Review',
    title: 'Summary Help',
    summary: 'Use Summary to understand the applicant, household, blockers, SLA, and worker checklist.',
    workerGuidance: [
      'Review profile, household, income, and expenses before taking action.',
      'Use the checklist to decide whether the case can move forward.',
      'Request supervisor review when final action needs approval.',
    ],
    checklist: ['Review applicant profile.', 'Check blockers.', 'Review due date/SLA.', 'Update the worker checklist.'],
    keyTerms: [
      { term: 'SLA', definition: 'A target timeline for completing or acting on the case.' },
      { term: 'Blocked', definition: 'A local state indicating work cannot proceed until an issue is resolved.' },
    ],
    relatedActions: ['Start Review', 'Assign to Me', 'Request Supervisor Review', 'Mark Ready for Next Step'],
    externalReferences: commonReferences,
  },
  application: {
    screenId: 'application',
    category: 'Case Review',
    title: 'Application Help',
    summary: 'Use Application to inspect the mock submitted application and responses.',
    workerGuidance: [
      'Review signature status before continuing.',
      'Compare application responses with documents and validations.',
      'Flag missing fields when an answer is incomplete.',
    ],
    checklist: ['Review PDF placeholder.', 'Check applicant responses.', 'Review household members.', 'Flag missing fields when needed.'],
    keyTerms: [
      { term: 'Signature Status', definition: 'Whether the application appears signed in the mock data.' },
      { term: 'Submitted Documents', definition: 'Documents provided with the application.' },
    ],
    relatedActions: ['View Full Application', 'Flag Missing Field', 'Add Worker Note'],
    externalReferences: commonReferences,
  },
  interview: {
    screenId: 'interview',
    category: 'Missing Information',
    title: 'Interview / Missing Info Help',
    summary: 'Use this tab to schedule interviews, track missing fields, and simulate applicant follow-up.',
    workerGuidance: [
      'Confirm interview method and scheduled date.',
      'Track missing fields before budget or transaction steps.',
      'Mock email actions do not send real email.',
    ],
    checklist: ['Review interview status.', 'Check missing fields.', 'Draft or send mock request.', 'Simulate applicant response.'],
    keyTerms: [
      { term: 'Missing Information', definition: 'Unresolved fields or evidence that block case completion.' },
      { term: 'Applicant Response Status', definition: 'Mock state showing whether the applicant has responded.' },
    ],
    relatedActions: ['Schedule Interview', 'Send Mock Email', 'Simulate Applicant Response', 'Add Follow-Up Note'],
    externalReferences: commonReferences,
  },
  documents: {
    screenId: 'documents',
    category: 'Documents',
    title: 'Documents Help',
    summary: 'Use this tab to review uploaded documents and determine whether they can be accepted for this case.',
    workerGuidance: [
      'Review the document image before marking it verified.',
      'Check that the document type matches the verification need.',
      'Identity documents may be reusable; income and expense documents are usually case-specific.',
      'If the document is blurry or incomplete, request a replacement before final transaction submission.',
    ],
    checklist: [
      'Open the uploaded document.',
      'Confirm the document type.',
      'Check extracted values and confidence.',
      'Mark verified or insufficient.',
      'Request replacement if needed.',
    ],
    keyTerms: [
      { term: 'Reusable document', definition: 'A document that can potentially be reused across cases, such as identity proof.' },
      { term: 'Case-specific document', definition: 'A document that usually applies only to this application, such as a recent paystub.' },
      { term: 'Confidence', definition: tooltips.confidence },
    ],
    relatedActions: ['Mark Verified', 'Mark Insufficient', 'Request Replacement', 'Simulate Replacement Upload'],
    externalReferences: [
      { label: 'Worker Procedure Reference', type: 'placeholder' },
      { label: 'Document Type Codes', type: 'placeholder' },
    ],
  },
  clearance: {
    screenId: 'clearance',
    category: 'Clearance / CIN or SIN Matching',
    title: 'Clearance Help',
    summary: 'Use CIN / SIN Matching to review identity candidates and decide whether to accept, reject, or assign a new identifier.',
    workerGuidance: [
      'Compare match score with matching criteria and mismatch indicators.',
      'Use override reasons when accepting an uncertain match.',
      'Assign a new identifier only when no candidate is acceptable.',
    ],
    checklist: ['Run mock search.', 'Review match candidates.', 'Check mismatches.', 'Accept, reject, or assign new CIN / SIN.'],
    keyTerms: [
      { term: 'CIN / SIN', definition: 'Configurable identifier terminology used in this demo.' },
      { term: 'Match Score', definition: 'Mock score representing how closely records appear to match.' },
    ],
    relatedActions: ['Run Mock Search', 'Accept Match', 'Reject Match', 'Assign New CIN / SIN'],
    externalReferences: commonReferences,
  },
  validation: {
    screenId: 'validation',
    category: 'External Validation',
    title: 'External Validation Help',
    summary: 'Use validation cards to review mock employment, tax, paystub, and discrepancy states.',
    workerGuidance: [
      'Run mock checks to demonstrate state changes.',
      'Review discrepancies before moving to budget.',
      'Mark validation complete when all cards are resolved.',
    ],
    checklist: ['Run mock employment check.', 'Run mock tax check.', 'Compare paystub.', 'Resolve discrepancies.'],
    keyTerms: [
      { term: 'External Validation', definition: 'A mock comparison against external evidence or records.' },
      { term: 'Discrepancy', definition: 'A mismatch that requires worker review in the prototype.' },
    ],
    relatedActions: ['Run Mock Employment Check', 'Compare Paystub', 'Review Discrepancy', 'Mark Validation Complete'],
    externalReferences: commonReferences,
  },
  budget: {
    screenId: 'budget',
    category: 'Budget',
    title: 'Budget Help',
    summary: 'Use Budget to review readiness, mock income/expense inputs, calculation status, and worker notes.',
    workerGuidance: [
      'Confirm application, income, expenses, and clearance are ready.',
      'Create a mock budget before marking it reviewed.',
      'Use the error state to show how a worker would recover.',
    ],
    checklist: ['Review readiness checklist.', 'Create budget.', 'Simulate calculation.', 'Mark budget reviewed.'],
    keyTerms: [
      { term: 'Budget', definition: 'Mock eligibility calculation using income and expense inputs.' },
      { term: 'Benefit Amount', definition: 'Static monthly value shown for demo purposes only.' },
    ],
    relatedActions: ['Create Budget', 'Simulate Successful Calculation', 'Simulate Error', 'Mark Budget Reviewed'],
    externalReferences: commonReferences,
  },
  notices: {
    screenId: 'notices',
    category: 'Forms & Notices',
    title: 'Forms & Notices Help',
    summary: 'Use this tab to select reason codes, complete dynamic text, preview, approve, and mock-send notices.',
    workerGuidance: [
      'Select the correct notice type.',
      'Add reason codes that match the case outcome.',
      'Complete dynamic text when prompted.',
      'Preview before approving or sending.',
    ],
    checklist: ['Select notice type.', 'Add reason codes.', 'Complete dynamic text if prompted.', 'Preview the notice.', 'Approve or revise before sending.'],
    keyTerms: [
      { term: 'Reason Code', definition: tooltips.reasonCode },
      { term: 'Dynamic Text', definition: tooltips.dynamicText },
      { term: 'Notice Preview', definition: 'Mock rendering of the notice content before approval.' },
    ],
    relatedActions: ['Add Reason Code', 'Generate Notice Preview', 'Approve Notice', 'Send Mock Notice'],
    externalReferences: commonReferences,
  },
  transaction: {
    screenId: 'transaction',
    category: 'Transaction Status',
    title: 'Transaction Status Help',
    summary: 'Use this tab to demonstrate mock final submission, batch processing, acceptance, rejection, correction, and finalization.',
    workerGuidance: [
      'Confirm the case is ready before submitting.',
      'Review accepted, rejected, or pending state.',
      'Correct and resubmit if rejected.',
      'Finalize only after acceptance.',
    ],
    checklist: ['Confirm readiness.', 'Submit mock transaction.', 'Review pending/accepted/rejected state.', 'Correct and resubmit if rejected.'],
    keyTerms: [
      { term: 'Transaction Status', definition: tooltips.transactionStatus },
      { term: 'Batch Pending', definition: 'Mock state showing a submitted transaction waiting on batch processing.' },
    ],
    relatedActions: ['Submit Mock Transaction', 'Simulate Batch Pending', 'Simulate Accepted', 'Correct and Resubmit', 'Finalize Case'],
    externalReferences: commonReferences,
  },
  timeline: {
    screenId: 'timeline',
    category: 'Case Review',
    title: 'Timeline / Audit Help',
    summary: 'Use Timeline / Audit to review the mock history of worker, system, document, notice, and transaction events.',
    workerGuidance: [
      'Filter events by category.',
      'Review before/after states for key actions.',
      'Use audit JSON for demo export only.',
    ],
    checklist: ['Choose event filters.', 'Review recent events.', 'Open event details.', 'Export mock audit JSON if needed.'],
    keyTerms: [
      { term: 'Audit Timeline', definition: 'Mock chronological record of case activity.' },
      { term: 'Status Before/After', definition: 'The state transition captured for an event.' },
    ],
    relatedActions: ['Add Mock Event', 'Export Audit JSON', 'View Details'],
    externalReferences: commonReferences,
  },
  json: {
    screenId: 'json',
    category: 'Mock Data / Demo Mode',
    title: 'Raw Case JSON Help',
    summary: 'Use Raw Case JSON to inspect the local mock object behind the selected case.',
    workerGuidance: [
      'This is a prototype/debug view, not a production data contract.',
      'Copy or download JSON to inspect the current local state.',
      'Reset case data if the click-through needs to restart.',
    ],
    checklist: ['Review formatted JSON.', 'Copy or download if useful.', 'Reset local case data when needed.'],
    keyTerms: [
      { term: 'Mock Data', definition: 'Static local data used for the click-through.' },
      { term: 'Raw JSON', definition: 'The selected case object shown for inspection.' },
    ],
    relatedActions: ['Copy JSON', 'Reset Case Data', 'Download JSON'],
    externalReferences: commonReferences,
  },
  operations: {
    screenId: 'operations',
    category: 'Dashboard & Metrics',
    title: 'Operations Dashboard Help',
    summary: 'Use the dashboard to understand workload health, bottlenecks, due dates, and county/region metrics.',
    workerGuidance: [
      'Click counties or bottlenecks to filter the inbox.',
      'Review due-soon and review counts before reassigning work.',
      'Use metrics as demo signals only.',
    ],
    checklist: ['Review workload cards.', 'Compare county/region bottlenecks.', 'Click a bottleneck to filter inbox.', 'Reset filters when done.'],
    keyTerms: [
      { term: 'Primary Bottleneck', definition: 'The largest mock issue affecting a county or region.' },
      { term: 'Average Case Age', definition: 'Mock average time since filing.' },
    ],
    relatedActions: ['Click County', 'Click Bottleneck', 'Reset Filters'],
    externalReferences: commonReferences,
  },
  testing: {
    screenId: 'testing',
    category: 'Testing',
    title: 'Testing Help',
    summary: 'Use Testing to present editable SOAP, REST, and SFTP command text boxes with mock return information.',
    workerGuidance: [
      'Select the test type that matches the integration story being demonstrated.',
      'Use the example command as a starting point, then open the command text box.',
      'Run Mock Test is enabled only after the command text box is open.',
      'The return area stays blank until a mock test is run.',
      'Treat all targets, commands, tokens, and responses as fake demo content.',
    ],
    checklist: [
      'Choose SOAP, REST, or SFTP.',
      'Review the target and expected result.',
      'Open the command text box.',
      'Run the mock test to populate return information.',
    ],
    keyTerms: [
      { term: 'Mock Test', definition: 'A local-only placeholder action that updates the UI without executing an external call.' },
      { term: 'Command Text Box', definition: 'Editable local command area used to preview the future automation-backed testing flow.' },
      { term: 'Return Information', definition: 'Static response content that appears only after Run Mock Test is clicked.' },
    ],
    relatedActions: ['Run Mock Test', 'Copy Command', 'Copy Return'],
    externalReferences: [
      { label: 'Integration Testing Reference', type: 'placeholder' },
      { label: 'SFTP Intake Reference', type: 'placeholder' },
    ],
  },
  settings: {
    screenId: 'settings',
    category: 'Roles & Permissions',
    title: 'Mock Settings Help',
    summary: 'Use settings to switch local roles, toggle banners, reset mock data, and enable Demo Coach Tips.',
    workerGuidance: [
      'Role switching is local and does not provide real security.',
      'Demo Coach Tips guide presenters through the scenario.',
      'Reset mock data before a fresh walkthrough.',
    ],
    checklist: ['Select role.', 'Set worker name.', 'Toggle Demo Coach Tips.', 'Reset mock data when needed.'],
    keyTerms: [
      { term: 'Role Switcher', definition: 'Local-only control that changes labels and disabled states.' },
      { term: 'Demo Coach Tips', definition: 'Presenter hints that appear on key screens.' },
    ],
    relatedActions: ['Change Role', 'Toggle Demo Coach Tips', 'Mock Data Reset'],
    externalReferences: commonReferences,
  },
  helpCenter: {
    screenId: 'helpCenter',
    category: 'Getting Started',
    title: 'Help Center',
    summary: 'Search static prototype guidance, FAQs, glossary terms, and screen-by-screen instructions.',
    workerGuidance: [
      'Use search to find terms such as reason code, document, or transaction.',
      'Filter by category to focus the guidance list.',
      'Use this page as a presenter reference during demos.',
    ],
    checklist: ['Search static help.', 'Filter by category.', 'Review FAQs.', 'Use the walkthrough guide.'],
    keyTerms: [
      { term: 'Self-help', definition: 'Static contextual guidance embedded in the frontend.' },
      { term: 'Placeholder Reference', definition: 'A mock external link label with no real integration.' },
    ],
    relatedActions: ['Search Help', 'Filter Category', 'Open Context Drawer'],
    externalReferences: commonReferences,
  },
};

export const faqs = [
  {
    question: 'What should I work first?',
    answer: 'Start with high-priority cases, due-soon cases, expedited cases, and cases with exception badges.',
    category: 'Getting Started' as HelpCategory,
  },
  {
    question: 'What does PR mean?',
    answer: 'Pending Review. The case is not finalized and still requires worker action.',
    category: 'Case Inbox' as HelpCategory,
  },
  {
    question: 'What does AP mean?',
    answer: 'Approved. The case has reached an approved status in the mock workflow.',
    category: 'Case Review' as HelpCategory,
  },
  {
    question: 'What should I do when a document is blurry?',
    answer: 'Mark it insufficient and use the replacement request action. In this prototype, you can simulate the applicant response.',
    category: 'Documents' as HelpCategory,
  },
  {
    question: 'Why is a document marked reusable?',
    answer: 'Some identity-type documents may be reused across cases, while income or expense documents are usually case-specific.',
    category: 'Documents' as HelpCategory,
  },
  {
    question: 'What is a reason code?',
    answer: 'A selected code that helps determine what notice or message should be produced.',
    category: 'Forms & Notices' as HelpCategory,
  },
  {
    question: 'Why did a text box appear after selecting a reason code?',
    answer: 'Some reason codes require additional worker-entered text for the notice.',
    category: 'Forms & Notices' as HelpCategory,
  },
  {
    question: 'What does the Operations Dashboard show?',
    answer: 'It summarizes case workload, aging, due dates, bottlenecks, and county/region metrics.',
    category: 'Dashboard & Metrics' as HelpCategory,
  },
  {
    question: 'Is this connected to real systems?',
    answer: 'No. This demo uses local mock data only.',
    category: 'Mock Data / Demo Mode' as HelpCategory,
  },
  {
    question: 'Does the Testing tab run real SFTP, REST, or SOAP tests?',
    answer: 'No. It displays copyable placeholder commands and static return information for demo purposes only.',
    category: 'Testing' as HelpCategory,
  },
];

export const glossary = [
  { term: 'MyB Number', definition: tooltips.mybNumber },
  { term: 'Filing Date', definition: tooltips.filingDate },
  { term: 'Eligibility Due Date', definition: tooltips.eligibilityDueDate },
  { term: 'Pending Review', definition: 'The case is not finalized and still requires worker action.' },
  { term: 'Approved', definition: 'The case has reached an approved status in the mock workflow.' },
  { term: 'Missing Information', definition: 'One or more fields, signatures, interviews, or documents are unresolved.' },
  { term: 'Verification', definition: 'Worker review of information or evidence before moving the case forward.' },
  { term: 'Reusable Document', definition: 'A document that may be reused across future cases, such as identity proof.' },
  { term: 'Case-Specific Document', definition: 'A document usually tied to this application, such as a recent paystub.' },
  { term: 'Reason Code', definition: tooltips.reasonCode },
  { term: 'Dynamic Text', definition: tooltips.dynamicText },
  { term: 'Notice Preview', definition: 'Mock notice output shown before approval or sending.' },
  { term: 'Clearance', definition: 'Identity matching and record review before final eligibility action.' },
  { term: 'CIN / SIN', definition: 'Configurable identifier terminology used in this demo.' },
  { term: 'Match Score', definition: 'Mock score representing how closely records appear to match.' },
  { term: 'External Validation', definition: 'Mock comparison against external evidence or records.' },
  { term: 'Budget', definition: 'Mock eligibility calculation using income and expense inputs.' },
  { term: 'Transaction Status', definition: tooltips.transactionStatus },
  { term: 'Batch Pending', definition: 'Mock transaction state waiting on batch processing.' },
  { term: 'Supervisor Review', definition: exceptionExplanations['Supervisor Review'] },
  { term: 'Audit Timeline', definition: 'Mock chronological record of case activity.' },
  { term: 'Mock Test', definition: 'A local placeholder action that shows sample return information without calling a real endpoint.' },
  { term: 'SFTP', definition: 'A file-transfer pattern represented here with fake command text and static return details.' },
];

export const roleHelp: Record<Role, string[]> = {
  'Case Worker': [
    'Focus on triage, missing information, case notes, and moving cases to the next step.',
    'Use the inbox, summary, interview, and timeline views as your main path.',
  ],
  'Document Reviewer': [
    'Focus on document type, reusable status, confidence, extracted values, and replacement actions.',
    'Use Documents and Interview / Missing Info for the strongest demo path.',
  ],
  'Eligibility Specialist': [
    'Focus on external validations, budget readiness, notices, and final review actions.',
    'Use Budget, Forms & Notices, and Transaction Status when the case is ready.',
  ],
  Supervisor: [
    'Focus on cases requiring review, return, approval, and reassignment decisions.',
    'Use Summary, Timeline / Audit, and Operations Dashboard to assess blockers.',
  ],
  Auditor: [
    'Focus on read-only review, timeline events, status changes, and raw JSON inspection.',
    'Editing actions are intentionally disabled for this role.',
  ],
  'Admin / Operations': [
    'Focus on dashboard bottlenecks, role switching, mock settings, and resetting demo data.',
    'Use Operations Dashboard and Mock Settings to manage the walkthrough.',
  ],
};

export const demoCoachTips: Partial<Record<HelpContextId, string[]>> = {
  overview: ['Start here: open the Case Inbox when introducing the workload.'],
  inbox: ['Start here: open MYB-1004 for the Michael Motorist SNAP/HEAP review.', 'Use exception filters to show a living queue.'],
  documents: ['Review Michael Motorist’s paystub and National Grid utility bill.', 'Then request replacement or simulate upload if you want to show the document loop.'],
  interview: ['Use Send Mock Email, then simulate applicant response.'],
  clearance: ['Next, resolve clearance by accepting or rejecting a possible match.'],
  notices: ['Generate a notice preview after adding a reason code.'],
  transaction: ['Simulate acceptance, then finalize the case.'],
  timeline: ['End by viewing Timeline / Audit to show everything the worker did.'],
  operations: ['Open Operations Dashboard to review county and region bottlenecks.'],
  testing: ['Open Testing, open a command text box, and run a mock SOAP, REST, or SFTP test without real integrations.'],
  helpCenter: ['Search “reason code” or “document” to demonstrate self-help.'],
};
