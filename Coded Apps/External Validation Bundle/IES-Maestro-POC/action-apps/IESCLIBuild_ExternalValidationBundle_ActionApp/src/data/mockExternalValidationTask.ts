import type {
  AgentReview,
  AuditInfo,
  CaseInfo,
  DeclaredApplicationFacts,
  DocumentExtraction,
  ExternalValidationInputs,
  TaskContext,
  ValidationResults,
  WorkerResolution
} from "../types/externalValidationTypes";

export const taskContext: TaskContext = {
  taskId: "TASK-VAL-MYB-1004-001",
  taskName: "External Validation Bundle",
  taskType: "Human Task",
  createdAtUtc: "2026-05-27T15:30:00Z",
  assignedGroup: "Monroe_SNAP_Workers",
  assignedWorker: "demo.worker1",
  priority: "High",
  isReadOnly: false
};

export const caseInfo: CaseInfo = {
  caseRecordNumber: "SNAP-CASE-000004",
  myBNumber: "MYB-1004",
  applicantName: "Michael M. Motorist",
  applicantEmail: "sohail.ghatnekar@uipath.com",
  county: "Monroe",
  derivedRegion: "Finger Lakes",
  filingDate: "2026-05-26",
  eligibilityDueDate: "2026-06-25",
  currentStatus: "In Progress",
  currentStage: "External Validation",
  statusCode: "PR"
};

export const declaredApplicationFacts: DeclaredApplicationFacts = {
  grossMonthlyIncome: 5200,
  rentMonthly: 1250,
  resourcesAmount: 2412.17,
  incomeSources: [
    {
      person: "Michael Motorist",
      source: "Employment - Warehouse Associate",
      frequency: "Weekly",
      grossAmount: 1000
    },
    {
      person: "Sarah Motorist",
      source: "Part-Time Retail",
      frequency: "Bi-Weekly",
      grossAmount: 600
    }
  ]
};

export const documentExtraction: DocumentExtraction = {
  documents: [
    {
      documentId: "DOC-1004-001",
      documentType: "Paystub",
      status: "Verified",
      confidence: 0.91,
      extractedEmployer: "Sample Company Name",
      extractedGrossAmount: 1000,
      receivedDate: "2026-05-27"
    },
    {
      documentId: "DOC-1004-002",
      documentType: "Driver License",
      status: "Verified",
      confidence: 0.96,
      receivedDate: "2026-05-26"
    },
    {
      documentId: "DOC-1004-003",
      documentType: "Utility Bill",
      status: "Verified",
      confidence: 0.94,
      receivedDate: "2026-05-26"
    }
  ]
};

export const validationResults: ValidationResults = {
  uibDol: {
    sourceName: "UIB/DOL Mock",
    status: "Mock Complete",
    result: "No Active UI Claim Found",
    discrepancyFound: false,
    rawMessageAvailable: true,
    summary: "No active unemployment conflict found."
  },
  taxRecords: {
    sourceName: "Tax/BICS Mock",
    status: "Mock Complete",
    result: "Prior income record found",
    discrepancyFound: false,
    rawMessageAvailable: true,
    summary: "Prior income record is not inconsistent."
  },
  paystubComparison: {
    sourceName: "Paystub Comparison Mock",
    status: "Worker Review Required",
    result: "Manual Review",
    discrepancyFound: true,
    rawMessageAvailable: true,
    summary: "Pay stub matches the declared weekly gross amount; worker review is required.",
    declaredAmount: 1000,
    extractedAmount: 1000,
    confidence: 0.91
  }
};

export const agentReview: AgentReview = {
  agentName: "IESCLIBuild_ExternalValidationAgent",
  advisoryOnly: true,
  summary: "The supplied documents support the declared application facts.",
  recommendedWorkerActions: [
    "Review the pay stub.",
    "Confirm the mock validation checks."
  ],
  workerApprovalRequired: true
};

export const workerResolution: WorkerResolution = {
  uibDolReviewed: false,
  taxReviewed: false,
  paystubComparisonReviewed: false,
  discrepancyResolved: false,
  resolutionReason: "",
  requestApplicantFollowUp: false,
  sendToSupervisor: false,
  supervisorReason: "",
  workerNotes: "",
  attestation: false
};

export const auditInfo: AuditInfo = {
  events: [
    {
      eventType: "ExternalValidationTaskCreated",
      timestampUtc: "2026-05-27T15:30:00Z",
      actor: "system",
      notes: "External validation review task created."
    }
  ]
};

export function createMockExternalValidationInputs(): ExternalValidationInputs {
  return JSON.parse(
    JSON.stringify({
      taskContext,
      caseInfo,
      declaredApplicationFacts,
      documentExtraction,
      validationResults,
      agentReview,
      workerResolution,
      auditInfo
    })
  ) as ExternalValidationInputs;
}
