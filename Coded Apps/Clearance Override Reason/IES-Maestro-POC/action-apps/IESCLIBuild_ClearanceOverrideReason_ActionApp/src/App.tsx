import { useEffect, useMemo, useRef, useState } from "react";
import {
  auditInfo as mockAuditInfo,
  candidateMatches as mockCandidateMatches,
  caseInfo as mockCaseInfo,
  clearanceSearch as mockClearanceSearch,
  householdMember as mockHouseholdMember,
  taskContext as mockTaskContext,
  workerDecision as mockWorkerDecision
} from "./data/mockClearanceOverrideTask";
import type {
  AuditInfo,
  CandidateMatch,
  CaseInfo,
  ClearanceOverrideInputs,
  ClearanceSearch,
  CompletionTaskAction,
  DecisionAction,
  FinalClearancePayload,
  HouseholdMember,
  TaskAction,
  TaskContext,
  ValidationError,
  WorkerDecision
} from "./types/clearanceOverrideTypes";
import { completeActionTask, loadActionCenterTask, notify, saveTaskData } from "./uipath/actionCenterClient";
import { appendAuditEvent, buildAuditEvent, buildFinalPayload } from "./utils/audit";
import {
  actionLabel,
  candidateOptionLabel,
  confidenceBadgeClass,
  confidenceBadgeLabel,
  formatDate,
  formatDateTime,
  scoreAttentionClass,
  scoreAttentionLabel
} from "./utils/formatters";
import { getSelectedCandidate, isOverrideRequired, validateClearanceDecision } from "./utils/validation";

const decisionActions: CompletionTaskAction[] = [
  "AcceptMatch",
  "RejectMatch",
  "AssignNewCinSin",
  "ReturnForResearch"
];

const overrideExamples = [
  "Applicant confirmed different address during interview.",
  "Candidate has mismatched date of birth.",
  "Multiple candidates require additional research.",
  "No candidate appears to be the applicant.",
  "Worker selected new CIN/SIN because all candidates were rejected."
];

