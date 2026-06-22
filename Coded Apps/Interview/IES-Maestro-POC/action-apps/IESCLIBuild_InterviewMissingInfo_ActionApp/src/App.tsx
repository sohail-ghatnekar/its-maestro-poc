import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { actionCenterClient } from './uipath/actionCenterClient';
import type {
  FinalAction,
  InterviewMethod,
  InterviewMissingInfoInputs,
  LocalToastMessage,
  MissingInfo,
  ValidationResult,
} from './types/interviewMissingInfoTypes';
import { appendAuditEvent, buildAuditEvent, buildFinalPayload } from './utils/audit';
import { formatBoolean, formatCurrency, formatDate, formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from './utils/formatters';
import {
  buildValidationSummary,
  getSelectedUnresolvedMissingItems,
  getUnresolvedRequiredItems,
  validateCompleteInterview,
  validatePendForApplicantResponse,
  validateRequestMissingInformation,
  validateReturnToCaseReview,
  validateSaveDraft,
} from './utils/validation';

const interviewMethods: InterviewMethod[] = ['Phone', 'In Person', 'Not Required'];

const actionLabels: Record<FinalAction, string> = {
  SaveDraft: 'Save Draft',
  CompleteInterview: 'Complete Interview',
  RequestMissingInformation: 'Request Missing Information',
  PendForApplicantResponse: 'Pend For Applicant Response',
  ReturnToCaseReview: 'Return To Case Review',
  Cancel: 'Cancel',
};

const actionValidators: Record<Exclude<FinalAction, 'Cancel'>, (inputs: InterviewMissingInfoInputs) => ValidationResult> = {
  SaveDraft: validateSaveDraft,
  CompleteInterview: validateCompleteInterview,
  RequestMissingInformation: validateRequestMissingInformation,
  PendForApplicantResponse: validatePendForApplicantResponse,
  ReturnToCaseReview: validateReturnToCaseReview,
};

function cloneInputs(inputs: InterviewMissingInfoInputs): InterviewMissingInfoInputs {
  if (typeof structuredClone === 'function') {
    return structuredClone(inputs);
  }

  return JSON.parse(JSON.stringify(inputs)) as InterviewMissingInfoInputs;
}

function deriveMissingInfoStillRequired(missingInfo: MissingInfo, selectedMissingItemIds: string[]): boolean {
  const selectedIds = new Set(selectedMissingItemIds);
  const hasUnresolvedRequired = missingInfo.missingItems.some((item) => item.required && !item.resolved);
  const hasSelectedUnresolved = missingInfo.missingItems.some((item) => selectedIds.has(item.itemId) && !item.resolved);

  return hasUnresolvedRequired || hasSelectedUnresolved;
}

function withDerivedMissingInfo(inputs: InterviewMissingInfoInputs): InterviewMissingInfoInputs {
  const missingInfoStillRequired = deriveMissingInfoStillRequired(
    inputs.missingInfo,
    inputs.workerResponse.selectedMissingItemIds,
  );

  return {
    ...inputs,
    interviewInfo: {
      ...inputs.interviewInfo,
      missingInfoStillRequired,
    },
    workerResponse: {
      ...inputs.workerResponse,
      missingInfoStillRequired,
    },
  };
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ValidationErrors({ result }: { result: ValidationResult }) {
  if (result.valid) {
    return <p className="valid-message">Ready</p>;
  }

  return (
    <ul className="inline-errors">
      {result.errors.map((error) => (
        <li key={error}>{error}</li>
      ))}
    </ul>
  );
}

function App() {
  const [inputs, setInputs] = useState<InterviewMissingInfoInputs | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalDemoMode, setIsLocalDemoMode] = useState(false);
  const [toasts, setToasts] = useState<LocalToastMessage[]>([]);
  const [completionPayload, setCompletionPayload] = useState<unknown>(null);
  const [selectedAction, setSelectedAction] = useState<FinalAction>('SaveDraft');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMissingLabel, setNewMissingLabel] = useState('');
  const [newMissingCategory, setNewMissingCategory] = useState('Document');
  const [newMissingRequired, setNewMissingRequired] = useState(false);

  const addToast = useCallback((toast: LocalToastMessage) => {
    setToasts((current) => [...current, toast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== toast.id));
    }, 4800);
  }, []);

  useEffect(() => {
    const removeMessageListener = actionCenterClient.onLocalMessage(addToast);
    const removeCompletionListener = actionCenterClient.onLocalCompletion(({ data }) => {
      setCompletionPayload(data);
    });
    let isMounted = true;

    actionCenterClient
      .loadTask()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setInputs(withDerivedMissingInfo(result.inputs));
        setIsLocalDemoMode(result.isLocalDemoMode);
      })
      .catch((error) => {
        console.error('Unable to load task.', error);
        actionCenterClient.showError('Unable to load task data.');
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      removeMessageListener();
      removeCompletionListener();
    };
  }, [addToast]);

  const validationSummary = useMemo(() => {
    return inputs ? buildValidationSummary(inputs) : null;
  }, [inputs]);

  const missingInfoSummary = useMemo(() => {
    if (!inputs) {
      return {
        total: 0,
        resolved: 0,
        unresolvedRequired: 0,
      };
    }

    return {
      total: inputs.missingInfo.missingItems.length,
      resolved: inputs.missingInfo.missingItems.filter((item) => item.resolved).length,
      unresolvedRequired: getUnresolvedRequiredItems(inputs.missingInfo).length,
    };
  }, [inputs]);

  const syncInputs = useCallback((nextInputs: InterviewMissingInfoInputs) => {
    const derivedInputs = withDerivedMissingInfo(nextInputs);
    setInputs(derivedInputs);
    void actionCenterClient.setTaskData(derivedInputs);
  }, []);

  const updateInputs = useCallback(
    (
      updater: (current: InterviewMissingInfoInputs) => InterviewMissingInfoInputs,
      audit?: { eventType: string; notes: string },
    ) => {
      if (!inputs) {
        return;
      }

      let nextInputs = updater(cloneInputs(inputs));

      if (audit) {
        nextInputs = {
          ...nextInputs,
          auditInfo: appendAuditEvent(nextInputs.auditInfo, buildAuditEvent(audit.eventType, 'worker', audit.notes)),
        };
      }

      syncInputs(nextInputs);
    },
    [inputs, syncInputs],
  );

  const handleInterviewMethodChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const interviewMethod = event.target.value as InterviewMethod;

      updateInputs(
        (current) => ({
          ...current,
          interviewInfo: {
            ...current.interviewInfo,
            interviewMethod,
            interviewRequired: interviewMethod !== 'Not Required',
          },
        }),
        { eventType: 'InterviewMethodUpdated', notes: `Interview method updated to ${interviewMethod}.` },
      );
    },
    [updateInputs],
  );

  const handleScheduledDateTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const scheduledDateTime = fromDateTimeLocalValue(event.target.value);

      updateInputs(
        (current) => ({
          ...current,
          interviewInfo: {
            ...current.interviewInfo,
            scheduledDateTime,
          },
        }),
        { eventType: 'InterviewScheduleUpdated', notes: 'Interview scheduled date time updated.' },
      );
    },
    [updateInputs],
  );

  const handleCompletedDateTimeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const completedDateTime = fromDateTimeLocalValue(event.target.value);

      updateInputs(
        (current) => ({
          ...current,
          interviewInfo: {
            ...current.interviewInfo,
            completedDateTime,
          },
        }),
        { eventType: 'InterviewCompletionTimeUpdated', notes: 'Interview completed date time updated.' },
      );
    },
    [updateInputs],
  );

  const handleInterviewCompletedChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const checked = event.target.checked;

      updateInputs(
        (current) => ({
          ...current,
          interviewInfo: {
            ...current.interviewInfo,
            interviewCompleted: checked,
            completedDateTime: checked && !current.interviewInfo.completedDateTime ? new Date().toISOString() : current.interviewInfo.completedDateTime,
          },
          workerResponse: {
            ...current.workerResponse,
            interviewCompleted: checked,
          },
        }),
        {
          eventType: checked ? 'InterviewCompleted' : 'InterviewReopened',
          notes: checked ? 'Interview marked completed.' : 'Interview marked incomplete.',
        },
      );
    },
    [updateInputs],
  );

  const handleWorkerNotesChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const workerNotes = event.target.value;

      updateInputs((current) => ({
        ...current,
        interviewInfo: {
          ...current.interviewInfo,
          workerNotes,
        },
        workerResponse: {
          ...current.workerResponse,
          workerNotes,
        },
      }));
    },
    [updateInputs],
  );

  const handleWorkerNotesBlur = useCallback(() => {
    updateInputs(
      (current) => current,
      { eventType: 'WorkerNotesUpdated', notes: 'Worker notes updated.' },
    );
  }, [updateInputs]);

  const handleAttestationChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const attestation = event.target.checked;

      updateInputs(
        (current) => ({
          ...current,
          workerResponse: {
            ...current.workerResponse,
            attestation,
          },
        }),
        { eventType: 'WorkerAttestationUpdated', notes: attestation ? 'Worker attestation accepted.' : 'Worker attestation cleared.' },
      );
    },
    [updateInputs],
  );

  const handleMissingItemResolvedChange = useCallback(
    (itemId: string, resolved: boolean) => {
      updateInputs(
        (current) => {
          const selectedMissingItemIds = resolved
            ? current.workerResponse.selectedMissingItemIds.filter((selectedId) => selectedId !== itemId)
            : current.workerResponse.selectedMissingItemIds;

          return {
            ...current,
            missingInfo: {
              ...current.missingInfo,
              missingItems: current.missingInfo.missingItems.map((item) =>
                item.itemId === itemId ? { ...item, resolved } : item,
              ),
            },
            workerResponse: {
              ...current.workerResponse,
              selectedMissingItemIds,
            },
          };
        },
        {
          eventType: resolved ? 'MissingItemResolved' : 'MissingItemReopened',
          notes: resolved ? `Missing item ${itemId} resolved.` : `Missing item ${itemId} reopened.`,
        },
      );
    },
    [updateInputs],
  );

  const handleMissingItemSelectedChange = useCallback(
    (itemId: string, selected: boolean) => {
      updateInputs(
        (current) => {
          const selectedIds = new Set(current.workerResponse.selectedMissingItemIds);

          if (selected) {
            selectedIds.add(itemId);
          } else {
            selectedIds.delete(itemId);
          }

          return {
            ...current,
            workerResponse: {
              ...current.workerResponse,
              selectedMissingItemIds: Array.from(selectedIds),
            },
          };
        },
        {
          eventType: selected ? 'MissingItemSelectedForFollowUp' : 'MissingItemRemovedFromFollowUp',
          notes: selected ? `Missing item ${itemId} selected for follow-up.` : `Missing item ${itemId} removed from follow-up.`,
        },
      );
    },
    [updateInputs],
  );

  const handleAddMissingItem = useCallback(() => {
    const label = newMissingLabel.trim();

    if (!label) {
      actionCenterClient.showWarning('Missing item label is required.');
      return;
    }

    const itemId = `MI-LOCAL-${Date.now()}`;

    updateInputs(
      (current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          missingItems: [
            ...current.missingInfo.missingItems,
            {
              itemId,
              label,
              category: newMissingCategory.trim() || 'Document',
              required: newMissingRequired,
              resolved: false,
              localOnly: true,
            },
          ],
        },
      }),
      { eventType: 'MissingItemAdded', notes: `Missing item ${itemId} added locally.` },
    );

    setNewMissingLabel('');
    setNewMissingCategory('Document');
    setNewMissingRequired(false);
  }, [newMissingCategory, newMissingLabel, newMissingRequired, updateInputs]);

  const handleRemoveMissingItem = useCallback(
    (itemId: string) => {
      updateInputs(
        (current) => ({
          ...current,
          missingInfo: {
            ...current.missingInfo,
            missingItems: current.missingInfo.missingItems.filter((item) => item.itemId !== itemId),
          },
          workerResponse: {
            ...current.workerResponse,
            selectedMissingItemIds: current.workerResponse.selectedMissingItemIds.filter((selectedId) => selectedId !== itemId),
          },
        }),
        { eventType: 'MissingItemRemoved', notes: `Local missing item ${itemId} removed.` },
      );
    },
    [updateInputs],
  );

  const handleApplicantMessageChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      const applicantMessage = event.target.value;

      updateInputs((current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          applicantMessageDraft: applicantMessage,
          outreachStatus: applicantMessage.trim() ? current.missingInfo.outreachStatus : 'Not Sent',
        },
        workerResponse: {
          ...current.workerResponse,
          applicantMessage,
        },
      }));
    },
    [updateInputs],
  );

  const handleDraftMessage = useCallback(() => {
    if (!inputs) {
      return;
    }

    const selectedItems = getSelectedUnresolvedMissingItems(inputs);
    const unresolvedItems = inputs.missingInfo.missingItems.filter((item) => !item.resolved);
    const itemsForMessage = selectedItems.length > 0 ? selectedItems : unresolvedItems;
    const itemList = itemsForMessage.length > 0 ? itemsForMessage.map((item) => item.label).join('; ') : 'no additional items';
    const applicantMessage = `Hello ${inputs.caseInfo.applicantName}, additional information is needed to continue processing your SNAP application ${inputs.caseInfo.myBNumber}. Please provide: ${itemList}.`;

    updateInputs(
      (current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          applicantMessageDraft: applicantMessage,
          outreachStatus: 'Drafted',
        },
        workerResponse: {
          ...current.workerResponse,
          applicantMessage,
        },
      }),
      { eventType: 'ApplicantMessageDrafted', notes: 'Applicant message drafted.' },
    );
  }, [inputs, updateInputs]);

  const handleMarkEmailSent = useCallback(() => {
    updateInputs(
      (current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          outreachStatus: 'Sent',
        },
      }),
      { eventType: 'MockEmailSent', notes: 'Mock email marked as sent.' },
    );
    actionCenterClient.showSuccess('Mock email marked as sent.');
  }, [updateInputs]);

  const handleSimulateApplicantResponse = useCallback(() => {
    updateInputs(
      (current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          responseStatus: 'Response Received',
        },
      }),
      { eventType: 'ApplicantResponseSimulated', notes: 'Applicant response simulated.' },
    );
    actionCenterClient.showSuccess('Applicant response simulated.');
  }, [updateInputs]);

  const handleClearMessage = useCallback(() => {
    updateInputs(
      (current) => ({
        ...current,
        missingInfo: {
          ...current.missingInfo,
          applicantMessageDraft: '',
          outreachStatus: 'Not Sent',
        },
        workerResponse: {
          ...current.workerResponse,
          applicantMessage: '',
        },
      }),
      { eventType: 'ApplicantMessageCleared', notes: 'Applicant message cleared.' },
    );
  }, [updateInputs]);

  const handleSaveDraft = useCallback(() => {
    if (!inputs) {
      return;
    }

    const nextInputs = {
      ...inputs,
      auditInfo: appendAuditEvent(inputs.auditInfo, buildAuditEvent('DraftSaved', 'worker', 'Interview and Missing Info draft saved.')),
    };

    syncInputs(nextInputs);
    actionCenterClient.showSuccess('Draft saved.');
  }, [inputs, syncInputs]);

  const getValidationForAction = useCallback(
    (action: FinalAction): ValidationResult => {
      if (!inputs || action === 'Cancel') {
        return { valid: true, errors: [] };
      }

      return actionValidators[action](inputs);
    },
    [inputs],
  );

  const handleFinalAction = useCallback(
    async (action: FinalAction) => {
      if (!inputs) {
        return;
      }

      setSelectedAction(action);

      if (action === 'SaveDraft') {
        handleSaveDraft();
        return;
      }

      const validation = getValidationForAction(action);

      if (!validation.valid) {
        actionCenterClient.showWarning(`${actionLabels[action]} is blocked by validation.`);
        return;
      }

      const baselineInputs =
        action === 'CompleteInterview' && !inputs.interviewInfo.completedDateTime
          ? {
              ...inputs,
              interviewInfo: {
                ...inputs.interviewInfo,
                completedDateTime: new Date().toISOString(),
                interviewCompleted: true,
              },
              workerResponse: {
                ...inputs.workerResponse,
                interviewCompleted: true,
              },
            }
          : inputs;
      const finalPayload = buildFinalPayload(baselineInputs, action);
      const completedInputs = withDerivedMissingInfo({
        ...baselineInputs,
        auditInfo: appendAuditEvent(
          baselineInputs.auditInfo,
          buildAuditEvent('InterviewMissingInfoCompleted', 'worker', `Worker submitted ${action}.`),
        ),
      });

      setIsSubmitting(true);

      try {
        setInputs(completedInputs);
        await actionCenterClient.setTaskData(completedInputs);
        const result = await actionCenterClient.completeTask(action, finalPayload);

        if (result.success === false) {
          actionCenterClient.showError(result.errorMessage || 'Task completion failed.');
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [getValidationForAction, handleSaveDraft, inputs],
  );

  const copyPayload = useCallback(() => {
    if (!completionPayload) {
      return;
    }

    void navigator.clipboard.writeText(JSON.stringify(completionPayload, null, 2)).then(
      () => actionCenterClient.showSuccess('Payload copied.'),
      () => actionCenterClient.showWarning('Unable to copy payload.'),
    );
  }, [completionPayload]);

  if (isLoading) {
    return (
      <main className="app-shell">
        <section className="loading-panel">Loading Interview and Missing Info task...</section>
      </main>
    );
  }

  if (!inputs) {
    return (
      <main className="app-shell">
        <section className="error-panel">Unable to load task data.</section>
      </main>
    );
  }

  const isReadOnly = inputs.taskContext.isReadOnly;
  const selectedMissingIds = new Set(inputs.workerResponse.selectedMissingItemIds);
  const recentAuditEvents = [...inputs.auditInfo.events].slice(-8).reverse();
  const selectedActionValidation = getValidationForAction(selectedAction);
  const canEdit = !isReadOnly && !isSubmitting;

  return (
    <main className="app-shell">
      <div className="toast-region" aria-live="polite">
        {toasts.map((toast) => (
          <div className={`toast toast-${toast.severity}`} key={toast.id}>
            {toast.message}
          </div>
        ))}
      </div>

      <header className="app-header">
        <div>
          <p className="eyebrow">{inputs.taskContext.taskType}</p>
          <h1>{inputs.taskContext.taskName}</h1>
          <p className="header-subtitle">
            {inputs.caseInfo.caseRecordNumber} | {inputs.caseInfo.myBNumber} | {inputs.caseInfo.applicantName}
          </p>
        </div>
        <div className="header-actions">
          <span className={`priority-badge priority-${inputs.taskContext.priority.toLowerCase()}`}>
            {inputs.taskContext.priority}
          </span>
          <span className="status-badge">{inputs.caseInfo.currentStage}</span>
        </div>
      </header>

      {isLocalDemoMode && (
        <div className="local-banner">Local Demo Mode - Interview and Missing Info task data is mocked.</div>
      )}

      {validationSummary && validationSummary.errors.length > 0 && (
        <section className="validation-summary" aria-label="Validation summary">
          <div>
            <h2>Validation Summary</h2>
            <p>{validationSummary.errors.length} blocking condition(s) are currently present across final actions.</p>
          </div>
          <ul>
            {validationSummary.errors.slice(0, 6).map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="content-grid">
        <article className="panel case-panel">
          <div className="panel-header">
            <h2>Case Identity</h2>
          </div>
          <dl className="definition-grid">
            <Field label="MyB Number" value={inputs.caseInfo.myBNumber} />
            <Field label="Applicant Name" value={inputs.caseInfo.applicantName} />
            <Field label="Applicant Email" value={inputs.caseInfo.applicantEmail} />
            <Field label="County" value={inputs.caseInfo.county} />
            <Field label="Region" value={inputs.caseInfo.derivedRegion} />
            <Field label="Filing Date" value={formatDate(inputs.caseInfo.filingDate)} />
            <Field label="Eligibility Due Date" value={formatDate(inputs.caseInfo.eligibilityDueDate)} />
            <Field label="Current Status" value={inputs.caseInfo.currentStatus} />
            <Field label="Current Stage" value={inputs.caseInfo.currentStage} />
            <Field label="Invocation ID" value={inputs.invocationInfo.invocationId} />
            <Field label="Invocation Reason" value={inputs.invocationInfo.invocationReason} />
            <Field label="Priority" value={inputs.taskContext.priority} />
            <Field label="Assigned Group" value={inputs.taskContext.assignedGroup} />
            <Field label="Assigned Worker" value={inputs.taskContext.assignedWorker} />
          </dl>
        </article>

        <article className="panel interview-panel">
          <div className="panel-header">
            <h2>Interview Details</h2>
          </div>
          <div className="form-grid">
            <label className="input-label">
              Interview required
              <input type="text" value={formatBoolean(inputs.interviewInfo.interviewRequired)} readOnly />
            </label>
            <label className="input-label">
              Interview method
              <select value={inputs.interviewInfo.interviewMethod} onChange={handleInterviewMethodChange} disabled={!canEdit}>
                {interviewMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>
            <label className="input-label">
              Scheduled date time
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(inputs.interviewInfo.scheduledDateTime)}
                onChange={handleScheduledDateTimeChange}
                disabled={!canEdit}
              />
            </label>
            <label className="input-label">
              Completed date time
              <input
                type="datetime-local"
                value={toDateTimeLocalValue(inputs.interviewInfo.completedDateTime)}
                onChange={handleCompletedDateTimeChange}
                disabled={!canEdit}
              />
            </label>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={inputs.workerResponse.interviewCompleted}
              onChange={handleInterviewCompletedChange}
              disabled={!canEdit}
            />
            Interview completed
          </label>
        </article>

        <article className="panel extraction-panel">
          <div className="panel-header">
            <h2>Extracted Application Summary</h2>
          </div>
          <dl className="definition-grid compact">
            <Field label="Document" value={inputs.applicationExtraction.applicationDocumentName} />
            <Field label="Legal Name" value={inputs.applicationExtraction.legalName} />
            <Field label="Phone" value={inputs.applicationExtraction.phone} />
            <Field label="Residence Address" value={inputs.applicationExtraction.residenceAddress} />
            <Field label="Signature Present" value={formatBoolean(inputs.applicationExtraction.signaturePresent)} />
            <Field label="Signature Date" value={formatDate(inputs.applicationExtraction.signatureDate)} />
            <Field label="Household Size" value={inputs.applicationExtraction.householdSize} />
            <Field label="Resources" value={formatCurrency(inputs.applicationExtraction.resourcesAmount)} />
            <Field label="Monthly Rent" value={formatCurrency(inputs.applicationExtraction.rentMonthly)} />
            <Field label="Utility Provider" value={inputs.applicationExtraction.utilityProvider} />
          </dl>
          <div className="table-wrap">
            <table>
              <caption>Household Members</caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Relationship</th>
                  <th>Date of Birth</th>
                  <th>Applying</th>
                </tr>
              </thead>
              <tbody>
                {inputs.applicationExtraction.householdMembers.map((member) => (
                  <tr key={`${member.name}-${member.dateOfBirth}`}>
                    <td>{member.name}</td>
                    <td>{member.relationship}</td>
                    <td>{formatDate(member.dateOfBirth)}</td>
                    <td>{formatBoolean(member.applying)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-wrap">
            <table>
              <caption>Income</caption>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Source</th>
                  <th>Frequency</th>
                  <th>Gross Amount</th>
                </tr>
              </thead>
              <tbody>
                {inputs.applicationExtraction.income.map((income) => (
                  <tr key={`${income.person}-${income.source}`}>
                    <td>{income.person}</td>
                    <td>{income.source}</td>
                    <td>{income.frequency}</td>
                    <td>{formatCurrency(income.grossAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel missing-panel">
          <div className="panel-header split-header">
            <h2>Missing Information</h2>
            <div className="summary-strip">
              <span>Total {missingInfoSummary.total}</span>
              <span>Resolved {missingInfoSummary.resolved}</span>
              <span>Unresolved Required {missingInfoSummary.unresolvedRequired}</span>
            </div>
          </div>
          <div className="missing-list">
            {inputs.missingInfo.missingItems.map((item) => {
              const isSelected = selectedMissingIds.has(item.itemId);
              const canRemove = Boolean(item.localOnly && !item.required);

              return (
                <div className={`missing-item ${item.resolved ? 'resolved' : ''}`} key={item.itemId}>
                  <div>
                    <p className="item-title">{item.label}</p>
                    <p className="item-meta">
                      {item.category} | {item.required ? 'Required' : 'Optional'} | {item.itemId}
                    </p>
                  </div>
                  <label className="checkbox-row compact-check">
                    <input
                      type="checkbox"
                      checked={item.resolved}
                      onChange={(event) => handleMissingItemResolvedChange(item.itemId, event.target.checked)}
                      disabled={!canEdit}
                    />
                    Resolved
                  </label>
                  <label className="checkbox-row compact-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(event) => handleMissingItemSelectedChange(item.itemId, event.target.checked)}
                      disabled={!canEdit || item.resolved}
                    />
                    Follow-up
                  </label>
                  {canRemove && (
                    <button className="text-button danger-text" type="button" onClick={() => handleRemoveMissingItem(item.itemId)} disabled={!canEdit}>
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="add-missing-row">
            <input
              type="text"
              value={newMissingLabel}
              onChange={(event) => setNewMissingLabel(event.target.value)}
              placeholder="New missing item"
              disabled={!canEdit}
            />
            <input
              type="text"
              value={newMissingCategory}
              onChange={(event) => setNewMissingCategory(event.target.value)}
              placeholder="Category"
              disabled={!canEdit}
            />
            <label className="checkbox-row compact-check">
              <input
                type="checkbox"
                checked={newMissingRequired}
                onChange={(event) => setNewMissingRequired(event.target.checked)}
                disabled={!canEdit}
              />
              Required
            </label>
            <button type="button" onClick={handleAddMissingItem} disabled={!canEdit}>
              Add
            </button>
          </div>
        </article>

        <article className="panel outreach-panel">
          <div className="panel-header">
            <h2>Applicant Outreach</h2>
          </div>
          <dl className="definition-grid compact">
            <Field label="Recipient Email" value={inputs.missingInfo.applicantEmail} />
            <Field label="Outreach Status" value={<span className="status-badge">{inputs.missingInfo.outreachStatus}</span>} />
            <Field label="Response Status" value={<span className="status-badge">{inputs.missingInfo.responseStatus}</span>} />
          </dl>
          <label className="input-label">
            Applicant message
            <textarea
              value={inputs.workerResponse.applicantMessage}
              onChange={handleApplicantMessageChange}
              disabled={!canEdit}
              rows={6}
            />
          </label>
          <div className="button-row">
            <button type="button" onClick={handleDraftMessage} disabled={!canEdit}>
              Draft Message
            </button>
            <button type="button" onClick={handleMarkEmailSent} disabled={!canEdit}>
              Mark Mock Email Sent
            </button>
            <button type="button" onClick={handleSimulateApplicantResponse} disabled={!canEdit}>
              Simulate Applicant Response
            </button>
            <button className="secondary-button" type="button" onClick={handleClearMessage} disabled={!canEdit}>
              Clear Message
            </button>
          </div>
        </article>

        <article className="panel notes-panel">
          <div className="panel-header">
            <h2>Worker Notes</h2>
          </div>
          <label className="input-label">
            Worker notes
            <textarea
              value={inputs.workerResponse.workerNotes}
              onChange={handleWorkerNotesChange}
              onBlur={handleWorkerNotesBlur}
              disabled={!canEdit}
              rows={7}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={inputs.workerResponse.attestation}
              onChange={handleAttestationChange}
              disabled={!canEdit}
            />
            I attest the interview and missing information review is accurate.
          </label>
        </article>

        <article className="panel action-panel">
          <div className="panel-header">
            <h2>Final Action</h2>
          </div>
          <div className="action-grid">
            {(['SaveDraft', 'CompleteInterview', 'RequestMissingInformation', 'PendForApplicantResponse', 'ReturnToCaseReview'] as FinalAction[]).map(
              (action) => {
                return (
                  <button
                    key={action}
                    type="button"
                    className={action === selectedAction ? 'selected-action' : ''}
                    onClick={() => void handleFinalAction(action)}
                    disabled={!canEdit}
                  >
                    {actionLabels[action]}
                  </button>
                );
              },
            )}
            <button
              type="button"
              className="danger-button"
              onClick={() => void handleFinalAction('Cancel')}
              disabled={!canEdit}
            >
              Cancel
            </button>
          </div>
          <div className="selected-validation">
            <h3>{actionLabels[selectedAction]}</h3>
            <ValidationErrors result={selectedActionValidation} />
          </div>
        </article>

        <article className="panel audit-panel">
          <div className="panel-header">
            <h2>Audit</h2>
          </div>
          <ol className="audit-list">
            {recentAuditEvents.map((event) => (
              <li key={`${event.eventType}-${event.timestampUtc}-${event.notes}`}>
                <div>
                  <strong>{event.eventType}</strong>
                  <span>{formatDateTime(event.timestampUtc)}</span>
                </div>
                <p>
                  {event.actor}: {event.notes}
                </p>
              </li>
            ))}
          </ol>
        </article>
      </section>

      {completionPayload !== null && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="payload-modal-title">
          <section className="payload-modal">
            <div className="panel-header split-header">
              <h2 id="payload-modal-title">Local Completion Payload</h2>
              <button className="secondary-button" type="button" onClick={() => setCompletionPayload(null)}>
                Close
              </button>
            </div>
            <pre>{JSON.stringify(completionPayload, null, 2)}</pre>
            <div className="button-row align-end">
              <button type="button" onClick={copyPayload}>
                Copy Payload
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
