import type {
  AbleBudgetResult,
  AuditInfo,
  BudgetInputSummary,
  CaseInfo,
  ReadinessResult,
  ReviewBudgetResultsInputs,
  TaskContext,
  WorkerReview
} from "../types/reviewBudgetResultsTypes";

export const taskContext: TaskContext = {
  taskId: "TASK-BUDGET-MYB-1004-001",
  taskName: "Review Budget Results",
  taskType: "Human Task",
  createdAtUtc: "2026-05-27T16:15:00Z",
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
  currentStage: "Budget",
  statusCode: "PR"
};

export const readinessResult: ReadinessResult = {
  readinessResult: "CORRECT",
  isReadyForBudget: true,
  summary: "Required intake steps are complete; the case can proceed to budget review.",
  blockingIssues: [],
  warnings: [],
  recommendedNextStep: "Review the returned budget result."
};

export const budgetInputSummary: BudgetInputSummary = {
  householdSize: 3,
  grossMonthlyIncome: 5200,
  earnedIncomeSources: [
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
  ],
  resourcesAmount: 2412.17,
  rentMonthly: 1250,
  utilityProvider: "National Grid",
  dependentCareMonthly: 250,
  medicalExpenseMonthly: 0,
  notes: "Values reflect the SNAP application, pay stub, and National Grid bill."
};

export const ableBudgetResult: AbleBudgetResult = {
  ableRequestId: "ABLE-MOCK-MYB-1004-001",
  ableStatus: "Returned",
  returnedAtUtc: "2026-05-27T16:10:00Z",
  mockBenefitAmount: 298,
  benefitFrequency: "Monthly",
  calculationSummary: "$298/month returned for the sample household.",
  calculationWarnings: [],
  calculationErrors: [],
  rawResultAvailable: true,
  rawResult: {
    mock: true,
    resultCode: "ABLE_MOCK_SUCCESS",
    amount: 298,
    frequency: "Monthly",
    message: "Mock budget calculation returned."
  }
};

export const workerReview: WorkerReview = {
  budgetReviewed: false,
  inputsAppearCorrect: false,
  correctionNeeded: false,
  requestMoreInformation: false,
  sendToSupervisor: false,
  correctionReason: "",
  moreInformationReason: "",
  supervisorReason: "",
  workerNotes: "",
  attestation: false
};

export const auditInfo: AuditInfo = {
  events: [
    {
      eventType: "ReviewBudgetResultsTaskCreated",
      timestampUtc: "2026-05-27T16:15:00Z",
      actor: "system",
      notes: "Budget review task created."
    }
  ]
};

export const mockReviewBudgetResultsTask: ReviewBudgetResultsInputs = {
  taskContext,
  caseInfo,
  readinessResult,
  budgetInputSummary,
  ableBudgetResult,
  workerReview,
  auditInfo
};
