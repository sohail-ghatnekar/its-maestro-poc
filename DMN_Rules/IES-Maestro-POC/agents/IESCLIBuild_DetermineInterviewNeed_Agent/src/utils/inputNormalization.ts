import type {
  CaseData,
  DetermineInterviewNeedInput,
  ExpeditedScreeningResult,
  NormalizedDetermineInterviewNeedInput,
} from "../types/determineInterviewNeedTypes";
import { normalizePriority } from "./formatters";

const DEFAULT_POLICY_CONFIG = {
  snapInterviewGenerallyRequired: true,
  defaultInterviewMethod: "Phone",
  allowInPersonIfRequested: true,
  expeditedInterviewPriority: true,
  dueSoonDays: 7,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getAny(source: unknown, ...names: string[]): unknown {
  const record = asRecord(source);
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function asString(value: unknown): string {
  return value === undefined || value === null ? "" : String(value);
}

function coerceInt(value: unknown, defaultValue: number): number {
  if (typeof value === "boolean") {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : defaultValue;
}

function coerceBool(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
  }
  return Boolean(value);
}

function formatCaseValue(
  label: string,
  value: unknown,
  fallback: string,
): string {
  const text = asString(value).trim();
  if (!text) {
    return fallback;
  }
  return /^\d+(\.\d+)?$/.test(text) ? `${label} ${text}` : text;
}

function datePlusDays(dateValue: unknown, days: number): string {
  const text = asString(dateValue).trim();
  if (!text) {
    return "";
  }
  const date = new Date(`${text.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isExpedited(expedited: ExpeditedScreeningResult): boolean {
  return coerceBool(getAny(expedited, "expeditedFlag", "ExpeditedFlag"));
}

function parseExpeditedScreeningResult(
  value: unknown,
): ExpeditedScreeningResult {
  const text = asString(value).trim();
  const normalized = text.toLowerCase().replace(/[_-]+/g, " ");
  const notExpedited = [
    "not expedited",
    "non expedited",
    "not eligible",
    "criteria not met",
    "false",
  ].some((phrase) => normalized.includes(phrase));
  const expedited =
    !notExpedited &&
    (normalized.includes("expedited") ||
      normalized.includes("critical") ||
      normalized.includes("7 day"));

  const priority = expedited
    ? "Critical"
    : normalized.includes("high")
      ? "High"
      : "Normal";

  return {
    expeditedDecision: text,
    expeditedFlag: expedited,
    slaDays: expedited ? 7 : 30,
    priority,
    reasonCode: text,
    recommendedAction: expedited
      ? "Prioritize expedited interview and processing."
      : "Continue standard SNAP processing.",
  };
}

function deriveDueDate(
  caseData: CaseData,
  expedited: ExpeditedScreeningResult,
): string {
  const explicitDueDate = getAny(
    caseData,
    "EligibilityDueDate",
    "eligibilityDueDate",
    "DueDate",
    "dueDate",
  );
  if (explicitDueDate) {
    return asString(explicitDueDate).slice(0, 10);
  }

  const filingDate =
    getAny(caseData, "FilingDate", "filingDate") ||
    getAny(caseData, "CreateTime", "createTime");
  const defaultSlaDays = isExpedited(expedited) ? 7 : 30;
  const slaDays = coerceInt(
    getAny(expedited, "slaDays", "SlaDays", "SLADays"),
    defaultSlaDays,
  );

  return datePlusDays(filingDate, slaDays);
}

export function normalizeDetermineInterviewNeedInput(
  inputs: DetermineInterviewNeedInput,
): NormalizedDetermineInterviewNeedInput {
  const caseData = inputs.caseData || ({} as CaseData);
  const expedited = parseExpeditedScreeningResult(
    inputs.expeditedScreeningResult,
  );
  const createdBy = asRecord(getAny(caseData, "CreatedBy", "createdBy"));
  const myBNumber = asString(getAny(caseData, "MyBNumber", "myBNumber"));
  const caseId = asString(
    getAny(caseData, "Id", "id", "CaseRecordNumber", "caseRecordNumber"),
  );
  const createTime =
    asString(
      getAny(caseData, "CreateTime", "createTime", "UpdateTime", "updateTime"),
    ) || new Date().toISOString();
  const priority =
    getAny(caseData, "Priority", "priority") ||
    getAny(expedited, "priority", "Priority");

  return {
    taskContext: {
      requestId: `REQ-INTERVIEW-NEED-${myBNumber || caseId}`,
      source: "caseData",
      createdAtUtc: createTime,
      requestedBy:
        asString(getAny(createdBy, "Email", "email", "Name", "name")) || "system",
      priority: normalizePriority(priority),
      isReevaluation: false,
    },
    invocationInfo: {
      invocationId: asString(
        getAny(caseData, "MaestroProcessID", "maestroProcessID") || caseId,
      ),
      invocationReason: "Determine Interview Need from case data",
      previousInvocationId: "",
      isRekickEvaluation: false,
    },
    caseInfo: {
      caseRecordNumber: caseId,
      caseId,
      myBNumber,
      applicantName: asString(
        getAny(caseData, "ApplicantName", "applicantName", "Name", "name"),
      ),
      applicantEmail: asString(
        getAny(caseData, "ApplicantEmail", "applicantEmail"),
      ),
      county: asString(getAny(caseData, "County", "county")),
      derivedRegion: "",
      filingDate: asString(getAny(caseData, "FilingDate", "filingDate")).slice(
        0,
        10,
      ),
      eligibilityDueDate: deriveDueDate(caseData, expedited),
      currentStatus: formatCaseValue(
        "Status",
        getAny(caseData, "CurrentStatus", "currentStatus"),
        "Pending Review",
      ),
      currentStage: formatCaseValue(
        "Stage",
        getAny(caseData, "CurrentStage", "currentStage"),
        "Intake",
      ),
      statusCode: asString(getAny(caseData, "CurrentStatus", "currentStatus")),
      expeditedFlag: isExpedited(expedited),
      assignedWorker: asString(
        getAny(caseData, "AssignedWorker", "assignedWorker"),
      ),
      folderId: asString(getAny(caseData, "FolderID", "FolderId", "folderId")),
      clearancePossibleMatch: coerceBool(
        getAny(caseData, "ClearancePossibleMatch", "clearancePossibleMatch"),
      ),
    },
    applicationExtraction: {
      preferredInterviewMethod:
        asString(
          getAny(
            caseData,
            "PreferredInterviewMethod",
            "preferredInterviewMethod",
          ),
        ) || "Phone",
      requestedAccommodation: coerceBool(
        getAny(caseData, "RequestedAccommodation", "requestedAccommodation"),
      ),
      income: [],
    },
    intakeRuleResult: {
      filingAccepted: true,
    },
    expeditedScreeningResult: expedited,
    priorInterviewState: {
      interviewTaskAlreadyOpen: false,
      lastInterviewCompleted: false,
      lastInterviewCompletedAtUtc: "",
      lastOutcome: "",
      lastMissingInfoItems: [],
      applicantResponsePending: false,
    },
    policyConfig: { ...DEFAULT_POLICY_CONFIG },
    auditInfo: {
      events: [],
    },
  };
}
