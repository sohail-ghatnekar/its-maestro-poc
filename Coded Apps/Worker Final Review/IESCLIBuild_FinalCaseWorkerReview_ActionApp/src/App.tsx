import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { actionCenterClient } from './uipath/actionCenterClient';
import type {
  FinalAction,
  FinalDecision,
  FinalReviewTaskData,
  LocalToastMessage,
  NoticeType,
  ReasonCode,
  ReviewChecklist,
  ValidationResult,
} from './types/finalReviewTypes';
import { appendAuditEvent, buildAuditEvent, buildFinalPayload } from './utils/audit';
import {
  formatBoolean,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPercent,
  summarizeGrossIncome,
  toStatusClass,
} from './utils/formatters';
import {
  canApprove,
  canPend,
  canApproveSupervisorReview,
  canReturnSupervisorReview,
  canSendToSupervisor,
  canWithdraw,
  requiresDynamicText,
  validateFinalDecision,
  validateSupervisorReviewDecision,
} from './utils/validation';

const checklistLabels: Array<{ key: keyof ReviewChecklist; label: string; required: boolean }> = [
  { key: 'intakeComplete', label: 'Intake complete', required: true },
  { key: 'expeditedScreeningComplete', label: 'Expedited screening complete', required: false },
  { key: 'interviewComplete', label: 'Interview complete', required: true },
  { key: 'documentsReviewed', label: 'Documents reviewed', required: true },
  { key: 'clearanceResolved', label: 'Clearance resolved', required: true },
  { key: 'externalValidationReviewed', label: 'External validation reviewed', required: true },
  { key: 'budgetReviewed', label: 'Budget reviewed', required: false },
  { key: 'noticeReady', label: 'Notice ready', required: false },
  { key: 'supervisorReviewRequired', label: 'Supervisor review required', required: false },
];

const decisionOptions: FinalDecision[] = ['', 'Approve', 'Deny', 'Pend', 'Withdraw', 'Send to Supervisor'];
const supervisorDecisionOptions: FinalDecision[] = ['', 'Approve', 'Pend'];

const statusExamples = [
  'Pending Review',
  'In Progress',
  'Approved',
  'Denied',
  'Missing Information',
  'Supervisor Review',
];

