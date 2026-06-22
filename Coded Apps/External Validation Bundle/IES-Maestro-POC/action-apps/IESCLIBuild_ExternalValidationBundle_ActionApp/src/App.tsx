import { useEffect, useMemo, useRef, useState } from "react";
import { createMockExternalValidationInputs } from "./data/mockExternalValidationTask";
import type {
  AgentReview,
  AuditInfo,
  CaseInfo,
  DeclaredApplicationFacts,
  DocumentExtraction,
  ExternalValidationInputs,
  FinalPayload,
  MessageSeverity,
  PaystubComparisonResult,
  TaskAction,
  TaskContext,
  ValidationSourceResult,
  ValidationResults,
  WorkerResolution
} from "./types/externalValidationTypes";
import {
  completeActionCenterTask,
  getTaskFromActionCenter,
  setActionCenterTaskData,
  showActionCenterMessage
} from "./uipath/actionCenterClient";
import { appendAuditEvent, buildAuditEvent, buildFinalPayload } from "./utils/audit";
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  getConfidenceLabel
} from "./utils/formatters";
import {
  canCompleteValidation,
  canRequestApplicantFollowUp,
  canReturnForMoreInformation,
  canSendToSupervisor,
  hasAnyDiscrepancy,
  validateExternalValidationResolution
} from "./utils/validation";

type ValidationSourceKey = "uibDol" | "taxRecords" | "paystubComparison";
type ReviewField = "uibDolReviewed" | "taxReviewed" | "paystubComparisonReviewed";

type ToastState = {
  message: string;
  severity: MessageSeverity;
};

const rawMockMessages: Record<ValidationSourceKey, { title: string; message: unknown }> = {
  uibDol: {
    title: "UIB/DOL Mock Raw Message",
    message: {
      source: "UIB/DOL Mock",
      requestId: "MOCK-UIB-DOL-MYB-1004",
      applicant: "Michael M. Motorist",
      activeUnemploymentClaim: false,
      employerMatch: "Sample Company Name",
      message: "No active unemployment claim conflict found."
    }
  },
  taxRecords: {
    title: "Tax/BICS Mock Raw Message",
    message: {
      source: "Tax/BICS Mock",
      requestId: "MOCK-TAX-BICS-MYB-1004",
      priorIncomeRecordFound: true,
      inconsistentWithDeclaredEmployment: false,
      message: "Prior income record is not inconsistent."
    }
  },
  paystubComparison: {
    title: "Paystub Comparison Mock Raw Message",
    message: {
      source: "Paystub Comparison Mock",
      requestId: "MOCK-PAYSTUB-MYB-1004",
      priorDocumentQualityIssue: true,
      replacementPaystubConfidence: 0.91,
      declaredAmount: 1000,
      extractedAmount: 1000,
      message: "Pay stub matches the declared weekly gross amount."
    }
  }
};

function getRawMessageData(
  sourceKey: ValidationSourceKey,
  discrepancySoap: string | undefined
): { title: string; message: unknown } {
  if (discrepancySoap && sourceKey === "uibDol") {
    return {
      title: "System SOAP Discrepancy",
      message: discrepancySoap
    };
  }

  return rawMockMessages[sourceKey];
}

function formatRawMessage(message: unknown): string {
  return typeof message === "string" ? message : JSON.stringify(message, null, 2);
}

