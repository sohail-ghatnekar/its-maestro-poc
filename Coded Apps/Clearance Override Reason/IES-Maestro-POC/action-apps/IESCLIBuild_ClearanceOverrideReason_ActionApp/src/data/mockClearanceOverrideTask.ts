import type {
  AuditInfo,
  CandidateMatch,
  CaseInfo,
  ClearanceOverrideInputs,
  ClearanceSearch,
  HouseholdMember,
  TaskContext,
  WorkerDecision
} from "../types/clearanceOverrideTypes";

export const taskContext: TaskContext = {
  taskId: "TASK-CLR-MYB-1004-001",
  taskName: "Clearance and CIN/SIN Matching",
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
  currentStage: "Clearance",
  statusCode: "PR"
};

export const householdMember: HouseholdMember = {
  memberId: "HH-1004-001",
  name: "Michael M. Motorist",
  dateOfBirth: "1978-08-31",
  ssnLast4: "6565",
  relationship: "Self",
  applying: true
};

export const clearanceSearch: ClearanceSearch = {
  searchRunAtUtc: "2026-05-27T15:25:00Z",
  algorithmProfile: "Upstate",
  recommendedAction: "ReviewPossibleMatch",
  recommendedCandidateId: "CAND-001",
  recommendationSummary: "Possible existing record found for Michael M. Motorist."
};

export const candidateMatches: CandidateMatch[] = [
  {
    candidateId: "CAND-001",
    candidateName: "Michael M. Motorist",
    candidateCinSin: "SIN-445912",
    matchScore: 106,
    matchType: "Possible Match",
    matchedFields: ["Name", "Date of Birth", "SSN Last 4"],
    mismatchedFields: ["Address Line 2"],
    notes: "Same identity; address formatting differs."
  },
  {
    candidateId: "CAND-002",
    candidateName: "Michael Motorist",
    candidateCinSin: "SIN-656501",
    matchScore: 88,
    matchType: "Low Confidence Match",
    matchedFields: ["Name"],
    mismatchedFields: ["Date of Birth", "SSN Last 4"],
    notes: "Lower confidence record."
  }
];

export const workerDecision: WorkerDecision = {
  selectedAction: "",
  selectedCandidateId: "",
  selectedCinSin: "",
  overrideUsed: false,
  overrideReason: "",
  workerNotes: "",
  attestation: false
};

export const auditInfo: AuditInfo = {
  events: [
    {
      eventType: "ClearanceTaskCreated",
      timestampUtc: "2026-05-27T15:30:00Z",
      actor: "system",
      notes: "Clearance review task created."
    }
  ]
};

export function createMockClearanceOverrideInputs(): ClearanceOverrideInputs {
  return {
    taskContext: { ...taskContext },
    caseInfo: { ...caseInfo },
    householdMember: { ...householdMember },
    clearanceSearch: { ...clearanceSearch },
    candidateMatches: candidateMatches.map((candidate) => ({
      ...candidate,
      matchedFields: [...candidate.matchedFields],
      mismatchedFields: [...candidate.mismatchedFields]
    })),
    workerDecision: { ...workerDecision },
    auditInfo: {
      events: auditInfo.events.map((event) => ({ ...event }))
    }
  };
}
