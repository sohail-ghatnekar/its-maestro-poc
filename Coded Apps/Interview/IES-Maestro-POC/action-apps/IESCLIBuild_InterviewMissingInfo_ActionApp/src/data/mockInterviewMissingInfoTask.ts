import type {
  ApplicationExtraction,
  AuditInfo,
  CaseInfo,
  InterviewInfo,
  InterviewMissingInfoInputs,
  InvocationInfo,
  MissingInfo,
  TaskContext,
  WorkerResponse,
} from '../types/interviewMissingInfoTypes';

export const taskContext: TaskContext = {
  taskId: 'TASK-INT-MYB-1004-001',
  taskName: 'Interview and Missing Info',
  taskType: 'Human Task',
  createdAtUtc: '2026-05-27T15:30:00Z',
  assignedGroup: 'Monroe_SNAP_Workers',
  assignedWorker: 'demo.worker1',
  priority: 'High',
  isReadOnly: false,
};

export const invocationInfo: InvocationInfo = {
  invocationId: 'INT-MYB-1004-001',
  invocationReason: 'Interview follow-up required',
  isRekick: false,
  previousInvocationId: '',
};

export const caseInfo: CaseInfo = {
  caseRecordNumber: 'SNAP-CASE-000004',
  myBNumber: 'MYB-1004',
  applicantName: 'Michael M. Motorist',
  applicantEmail: 'sohail.ghatnekar@uipath.com',
  county: 'Monroe',
  derivedRegion: 'Finger Lakes',
  filingDate: '2026-05-26',
  eligibilityDueDate: '2026-06-25',
  currentStatus: 'In Progress',
  currentStage: 'Interview',
  statusCode: 'PR',
};

export const applicationExtraction: ApplicationExtraction = {
  applicationDocumentName: 'Fake_SNAP_App_Completed.pdf',
  applicationDocumentUri: 'mock://documents/MYB-1004/Fake_SNAP_App_Completed.pdf',
  legalName: 'Michael M. Motorist',
  phone: '(555) 555-1234',
  residenceAddress: '2345 Anywhere Street Apt 2B, Your City, NY 12345',
  signaturePresent: true,
  signatureDate: '2026-05-26',
  householdSize: 3,
  householdMembers: [
    {
      name: 'Michael M. Motorist',
      relationship: 'Self',
      dateOfBirth: '1978-08-31',
      applying: true,
    },
    {
      name: 'Sarah A. Motorist',
      relationship: 'Spouse',
      dateOfBirth: '1980-04-11',
      applying: true,
    },
    {
      name: 'Emma L. Motorist',
      relationship: 'Daughter',
      dateOfBirth: '2012-02-15',
      applying: true,
    },
  ],
  income: [
    {
      person: 'Michael Motorist',
      source: 'Employment - Warehouse Associate',
      frequency: 'Weekly',
      grossAmount: 1000,
    },
    {
      person: 'Sarah Motorist',
      source: 'Part-Time Retail',
      frequency: 'Bi-Weekly',
      grossAmount: 600,
    },
  ],
  resourcesAmount: 2412.17,
  rentMonthly: 1250,
  utilityProvider: 'National Grid',
};

export const interviewInfo: InterviewInfo = {
  interviewRequired: true,
  interviewMethod: 'Phone',
  scheduledDateTime: '',
  completedDateTime: '',
  interviewCompleted: false,
  workerNotes: '',
  missingInfoStillRequired: true,
};

export const missingInfo: MissingInfo = {
  missingItems: [
    {
      itemId: 'MI-001',
      label: "Confirm Sarah's bi-weekly income",
      category: 'Income',
      required: true,
      resolved: false,
    },
    {
      itemId: 'MI-002',
      label: "Confirm Michael's pay stub proof",
      category: 'Document',
      required: true,
      resolved: false,
    },
  ],
  applicantMessageDraft: '',
  applicantEmail: 'sohail.ghatnekar@uipath.com',
  outreachStatus: 'Not Sent',
  responseStatus: 'Not Received',
};

export const workerResponse: WorkerResponse = {
  interviewCompleted: false,
  missingInfoStillRequired: true,
  selectedMissingItemIds: [],
  applicantMessage: '',
  workerNotes: '',
  attestation: false,
};

export const auditInfo: AuditInfo = {
  events: [
    {
      eventType: 'InterviewMissingInfoTaskCreated',
      timestampUtc: '2026-05-27T15:30:00Z',
      actor: 'system',
      notes: 'Interview and Missing Info task created.',
    },
  ],
};

export const mockInterviewMissingInfoTask: InterviewMissingInfoInputs = {
  taskContext,
  invocationInfo,
  caseInfo,
  applicationExtraction,
  interviewInfo,
  missingInfo,
  workerResponse,
  auditInfo,
};