function decisionOptionLabel(decision: FinalDecision, isSupervisorReview: boolean): string {
  if (!decision) {
    return 'Select decision';
  }

  if (isSupervisorReview && decision === 'Pend') {
    return 'Send back for more info';
  }

  return decision;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function App() {
  const [taskData, setTaskData] = useState<FinalReviewTaskData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocalDemoMode, setIsLocalDemoMode] = useState(false);
  const [toasts, setToasts] = useState<LocalToastMessage[]>([]);
  const [completionPayload, setCompletionPayload] = useState<unknown>(null);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

        setTaskData(result.taskData);
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

  const validation = useMemo<ValidationResult | null>(() => {
    if (!taskData) {
      return null;
    }

    return taskData.taskContext.isSupervisorReview
      ? validateSupervisorReviewDecision(taskData)
      : validateFinalDecision(taskData);
  }, [taskData]);

  const syncTaskData = useCallback((nextTaskData: FinalReviewTaskData) => {
    setTaskData(nextTaskData);
    void actionCenterClient.updateTaskData(nextTaskData);
  }, []);

  const updateReviewData = useCallback(
    (
      updater: (current: FinalReviewTaskData) => FinalReviewTaskData,
      audit?: { eventType: string; notes: string },
    ) => {
      if (!taskData) {
        return;
      }

      let nextTaskData = updater(taskData);

      if (audit) {
        nextTaskData = appendAuditEvent(nextTaskData, buildAuditEvent(audit.eventType, 'worker', audit.notes));
      }

      syncTaskData(nextTaskData);
    },
    [syncTaskData, taskData],
  );

  const updateWorkerDecision = useCallback(
    (patch: Partial<FinalReviewTaskData['workerDecision']>) => {
      updateReviewData((current) => ({
        ...current,
        workerDecision: {
          ...current.workerDecision,
          ...patch,
        },
      }));
    },
    [updateReviewData],
  );

  const handleDecisionChange = useCallback(
    (decision: FinalDecision) => {
      updateReviewData(
        (current) => {
          const nextNotice = { ...current.notice };
          const nextDecision = { ...current.workerDecision, decision };

          if (decision === 'Approve') {
            nextNotice.selectedNoticeType = 'Approval';
            nextNotice.selectedReasonCodes = ['APPROVED_STANDARD'];
            nextDecision.reasonCode = 'APPROVED_STANDARD';
            nextDecision.sendToSupervisor = false;
          }

          if (decision === 'Deny') {
            nextNotice.selectedNoticeType = 'Denial';
            nextNotice.selectedReasonCodes = current.notice.selectedReasonCodes.filter((code) =>
              code.startsWith('DENIED') || code === 'Q21' || code === 'Q22',
            );
            nextDecision.sendToSupervisor = true;
          }

          if (decision === 'Pend') {
            nextNotice.selectedNoticeType = 'Missing Information';
            nextNotice.selectedReasonCodes = ['PENDING_MISSING_INFO'];
            nextDecision.reasonCode = 'PENDING_MISSING_INFO';
            nextDecision.sendToSupervisor = false;
          }

          if (decision === 'Withdraw') {
            nextNotice.selectedNoticeType = 'Withdrawal';
            nextNotice.selectedReasonCodes = ['WITHDRAWN_BY_APPLICANT'];
            nextDecision.reasonCode = 'WITHDRAWN_BY_APPLICANT';
            nextDecision.sendToSupervisor = false;
          }

          if (decision === 'Send to Supervisor') {
            nextDecision.sendToSupervisor = true;
          }

          nextNotice.dynamicTextRequired = requiresDynamicText(nextNotice.selectedReasonCodes);
          nextNotice.status = nextNotice.noticePreview ? 'Preview Generated' : nextNotice.status;

          return {
            ...current,
            notice: nextNotice,
            workerDecision: nextDecision,
          };
        },
        { eventType: 'DecisionChanged', notes: `Decision changed to ${decision || 'None'}.` },
      );
    },
    [updateReviewData],
  );

  const handleReasonCodeChange = useCallback(
    (reasonCode: ReasonCode | '') => {
      updateReviewData((current) => {
        const selectedReasonCodes =
          reasonCode && !current.notice.selectedReasonCodes.includes(reasonCode)
            ? [...current.notice.selectedReasonCodes, reasonCode]
            : current.notice.selectedReasonCodes;

        return {
          ...current,
          notice: {
            ...current.notice,
            selectedReasonCodes,
            dynamicTextRequired: requiresDynamicText(selectedReasonCodes),
          },
          workerDecision: {
            ...current.workerDecision,
            reasonCode,
          },
        };
      });
    },
    [updateReviewData],
  );

  const handleNoticeReasonToggle = useCallback(
    (reasonCode: ReasonCode, checked: boolean) => {
      updateReviewData((current) => {
        const selectedReasonCodes = checked
          ? [...new Set([...current.notice.selectedReasonCodes, reasonCode])]
          : current.notice.selectedReasonCodes.filter((code) => code !== reasonCode);

        return {
          ...current,
          notice: {
            ...current.notice,
            selectedReasonCodes,
            dynamicTextRequired: requiresDynamicText(selectedReasonCodes),
          },
          workerDecision: {
            ...current.workerDecision,
            reasonCode:
              !checked && current.workerDecision.reasonCode === reasonCode ? '' : current.workerDecision.reasonCode,
          },
        };
      });
    },
    [updateReviewData],
  );

  const handleExternalValidationReviewed = useCallback(
    (checked: boolean) => {
      updateReviewData(
        (current) => ({
          ...current,
          externalValidation: {
            ...current.externalValidation,
            workerReviewed: checked,
          },
          reviewChecklist: {
            ...current.reviewChecklist,
            externalValidationReviewed: checked,
          },
        }),
        checked
          ? {
              eventType: 'ExternalValidationReviewed',
              notes: 'Worker reviewed external validation results.',
            }
          : undefined,
      );

      if (checked) {
        actionCenterClient.showSuccess('External validation reviewed.');
      }
    },
    [updateReviewData],
  );

  const handleBudgetReviewed = useCallback(
    (checked: boolean) => {
      updateReviewData(
        (current) => ({
          ...current,
          budget: {
            ...current.budget,
            workerReviewed: checked,
          },
          reviewChecklist: {
            ...current.reviewChecklist,
            budgetReviewed: checked,
          },
        }),
        checked
          ? {
              eventType: 'BudgetReviewed',
              notes: 'Worker reviewed the mock ABLE budget result.',
            }
          : undefined,
      );

      if (checked) {
        actionCenterClient.showSuccess('Budget reviewed.');
      }
    },
    [updateReviewData],
  );

  const handleGenerateNoticePreview = useCallback(() => {
    if (!taskData) {
      return;
    }

    const selectedReasonCodes = taskData.notice.selectedReasonCodes.length
      ? taskData.notice.selectedReasonCodes
      : taskData.workerDecision.reasonCode
        ? [taskData.workerDecision.reasonCode]
        : [];
    const dynamicTextRequired = requiresDynamicText(selectedReasonCodes);

    if (!taskData.notice.selectedNoticeType) {
      actionCenterClient.showWarning('Select a notice type before generating a preview.');
      return;
    }

    if (dynamicTextRequired && !hasText(taskData.notice.dynamicText)) {
      actionCenterClient.showWarning('Dynamic text is required for Q21 or Q22 before preview generation.');
      return;
    }

    const preview = [
      `Mock ${taskData.notice.selectedNoticeType} notice preview for ${taskData.caseHeader.applicantName}.`,
      `Case ${taskData.caseHeader.caseRecordNumber} / ${taskData.caseHeader.myBNumber}.`,
      `Decision: ${taskData.workerDecision.decision || 'Not selected'}.`,
      `Reason codes: ${selectedReasonCodes.join(', ') || 'Not selected'}.`,
      `Mock benefit amount: ${formatCurrency(taskData.budget.mockBenefitAmount)}/month.`,
      taskData.notice.dynamicText ? `Worker notice text: ${taskData.notice.dynamicText}` : '',
      'This preview is for the NY SNAP demo only and was not sent.',
    ]
      .filter(Boolean)
      .join('\n');

    updateReviewData(
      (current) => ({
        ...current,
        notice: {
          ...current.notice,
          selectedReasonCodes,
          dynamicTextRequired,
          noticePreview: preview,
          status: 'Preview Generated',
        },
        reviewChecklist: {
          ...current.reviewChecklist,
          noticeReady: true,
        },
      }),
      {
        eventType: 'NoticePreviewGenerated',
        notes: 'Worker generated mock notice preview.',
      },
    );

    actionCenterClient.showSuccess('Notice preview generated.');
  }, [taskData, updateReviewData]);

  const handleClearNotice = useCallback(() => {
    updateReviewData((current) => ({
      ...current,
      notice: {
        ...current.notice,
        selectedNoticeType: '',
        selectedReasonCodes: [],
        dynamicTextRequired: false,
        dynamicText: '',
        noticePreview: '',
        status: 'Not Started',
      },
      reviewChecklist: {
        ...current.reviewChecklist,
        noticeReady: false,
      },
    }));

    actionCenterClient.showInfo('Notice cleared.');
  }, [updateReviewData]);

  const handleMarkNoticeReviewed = useCallback(() => {
    if (!taskData?.notice.noticePreview) {
      actionCenterClient.showWarning('Generate a notice preview before marking it reviewed.');
      return;
    }

    updateReviewData(
      (current) => ({
        ...current,
        notice: {
          ...current.notice,
          status: 'Reviewed',
        },
        reviewChecklist: {
          ...current.reviewChecklist,
          noticeReady: true,
        },
      }),
      {
        eventType: 'NoticeReviewed',
        notes: 'Worker marked the notice preview as reviewed.',
      },
    );

    actionCenterClient.showSuccess('Notice marked reviewed.');
  }, [taskData?.notice.noticePreview, updateReviewData]);

  const handleSaveDraft = useCallback(() => {
    if (!taskData) {
      return;
    }

    const nextTaskData = appendAuditEvent(
      taskData,
      buildAuditEvent('DraftSaved', 'worker', 'Worker saved final review draft.'),
    );
    syncTaskData(nextTaskData);
    actionCenterClient.showInfo('Draft saved.');
  }, [syncTaskData, taskData]);

  const validateSelectedAction = useCallback(
    (action: FinalAction): ValidationResult => {
      if (!taskData) {
        return { valid: false, errors: ['Task data is not loaded.'], warnings: [] };
      }

      const isSupervisorReview = taskData.taskContext.isSupervisorReview;
      const result = isSupervisorReview
        ? validateSupervisorReviewDecision(taskData)
        : validateFinalDecision(taskData);
      const errors = [...result.errors];
      const decision = taskData.workerDecision.decision;

      if (action === 'Approve' && decision !== 'Approve') {
        errors.push('Select Approve before approving the case.');
      }

      if (!isSupervisorReview && (action === 'Pend' || action === 'ReturnForMoreInformation') && decision !== 'Pend') {
        errors.push('Select Pend before requesting more information.');
      }

      if (isSupervisorReview && action !== 'Approve' && action !== 'ReturnForMoreInformation') {
        errors.push('Supervisor review can only approve or send back for more information.');
      }

      if (isSupervisorReview && action === 'ReturnForMoreInformation' && decision !== 'Pend') {
        errors.push('Select Send back for more info before returning the review.');
      }

      if (action === 'Withdraw' && decision !== 'Withdraw') {
        errors.push('Select Withdraw before completing withdrawal.');
      }

      if (action === 'SendToSupervisor' && decision !== 'Send to Supervisor' && decision !== 'Deny') {
        errors.push('Select Send to Supervisor or Deny before routing to a supervisor.');
      }

      if (action === 'Deny') {
        errors.push('Direct denial is not available from this action app.');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings: result.warnings,
      };
    },
    [taskData],
  );

  const handleSubmit = useCallback(
    async (action: FinalAction) => {
      if (!taskData) {
        return;
      }

      const result = validateSelectedAction(action);

      if (!result.valid) {
        actionCenterClient.showError('Validation failed. Review the blocked items before completing.');
        return;
      }

      setIsSubmitting(true);

      const completedTaskData = appendAuditEvent(
        taskData,
        buildAuditEvent('TaskCompleted', 'worker', `Worker submitted ${action}.`),
      );
      const completionData = buildFinalPayload(completedTaskData, action);

      await actionCenterClient.updateTaskData(completedTaskData);
      const completion = await actionCenterClient.completeTask(action, completionData);

      if (completion.success !== false) {
        setTaskData(completedTaskData);
      }

      setIsSubmitting(false);
    },
    [taskData, validateSelectedAction],
  );

  const handleCopyPayload = useCallback(async () => {
    if (!completionPayload) {
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(completionPayload, null, 2));
      actionCenterClient.showSuccess('Final payload copied.');
    } catch (error) {
      console.error('Copy failed.', error);
      actionCenterClient.showError('Unable to copy final payload.');
    }
  }, [completionPayload]);

  if (isLoading) {
    return (
      <main className="loading-shell">
        <div className="loader-card">
          <span className="loader" aria-hidden="true" />
          <p>Loading final review task...</p>
        </div>
      </main>
    );
  }

  if (!taskData) {
    return (
      <main className="loading-shell">
        <div className="loader-card error-card">
          <h1>Task unavailable</h1>
          <p>Final review task data could not be loaded.</p>
        </div>
      </main>
    );
  }

  const isSupervisorReview = taskData.taskContext.isSupervisorReview;
  const selectedDecision = taskData.workerDecision.decision;
  const availableDecisionOptions = isSupervisorReview ? supervisorDecisionOptions : decisionOptions;
  const headerEyebrow = isSupervisorReview ? 'NY SNAP supervisor review' : 'NY SNAP final case worker review';
  const headerTitle = isSupervisorReview ? 'Supervisor Review' : taskData.taskContext.taskName;
  const sendButtonLabel =
    selectedDecision === 'Deny'
      ? 'Send Denial to Supervisor'
      : 'Send to Supervisor';
  const sendButtonAction: FinalAction = 'SendToSupervisor';
  const approveReady =
    selectedDecision === 'Approve' &&
    validation?.valid &&
    (isSupervisorReview ? canApproveSupervisorReview(taskData) : canApprove(taskData));
  const sendBackReady =
    isSupervisorReview &&
    selectedDecision === 'Pend' &&
    validation?.valid &&
    canReturnSupervisorReview(taskData);
  const pendReady = !isSupervisorReview && selectedDecision === 'Pend' && validation?.valid && canPend(taskData);
  const sendReady =
    !isSupervisorReview &&
    (selectedDecision === 'Send to Supervisor' || selectedDecision === 'Deny') &&
    validation?.valid &&
    (selectedDecision === 'Deny' ? canSendToSupervisor(taskData) : canSendToSupervisor(taskData));
  const withdrawReady = !isSupervisorReview && selectedDecision === 'Withdraw' && validation?.valid && canWithdraw(taskData);

  return (
    <main className="app-shell">
      <ToastStack toasts={toasts} onDismiss={(id) => setToasts((items) => items.filter((item) => item.id !== id))} />

      {isLocalDemoMode ? (
        <div className="local-banner" role="status">
          Local Demo Mode - Action Center task data is mocked.
        </div>
      ) : null}

      <header className="app-header">
        <div>
          <span className="eyebrow">{headerEyebrow}</span>
          <h1>{headerTitle}</h1>
          <div className="header-meta">
            <StatusPill status={taskData.caseHeader.currentStatus} />
            <span>{taskData.caseHeader.myBNumber}</span>
            <span>{taskData.caseHeader.applicantName}</span>
            <span>{taskData.caseHeader.county} / {taskData.caseHeader.derivedRegion}</span>
          </div>
        </div>
        <div className="header-summary" aria-label="Task context">
          <Field label="Review type" value={isSupervisorReview ? 'Supervisor' : 'Worker'} />
          <Field label="Priority" value={taskData.taskContext.priority} />
          <Field label="Assigned group" value={taskData.taskContext.assignedGroup} />
          <Field label="Assigned worker" value={taskData.taskContext.assignedWorker} />
        </div>
      </header>

      <div className="content-grid">
        <div className="review-stack">
          <CaseIdentityCard taskData={taskData} />
          {isSupervisorReview ? (
            <SupervisorSummarySection taskData={taskData} />
          ) : (
            <>
              <ReviewChecklistCard taskData={taskData} />
              <CaseSummarySection taskData={taskData} />
            </>
          )}
        </div>

        <aside className="decision-panel" aria-labelledby="decision-panel-heading">
          <div className="panel-header">
            <span className="eyebrow">{isSupervisorReview ? 'Supervisor Review' : 'Decision'}</span>
            <h2 id="decision-panel-heading">{isSupervisorReview ? 'Review action' : 'Final action'}</h2>
          </div>

          <label className="field-control">
            <span>{isSupervisorReview ? 'Supervisor Decision' : 'Final Decision'}</span>
            <select
              value={selectedDecision}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleDecisionChange(event.target.value as FinalDecision)
              }
            >
              {availableDecisionOptions.map((decision) => (
                <option key={decision || 'blank'} value={decision}>
                  {decisionOptionLabel(decision, isSupervisorReview)}
                </option>
              ))}
            </select>
          </label>

          <label className="field-control">
            <span>{isSupervisorReview ? 'Supervisor Notes' : 'Worker Notes'}</span>
            <textarea
              rows={5}
              value={taskData.workerDecision.workerNotes}
              onChange={(event) => updateWorkerDecision({ workerNotes: event.target.value })}
              placeholder="Summarize the review and final decision rationale."
            />
          </label>

          {validation ? <ValidationSummary validation={validation} /> : null}

          <div className="decision-actions" aria-label="Final action buttons">
            {isSupervisorReview ? (
              <>
                <button type="button" className="success-button" disabled={!approveReady || isSubmitting} onClick={() => handleSubmit('Approve')}>
                  Approve
                </button>
                <button
                  type="button"
                  className="warning-button"
                  disabled={!sendBackReady || isSubmitting}
                  onClick={() => handleSubmit('ReturnForMoreInformation')}
                >
                  Send Back for More Info
                </button>
              </>
            ) : (
              <>
                <button type="button" className="success-button" disabled={!approveReady || isSubmitting} onClick={() => handleSubmit('Approve')}>
                  Approve Case
                </button>
                <button
                  type="button"
                  className="warning-button"
                  disabled={!pendReady || isSubmitting}
                  onClick={() => handleSubmit('Pend')}
                >
                  Pend / Request More Info
                </button>
                <button
                  type="button"
                  className="info-button"
                  disabled={!sendReady || isSubmitting}
                  onClick={() => handleSubmit(sendButtonAction)}
                >
                  {sendButtonLabel}
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={!withdrawReady || isSubmitting}
                  onClick={() => handleSubmit('Withdraw')}
                >
                  Withdraw
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

      {showDocumentModal ? (
        <DocumentModal taskData={taskData} onClose={() => setShowDocumentModal(false)} />
      ) : null}

      {completionPayload ? (
        <CompletionModal
          payload={completionPayload}
          onClose={() => setCompletionPayload(null)}
          onCopy={handleCopyPayload}
        />
      ) : null}
    </main>
  );
}

