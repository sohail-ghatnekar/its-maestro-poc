import type {
  CaseActor,
  CaseData,
  DetermineInterviewNeedInput,
  DocumentExtraction,
  MockScenario,
} from "../types/determineInterviewNeedTypes";

const userActor: CaseActor = {
  Type: 0,
  Email: "sohail.ghatnekar@uipath.com",
  IsActive: true,
  CreateTime: "2025-09-04T19:12:57.2233333+00:00",
  UpdateTime: "2025-09-04T19:12:57.2233333+00:00",
  Id: "be674e56-2470-4ebd-8fb2-7ea82948b4f8",
  Name: "Sohail Ghatnekar",
};

const baseCaseData: CaseData = {
  ProofofResidenceFilePath: "Michael_Motorist_National_Grid_Utility_SAMPLE.pdf",
  LicenseFilePath: "fake-license.jpg",
  MyBNumber: "MYB-2D8U66GM",
  CreatedBy: userActor,
  MaestroProcessID: "bb935bce-2e74-42fa-96fd-a056e1e1b588@",
  ApplicantEmail: "sohail.ghatnekar@uipath.com",
  AssignedWorker: "sohail.ghatnekar@uipath.com",
  CurrentStatus: 1,
  Priority: 4,
  AppFilePath: "Fake_SNAP_App_Completed.pdf",
  CreateTime: "2026-06-16T19:42:17.3436527+00:00",
  CurrentStage: 6,
  FolderID: "0712d628-1391-46d2-859c-d71a6ace28e1",
  PaystubFilePath: "Michael_Motorist_Pay_Stub_SAMPLE.pdf",
  UpdatedBy: userActor,
  RecordOwner: userActor,
  FilingDate: "2026-06-16",
  UpdateTime: "2026-06-16T19:42:17.3436527+00:00",
  Id: "875db17a-bb69-f111-8fcb-002248a04067",
};

const standardExpeditedScreening = "NOT_EXPEDITED";

const verifiedDocuments: DocumentExtraction = {
  documents: [
    {
      documentId: "DOC-VERIFIED-PAYSTUB",
      documentType: "Paystub",
      status: "Verified",
      confidence: 0.94,
      reusable: true,
      fileName: "Michael_Motorist_Pay_Stub_SAMPLE.pdf",
      requiresWorkerReview: false,
    },
    {
      documentId: "DOC-VERIFIED-LICENSE",
      documentType: "Driver License",
      status: "Verified",
      confidence: 0.97,
      reusable: true,
      fileName: "fake-license.jpg",
      requiresWorkerReview: false,
    },
  ],
  documentReviewNeeded: false,
  lowestConfidence: 0.94,
  missingRequiredDocuments: [],
  insufficientDocuments: [],
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function buildInput(
  caseData: CaseData,
  expeditedScreeningResult = standardExpeditedScreening,
  documentExtraction: DocumentExtraction = verifiedDocuments,
): DetermineInterviewNeedInput {
  return {
    caseData,
    expeditedScreeningResult,
    documentExtraction,
  };
}

function withCase(
  myBNumber: string,
  id: string,
  priority: number | string = 2,
): CaseData {
  return {
    ...clone(baseCaseData),
    MyBNumber: myBNumber,
    Priority: priority,
    MaestroProcessID: `INT-NEED-${myBNumber}`,
    Id: id,
  };
}

const scenario1001 = buildInput(
  withCase("MYB-1001", "875db17a-bb69-f111-8fcb-002248a04001", 2),
);

const scenario1002 = buildInput(
  withCase("MYB-1002", "875db17a-bb69-f111-8fcb-002248a04002", 2),
  "EXPEDITED_LOW_INCOME_RESOURCE",
);

const scenario1003 = buildInput(
  withCase("MYB-1003", "875db17a-bb69-f111-8fcb-002248a04003", 2),
  standardExpeditedScreening,
  {
    ...clone(verifiedDocuments),
    missingRequiredDocuments: ["Proof of Residence"],
    insufficientDocuments: ["Proof of Residence"],
  },
);

const scenario1004 = buildInput(clone(baseCaseData), standardExpeditedScreening, {
  documents: [
    {
      documentId: "DOC-LOW-PAYSTUB",
      documentType: "Paystub",
      status: "Low Confidence Review",
      confidence: 0.74,
      reusable: false,
      fileName: "Michael_Motorist_Pay_Stub_SAMPLE.pdf",
      requiresWorkerReview: true,
    },
    {
      documentId: "DOC-VERIFIED-LICENSE",
      documentType: "Driver License",
      status: "Verified",
      confidence: 0.96,
      reusable: true,
      fileName: "fake-license.jpg",
      requiresWorkerReview: false,
    },
  ],
  documentReviewNeeded: true,
  lowestConfidence: 0.74,
  missingRequiredDocuments: [],
  insufficientDocuments: ["Paystub"],
});

const clearanceCase = withCase(
  "MYB-1005",
  "875db17a-bb69-f111-8fcb-002248a04005",
  2,
);
clearanceCase.ClearancePossibleMatch = true;
const scenario1005 = buildInput(clearanceCase);

export const mockDetermineInterviewNeedScenarios: MockScenario[] = [
  {
    scenarioId: "MYB-1001",
    description: "Case data with all submitted documents verified.",
    inputs: scenario1001,
    expected: {
      shouldCreateHumanTask: true,
      recommendedPriority: "Normal",
      reasonCodes: ["SNAP_INTERVIEW_REQUIRED"],
    },
  },
  {
    scenarioId: "MYB-1002",
    description: "Expedited screening raises interview priority.",
    inputs: scenario1002,
    expected: {
      shouldCreateHumanTask: true,
      recommendedPriority: "Critical",
      reasonCodes: ["EXPEDITED_INTERVIEW_PRIORITY"],
    },
  },
  {
    scenarioId: "MYB-1003",
    description: "Missing required residence document.",
    inputs: scenario1003,
    expected: {
      shouldCreateHumanTask: true,
      reasonCodes: ["MISSING_REQUIRED_DOCUMENT"],
      nextRecommendedStepIncludes: "Create Interview",
    },
  },
  {
    scenarioId: "MYB-2D8U66GM",
    description: "Provided case data with low-confidence paystub.",
    inputs: scenario1004,
    expected: {
      shouldCreateHumanTask: true,
      recommendedPriority: "Critical",
      reasonCodes: ["DOCUMENT_REVIEW_PAYSTUB_LOW_CONFIDENCE"],
    },
  },
  {
    scenarioId: "MYB-1005",
    description: "Clearance possible match with interview still required.",
    inputs: scenario1005,
    expected: {
      shouldCreateHumanTask: true,
      reasonCodes: ["SNAP_INTERVIEW_REQUIRED"],
      workerActionIncludes: "Clearance can run separately",
    },
  },
];

export const mockDetermineInterviewNeedInputs = mockDetermineInterviewNeedScenarios.map(
  (scenario) => scenario.inputs,
);