export default function App() {
  const [taskContext, setTaskContext] = useState<TaskContext>({ ...mockTaskContext });
  const [caseInfo, setCaseInfo] = useState<CaseInfo>({ ...mockCaseInfo });
  const [householdMember, setHouseholdMember] = useState<HouseholdMember>({ ...mockHouseholdMember });
  const [clearanceSearch, setClearanceSearch] = useState<ClearanceSearch>({ ...mockClearanceSearch });
  const [candidateMatches, setCandidateMatches] = useState<CandidateMatch[]>(
    mockCandidateMatches.map((candidate) => ({ ...candidate }))
  );
  const [workerDecision, setWorkerDecision] = useState<WorkerDecision>({ ...mockWorkerDecision });
  const [auditInfo, setAuditInfo] = useState<AuditInfo>({
    events: mockAuditInfo.events.map((event) => ({ ...event }))
  });
  const [activeCandidateId, setActiveCandidateId] = useState<string>(mockClearanceSearch.recommendedCandidateId);
  const [isLocalMode, setIsLocalMode] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [localModalPayload, setLocalModalPayload] = useState<FinalClearancePayload | null>(null);
  const skippedInitialPersist = useRef(false);

  const rawInputs = useMemo<ClearanceOverrideInputs>(
    () => ({
      taskContext,
      caseInfo,
      householdMember,
      clearanceSearch,
      candidateMatches,
      workerDecision,
      auditInfo
    }),
    [taskContext, caseInfo, householdMember, clearanceSearch, candidateMatches, workerDecision, auditInfo]
  );

  const autoOverrideRequired = useMemo(() => isOverrideRequired(rawInputs), [rawInputs]);
  const effectiveWorkerDecision = useMemo<WorkerDecision>(
    () => ({
      ...workerDecision,
      overrideUsed: workerDecision.overrideUsed || autoOverrideRequired
    }),
    [workerDecision, autoOverrideRequired]
  );

  const inputs = useMemo<ClearanceOverrideInputs>(
    () => ({
      ...rawInputs,
      workerDecision: effectiveWorkerDecision
    }),
    [rawInputs, effectiveWorkerDecision]
  );

  const activeCandidate = useMemo(
    () => candidateMatches.find((candidate) => candidate.candidateId === activeCandidateId),
    [candidateMatches, activeCandidateId]
  );
  const selectedCandidate = useMemo(
    () => getSelectedCandidate(candidateMatches, workerDecision),
    [candidateMatches, workerDecision]
  );
  const validation = useMemo(() => validateClearanceDecision(inputs), [inputs]);

  useEffect(() => {
    let isMounted = true;

    loadActionCenterTask().then((loadedTask) => {
      if (!isMounted) {
        return;
      }

      setTaskContext(loadedTask.inputs.taskContext);
      setCaseInfo(loadedTask.inputs.caseInfo);
      setHouseholdMember(loadedTask.inputs.householdMember);
      setClearanceSearch(loadedTask.inputs.clearanceSearch);
      setCandidateMatches(loadedTask.inputs.candidateMatches);
      setWorkerDecision(loadedTask.inputs.workerDecision);
      setAuditInfo(loadedTask.inputs.auditInfo);
      setActiveCandidateId(
        loadedTask.inputs.workerDecision.selectedCandidateId ||
          loadedTask.inputs.clearanceSearch.recommendedCandidateId ||
          loadedTask.inputs.candidateMatches[0]?.candidateId ||
          ""
      );
      setIsLocalMode(loadedTask.isLocalMode);
      setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!skippedInitialPersist.current) {
      skippedInitialPersist.current = true;
      return;
    }

    const saveHandle = window.setTimeout(() => {
      saveTaskData(inputs, isLocalMode).catch((error) => {
        console.error("Unable to save task data.", error);
      });
    }, 500);

    return () => window.clearTimeout(saveHandle);
  }, [inputs, isLoaded, isLocalMode]);

  function appendEvent(eventType: string, notes: string) {
    setAuditInfo((currentAuditInfo) =>
      appendAuditEvent(currentAuditInfo, buildAuditEvent(eventType, "worker", notes))
    );
  }

  function updateDecision(patch: Partial<WorkerDecision>) {
    setWorkerDecision((currentDecision) => ({
      ...currentDecision,
      ...patch
    }));
  }

  function selectCandidate(candidateId: string) {
    const candidate = candidateMatches.find((match) => match.candidateId === candidateId);

    updateDecision({
      selectedCandidateId: candidateId,
      selectedCinSin: candidate?.candidateCinSin ?? ""
    });
    setActiveCandidateId(candidateId);
    setShowValidation(false);
    appendEvent("CandidateSelected", `Candidate ${candidateId} selected.`);
  }

  function viewCandidateDetails(candidateId: string) {
    setActiveCandidateId(candidateId);
    appendEvent("MatchDetailsViewed", `Match details viewed for candidate ${candidateId}.`);
  }

  function handleActionChange(value: DecisionAction) {
    updateDecision({
      selectedAction: value,
      selectedCandidateId: value === "AssignNewCinSin" ? "" : workerDecision.selectedCandidateId,
      selectedCinSin: value === "AssignNewCinSin" ? "" : workerDecision.selectedCinSin
    });
    setShowValidation(false);
    appendEvent("DecisionChanged", `Decision changed to ${actionLabel(value)}.`);
  }

  function handleCandidateDropdown(candidateId: string) {
    if (!candidateId) {
      updateDecision({
        selectedCandidateId: "",
        selectedCinSin: ""
      });
      return;
    }

    selectCandidate(candidateId);
  }

  function handleOverrideReasonChange(value: string) {
    if (!workerDecision.overrideReason.trim() && value.trim()) {
      appendEvent("OverrideReasonEntered", "Override reason entered.");
    }

    updateDecision({
      overrideReason: value
    });
  }

  async function handleSaveDraft() {
    const draftAuditInfo = appendAuditEvent(auditInfo, buildAuditEvent("DraftSaved", "worker", "Draft saved."));
    const draftInputs: ClearanceOverrideInputs = {
      ...inputs,
      auditInfo: draftAuditInfo
    };

    setAuditInfo(draftAuditInfo);
    await saveTaskData(draftInputs, isLocalMode);
    await notify("Draft saved.", "success");
  }

  async function handleCompleteTask() {
    if (!isCompletionAction(inputs.workerDecision.selectedAction)) {
      setShowValidation(true);
      await notify("Select an action before completing the task.", "error");
      return;
    }

    if (!validation.isValid) {
      setShowValidation(true);
      await notify("Complete required fields before submitting.", "error");
      return;
    }

    await submitTask(inputs.workerDecision.selectedAction);
  }

  async function handleCancelTask() {
    await submitTask("Cancel");
  }

  async function submitTask(action: TaskAction) {
    setIsSubmitting(true);

    try {
      const completedAuditInfo = appendAuditEvent(
        auditInfo,
        buildAuditEvent(
          action === "Cancel" ? "TaskCancelled" : "TaskCompleted",
          "worker",
          action === "Cancel" ? "Task canceled." : `Task completed with ${actionLabel(action)}.`
        )
      );
      const completedInputs: ClearanceOverrideInputs = {
        ...inputs,
        auditInfo: completedAuditInfo
      };
      const finalPayload = buildFinalPayload(completedInputs, action);

      setAuditInfo(completedAuditInfo);
      const result = await completeActionTask(action, finalPayload, isLocalMode);

      if (result.localPayload) {
        setLocalModalPayload(result.localPayload);
      }

      await notify(action === "Cancel" ? "Task canceled." : "Task completed.", "success");
    } catch (error) {
      console.error("Unable to complete task.", error);
      await notify("Unable to complete task. Review the console for details.", "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getFieldError(field: ValidationError["field"]): string {
    if (!showValidation) {
      return "";
    }

    return validation.errors.find((error) => error.field === field)?.message ?? "";
  }

  if (!isLoaded) {
    return (
      <main className="app-shell">
        <section className="loading-panel">Loading clearance task...</section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="task-header">
        <div>
          <p className="eyebrow">IES - Maestro POC</p>
          <h1>{taskContext.taskName}</h1>
          <p className="header-subtitle">
            Human review for clearance and <strong>CIN/SIN</strong> matching override decisions.
          </p>
          <p className="terminology-note">Identifier terminology is configurable for this demo.</p>
        </div>
        <div className="header-meta">
          <span className="priority-pill">{taskContext.priority} Priority</span>
          <span>{taskContext.assignedGroup}</span>
          <span>{formatDateTime(taskContext.createdAtUtc)}</span>
        </div>
      </header>

      {isLocalMode ? <div className="local-banner">Local Demo Mode - Clearance task data is mocked.</div> : null}

      {showValidation && !validation.isValid ? (
        <section className="summary-banner" aria-live="polite">
          <strong>Review required fields before completing.</strong>
          <ul>
            {validation.errors.map((error) => (
              <li key={`${error.field}-${error.message}`}>{error.message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="overview-grid">
        <InfoCard title="Case Identity">
          <Field label="MyB Number" value={caseInfo.myBNumber} />
          <Field label="Applicant Name" value={caseInfo.applicantName} />
          <Field label="County" value={caseInfo.county} />
          <Field label="Region" value={caseInfo.derivedRegion} />
          <Field label="Filing Date" value={formatDate(caseInfo.filingDate)} />
          <Field label="Eligibility Due Date" value={formatDate(caseInfo.eligibilityDueDate)} />
          <Field label="Current Status" value={caseInfo.currentStatus} />
          <Field label="Current Stage" value={caseInfo.currentStage} />
        </InfoCard>

        <InfoCard title="Household Member">
          <Field label="Household Member Name" value={householdMember.name} />
          <Field label="Date of Birth" value={formatDate(householdMember.dateOfBirth)} />
          <Field label="SSN Last 4" value={householdMember.ssnLast4} />
          <Field label="Relationship" value={householdMember.relationship} />
          <Field label="Applying" value={householdMember.applying ? "Yes" : "No"} />
        </InfoCard>

        <InfoCard title="Clearance Recommendation">
          <Field label="Algorithm Profile" value={clearanceSearch.algorithmProfile} />
          <Field label="Recommended Action" value={clearanceSearch.recommendedAction} />
          <Field label="Recommended Candidate" value={clearanceSearch.recommendedCandidateId} />
          <Field label="Search Run" value={formatDateTime(clearanceSearch.searchRunAtUtc)} />
          <p className="recommendation-text">{clearanceSearch.recommendationSummary}</p>
        </InfoCard>
      </section>

      <section className="content-grid">
        <section className="panel table-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Candidate matches</p>
              <h2>CIN/SIN Match Results</h2>
            </div>
            <span className="count-pill">{candidateMatches.length} candidates</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate ID</th>
                  <th>Candidate Name</th>
                  <th>Candidate CIN/SIN</th>
                  <th>Match Score</th>
                  <th>Match Type</th>
                  <th>Matched Field Count</th>
                  <th>Mismatched Field Count</th>
                  <th>Select</th>
                  <th>View Details</th>
                </tr>
              </thead>
              <tbody>
                {candidateMatches.map((candidate) => (
                  <tr
                    key={candidate.candidateId}
                    className={candidate.candidateId === workerDecision.selectedCandidateId ? "selected-row" : ""}
                  >
                    <td>{candidate.candidateId}</td>
                    <td>{candidate.candidateName}</td>
                    <td>{candidate.candidateCinSin}</td>
                    <td>
                      <span className={`score-badge ${scoreAttentionClass(candidate.matchScore)}`}>
                        {candidate.matchScore}
                      </span>
                      <span className="score-caption">{scoreAttentionLabel(candidate.matchScore)}</span>
                    </td>
                    <td>
                      <span className={`badge ${confidenceBadgeClass(candidate)}`}>{confidenceBadgeLabel(candidate)}</span>
                    </td>
                    <td>{candidate.matchedFields.length}</td>
                    <td>{candidate.mismatchedFields.length}</td>
                    <td>
                      <button type="button" className="button secondary" onClick={() => selectCandidate(candidate.candidateId)}>
                        Select
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => viewCandidateDetails(candidate.candidateId)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel details-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Match details</p>
              <h2>{activeCandidate ? activeCandidate.candidateId : "No candidate selected"}</h2>
            </div>
          </div>

          {activeCandidate ? (
            <MatchDetails candidate={activeCandidate} />
          ) : (
            <p className="empty-state">Select or view a candidate to inspect match details.</p>
          )}
        </section>
      </section>

      <section className="content-grid decision-grid">
        <section className="panel decision-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Worker decision</p>
              <h2>Clearance Outcome</h2>
            </div>
          </div>

          <label className="control-label" htmlFor="selected-action">
            Selected action
          </label>
          <select
            id="selected-action"
            value={workerDecision.selectedAction}
            onChange={(event) => handleActionChange(event.target.value as DecisionAction)}
          >
            <option value="">Select action</option>
            {decisionActions.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </select>
          <InlineError message={getFieldError("selectedAction")} />

          <label className="control-label" htmlFor="selected-candidate">
            Selected candidate
          </label>
          <select
            id="selected-candidate"
            value={workerDecision.selectedCandidateId}
            onChange={(event) => handleCandidateDropdown(event.target.value)}
          >
            <option value="">Choose candidate</option>
            {candidateMatches.map((candidate) => (
              <option key={candidate.candidateId} value={candidate.candidateId}>
                {candidateOptionLabel(candidate)}
              </option>
            ))}
          </select>
          <InlineError message={getFieldError("selectedCandidateId")} />

          {selectedCandidate ? (
            <div className="selected-summary">
              <span>Selected CIN/SIN</span>
              <strong>{selectedCandidate.candidateCinSin}</strong>
            </div>
          ) : null}

          <label className="control-label" htmlFor="worker-notes">
            Worker notes
          </label>
          <textarea
            id="worker-notes"
            value={workerDecision.workerNotes}
            onChange={(event) => updateDecision({ workerNotes: event.target.value })}
            rows={5}
            placeholder="Document the review outcome."
          />
          <InlineError message={getFieldError("workerNotes")} />

          <label className="checkbox-line" htmlFor="override-used">
            <input
              id="override-used"
              type="checkbox"
              checked={effectiveWorkerDecision.overrideUsed}
              disabled={autoOverrideRequired}
              onChange={(event) => updateDecision({ overrideUsed: event.target.checked })}
            />
            <span>Override used</span>
            {autoOverrideRequired ? <span className="auto-pill">Auto required</span> : null}
          </label>

          <label className="checkbox-line" htmlFor="attestation">
            <input
              id="attestation"
              type="checkbox"
              checked={workerDecision.attestation}
              onChange={(event) => updateDecision({ attestation: event.target.checked })}
            />
            <span>I reviewed the clearance search results and confirm this decision.</span>
          </label>
          <InlineError message={getFieldError("attestation")} />
        </section>

        {effectiveWorkerDecision.overrideUsed ? (
          <section className="panel override-panel">
            <div className="override-heading">
              <p className="eyebrow">Override</p>
              <h2>Override Reason Required</h2>
            </div>
            <p>
              This decision differs from the system recommendation or uses a lower-confidence candidate. Enter a reason
              before completing the task.
            </p>

            <label className="control-label" htmlFor="override-reason">
              Override reason
            </label>
            <textarea
              id="override-reason"
              value={workerDecision.overrideReason}
              onChange={(event) => handleOverrideReasonChange(event.target.value)}
              rows={5}
              placeholder="Enter the reason for the override."
            />
            <InlineError message={getFieldError("overrideReason")} />

            <div className="example-list">
              <strong>Examples</strong>
              <ul>
                {overrideExamples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </div>

            <div className="required-reminder">
              Required before completion: override reason, worker notes, and attestation when applicable.
            </div>
          </section>
        ) : (
          <section className="panel quiet-panel">
            <p className="eyebrow">Override</p>
            <h2>No Override Required</h2>
            <p>The current decision path does not require an override reason.</p>
          </section>
        )}
      </section>

      <section className="panel audit-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Audit</p>
            <h2>Task Events</h2>
          </div>
          <span className="count-pill">{auditInfo.events.length} events</span>
        </div>
        <ol className="audit-list">
          {auditInfo.events.map((event, index) => (
            <li key={`${event.eventType}-${event.timestampUtc}-${index}`}>
              <span>{formatDateTime(event.timestampUtc)}</span>
              <strong>{event.eventType}</strong>
              <span>{event.actor}</span>
              <p>{event.notes}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="action-bar">
        <button type="button" className="button secondary" onClick={handleSaveDraft} disabled={isSubmitting}>
          Save Draft
        </button>
        <button type="button" className="button ghost danger" onClick={handleCancelTask} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="button" className="button primary" onClick={handleCompleteTask} disabled={isSubmitting}>
          Complete Task
        </button>
      </footer>

      {localModalPayload ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="local-modal-title">
          <section className="modal-panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Local completeTask</p>
                <h2 id="local-modal-title">Final Output Payload</h2>
              </div>
              <button type="button" className="button ghost" onClick={() => setLocalModalPayload(null)}>
                Close
              </button>
            </div>
            <pre>{JSON.stringify(localModalPayload, null, 2)}</pre>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel info-card">
      <h2>{title}</h2>
      <div className="field-grid">{children}</div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MatchDetails({ candidate }: { candidate: CandidateMatch }) {
  return (
    <div className="match-details">
      <Field label="Candidate name" value={candidate.candidateName} />
      <Field label="Candidate CIN/SIN" value={candidate.candidateCinSin} />
      <Field label="Match score" value={String(candidate.matchScore)} />

      <div className="match-field-group">
        <h3>Matched fields</h3>
        {candidate.matchedFields.map((field) => (
          <span className="field-token match" key={field}>
            MATCH {field}
          </span>
        ))}
      </div>

      <div className="match-field-group">
        <h3>Mismatched fields</h3>
        {candidate.mismatchedFields.map((field) => (
          <span className="field-token mismatch" key={field}>
            MISMATCH {field}
          </span>
        ))}
      </div>

      <div className="notes-block">
        <span>Notes</span>
        <p>{candidate.notes}</p>
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  if (!message) {
    return null;
  }

  return <p className="inline-error">{message}</p>;
}

function isCompletionAction(action: DecisionAction): action is CompletionTaskAction {
  return action !== "";
}