function CaseIdentityCard({ taskData }: { taskData: FinalReviewTaskData }) {
  return (
    <section className="identity-card" aria-label="Case identity">
      <div>
        <span className="eyebrow">Case</span>
        <h2>{taskData.caseHeader.caseRecordNumber}</h2>
        <p>{taskData.caseHeader.applicantName}</p>
      </div>
      <div className="identity-grid">
        <Field label="MyB Number" value={taskData.caseHeader.myBNumber} />
        <Field label="Filing Date" value={formatDate(taskData.caseHeader.filingDate)} />
        <Field label="Eligibility Due" value={formatDate(taskData.caseHeader.eligibilityDueDate)} />
        <Field label="Status Code" value={taskData.caseHeader.statusCode} />
      </div>
    </section>
  );
}

function SupervisorSummarySection({ taskData }: { taskData: FinalReviewTaskData }) {
  const previous = taskData.previousWorkerReview;

  return (
    <SectionCard title="Supervisor Summary" eyebrow="Prior worker review">
      <div className="detail-grid">
        <Field label="Prior Decision" value={previous.decision || 'Not provided'} />
        <Field label="Recommended Action" value={previous.recommendedAction || 'Not provided'} />
        <Field label="Submitted By" value={previous.submittedBy || 'Not provided'} />
        <Field label="Submitted At" value={formatDateTime(previous.submittedAtUtc)} />
        <Field label="Reason Code" value={previous.reasonCode || 'Not provided'} />
        <Field label="Supervisor Reason" value={previous.supervisorReason || 'Not provided'} wide />
        <Field label="Previous Worker Notes" value={previous.workerNotes || 'No prior worker notes provided.'} wide />
      </div>
      <div className="summary-strip" aria-label="Supervisor glance summary">
        <span>Documents {taskData.reviewChecklist.documentsReviewed ? 'reviewed' : 'not reviewed'}</span>
        <span>Clearance {taskData.reviewChecklist.clearanceResolved ? 'resolved' : 'open'}</span>
        <span>External validation {taskData.reviewChecklist.externalValidationReviewed ? 'reviewed' : 'open'}</span>
        <span>Budget {formatCurrency(taskData.budget.mockBenefitAmount)}/month</span>
      </div>
    </SectionCard>
  );
}

