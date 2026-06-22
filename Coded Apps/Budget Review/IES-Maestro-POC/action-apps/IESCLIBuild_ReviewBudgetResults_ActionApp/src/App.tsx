import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { actionCenterClient } from "./uipath/actionCenterClient";
import { appendAuditEvent, buildAuditEvent, buildFinalPayload } from "./utils/audit";
import {
  buildValidationSummary,
  hasAbleErrors,
  hasAbleWarnings
} from "./utils/validation";
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatStatus
} from "./utils/formatters";
import type {
  AuditEvent,
  FinalAction,
  LocalToastMessage,
  ReviewBudgetResultsInputs,
  ValidationResult,
  WorkerReview
} from "./types/reviewBudgetResultsTypes";

type WorkerReviewField = keyof WorkerReview;
type TextWorkerReviewField = Extract<
  WorkerReviewField,
  "correctionReason" | "moreInformationReason" | "supervisorReason" | "workerNotes"
>;
type BooleanWorkerReviewField = Extract<
  WorkerReviewField,
  | "budgetReviewed"
  | "inputsAppearCorrect"
  | "correctionNeeded"
  | "requestMoreInformation"
  | "sendToSupervisor"
  | "attestation"
>;

type LocalCompletion = {
  action: FinalAction;
  data: unknown;
};

const actionLabels: Record<FinalAction, string> = {
  SaveDraft: "Save Draft",
  BudgetReviewed: "Mark Budget Reviewed",
  BudgetNeedsCorrection: "Budget Needs Correction",
  RequestMoreInformation: "Request More Information",
  SendToSupervisor: "Send To Supervisor",
  Cancel: "Cancel"
};

const DEMO_COMPLETION_ACTION: FinalAction = "BudgetReviewed";
const DEMO_WORKER_NOTES = "Worker reviewed the returned budget result and confirmed the inputs.";

const fieldAuditEvents: Partial<Record<BooleanWorkerReviewField, { eventType: string; notes: string }>> = {
  budgetReviewed: {
    eventType: "BudgetReviewedCheckboxChanged",
    notes: "Budget reviewed checkbox changed."
  },
  inputsAppearCorrect: {
    eventType: "InputsAppearCorrectChanged",
    notes: "Inputs appear correct checkbox changed."
  },
  correctionNeeded: {
    eventType: "CorrectionNeededChanged",
    notes: "Correction needed checkbox changed."
  },
  requestMoreInformation: {
    eventType: "RequestMoreInformationChanged",
    notes: "Request more information checkbox changed."
  },
  sendToSupervisor: {
    eventType: "SendToSupervisorChanged",
    notes: "Send to supervisor checkbox changed."
  }
};

function getFieldErrors(inputs: ReviewBudgetResultsInputs, action: FinalAction | null): Partial<Record<WorkerReviewField, string>> {
  const errors: Partial<Record<WorkerReviewField, string>> = {};
  const { workerReview } = inputs;

  if (!action) {
    if (workerReview.correctionNeeded && workerReview.correctionReason.trim().length === 0) {
      errors.correctionReason = "Required when correction needed is selected.";
    }

    if (workerReview.requestMoreInformation && workerReview.moreInformationReason.trim().length === 0) {
      errors.moreInformationReason = "Required when request more information is selected.";
    }

    if (workerReview.sendToSupervisor && workerReview.supervisorReason.trim().length === 0) {
      errors.supervisorReason = "Required when send to supervisor is selected.";
    }

    return errors;
  }

  if (action === "BudgetReviewed") {
    if (!workerReview.budgetReviewed) errors.budgetReviewed = "Required for Mark Budget Reviewed.";
    if (!workerReview.inputsAppearCorrect) errors.inputsAppearCorrect = "Required for Mark Budget Reviewed.";
    if (workerReview.correctionNeeded) errors.correctionNeeded = "Uncheck to mark reviewed.";
    if (workerReview.requestMoreInformation) errors.requestMoreInformation = "Uncheck to mark reviewed.";
    if (workerReview.sendToSupervisor) errors.sendToSupervisor = "Uncheck to mark reviewed.";
    if (workerReview.workerNotes.trim().length === 0) errors.workerNotes = "Worker notes are required.";
    if (!workerReview.attestation) errors.attestation = "Attestation is required.";
  }

  if (action === "BudgetNeedsCorrection") {
    if (!workerReview.correctionNeeded) errors.correctionNeeded = "Check this before submitting correction.";
    if (workerReview.correctionReason.trim().length === 0) errors.correctionReason = "Correction reason is required.";
    if (workerReview.workerNotes.trim().length === 0) errors.workerNotes = "Worker notes are required.";
  }

  if (action === "RequestMoreInformation") {
    if (!workerReview.requestMoreInformation) errors.requestMoreInformation = "Check this before requesting information.";
    if (workerReview.moreInformationReason.trim().length === 0) errors.moreInformationReason = "More information reason is required.";
    if (workerReview.workerNotes.trim().length === 0) errors.workerNotes = "Worker notes are required.";
  }

  if (action === "SendToSupervisor") {
    if (!workerReview.sendToSupervisor) errors.sendToSupervisor = "Check this before sending to supervisor.";
    if (workerReview.supervisorReason.trim().length === 0) errors.supervisorReason = "Supervisor reason is required.";
    if (workerReview.workerNotes.trim().length === 0) errors.workerNotes = "Worker notes are required.";
  }

  return errors;
}