const reviewLabels: Record<ReviewField, string> = {
  uibDolReviewed: "UIB/DOL mock result",
  taxReviewed: "Tax/BICS mock result",
  paystubComparisonReviewed: "Paystub comparison"
};

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail-item">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function TextAreaField({
  id,
  label,
  value,
  disabled,
  error,
  onBlur,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        disabled={disabled}
        rows={4}
        aria-describedby={error ? `${id}-error` : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
      {error ? (
        <span id={`${id}-error`} className="field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function CheckboxField({
  id,
  label,
  checked,
  disabled,
  error,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="checkbox-control">
      <label className="checkbox-row" htmlFor={id}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => onChange(event.currentTarget.checked)}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <span id={`${id}-error`} className="field-error inline">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function ValidationResultCard({
  reviewId,
  title,
  result,
  reviewed,
  disabled,
  children,
  onReviewedChange,
  onViewRaw
}: {
  reviewId: string;
  title: string;
  result: ValidationSourceResult;
  reviewed: boolean;
  disabled: boolean;
  children?: React.ReactNode;
  onReviewedChange: (checked: boolean) => void;
  onViewRaw: () => void;
}) {
  return (
    <article className={`validation-card ${result.discrepancyFound ? "needs-review" : "complete"}`}>
      <div className="card-heading">
        <div>
          <h3>{title}</h3>
          <span className="status-pill">{result.status}</span>
        </div>
        <span className={`discrepancy ${result.discrepancyFound ? "yes" : "no"}`}>
          {result.discrepancyFound ? "Discrepancy" : "No discrepancy"}
        </span>
      </div>
      <dl className="detail-grid compact">
        <DetailItem label="Status" value={result.status} />
        <DetailItem label="Result" value={result.result} />
        <DetailItem label="Discrepancy Found" value={formatBoolean(result.discrepancyFound)} />
        {children}
        <DetailItem label="Raw Message Available" value={formatBoolean(result.rawMessageAvailable)} />
      </dl>
      <p className="summary-text">{result.summary}</p>
      <div className="card-actions">
        <CheckboxField
          id={reviewId}
          label="Mark Reviewed"
          checked={reviewed}
          disabled={disabled}
          onChange={onReviewedChange}
        />
        <button type="button" className="secondary" onClick={onViewRaw}>
          View Raw Message
        </button>
      </div>
    </article>
  );
}

function App() {
  const initialInputsRef = useRef<ExternalValidationInputs>(createMockExternalValidationInputs());
  const [taskContext, setTaskContext] = useState<TaskContext>(initialInputsRef.current.taskContext);
  const [caseInfo, setCaseInfo] = useState<CaseInfo>(initialInputsRef.current.caseInfo);
  const [discrepancySoap, setDiscrepancySoap] = useState<string | undefined>(
    initialInputsRef.current.discrepancySoap
  );
  const [declaredApplicationFacts, setDeclaredApplicationFacts] =
    useState<DeclaredApplicationFacts>(initialInputsRef.current.declaredApplicationFacts);
  const [documentExtraction, setDocumentExtraction] = useState<DocumentExtraction>(
    initialInputsRef.current.documentExtraction
  );
  const [validationResults, setValidationResults] = useState<ValidationResults>(
    initialInputsRef.current.validationResults
  );
  const [agentReview, setAgentReview] = useState<AgentReview>(initialInputsRef.current.agentReview);
  const [workerResolution, setWorkerResolution] = useState<WorkerResolution>(
    initialInputsRef.current.workerResolution
  );
  const [auditInfo, setAuditInfo] = useState<AuditInfo>(initialInputsRef.current.auditInfo);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [selectedRawMessage, setSelectedRawMessage] = useState<ValidationSourceKey | null>(null);
  const [isRawModalOpen, setIsRawModalOpen] = useState(false);
  const [finalPayload, setFinalPayload] = useState<FinalPayload | null>(null);
  const [finalAction, setFinalAction] = useState<TaskAction | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [attemptedAction, setAttemptedAction] = useState<TaskAction | null>(null);
  const advisoryViewedRef = useRef(false);
  const lastAuditedResolutionReason = useRef("");

  const currentInputs = useMemo<ExternalValidationInputs>(
    () => ({
      taskContext,
      caseInfo,
      discrepancySoap,
      declaredApplicationFacts,
      documentExtraction,
      validationResults,
      agentReview,
      workerResolution,
      auditInfo
    }),
    [
      taskContext,
      caseInfo,
      discrepancySoap,
      declaredApplicationFacts,
      documentExtraction,
      validationResults,
      agentReview,
      workerResolution,
      auditInfo
    ]
  );

  const validationErrors = validateExternalValidationResolution(currentInputs);
  const validationSummary = Object.values(validationErrors).filter(
    (message): message is string => Boolean(message)
  );
  const discrepancyExists = hasAnyDiscrepancy(validationResults);
  const canComplete = canCompleteValidation(currentInputs);
  const canRequestFollowUp = canRequestApplicantFollowUp(currentInputs);
  const canSendSupervisor = canSendToSupervisor(currentInputs);
  const canReturnMoreInfo = canReturnForMoreInformation(currentInputs);
  const isReadOnly = taskContext.isReadOnly;
  const hasSoapDiscrepancy = Boolean(discrepancySoap?.trim());

  function replaceInputGroups(inputs: ExternalValidationInputs) {
    setTaskContext(inputs.taskContext);
    setCaseInfo(inputs.caseInfo);
    setDiscrepancySoap(inputs.discrepancySoap);
    setDeclaredApplicationFacts(inputs.declaredApplicationFacts);
    setDocumentExtraction(inputs.documentExtraction);
    setValidationResults(inputs.validationResults);
    setAgentReview(inputs.agentReview);
    setWorkerResolution(inputs.workerResolution);
    setAuditInfo(inputs.auditInfo);
    lastAuditedResolutionReason.current = inputs.workerResolution.resolutionReason;
  }

  function createSnapshot(overrides: Partial<ExternalValidationInputs> = {}): ExternalValidationInputs {
    return {
      taskContext,
      caseInfo,
      discrepancySoap,
      declaredApplicationFacts,
      documentExtraction,
      validationResults,
      agentReview,
      workerResolution,
      auditInfo,
      ...overrides
    };
  }

  async function notify(message: string, severity: MessageSeverity) {
    setToast({ message, severity });

    try {
      await showActionCenterMessage(message, severity);
    } catch (error) {
      console.warn("showMessage failed", error);
    }
  }

  async function persistTaskData(inputs: ExternalValidationInputs) {
    if (isLocalMode) {
      console.log("[Local Demo Mode] setTaskData", inputs);
      return;
    }

    try {
      await setActionCenterTaskData(inputs);
    } catch (error) {
      console.warn("setTaskData failed", error);
    }
  }

  useEffect(() => {
    let isMounted = true;

    async function loadTask() {
      try {
        const actionCenterInputs = await getTaskFromActionCenter();

        if (!isMounted) {
          return;
        }

        if (actionCenterInputs) {
          replaceInputGroups(actionCenterInputs);
          setIsLocalMode(false);
        } else {
          replaceInputGroups(createMockExternalValidationInputs());
          setIsLocalMode(true);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        console.info("Action Center task data unavailable. Loading local mock data.");
        replaceInputGroups(createMockExternalValidationInputs());
        setIsLocalMode(true);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTask();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || advisoryViewedRef.current) {
      return;
    }

    advisoryViewedRef.current = true;
    const event = buildAuditEvent(
      "AgentAdvisoryViewed",
      "worker",
      "Agent advisory summary viewed."
    );
    const nextAuditInfo = appendAuditEvent(auditInfo, event);
    setAuditInfo(nextAuditInfo);
    void persistTaskData(createSnapshot({ auditInfo: nextAuditInfo }));
  }, [isLoading]);

  async function updateWorkerResolution<K extends keyof WorkerResolution>(
    field: K,
    value: WorkerResolution[K]
  ) {
    const nextWorkerResolution: WorkerResolution = {
      ...workerResolution,
      [field]: value
    };

    if (field === "requestApplicantFollowUp" && value === true) {
      nextWorkerResolution.sendToSupervisor = false;
    }

    if (field === "sendToSupervisor" && value === true) {
      nextWorkerResolution.requestApplicantFollowUp = false;
    }

    let nextAuditInfo = auditInfo;

    if (
      (field === "uibDolReviewed" ||
        field === "taxReviewed" ||
        field === "paystubComparisonReviewed") &&
      value === true
    ) {
      const reviewField = field as ReviewField;
      const event = buildAuditEvent(
        "SourceReviewed",
        "worker",
        `${reviewLabels[reviewField]} marked reviewed.`
      );
      nextAuditInfo = appendAuditEvent(nextAuditInfo, event);
      setAuditInfo(nextAuditInfo);
    }

    setWorkerResolution(nextWorkerResolution);
    await persistTaskData(
      createSnapshot({
        workerResolution: nextWorkerResolution,
        auditInfo: nextAuditInfo
      })
    );
  }

  async function appendAuditAndPersist(eventType: string, notes: string) {
    const event = buildAuditEvent(eventType, "worker", notes);
    const nextAuditInfo = appendAuditEvent(auditInfo, event);
    setAuditInfo(nextAuditInfo);
    await persistTaskData(createSnapshot({ auditInfo: nextAuditInfo }));
  }

  async function handleResolutionReasonBlur() {
    if (workerResolution.resolutionReason === lastAuditedResolutionReason.current) {
      return;
    }

    lastAuditedResolutionReason.current = workerResolution.resolutionReason;
    await appendAuditAndPersist("ResolutionReasonChanged", "Resolution reason changed.");
  }

  async function handleViewRawMessage(sourceKey: ValidationSourceKey) {
    setSelectedRawMessage(sourceKey);
    setIsRawModalOpen(true);
    await appendAuditAndPersist(
      "RawMockMessageViewed",
      `${rawMockMessages[sourceKey].title} viewed.`
    );
  }

  async function handleSaveDraft() {
    const event = buildAuditEvent("DraftSaved", "worker", "External validation draft saved.");
    const nextAuditInfo = appendAuditEvent(auditInfo, event);
    const nextInputs = createSnapshot({ auditInfo: nextAuditInfo });
    setAuditInfo(nextAuditInfo);
    await persistTaskData(nextInputs);
    await notify("Draft saved.", "success");
  }

  function buildActionWorkerResolution(action: TaskAction): WorkerResolution {
    if (action === "ValidationComplete") {
      return {
        ...workerResolution,
        requestApplicantFollowUp: false,
        sendToSupervisor: false
      };
    }

    if (action === "RequestApplicantFollowUp") {
      return {
        ...workerResolution,
        requestApplicantFollowUp: true,
        sendToSupervisor: false
      };
    }

    if (action === "SendToSupervisor") {
      return {
        ...workerResolution,
        requestApplicantFollowUp: false,
        sendToSupervisor: true
      };
    }

    return workerResolution;
  }

  function isActionAllowed(action: TaskAction, inputs: ExternalValidationInputs): boolean {
    if (action === "ValidationComplete") {
      return canCompleteValidation(inputs);
    }

    if (action === "RequestApplicantFollowUp") {
      return canRequestApplicantFollowUp(inputs);
    }

    if (action === "SendToSupervisor") {
      return canSendToSupervisor(inputs);
    }

    if (action === "ReturnForMoreInformation") {
      return canReturnForMoreInformation(inputs);
    }

    return true;
  }

  async function handleTaskAction(action: TaskAction) {
    const actionWorkerResolution = buildActionWorkerResolution(action);
    const actionInputs = createSnapshot({ workerResolution: actionWorkerResolution });

    if (!isActionAllowed(action, actionInputs)) {
      setAttemptedAction(action);
      await notify("Resolve validation errors before submitting this action.", "error");
      return;
    }

    const taskCompletedEvent = buildAuditEvent(
      "TaskCompleted",
      "worker",
      `Task completed with action ${action}.`
    );
    const nextAuditInfo = appendAuditEvent(auditInfo, taskCompletedEvent);
    const finalInputs = createSnapshot({
      workerResolution: actionWorkerResolution,
      auditInfo: nextAuditInfo
    });
    const payload = buildFinalPayload(finalInputs, action);

    setWorkerResolution(actionWorkerResolution);
    setAuditInfo(nextAuditInfo);
    await persistTaskData(finalInputs);

    if (isLocalMode) {
      console.log("[Local Demo Mode] completeTask", action, payload);
      setFinalAction(action);
      setFinalPayload(payload);
      await notify("Local demo payload generated.", "success");
      return;
    }

    try {
      await completeActionCenterTask(action, payload);
      await notify("Task submitted.", "success");
    } catch (error) {
      console.error("completeTask failed", error);
      await notify("Task submission failed.", "error");
    }
  }

  async function handleCopyPayload() {
    if (!finalPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(finalPayload, null, 2));
      await notify("Final payload copied.", "success");
    } catch (error) {
      console.warn("Payload copy failed", error);
      await notify("Copy failed. Select the payload text manually.", "warning");
    }
  }

  if (isLoading) {
    return <main className="loading">Loading External Validation task...</main>;
  }

  const selectedRawMessageData = selectedRawMessage
    ? getRawMessageData(selectedRawMessage, discrepancySoap)
    : null;
  const paystubComparison: PaystubComparisonResult = validationResults.paystubComparison;

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">{taskContext.taskType}</span>
          <h1>{taskContext.taskName}</h1>
          <p>
            {caseInfo.caseRecordNumber} | {caseInfo.myBNumber} | Priority {taskContext.priority}
          </p>
        </div>
        {isLocalMode ? (
          <div className="local-banner">Local Demo Mode - External Validation task data is mocked.</div>
        ) : null}
      </header>

      {toast ? <div className={`toast ${toast.severity}`}>{toast.message}</div> : null}

      <section className="panel identity-panel">
        <div className="section-heading">
          <h2>Case Identity</h2>
          <span className="status-pill">{caseInfo.currentStatus}</span>
        </div>
        <dl className="detail-grid">
          <DetailItem label="MyB Number" value={caseInfo.myBNumber} />
          <DetailItem label="Applicant Name" value={caseInfo.applicantName} />
          <DetailItem label="Applicant Email" value={caseInfo.applicantEmail} />
          <DetailItem label="County" value={caseInfo.county} />
          <DetailItem label="Region" value={caseInfo.derivedRegion} />
          <DetailItem label="Filing Date" value={formatDate(caseInfo.filingDate)} />
          <DetailItem label="Eligibility Due Date" value={formatDate(caseInfo.eligibilityDueDate)} />
          <DetailItem label="Current Status" value={caseInfo.currentStatus} />
          <DetailItem label="Current Stage" value={caseInfo.currentStage} />
          <DetailItem label="Assigned Group" value={taskContext.assignedGroup} />
          <DetailItem label="Assigned Worker" value={taskContext.assignedWorker} />
          <DetailItem label="Task Created" value={formatDateTime(taskContext.createdAtUtc)} />
        </dl>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Declared Application Facts</h2>
        </div>
        <dl className="detail-grid totals">
          <DetailItem
            label="Gross monthly income"
            value={formatCurrency(declaredApplicationFacts.grossMonthlyIncome)}
          />
          <DetailItem label="Rent monthly" value={formatCurrency(declaredApplicationFacts.rentMonthly)} />
          <DetailItem
            label="Resources amount"
            value={formatCurrency(declaredApplicationFacts.resourcesAmount)}
          />
        </dl>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>Source</th>
                <th>Frequency</th>
                <th>Gross Amount</th>
              </tr>
            </thead>
            <tbody>
              {declaredApplicationFacts.incomeSources.map((source) => (
                <tr key={`${source.person}-${source.source}`}>
                  <td>{source.person}</td>
                  <td>{source.source}</td>
                  <td>{source.frequency}</td>
                  <td>{formatCurrency(source.grossAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Applicant-entered data is reviewed by the worker against documents and external validation
          sources.
        </p>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Document Extraction</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Document ID</th>
                <th>Document type</th>
                <th>Status</th>
                <th>Confidence</th>
                <th>Extracted employer</th>
                <th>Extracted gross amount</th>
                <th>Received date</th>
              </tr>
            </thead>
            <tbody>
              {documentExtraction.documents.map((document) => (
                <tr key={document.documentId}>
                  <td>{document.documentId}</td>
                  <td>{document.documentType}</td>
                  <td>{document.status}</td>
                  <td>
                    {formatPercent(document.confidence)}
                    <span className={`confidence ${getConfidenceLabel(document.confidence)}`}>
                      {getConfidenceLabel(document.confidence)}
                    </span>
                  </td>
                  <td>{document.extractedEmployer ?? "Not provided"}</td>
                  <td>{formatCurrency(document.extractedGrossAmount)}</td>
                  <td>{formatDate(document.receivedDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>External Validation Results</h2>
          {discrepancyExists ? (
            <span className="discrepancy yes">Discrepancy review required</span>
          ) : (
            <span className="discrepancy no">No discrepancies</span>
          )}
        </div>
        <div className="validation-grid">
          {hasSoapDiscrepancy ? (
            <ValidationResultCard
              reviewId="systemDiscrepancyReviewed"
              title="System Discrepancy"
              result={validationResults.uibDol}
              reviewed={workerResolution.uibDolReviewed}
              disabled={isReadOnly}
              onReviewedChange={(checked) => void updateWorkerResolution("uibDolReviewed", checked)}
              onViewRaw={() => void handleViewRawMessage("uibDol")}
            />
          ) : (
            <>
              <ValidationResultCard
                reviewId="uibDolCardReviewed"
                title="UIB/DOL Mock"
                result={validationResults.uibDol}
                reviewed={workerResolution.uibDolReviewed}
                disabled={isReadOnly}
                onReviewedChange={(checked) => void updateWorkerResolution("uibDolReviewed", checked)}
                onViewRaw={() => void handleViewRawMessage("uibDol")}
              />
              <ValidationResultCard
                reviewId="taxCardReviewed"
                title="Tax/BICS Mock"
                result={validationResults.taxRecords}
                reviewed={workerResolution.taxReviewed}
                disabled={isReadOnly}
                onReviewedChange={(checked) => void updateWorkerResolution("taxReviewed", checked)}
                onViewRaw={() => void handleViewRawMessage("taxRecords")}
              />
              <ValidationResultCard
                reviewId="paystubCardReviewed"
                title="Paystub Comparison Mock"
                result={paystubComparison}
                reviewed={workerResolution.paystubComparisonReviewed}
                disabled={isReadOnly}
                onReviewedChange={(checked) =>
                  void updateWorkerResolution("paystubComparisonReviewed", checked)
                }
                onViewRaw={() => void handleViewRawMessage("paystubComparison")}
              >
                <DetailItem label="Declared Amount" value={formatCurrency(paystubComparison.declaredAmount)} />
                <DetailItem label="Extracted Amount" value={formatCurrency(paystubComparison.extractedAmount)} />
                <DetailItem label="Confidence" value={formatPercent(paystubComparison.confidence)} />
              </ValidationResultCard>
            </>
          )}
        </div>
      </section>

      <section className="panel raw-viewer">
        <div className="section-heading">
          <h2>Raw Message Viewer</h2>
          {selectedRawMessageData ? <span className="status-pill">{selectedRawMessageData.title}</span> : null}
        </div>
        {selectedRawMessageData ? (
          <pre>{formatRawMessage(selectedRawMessageData.message)}</pre>
        ) : (
          <p className="muted">No mock message selected.</p>
        )}
      </section>

      <section className="panel advisory-panel">
        <div className="section-heading">
          <h2>Agent Advisory Summary</h2>
          {agentReview.advisoryOnly ? <span className="advisory-badge">Advisory only</span> : null}
        </div>
        <dl className="detail-grid compact">
          <DetailItem label="Agent name" value={agentReview.agentName} />
          <DetailItem label="Worker approval required" value={formatBoolean(agentReview.workerApprovalRequired)} />
        </dl>
        <p className="summary-text">{agentReview.summary}</p>
        <ul className="recommendations">
          {agentReview.recommendedWorkerActions.map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
        <p className="note">
          Agent output is advisory only. Worker remains responsible for the final validation decision.
        </p>
      </section>

      <section className="panel resolution-panel">
        <div className="section-heading">
          <h2>Worker Resolution</h2>
          <span className="status-pill">
            {canComplete ? "Ready to complete" : "Pending required fields"}
          </span>
        </div>

        {validationSummary.length > 0 ? (
          <div className="validation-summary" role="alert">
            <strong>Validation Summary</strong>
            <ul>
              {validationSummary.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="resolution-grid">
          <div className="checkbox-stack">
            {hasSoapDiscrepancy ? (
              <CheckboxField
                id="systemDiscrepancyReviewed"
                label="System discrepancy reviewed"
                checked={workerResolution.uibDolReviewed}
                disabled={isReadOnly}
                error={validationErrors.uibDolReviewed}
                onChange={(checked) => void updateWorkerResolution("uibDolReviewed", checked)}
              />
            ) : (
              <>
                <CheckboxField
                  id="uibDolReviewed"
                  label="UIB/DOL reviewed"
                  checked={workerResolution.uibDolReviewed}
                  disabled={isReadOnly}
                  error={validationErrors.uibDolReviewed}
                  onChange={(checked) => void updateWorkerResolution("uibDolReviewed", checked)}
                />
                <CheckboxField
                  id="taxReviewed"
                  label="Tax reviewed"
                  checked={workerResolution.taxReviewed}
                  disabled={isReadOnly}
                  error={validationErrors.taxReviewed}
                  onChange={(checked) => void updateWorkerResolution("taxReviewed", checked)}
                />
                <CheckboxField
                  id="paystubComparisonReviewed"
                  label="Paystub comparison reviewed"
                  checked={workerResolution.paystubComparisonReviewed}
                  disabled={isReadOnly}
                  error={validationErrors.paystubComparisonReviewed}
                  onChange={(checked) =>
                    void updateWorkerResolution("paystubComparisonReviewed", checked)
                  }
                />
              </>
            )}
            <CheckboxField
              id="discrepancyResolved"
              label="Discrepancy resolved"
              checked={workerResolution.discrepancyResolved}
              disabled={isReadOnly}
              error={validationErrors.discrepancyResolved}
              onChange={(checked) => void updateWorkerResolution("discrepancyResolved", checked)}
            />
            <CheckboxField
              id="requestApplicantFollowUp"
              label="Request applicant follow-up"
              checked={workerResolution.requestApplicantFollowUp}
              disabled={isReadOnly}
              onChange={(checked) => void updateWorkerResolution("requestApplicantFollowUp", checked)}
            />
            <CheckboxField
              id="sendToSupervisor"
              label="Send to supervisor"
              checked={workerResolution.sendToSupervisor}
              disabled={isReadOnly}
              onChange={(checked) => void updateWorkerResolution("sendToSupervisor", checked)}
            />
            <CheckboxField
              id="attestation"
              label="I reviewed all validation results and confirm the resolution."
              checked={workerResolution.attestation}
              disabled={isReadOnly}
              error={validationErrors.attestation}
              onChange={(checked) => void updateWorkerResolution("attestation", checked)}
            />
          </div>
          <div className="notes-stack">
            <TextAreaField
              id="resolutionReason"
              label="Resolution reason"
              value={workerResolution.resolutionReason}
              disabled={isReadOnly}
              error={validationErrors.resolutionReason}
              onBlur={() => void handleResolutionReasonBlur()}
              onChange={(value) => void updateWorkerResolution("resolutionReason", value)}
            />
            <TextAreaField
              id="supervisorReason"
              label="Supervisor reason"
              value={workerResolution.supervisorReason}
              disabled={isReadOnly}
              error={
                workerResolution.sendToSupervisor || attemptedAction === "SendToSupervisor"
                  ? validationErrors.supervisorReason
                  : undefined
              }
              onChange={(value) => void updateWorkerResolution("supervisorReason", value)}
            />
            <TextAreaField
              id="workerNotes"
              label="Worker notes"
              value={workerResolution.workerNotes}
              disabled={isReadOnly}
              error={validationErrors.workerNotes}
              onChange={(value) => void updateWorkerResolution("workerNotes", value)}
            />
          </div>
        </div>
      </section>

      <section className="panel action-panel">
        <div className="section-heading">
          <h2>Final Action</h2>
        </div>
        <div className="actions-row">
          <button type="button" className="secondary" disabled={isReadOnly} onClick={() => void handleSaveDraft()}>
            Save Draft
          </button>
          <button
            type="button"
            className="primary"
            disabled={isReadOnly || !canComplete}
            onClick={() => void handleTaskAction("ValidationComplete")}
          >
            Mark Validation Complete
          </button>
          <button
            type="button"
            className="secondary"
            disabled={isReadOnly || !canRequestFollowUp}
            onClick={() => void handleTaskAction("RequestApplicantFollowUp")}
          >
            Request Applicant Follow-Up
          </button>
          <button
            type="button"
            className="secondary"
            disabled={isReadOnly || !canSendSupervisor}
            onClick={() => void handleTaskAction("SendToSupervisor")}
          >
            Send To Supervisor
          </button>
          <button
            type="button"
            className="secondary"
            disabled={isReadOnly || !canReturnMoreInfo}
            onClick={() => void handleTaskAction("ReturnForMoreInformation")}
          >
            Return For More Information
          </button>
          <button type="button" className="ghost" onClick={() => void handleTaskAction("Cancel")}>
            Cancel
          </button>
        </div>
      </section>

      <section className="panel audit-panel">
        <div className="section-heading">
          <h2>Audit</h2>
          <span className="status-pill">{auditInfo.events.length} events</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event Type</th>
                <th>Timestamp UTC</th>
                <th>Actor</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {auditInfo.events.map((event, index) => (
                <tr key={`${event.eventType}-${event.timestampUtc}-${index}`}>
                  <td>{event.eventType}</td>
                  <td>{formatDateTime(event.timestampUtc)}</td>
                  <td>{event.actor}</td>
                  <td>{event.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isRawModalOpen && selectedRawMessageData ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="rawMessageTitle">
            <div className="modal-header">
              <h2 id="rawMessageTitle">{selectedRawMessageData.title}</h2>
              <button type="button" className="ghost compact-button" onClick={() => setIsRawModalOpen(false)}>
                Close
              </button>
            </div>
            <pre>{formatRawMessage(selectedRawMessageData.message)}</pre>
          </div>
        </div>
      ) : null}

      {finalPayload ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="finalPayloadTitle">
            <div className="modal-header">
              <h2 id="finalPayloadTitle">Final Payload {finalAction ? `- ${finalAction}` : ""}</h2>
              <button type="button" className="ghost compact-button" onClick={() => setFinalPayload(null)}>
                Close
              </button>
            </div>
            <pre>{JSON.stringify(finalPayload, null, 2)}</pre>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => void handleCopyPayload()}>
                Copy Payload
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default App;