function ReviewChecklistCard({ taskData }: { taskData: FinalReviewTaskData }) {
  return (
    <SectionCard title="Review Checklist" eyebrow="Readiness">
      <div className="checklist-grid">
        {checklistLabels.map((item) => {
          const checked = taskData.reviewChecklist[item.key];
          const isBlocking =
            !checked &&
            (item.required ||
              ((taskData.workerDecision.decision === 'Approve' || taskData.workerDecision.decision === 'Deny') &&
                (item.key === 'budgetReviewed' || item.key === 'noticeReady')));
          const stateClass = checked ? 'check-complete' : isBlocking ? 'check-blocked' : 'check-warning';
          const statusText = checked ? 'Complete' : isBlocking ? 'Required' : 'Review';

          return (
            <div className={`check-item ${stateClass}`} key={item.key}>
              <span className="check-icon" aria-hidden="true">
                {checked ? '✓' : '!'}
              </span>
              <div>
                <strong>{item.label}</strong>
                <span>{statusText}</span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function CaseSummarySection({ taskData }: { taskData: FinalReviewTaskData }) {
  return (
    <SectionCard title="Case Summary" eyebrow="Summary">
      <div className="status-strip" aria-label="Supported status indicators">
        {statusExamples.map((status) => (
          <StatusPill key={status} status={status} />
        ))}
      </div>
      <div className="detail-grid">
        <Field label="MyB Number" value={taskData.caseHeader.myBNumber} />
        <Field label="Applicant Name" value={taskData.caseHeader.applicantName} />
        <Field label="Applicant Email" value={taskData.caseHeader.applicantEmail} />
        <Field label="County" value={taskData.caseHeader.county} />
        <Field label="Region" value={taskData.caseHeader.derivedRegion} />
        <Field label="Filing Date" value={formatDate(taskData.caseHeader.filingDate)} />
        <Field label="Eligibility Due Date" value={formatDate(taskData.caseHeader.eligibilityDueDate)} />
        <Field label="Current Status" value={taskData.caseHeader.currentStatus} />
        <Field label="Current Stage" value={taskData.caseHeader.currentStage} />
        <Field label="Status Code" value={taskData.caseHeader.statusCode} />
        <Field label="Household Size" value={String(taskData.extractedApplication.householdSize)} />
        <Field label="Gross Income" value={summarizeGrossIncome(taskData.extractedApplication.income)} wide />
        <Field
          label="Rent / Resources"
          value={`${formatCurrency(taskData.extractedApplication.rentMonthly)} rent, ${formatCurrency(
            taskData.extractedApplication.resourcesAmount,
          )} resources`}
          wide
        />
      </div>
    </SectionCard>
  );
}

function ExtractedApplicationSection({
  taskData,
  onViewDocument,
}: {
  taskData: FinalReviewTaskData;
  onViewDocument: () => void;
}) {
  return (
    <SectionCard title="Extracted Application" eyebrow="Application">
      <p className="section-note">
        Application details were extracted from the uploaded SNAP application PDF. Worker remains responsible for final
        review.
      </p>
      <div className="detail-grid">
        <Field label="Document Name" value={taskData.extractedApplication.applicationDocumentName} wide />
        <Field label="Legal Name" value={taskData.extractedApplication.legalName} />
        <Field label="Phone" value={taskData.extractedApplication.phone} />
        <Field label="Residence Address" value={taskData.extractedApplication.residenceAddress} wide />
        <Field label="Signature Present" value={formatBoolean(taskData.extractedApplication.signaturePresent)} />
        <Field label="Signature Date" value={formatDate(taskData.extractedApplication.signatureDate)} />
        <Field label="Resources Amount" value={formatCurrency(taskData.extractedApplication.resourcesAmount)} />
        <Field label="Rent Monthly" value={formatCurrency(taskData.extractedApplication.rentMonthly)} />
        <Field label="Utility Provider" value={taskData.extractedApplication.utilityProvider} />
      </div>

      <button type="button" className="secondary-button inline-action" onClick={onViewDocument}>
        View Application Document
      </button>

      <h3>Household Members</h3>
      <DataTable
        headers={['Name', 'Relationship', 'Date of Birth', 'Applying']}
        rows={taskData.extractedApplication.householdMembers.map((member) => [
          member.name,
          member.relationship,
          formatDate(member.dateOfBirth),
          formatBoolean(member.applying),
        ])}
      />

      <h3>Income</h3>
      <DataTable
        headers={['Person', 'Source', 'Frequency', 'Gross Amount']}
        rows={taskData.extractedApplication.income.map((income) => [
          income.person,
          income.source,
          income.frequency,
          formatCurrency(income.grossAmount),
        ])}
      />
    </SectionCard>
  );
}

function DocumentsSection({
  taskData,
  onNotesChange,
}: {
  taskData: FinalReviewTaskData;
  onNotesChange: (workerNotes: string) => void;
}) {
  return (
    <SectionCard title="Documents" eyebrow="Document Review">
      <div className="detail-grid">
        <Field label="Overall Status" value={taskData.documentReview.status} />
        <Field label="Summary" value={taskData.documentReview.summary} wide />
      </div>

      <DataTable
        headers={['Document ID', 'Type', 'Status', 'Confidence', 'Reusable', 'Received Date']}
        rows={taskData.documentReview.documents.map((document) => [
          document.documentId,
          document.documentType,
          <StatusPill key={`${document.documentId}-status`} status={document.status} />,
          <span
            key={`${document.documentId}-confidence`}
            className={`confidence ${document.confidence >= 0.85 ? 'confidence-good' : 'confidence-warning'}`}
          >
            {formatPercent(document.confidence)}
          </span>,
          document.reusable ? <span key={`${document.documentId}-badge`} className="badge">Reusable</span> : 'No',
          formatDate(document.receivedDate),
        ])}
      />

      <label className="field-control full-width">
        <span>Document Review Notes</span>
        <textarea
          rows={3}
          value={taskData.documentReview.workerNotes ?? ''}
          onChange={(event) => onNotesChange(event.target.value)}
          placeholder="Add document review notes."
        />
      </label>
    </SectionCard>
  );
}

function ClearanceSection({
  taskData,
  onNotesChange,
  onOverrideChange,
  onOverrideReasonChange,
}: {
  taskData: FinalReviewTaskData;
  onNotesChange: (workerNotes: string) => void;
  onOverrideChange: (overrideClearance: boolean) => void;
  onOverrideReasonChange: (overrideReason: string) => void;
}) {
  return (
    <SectionCard title="Clearance / CIN-SIN" eyebrow="Clearance">
      <div className="detail-grid">
        <Field label="Status" value={taskData.clearanceReview.status} />
        <Field label="Match Type" value={taskData.clearanceReview.matchType} />
        <Field label="Match Score" value={String(taskData.clearanceReview.matchScore)} />
        <Field label="Existing CIN / SIN" value={taskData.clearanceReview.existingCinSin} />
      </div>

      <label className="field-control full-width">
        <span>Clearance Notes</span>
        <textarea
          rows={3}
          value={taskData.clearanceReview.workerNotes}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </label>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(taskData.clearanceReview.overrideClearance)}
          onChange={(event) => onOverrideChange(event.target.checked)}
        />
        <span>Override clearance</span>
      </label>

      {taskData.clearanceReview.overrideClearance ? (
        <label className="field-control full-width">
          <span>Override Reason</span>
          <textarea
            rows={3}
            value={taskData.clearanceReview.overrideReason ?? ''}
            onChange={(event) => onOverrideReasonChange(event.target.value)}
          />
        </label>
      ) : null}
    </SectionCard>
  );
}

function ExternalValidationSection({
  taskData,
  onReviewedChange,
}: {
  taskData: FinalReviewTaskData;
  onReviewedChange: (checked: boolean) => void;
}) {
  return (
    <SectionCard title="External Validation" eyebrow="Validation">
      <div className="detail-grid">
        <Field label="Status" value={taskData.externalValidation.status} />
        <Field label="UIB/DOL Status" value={taskData.externalValidation.uibDolStatus} />
        <Field label="Tax Status" value={taskData.externalValidation.taxStatus} />
        <Field label="Paystub Comparison" value={taskData.externalValidation.paystubComparisonStatus} />
        <Field label="Discrepancy Found" value={formatBoolean(taskData.externalValidation.discrepancyFound)} />
        <Field label="Summary" value={taskData.externalValidation.summary} wide />
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={Boolean(taskData.externalValidation.workerReviewed ?? taskData.reviewChecklist.externalValidationReviewed)}
          onChange={(event) => onReviewedChange(event.target.checked)}
        />
        <span>I reviewed external validation results</span>
      </label>
    </SectionCard>
  );
}

function BudgetSection({
  taskData,
  onReviewedChange,
}: {
  taskData: FinalReviewTaskData;
  onReviewedChange: (checked: boolean) => void;
}) {
  return (
    <SectionCard title="Budget" eyebrow="Mock ABLE">
      <div className="budget-callout">
        <strong>Mock ABLE result: {formatCurrency(taskData.budget.mockBenefitAmount)}/month</strong>
        <span>This is a mock budget result for the POC. The worker must confirm the inputs before final decision.</span>
      </div>
      <div className="detail-grid">
        <Field label="Budget Status" value={taskData.budget.status} />
        <Field label="Created" value={formatDateTime(taskData.budget.budgetCreatedAtUtc)} />
        <Field label="Summary" value={taskData.budget.budgetSummary} wide />
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={taskData.budget.workerReviewed}
          onChange={(event) => onReviewedChange(event.target.checked)}
        />
        <span>I reviewed the budget result</span>
      </label>
    </SectionCard>
  );
}

function NoticeSection({
  taskData,
  onNoticeTypeChange,
  onReasonToggle,
  onDynamicTextChange,
  onGenerate,
  onClear,
  onMarkReviewed,
}: {
  taskData: FinalReviewTaskData;
  onNoticeTypeChange: (noticeType: NoticeType) => void;
  onReasonToggle: (reasonCode: ReasonCode, checked: boolean) => void;
  onDynamicTextChange: (dynamicText: string) => void;
  onGenerate: () => void;
  onClear: () => void;
  onMarkReviewed: () => void;
}) {
  return (
    <SectionCard title="Notice" eyebrow="Notice Readiness">
      <div className="detail-grid">
        <Field label="Notice Status" value={taskData.notice.status} />
        <Field label="Dynamic Text Required" value={formatBoolean(taskData.notice.dynamicTextRequired)} />
      </div>

      <label className="field-control">
        <span>Notice Type</span>
        <select value={taskData.notice.selectedNoticeType} onChange={(event) => onNoticeTypeChange(event.target.value as NoticeType)}>
          <option value="">Select notice type</option>
          {taskData.notice.availableNoticeTypes.map((noticeType) => (
            <option key={noticeType} value={noticeType}>
              {noticeType}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="reason-fieldset">
        <legend>Reason Codes</legend>
        <div className="reason-grid">
          {taskData.notice.availableReasonCodes.map((reasonCode) => (
            <label key={reasonCode} className="checkbox-row compact-checkbox">
              <input
                type="checkbox"
                checked={taskData.notice.selectedReasonCodes.includes(reasonCode)}
                onChange={(event) => onReasonToggle(reasonCode, event.target.checked)}
              />
              <span>{reasonCode}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field-control full-width">
        <span>Dynamic Text</span>
        <textarea
          rows={4}
          value={taskData.notice.dynamicText}
          onChange={(event) => onDynamicTextChange(event.target.value)}
          placeholder="Required when Q21 or Q22 is selected."
        />
      </label>

      <div className="notice-actions">
        <button type="button" className="secondary-button" onClick={onGenerate}>
          Generate Notice Preview
        </button>
        <button type="button" className="ghost-button" onClick={onClear}>
          Clear Notice
        </button>
        <button type="button" className="info-button" onClick={onMarkReviewed}>
          Mark Notice Reviewed
        </button>
      </div>

      <pre className="notice-preview">{taskData.notice.noticePreview || 'No notice preview generated yet.'}</pre>
    </SectionCard>
  );
}

function FinalDecisionSection({ taskData }: { taskData: FinalReviewTaskData }) {
  return (
    <SectionCard title="Final Decision" eyebrow="Current Draft">
      <div className="detail-grid">
        <Field label="Decision" value={taskData.workerDecision.decision || 'Not selected'} />
        <Field label="Reason Code" value={taskData.workerDecision.reasonCode || 'Not selected'} />
        <Field label="Send to Supervisor" value={formatBoolean(taskData.workerDecision.sendToSupervisor)} />
        <Field label="Attestation" value={formatBoolean(taskData.workerDecision.attestation)} />
        <Field label="Worker Notes" value={taskData.workerDecision.workerNotes || 'No notes entered'} wide />
        <Field label="Supervisor Reason" value={taskData.workerDecision.supervisorReason || 'Not provided'} wide />
      </div>
    </SectionCard>
  );
}

function AuditSection({ taskData }: { taskData: FinalReviewTaskData }) {
  return (
    <SectionCard title="Audit" eyebrow="Activity">
      <div className="audit-list">
        {taskData.audit.events.map((event, index) => (
          <article className="audit-event" key={`${event.eventType}-${event.timestampUtc}-${index}`}>
            <div>
              <strong>{event.eventType}</strong>
              <span>{event.notes}</span>
            </div>
            <div className="audit-meta">
              <span>{event.actor}</span>
              <span>{formatDateTime(event.timestampUtc)}</span>
            </div>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}

function SectionCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="section-card" aria-labelledby={`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`}>
      <div className="section-heading">
        <span className="eyebrow">{eyebrow}</span>
        <h2 id={`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-heading`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, wide = false }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={`field-readout ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: string | null | undefined }) {
  return <span className={`status-pill ${toStatusClass(status)}`}>{status || 'Not provided'}</span>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ValidationSummary({ validation }: { validation: ValidationResult }) {
  if (!validation.errors.length && !validation.warnings.length) {
    return (
      <div className="validation-summary validation-ok">
        <strong>Validation ready</strong>
        <span>No blocking items for the selected decision.</span>
      </div>
    );
  }

  return (
    <div className="validation-summary" role="alert">
      <strong>Validation</strong>
      {validation.errors.length ? (
        <ul>
          {validation.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      ) : null}
      {validation.warnings.length ? (
        <ul className="warning-list">
          {validation.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: LocalToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <button
          type="button"
          className={`toast toast-${toast.severity}`}
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}

function DocumentModal({ taskData, onClose }: { taskData: FinalReviewTaskData; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="document-modal-heading">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Document</span>
            <h2 id="document-modal-heading">{taskData.extractedApplication.applicationDocumentName}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close document preview">
            X
          </button>
        </div>
        <Field label="Document URI" value={taskData.extractedApplication.applicationDocumentUri} wide />
        <div className="pdf-placeholder">
          <div>
            <strong>Mock PDF Preview</strong>
            <span>{taskData.extractedApplication.applicationDocumentName}</span>
            <p>Document rendering is intentionally mocked for the demo action app.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionModal({
  payload,
  onClose,
  onCopy,
}: {
  payload: unknown;
  onClose: () => void;
  onCopy: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal large-modal" role="dialog" aria-modal="true" aria-labelledby="completion-modal-heading">
        <div className="modal-header">
          <div>
            <span className="eyebrow">Local completion</span>
            <h2 id="completion-modal-heading">Final Payload</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close final payload">
            X
          </button>
        </div>
        <pre className="payload-preview">{JSON.stringify(payload, null, 2)}</pre>
        <div className="modal-actions">
          <button type="button" className="info-button" onClick={onCopy}>
            Copy Final Payload
          </button>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
