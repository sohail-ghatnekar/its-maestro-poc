import {
  CodedActionAppService,
  MessageSeverity as UiPathMessageSeverity
} from "@uipath/coded-action-app";
import { createMockExternalValidationInputs } from "../data/mockExternalValidationTask";
import type {
  ExternalValidationInputs,
  FinalPayload,
  IncomeSource,
  MessageSeverity,
  TaskAction
} from "../types/externalValidationTypes";

const service = new CodedActionAppService();

const severityMap: Record<MessageSeverity, UiPathMessageSeverity> = {
  info: UiPathMessageSeverity.Info,
  success: UiPathMessageSeverity.Success,
  warning: UiPathMessageSeverity.Warning,
  error: UiPathMessageSeverity.Error
};

const requiredGroupKeys = [
  "taskContext",
  "caseInfo",
  "declaredApplicationFacts",
  "documentExtraction",
  "validationResults",
  "agentReview",
  "workerResolution",
  "auditInfo"
] as const;

const discrepancySoapKeys = [
  "discrepancySoap",
  "DiscrepancySoap",
  "discrepancyXml",
  "DiscrepancyXml",
  "eligibilitySoap",
  "EligibilitySoap",
  "soapPayload",
  "SoapPayload"
] as const;

interface SoapValidationMessage {
  code: string;
  severity: string;
  text: string;
}