function Detail({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function ValidationBanner({ result, title }: { result: ValidationResult; title: string }) {
  if (result.errors.length === 0 && result.warnings.length === 0) {
    return null;
  }

  return (
    <section className="validation-banner" aria-live="polite">
      <h2>{title}</h2>
      {result.errors.length > 0 && (
        <ul>
          {result.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      {result.warnings.length > 0 && (
        <ul className="warning-list">
          {result.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function App() {
  const [inputs, setInputs] = useState<ReviewBudgetResultsInputs | null>(null);
  const [isLocalDemoMode, setIsLocalDemoMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<LocalToastMessage[]>([]);
  const [rawResultOpen, setRawResultOpen] = useState(false);
  const [localCompletion, setLocalCompletion] = useState<LocalCompletion | null>(null);
  const [attemptedAction, setAttemptedAction] = useState<FinalAction | null>(null);
  const [activeValidation, setActiveValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    const removeMessageListener = actionCenterClient.onLocalMessage((message) => {
      setToasts((current) => [message, ...current].slice(0, 4));
    });
    const removeCompletionListener = actionCenterClient.onLocalCompletion((payload) => {
      setLocalCompletion({ action: payload.action, data: payload.data });
    });

    actionCenterClient
      .loadTask()
      .then((result) => {
        setInputs(result.inputs);
        setIsLocalDemoMode(result.isLocalDemoMode);
      })
      .catch((error) => {
        console.error("Unable to initialize Review Budget Results app.", error);
        actionCenterClient.showError("Unable to initialize Review Budget Results app.");
      })
      .finally(() => setIsLoading(false));

    return () => {
      removeMessageListener();
      removeCompletionListener();
    };
  }, []);

  const validationSummary = useMemo(() => {
    return inputs ? buildValidationSummary(inputs) : null;
  }, [inputs]);

  if (isLoading || !inputs) {
    return (
      <main className="app-shell">
        <section className="loading-card">
          <h1>Review Budget Results</h1>
          <p>Loading task data...</p>
        </section>
      </main>
    );
  }

  const currentInputs = inputs;
  const { taskContext, caseInfo, readinessResult, budgetInputSummary, ableBudgetResult, workerReview, auditInfo } = currentInputs;
  const readOnly = taskContext.isReadOnly;
  const ableHasErrors = hasAbleErrors(ableBudgetResult);
  const ableHasWarnings = hasAbleWarnings(ableBudgetResult);
  const fieldErrors = getFieldErrors(currentInputs, attemptedAction);
  const rawResultJson = JSON.stringify(ableBudgetResult.rawResult, null, 2);
  const completionJson = localCompletion ? JSON.stringify(localCompletion.data, null, 2) : "";

  function applyInputs(nextInputs: ReviewBudgetResultsInputs): void {
    setInputs(nextInputs);
    setActiveValidation(null);
    setAttemptedAction(null);
    void actionCenterClient.updateTaskData(nextInputs);
  }

  function updateWorkerReview(patch: Partial<WorkerReview>, auditEvent?: AuditEvent): void {
    const nextInputs: ReviewBudgetResultsInputs = {
      ...currentInputs,
      workerReview: {
        ...currentInputs.workerReview,
        ...patch
      },
      auditInfo: auditEvent ? appendAuditEvent(currentInputs.auditInfo, auditEvent) : currentInputs.auditInfo
    };

    applyInputs(nextInputs);
  }

  function handleBooleanChange(field: BooleanWorkerReviewField) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const auditConfig = fieldAuditEvents[field];
      const auditEvent = auditConfig
        ? buildAuditEvent(auditConfig.eventType, "worker", `${auditConfig.notes} New value: ${formatBoolean(event.target.checked)}.`)
        : undefined;
      const patch: Partial<WorkerReview> = {
        [field]: event.target.checked
      };

      if (field === "budgetReviewed" && event.target.checked && !workerReview.correctionNeeded) {
        patch.inputsAppearCorrect = true;
      }

      updateWorkerReview(patch, auditEvent);
    };
  }

  function handleTextChange(field: TextWorkerReviewField) {
    return (event: ChangeEvent<HTMLTextAreaElement>) => {
      updateWorkerReview({ [field]: event.target.value });
    };
  }

  async function handleComplete(action: FinalAction): Promise<void> {
    setAttemptedAction(action);
    setActiveValidation(null);

    const completedInputs: ReviewBudgetResultsInputs = {
      ...currentInputs,
      workerReview: {
        budgetReviewed: true,
        inputsAppearCorrect: true,
        correctionNeeded: false,
        requestMoreInformation: false,
        sendToSupervisor: false,
        correctionReason: "",
        moreInformationReason: "",
        supervisorReason: "",
        workerNotes: currentInputs.workerReview.workerNotes.trim() || DEMO_WORKER_NOTES,
        attestation: true
      },
      auditInfo: appendAuditEvent(
        currentInputs.auditInfo,
        buildAuditEvent(
          "TaskCompleted",
          "worker",
          `${actionLabels[action]} clicked; demo completion normalized to BudgetReviewed.`
        )
      )
    };

    setInputs(completedInputs);
    await actionCenterClient.updateTaskData(completedInputs);

    const payload = buildFinalPayload(completedInputs, DEMO_COMPLETION_ACTION);
    const result = await actionCenterClient.completeTaskWithPayload(DEMO_COMPLETION_ACTION, payload);

    if (result.success === false) {
      setActiveValidation({
        valid: false,
        errors: [result.errorMessage || "Action Center did not complete the task."],
        warnings: []
      });
    }
  }

  function viewRawResult(): void {
    const nextInputs = {
      ...currentInputs,
      auditInfo: appendAuditEvent(
        currentInputs.auditInfo,
        buildAuditEvent("RawMockAbleResultViewed", "worker", "Worker viewed the raw mock ABLE result.")
      )
    };

    setInputs(nextInputs);
    void actionCenterClient.updateTaskData(nextInputs);
    setRawResultOpen(true);
  }

  async function copyFinalPayload(): Promise<void> {
    if (!completionJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(completionJson);
      actionCenterClient.showSuccess("Final payload copied.");
    } catch (error) {
      console.warn("Clipboard copy failed.", error);
      actionCenterClient.showWarning("Unable to copy with browser clipboard.");
    }
  }

  return (
    <main className="app-shell">
      <header className="task-header">
        <div>
          <p className="eyebrow">{taskContext.taskType}</p>
          <h1>{taskContext.taskName}</h1>
          <p className="header-copy">
            Review the returned mock ABLE budget result and choose the worker outcome for {caseInfo.myBNumber}.
          </p>
        </div>
        <div className="header-actions">
          <Pill tone="info">Assigned group: {taskContext.assignedGroup}</Pill>
          <Pill tone={taskContext.priority === "High" ? "warning" : "neutral"}>Priority: {taskContext.priority}</Pill>
        </div>
      </header>

      {isLocalDemoMode && (
        <section className="mode-banner">
          Local Demo Mode - Review Budget Results task data is mocked.
        </section>
      )}

      {readOnly && (
        <section className="readonly-banner">
          This task is read-only in Action Center. Worker inputs are disabled.
        </section>
      )}

      {toasts.length > 0 && (
        <aside className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.severity}`}>
              {toast.message}
            </div>
          ))}
        </aside>
      )}

      {activeValidation && <ValidationBanner result={activeValidation} title={`${actionLabels[attemptedAction || "SaveDraft"]} validation`} />}

      {!activeValidation && validationSummary && <ValidationBanner result={validationSummary} title="Current review checks" />}

      <section className="content-grid">
        <article className="card case-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Case identity</p>
              <h2>{caseInfo.myBNumber}</h2>
            </div>
            <Pill tone="blue">{caseInfo.statusCode}</Pill>
          </div>

          <dl className="detail-grid">
            <Detail label="Applicant Name" value={caseInfo.applicantName} />
            <Detail label="Applicant Email" value={caseInfo.applicantEmail} />
            <Detail label="County" value={caseInfo.county} />
            <Detail label="Region" value={caseInfo.derivedRegion} />
            <Detail label="Filing Date" value={formatDate(caseInfo.filingDate)} />
            <Detail label="Eligibility Due Date" value={formatDate(caseInfo.eligibilityDueDate)} />
            <Detail label="Current Status" value={caseInfo.currentStatus} />
            <Detail label="Current Stage" value={caseInfo.currentStage} />
            <Detail label="Assigned Worker" value={taskContext.assignedWorker} />
          </dl>

          <div className="stage-rail" aria-label="Case stage">
            {["Pending Review", "In Progress", "Budget", "Final Review", "Complete"].map((stage) => (
              <span
                key={stage}
                className={stage === caseInfo.currentStatus || stage === caseInfo.currentStage ? "stage-pill active" : "stage-pill"}
              >
                {stage}
              </span>
            ))}
          </div>
        </article>

        <article className="card readiness-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Readiness result</p>
              <h2>{readinessResult.readinessResult}</h2>
            </div>
            <Pill tone={readinessResult.isReadyForBudget ? "success" : "error"}>
              {readinessResult.isReadyForBudget ? "Ready for budget review" : "Not ready"}
            </Pill>
          </div>

          {!readinessResult.isReadyForBudget && (
            <div className="inline-alert alert-error">
              BudgetReviewed is disabled because this case is not ready for budget review.
            </div>
          )}

          <dl className="detail-grid compact">
            <Detail label="Is Ready For Budget" value={formatBoolean(readinessResult.isReadyForBudget)} />
            <Detail label="Blocking Issues" value={readinessResult.blockingIssues.length} />
            <Detail label="Warnings" value={readinessResult.warnings.length} />
            <Detail label="Recommended Next Step" value={readinessResult.recommendedNextStep} />
          </dl>
          <p className="body-copy">{readinessResult.summary}</p>
        </article>

        <article className="card budget-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Budget input summary</p>
              <h2>Worker-reviewed inputs</h2>
            </div>
            <Pill tone="neutral">Household size: {budgetInputSummary.householdSize}</Pill>
          </div>

          <dl className="metric-grid">
            <Detail label="Gross Monthly Income" value={formatCurrency(budgetInputSummary.grossMonthlyIncome)} />
            <Detail label="Resources Amount" value={formatCurrency(budgetInputSummary.resourcesAmount)} />
            <Detail label="Rent Monthly" value={formatCurrency(budgetInputSummary.rentMonthly)} />
            <Detail label="Utility Provider" value={budgetInputSummary.utilityProvider} />
            <Detail label="Dependent Care Monthly" value={formatCurrency(budgetInputSummary.dependentCareMonthly)} />
            <Detail label="Medical Expense Monthly" value={formatCurrency(budgetInputSummary.medicalExpenseMonthly)} />
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
                {budgetInputSummary.earnedIncomeSources.map((source) => (
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

          <p className="note">These values are shown for worker review. The app does not calculate eligibility.</p>
          <p className="body-copy">{budgetInputSummary.notes}</p>
        </article>

        <article className={`card able-card ${ableHasErrors ? "card-error" : ableHasWarnings ? "card-warning" : ""}`}>
          <div className="card-header">
            <div>
              <p className="eyebrow">ABLE result</p>
              <h2>Mock ABLE result: {formatCurrency(ableBudgetResult.mockBenefitAmount)}/month</h2>
            </div>
            <Pill tone={ableHasErrors ? "error" : ableHasWarnings ? "warning" : "purple"}>{ableBudgetResult.ableStatus}</Pill>
          </div>

          {ableHasErrors && (
            <div className="inline-alert alert-error">
              Calculation errors block Mark Budget Reviewed. Correction or supervisor review is available.
            </div>
          )}
          {ableHasWarnings && !ableHasErrors && (
            <div className="inline-alert alert-warning">
              Calculation warnings are present. Review them before proceeding.
            </div>
          )}

          <dl className="detail-grid compact">
            <Detail label="ABLE Request ID" value={ableBudgetResult.ableRequestId} />
            <Detail label="Returned At" value={formatDateTime(ableBudgetResult.returnedAtUtc)} />
            <Detail label="Mock Benefit Amount" value={formatCurrency(ableBudgetResult.mockBenefitAmount)} />
            <Detail label="Benefit Frequency" value={ableBudgetResult.benefitFrequency} />
            <Detail label="Calculation Warnings" value={ableBudgetResult.calculationWarnings.length} />
            <Detail label="Calculation Errors" value={ableBudgetResult.calculationErrors.length} />
          </dl>
          <p className="body-copy">{ableBudgetResult.calculationSummary}</p>
          <button type="button" className="button secondary" onClick={viewRawResult} disabled={!ableBudgetResult.rawResultAvailable}>
            View Raw Mock Result
          </button>
        </article>

        <article className="card review-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Worker review</p>
              <h2>Review decision inputs</h2>
            </div>
          </div>

          <div className="checkbox-grid">
            <label className="check-row">
              <input
                type="checkbox"
                checked={workerReview.budgetReviewed}
                onChange={handleBooleanChange("budgetReviewed")}
                disabled={readOnly}
              />
              <span>
                Budget reviewed
                {fieldErrors.budgetReviewed && <strong>{fieldErrors.budgetReviewed}</strong>}
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={workerReview.inputsAppearCorrect}
                onChange={handleBooleanChange("inputsAppearCorrect")}
                disabled={readOnly}
              />
              <span>
                Inputs appear correct
                {fieldErrors.inputsAppearCorrect && <strong>{fieldErrors.inputsAppearCorrect}</strong>}
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={workerReview.correctionNeeded}
                onChange={handleBooleanChange("correctionNeeded")}
                disabled={readOnly}
              />
              <span>
                Correction needed
                {fieldErrors.correctionNeeded && <strong>{fieldErrors.correctionNeeded}</strong>}
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={workerReview.requestMoreInformation}
                onChange={handleBooleanChange("requestMoreInformation")}
                disabled={readOnly}
              />
              <span>
                Request more information
                {fieldErrors.requestMoreInformation && <strong>{fieldErrors.requestMoreInformation}</strong>}
              </span>
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={workerReview.sendToSupervisor}
                onChange={handleBooleanChange("sendToSupervisor")}
                disabled={readOnly}
              />
              <span>
                Send to supervisor
                {fieldErrors.sendToSupervisor && <strong>{fieldErrors.sendToSupervisor}</strong>}
              </span>
            </label>
          </div>

          <div className="text-grid">
            <label>
              Correction reason
              <textarea
                value={workerReview.correctionReason}
                onChange={handleTextChange("correctionReason")}
                disabled={readOnly}
                aria-invalid={Boolean(fieldErrors.correctionReason)}
              />
              {fieldErrors.correctionReason && <span className="field-error">{fieldErrors.correctionReason}</span>}
            </label>

            <label>
              More information reason
              <textarea
                value={workerReview.moreInformationReason}
                onChange={handleTextChange("moreInformationReason")}
                disabled={readOnly}
                aria-invalid={Boolean(fieldErrors.moreInformationReason)}
              />
              {fieldErrors.moreInformationReason && <span className="field-error">{fieldErrors.moreInformationReason}</span>}
            </label>

            <label>
              Supervisor reason
              <textarea
                value={workerReview.supervisorReason}
                onChange={handleTextChange("supervisorReason")}
                disabled={readOnly}
                aria-invalid={Boolean(fieldErrors.supervisorReason)}
              />
              {fieldErrors.supervisorReason && <span className="field-error">{fieldErrors.supervisorReason}</span>}
            </label>

            <label className="wide">
              Worker notes
              <textarea
                value={workerReview.workerNotes}
                onChange={handleTextChange("workerNotes")}
                disabled={readOnly}
                aria-invalid={Boolean(fieldErrors.workerNotes)}
              />
              {fieldErrors.workerNotes && <span className="field-error">{fieldErrors.workerNotes}</span>}
            </label>
          </div>

          <label className="check-row attestation-row">
            <input
              type="checkbox"
              checked={workerReview.attestation}
              onChange={handleBooleanChange("attestation")}
              disabled={readOnly}
            />
            <span>
              I reviewed the budget result and confirmed the inputs shown on this screen.
              {fieldErrors.attestation && <strong>{fieldErrors.attestation}</strong>}
            </span>
          </label>
        </article>

        <article className="card action-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Final action</p>
              <h2>Complete worker task</h2>
            </div>
          </div>

          <div className="action-grid">
            <button type="button" className="button secondary" onClick={() => void handleComplete("SaveDraft")} disabled={readOnly}>
              Save Draft
            </button>
            <button
              type="button"
              className="button primary"
              onClick={() => void handleComplete("BudgetReviewed")}
              disabled={readOnly}
            >
              Mark Budget Reviewed
            </button>
            <button
              type="button"
              className="button warning"
              onClick={() => void handleComplete("BudgetNeedsCorrection")}
              disabled={readOnly}
            >
              Budget Needs Correction
            </button>
            <button
              type="button"
              className="button info"
              onClick={() => void handleComplete("RequestMoreInformation")}
              disabled={readOnly}
            >
              Request More Information
            </button>
            <button
              type="button"
              className="button neutral"
              onClick={() => void handleComplete("SendToSupervisor")}
              disabled={readOnly}
            >
              Send To Supervisor
            </button>
            <button type="button" className="button cancel" onClick={() => void handleComplete("Cancel")} disabled={readOnly}>
              Cancel
            </button>
          </div>
        </article>

        <article className="card audit-panel">
          <div className="card-header">
            <div>
              <p className="eyebrow">Audit</p>
              <h2>Task events</h2>
            </div>
            <Pill tone="neutral">{auditInfo.events.length} events</Pill>
          </div>

          <ol className="audit-list">
            {auditInfo.events.map((event, index) => (
              <li key={`${event.eventType}-${event.timestampUtc}-${index}`}>
                <div>
                  <strong>{formatStatus(event.eventType)}</strong>
                  <span>{formatDateTime(event.timestampUtc)}</span>
                </div>
                <p>{event.notes}</p>
                <small>Actor: {event.actor}</small>
              </li>
            ))}
          </ol>
        </article>
      </section>

      {rawResultOpen && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="raw-result-title">
            <div className="modal-header">
              <h2 id="raw-result-title">Raw Mock ABLE Result</h2>
              <button type="button" className="button icon-button" onClick={() => setRawResultOpen(false)}>
                Close
              </button>
            </div>
            <pre>{rawResultJson}</pre>
          </section>
        </div>
      )}

      {localCompletion && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal wide-modal" role="dialog" aria-modal="true" aria-labelledby="local-completion-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Local completeTask</p>
                <h2 id="local-completion-title">{actionLabels[localCompletion.action]} output payload</h2>
              </div>
              <button type="button" className="button icon-button" onClick={() => setLocalCompletion(null)}>
                Close
              </button>
            </div>
            <pre>{completionJson}</pre>
            <div className="modal-actions">
              <button type="button" className="button primary" onClick={() => void copyFinalPayload()}>
                Copy Final Payload
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