interface ParsedEligibilitySoap {
  requestStatus?: string;
  correlationId?: string;
  clientId?: string;
  program?: string;
  myBNumber?: string;
  applicantName?: string;
  applicantEmail?: string;
  county?: string;
  filingDate?: string;
  eligibilityDueDate?: string;
  householdSize?: number;
  liquidResources?: number;
  monthlyRent?: number;
  incomeSources: IncomeSource[];
  eligibilityStatus?: string;
  eligibilityRecommendation?: string;
  expeditedProcessingStatus?: string;
  budgetStatus?: string;
  benefitAmount?: number;
  requiredNextActions: string[];
  message?: SoapValidationMessage;
  checkedAtUtc?: string;
  sourceSystem?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function objectInput<T extends object>(value: unknown): Partial<T> {
  const parsed = parseMaybeJson(value);
  return isRecord(parsed) ? (parsed as Partial<T>) : {};
}

function arrayInput<T>(value: unknown, fallback: T[]): T[] {
  const parsed = parseMaybeJson(value);
  return Array.isArray(parsed) ? (parsed as T[]) : fallback;
}

function stringInput(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function numberFromText(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateInput(value: unknown): string | undefined {
  const date = stringInput(value);
  return date?.includes("T") ? date.slice(0, 10) : date;
}

function statusInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return (
      {
        0: "Pending Review",
        1: "In Progress",
        2: "Approved",
        3: "Denied",
        4: "Missing Information",
        5: "Supervisor Review",
        6: "Withdrawn"
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function stageInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return (
      {
        1: "Intake",
        2: "Clearance",
        3: "Interview",
        4: "External Validation",
        5: "Budget",
        6: "Final Review"
      }[value] ?? String(value)
    );
  }

  return stringInput(value);
}

function priorityInput(value: unknown): string | undefined {
  if (typeof value === "number") {
    return value <= 1 ? "Low" : "High";
  }

  return stringInput(value);
}

function xmlTagPattern(tagName: string, flags: string): RegExp {
  return new RegExp(`<(?:\\w+:)?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${tagName}>`, flags);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function normalizeXmlText(value: string): string {
  return decodeXmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function readXmlTag(xml: string, tagName: string): string | undefined {
  const match = xmlTagPattern(tagName, "i").exec(xml);
  return match?.[1] ? normalizeXmlText(match[1]) : undefined;
}

function readXmlBlocks(xml: string, tagName: string): string[] {
  return Array.from(xml.matchAll(xmlTagPattern(tagName, "gi")), (match) => match[1]);
}

function parseSoapValidationMessages(xml: string): SoapValidationMessage[] {
  return readXmlBlocks(xml, "Message")
    .map((block) => ({
      code: readXmlTag(block, "Code") ?? "",
      severity: readXmlTag(block, "Severity") ?? "",
      text: readXmlTag(block, "Text") ?? ""
    }))
    .filter((message) => message.code || message.severity || message.text);
}

function selectDiscrepancyMessage(messages: SoapValidationMessage[]): SoapValidationMessage | undefined {
  return (
    messages.find((message) => ["ERROR", "WARNING"].includes(message.severity.toUpperCase())) ??
    messages.find((message) => /discrep|match|required|review/i.test(`${message.code} ${message.text}`)) ??
    messages[0]
  );
}

function parseSoapIncomeEntries(xml: string): IncomeSource[] {
  return readXmlBlocks(xml, "IncomeEntry")
    .map((block) => ({
      person: readXmlTag(block, "PersonName") ?? "Not provided",
      source: readXmlTag(block, "IncomeSource") ?? "Not provided",
      frequency: readXmlTag(block, "Frequency") ?? "Not provided",
      grossAmount: numberFromText(readXmlTag(block, "GrossAmount")) ?? 0
    }))
    .filter((entry) => entry.person !== "Not provided" || entry.grossAmount > 0);
}

function calculateMonthlyIncome(incomeSources: IncomeSource[]): number {
  return incomeSources.reduce((total, source) => {
    const frequency = source.frequency.toLowerCase().replace(/[\s_-]/g, "");

    if (frequency === "weekly") {
      return total + source.grossAmount * 4.333;
    }

    if (frequency === "biweekly" || frequency === "everyotherweek") {
      return total + source.grossAmount * 2.167;
    }

    if (frequency === "semimonthly") {
      return total + source.grossAmount * 2;
    }

    return total + source.grossAmount;
  }, 0);
}

function formatSoapAction(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseEligibilitySoap(discrepancySoap: string): ParsedEligibilitySoap | null {
  if (!/<(?:\w+:)?CheckEligibilityResponse\b/i.test(discrepancySoap)) {
    return null;
  }

  const incomeSources = parseSoapIncomeEntries(discrepancySoap);
  const messages = parseSoapValidationMessages(discrepancySoap);

  return {
    requestStatus: readXmlTag(discrepancySoap, "RequestStatus"),
    correlationId: readXmlTag(discrepancySoap, "CorrelationId"),
    clientId: readXmlTag(discrepancySoap, "ClientId"),
    program: readXmlTag(discrepancySoap, "Program"),
    myBNumber: readXmlTag(discrepancySoap, "MyBNumber"),
    applicantName: readXmlTag(discrepancySoap, "ApplicantName"),
    applicantEmail: readXmlTag(discrepancySoap, "ApplicantEmail"),
    county: readXmlTag(discrepancySoap, "County"),
    filingDate: readXmlTag(discrepancySoap, "FilingDate"),
    eligibilityDueDate: readXmlTag(discrepancySoap, "EligibilityDueDate"),
    householdSize: numberFromText(readXmlTag(discrepancySoap, "HouseholdSize")),
    liquidResources: numberFromText(readXmlTag(discrepancySoap, "LiquidResources")),
    monthlyRent: numberFromText(readXmlTag(discrepancySoap, "MonthlyRent")),
    incomeSources,
    eligibilityStatus: readXmlTag(discrepancySoap, "Status"),
    eligibilityRecommendation: readXmlTag(discrepancySoap, "EligibilityRecommendation"),
    expeditedProcessingStatus: readXmlTag(discrepancySoap, "ExpeditedProcessingStatus"),
    budgetStatus: readXmlTag(discrepancySoap, "BudgetStatus"),
    benefitAmount: numberFromText(readXmlTag(discrepancySoap, "BenefitAmount")),
    requiredNextActions: readXmlBlocks(discrepancySoap, "Action")
      .map(normalizeXmlText)
      .filter(Boolean),
    message: selectDiscrepancyMessage(messages),
    checkedAtUtc: readXmlTag(discrepancySoap, "CheckedAtUtc"),
    sourceSystem: readXmlTag(discrepancySoap, "SourceSystem")
  };
}

function getDiscrepancySoapInput(value: unknown): string | undefined {
  const parsed = parseMaybeJson(value);

  if (!isRecord(parsed)) {
    return undefined;
  }

  for (const key of discrepancySoapKeys) {
    const directValue = stringInput(parsed[key]);

    if (directValue) {
      return directValue;
    }
  }

  const documentInfo = objectInput<Record<string, unknown>>(parsed.documentInfo);

  for (const key of discrepancySoapKeys) {
    const documentValue = stringInput(documentInfo[key]);

    if (documentValue) {
      return documentValue;
    }
  }

  return undefined;
}

function appendSoapAuditEvent(
  inputs: ExternalValidationInputs,
  parsedSoap: ParsedEligibilitySoap,
  discrepancySummary: string
): ExternalValidationInputs["auditInfo"] {
  const eventExists = inputs.auditInfo.events.some(
    (event) => event.eventType === "DiscrepancySoapReceived" && event.notes === discrepancySummary
  );

  if (eventExists) {
    return inputs.auditInfo;
  }

  return {
    events: [
      ...inputs.auditInfo.events,
      {
        eventType: "DiscrepancySoapReceived",
        timestampUtc: parsedSoap.checkedAtUtc ?? new Date().toISOString(),
        actor: parsedSoap.sourceSystem ?? "system",
        notes: discrepancySummary
      }
    ]
  };
}

function applyDiscrepancySoap(
  inputs: ExternalValidationInputs,
  discrepancySoap: string
): ExternalValidationInputs {
  const parsedSoap = parseEligibilitySoap(discrepancySoap);

  if (!parsedSoap) {
    return {
      ...inputs,
      discrepancySoap
    };
  }

  const message = parsedSoap.message;
  const discrepancySummary =
    message?.text ??
    parsedSoap.eligibilityRecommendation ??
    "System returned a discrepancy that requires worker validation.";
  const discrepancyFound = message?.severity
    ? message.severity.toUpperCase() !== "INFO"
    : /discrep|match|required|review/i.test(discrepancySummary);
  const incomeSources = parsedSoap.incomeSources.length
    ? parsedSoap.incomeSources
    : inputs.declaredApplicationFacts.incomeSources;
  const recommendedWorkerActions = parsedSoap.requiredNextActions.length
    ? parsedSoap.requiredNextActions.slice(0, 3).map(formatSoapAction)
    : ["Validate the system discrepancy.", "Document the resolution."];

  return {
    ...inputs,
    discrepancySoap,
    taskContext: {
      ...inputs.taskContext,
      taskId: parsedSoap.correlationId ?? inputs.taskContext.taskId,
      taskName: "External Validation Bundle"
    },
    caseInfo: {
      ...inputs.caseInfo,
      caseRecordNumber: parsedSoap.clientId ?? inputs.caseInfo.caseRecordNumber,
      myBNumber: parsedSoap.myBNumber ?? inputs.caseInfo.myBNumber,
      applicantName: parsedSoap.applicantName ?? inputs.caseInfo.applicantName,
      applicantEmail: parsedSoap.applicantEmail ?? inputs.caseInfo.applicantEmail,
      county: parsedSoap.county ?? inputs.caseInfo.county,
      filingDate: parsedSoap.filingDate ?? inputs.caseInfo.filingDate,
      eligibilityDueDate: parsedSoap.eligibilityDueDate ?? inputs.caseInfo.eligibilityDueDate,
      currentStatus: parsedSoap.eligibilityStatus ?? inputs.caseInfo.currentStatus,
      currentStage: "External Validation",
      statusCode: parsedSoap.requestStatus ?? inputs.caseInfo.statusCode
    },
    declaredApplicationFacts: {
      ...inputs.declaredApplicationFacts,
      grossMonthlyIncome: Number(calculateMonthlyIncome(incomeSources).toFixed(2)),
      rentMonthly: parsedSoap.monthlyRent ?? inputs.declaredApplicationFacts.rentMonthly,
      resourcesAmount: parsedSoap.liquidResources ?? inputs.declaredApplicationFacts.resourcesAmount,
      incomeSources
    },
    validationResults: {
      uibDol: {
        sourceName: parsedSoap.sourceSystem ?? "Eligibility SOAP",
        status: parsedSoap.eligibilityStatus ?? parsedSoap.requestStatus ?? "Received",
        result: message?.code ?? parsedSoap.eligibilityRecommendation ?? "System discrepancy",
        discrepancyFound,
        rawMessageAvailable: true,
        summary: discrepancySummary
      },
      taxRecords: {
        ...inputs.validationResults.taxRecords,
        sourceName: "Not included in SOAP",
        status: "Not Provided",
        result: "No additional discrepancy",
        discrepancyFound: false,
        rawMessageAvailable: false,
        summary: "This task is focused on the single discrepancy from the SOAP payload."
      },
      paystubComparison: {
        ...inputs.validationResults.paystubComparison,
        sourceName: "Not included in SOAP",
        status: "Not Provided",
        result: "No additional discrepancy",
        discrepancyFound: false,
        rawMessageAvailable: false,
        summary: "This task is focused on the single discrepancy from the SOAP payload."
      }
    },
    agentReview: {
      ...inputs.agentReview,
      summary: `System response requires worker validation: ${discrepancySummary}`,
      recommendedWorkerActions,
      workerApprovalRequired: true
    },
    auditInfo: appendSoapAuditEvent(inputs, parsedSoap, discrepancySummary)
  };
}

function normalizeCaseInfo(
  defaults: ExternalValidationInputs["caseInfo"],
  value: unknown
): ExternalValidationInputs["caseInfo"] {
  const record = objectInput<Record<string, unknown>>(value);

  return {
    ...defaults,
    ...record,
    caseRecordNumber: stringInput(record.caseRecordNumber ?? record.CaseRecordNumber ?? record.Id) ?? defaults.caseRecordNumber,
    myBNumber: stringInput(record.myBNumber ?? record.MyBNumber) ?? defaults.myBNumber,
    applicantName: stringInput(record.applicantName ?? record.ApplicantName) ?? defaults.applicantName,
    applicantEmail: stringInput(record.applicantEmail ?? record.ApplicantEmail) ?? defaults.applicantEmail,
    county: stringInput(record.county ?? record.County) ?? defaults.county,
    derivedRegion: stringInput(record.derivedRegion ?? record.DerivedRegion) ?? defaults.derivedRegion,
    filingDate: dateInput(record.filingDate ?? record.FilingDate ?? record.CreateTime) ?? defaults.filingDate,
    eligibilityDueDate:
      dateInput(record.eligibilityDueDate ?? record.EligibilityDueDate) ?? defaults.eligibilityDueDate,
    currentStatus: statusInput(record.currentStatus ?? record.CurrentStatus) ?? defaults.currentStatus,
    currentStage: stageInput(record.currentStage ?? record.CurrentStage) ?? defaults.currentStage,
    statusCode: stringInput(record.statusCode ?? record.StatusCode) ?? defaults.statusCode
  };
}

function normalizeTaskContext(
  defaults: ExternalValidationInputs["taskContext"],
  value: unknown
): ExternalValidationInputs["taskContext"] {
  const record = objectInput<Record<string, unknown>>(value);

  return {
    ...defaults,
    ...record,
    taskId: stringInput(record.taskId ?? record.TaskId ?? record.MaestroProcessID ?? record.Id) ?? defaults.taskId,
    createdAtUtc: stringInput(record.createdAtUtc ?? record.CreateTime) ?? defaults.createdAtUtc,
    assignedWorker: stringInput(record.assignedWorker ?? record.AssignedWorker) ?? defaults.assignedWorker,
    priority: (priorityInput(record.priority ?? record.Priority) ??
      defaults.priority) as ExternalValidationInputs["taskContext"]["priority"],
    isReadOnly: typeof record.isReadOnly === "boolean" ? record.isReadOnly : defaults.isReadOnly
  };
}

function hasSeparatedGroups(value: unknown): value is ExternalValidationInputs {
  return isRecord(value) && requiredGroupKeys.every((key) => isRecord(value[key]));
}

function unwrapCandidate(task: unknown): unknown[] {
  if (!isRecord(task)) {
    return [task];
  }

  return [
    task,
    task.data,
    task.Data,
    task.taskData,
    task.TaskData,
    task.input,
    task.inputs,
    task.payload,
    task.Payload
  ];
}

export function extractExternalValidationInputs(task: unknown): ExternalValidationInputs | null {
  for (const candidate of unwrapCandidate(task)) {
    const parsed = parseMaybeJson(candidate);

    if (hasSeparatedGroups(parsed)) {
      const discrepancySoap = getDiscrepancySoapInput(parsed);
      return discrepancySoap ? applyDiscrepancySoap(parsed, discrepancySoap) : parsed;
    }

    const minimalInputs = composeFromMinimalInputs(parsed);
    if (minimalInputs) {
      return minimalInputs;
    }
  }

  return null;
}

function composeFromMinimalInputs(value: unknown): ExternalValidationInputs | null {
  if (!isRecord(value) || !isRecord(value.caseInfo)) {
    return null;
  }

  const defaults = createMockExternalValidationInputs();
  const documentInfo = objectInput<Record<string, unknown>>(value.documentInfo);
  const discrepancySoap = getDiscrepancySoapInput(value);
  const documentExtraction = objectInput<typeof defaults.documentExtraction>(
    documentInfo.documentExtraction ?? documentInfo.documentReview
  );

  const composedInputs: ExternalValidationInputs = {
    ...defaults,
    taskContext: normalizeTaskContext(defaults.taskContext, value.caseInfo),
    caseInfo: normalizeCaseInfo(defaults.caseInfo, value.caseInfo),
    declaredApplicationFacts: {
      ...defaults.declaredApplicationFacts,
      ...objectInput<typeof defaults.declaredApplicationFacts>(
        documentInfo.declaredApplicationFacts ?? documentInfo.applicationFacts
      )
    },
    documentExtraction: {
      ...defaults.documentExtraction,
      ...documentExtraction,
      documents: arrayInput(
        documentInfo.documents ?? documentExtraction.documents,
        defaults.documentExtraction.documents
      )
    },
    validationResults: {
      ...defaults.validationResults,
      ...objectInput<typeof defaults.validationResults>(documentInfo.validationResults)
    },
    agentReview: {
      ...defaults.agentReview,
      ...objectInput<typeof defaults.agentReview>(documentInfo.agentReview)
    },
    workerResolution: {
      ...defaults.workerResolution,
      ...objectInput<typeof defaults.workerResolution>(documentInfo.workerResolution)
    },
    auditInfo: {
      ...defaults.auditInfo,
      ...objectInput<typeof defaults.auditInfo>(documentInfo.auditInfo)
    }
  };

  return discrepancySoap ? applyDiscrepancySoap(composedInputs, discrepancySoap) : composedInputs;
}

export async function getTaskFromActionCenter(): Promise<ExternalValidationInputs | null> {
  const task = await service.getTask();
  return extractExternalValidationInputs(task);
}

export async function setActionCenterTaskData(data: ExternalValidationInputs): Promise<void> {
  service.setTaskData(data);
}

export async function completeActionCenterTask(action: TaskAction, data: FinalPayload): Promise<void> {
  const result = await service.completeTask(action, data);

  if (!result.success) {
    throw new Error(result.errorMessage ?? `Action Center rejected task completion ${action}.`);
  }
}

export async function showActionCenterMessage(
  message: string,
  severity: MessageSeverity
): Promise<void> {
  service.showMessage(message, severityMap[severity]);
}
