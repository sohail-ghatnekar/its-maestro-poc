import { mockFinalReviewTask } from '../src/data/mockFinalReviewTask';
import type { FinalReviewTaskData, ReasonCode } from '../src/types/finalReviewTypes';
import { composeTaskDataFromActionInput } from '../src/utils/taskDataComposer';
import { canApprove, requiresDynamicText, validateFinalDecision, validateSupervisorReviewDecision } from '../src/utils/validation';

function cloneTask(data: FinalReviewTaskData): FinalReviewTaskData {
  return JSON.parse(JSON.stringify(data)) as FinalReviewTaskData;
}

function assertCheck(condition: boolean, message: string, failures: string[]): void {
  if (!condition) {
    failures.push(message);
  }
}

const failures: string[] = [];
const task = cloneTask(mockFinalReviewTask);

assertCheck(Boolean(task.taskContext.taskId), 'taskContext.taskId is required.', failures);
assertCheck(task.caseHeader.myBNumber === 'MYB-1004', 'Mock task must use MYB-1004.', failures);
assertCheck(task.caseHeader.applicantName === 'Michael M. Motorist', 'Mock applicant must be Michael M. Motorist.', failures);
assertCheck(task.budget.mockBenefitAmount === 298, 'Mock benefit amount must be 298.', failures);
assertCheck(task.taskContext.isSupervisorReview === false, 'Mock task should start in worker review mode.', failures);
assertCheck(task.reviewChecklist.budgetReviewed === false, 'Budget should start unreviewed.', failures);
assertCheck(task.reviewChecklist.noticeReady === false, 'Notice should start not ready.', failures);

task.workerDecision.decision = 'Approve';
task.workerDecision.reasonCode = 'APPROVED_STANDARD';
task.workerDecision.workerNotes = 'Reviewed application, documents, clearance, validation, and budget result.';
task.workerDecision.attestation = true;
task.notice.selectedNoticeType = 'Approval';
task.notice.selectedReasonCodes = ['APPROVED_STANDARD'];

const minimalApproval = validateFinalDecision(task);
assertCheck(minimalApproval.valid, 'Approve should be allowed once a decision is selected.', failures);
assertCheck(canApprove(task), 'canApprove should be true for the minimal demo model.', failures);

task.budget.workerReviewed = true;
task.reviewChecklist.budgetReviewed = true;
task.reviewChecklist.noticeReady = true;
task.notice.status = 'Reviewed';
task.notice.noticePreview = 'Mock approval notice preview...';

const allowedApproval = validateFinalDecision(task);
assertCheck(allowedApproval.valid, 'Approve should remain allowed after optional readiness fields are complete.', failures);
assertCheck(canApprove(task), 'canApprove should remain true after optional readiness fields are complete.', failures);

const dynamicReasonCodes: ReasonCode[] = ['Q21'];
assertCheck(requiresDynamicText(dynamicReasonCodes), 'Q21 must require dynamic text.', failures);
assertCheck(requiresDynamicText(['Q22']), 'Q22 must require dynamic text.', failures);
assertCheck(!requiresDynamicText(['APPROVED_STANDARD']), 'APPROVED_STANDARD must not require dynamic text.', failures);

const splitInputTask = composeTaskDataFromActionInput({
  supervisorFlag: true,
  previousWorkerDecision: 'SendToSupervisor',
  previousWorkerNotes: 'Prior worker routed the case for supervisor review.',
  caseInfo: {
    ...mockFinalReviewTask.taskContext,
    ...mockFinalReviewTask.caseHeader,
    reviewChecklist: mockFinalReviewTask.reviewChecklist,
  },
  documentExtractionInfo: mockFinalReviewTask.extractedApplication,
  documentReview: mockFinalReviewTask.documentReview,
  clearanceReview: mockFinalReviewTask.clearanceReview,
  externalValidation: mockFinalReviewTask.externalValidation,
  budget: mockFinalReviewTask.budget,
});

const nullableWorkerInputTask = composeTaskDataFromActionInput({
  supervisorFlag: false,
  caseInfo: {},
  previousWorkerDecision: null,
  previousWorkerNotes: null,
  documentExtractionInfo: mockFinalReviewTask.extractedApplication,
  documentReview: mockFinalReviewTask.documentReview,
  clearanceReview: mockFinalReviewTask.clearanceReview,
  externalValidation: mockFinalReviewTask.externalValidation,
  budget: mockFinalReviewTask.budget,
});

assertCheck(Boolean(splitInputTask), 'Split action inputs must compose into task data.', failures);
assertCheck(splitInputTask?.caseHeader.myBNumber === 'MYB-1004', 'Split inputs must preserve MyB number.', failures);
assertCheck(
  splitInputTask?.extractedApplication.householdSize === 3,
  'Split inputs must preserve extracted household size.',
  failures,
);
assertCheck(splitInputTask?.taskContext.isSupervisorReview === true, 'supervisorFlag must enable supervisor review mode.', failures);
assertCheck(
  splitInputTask?.previousWorkerReview.workerNotes === 'Prior worker routed the case for supervisor review.',
  'Supervisor inputs must preserve previous worker notes.',
  failures,
);
assertCheck(
  splitInputTask?.previousWorkerReview.decision === 'SendToSupervisor',
  'Supervisor inputs must preserve previous worker decision.',
  failures,
);
assertCheck(Boolean(nullableWorkerInputTask), 'Empty caseInfo and null prior worker fields must compose task data.', failures);
assertCheck(
  nullableWorkerInputTask?.caseHeader.myBNumber === mockFinalReviewTask.caseHeader.myBNumber,
  'Empty caseInfo must fall back to the demo case header.',
  failures,
);
assertCheck(
  nullableWorkerInputTask?.previousWorkerReview.decision === '',
  'Null previous worker decision must render as empty.',
  failures,
);
assertCheck(
  nullableWorkerInputTask?.previousWorkerReview.workerNotes === '',
  'Null previous worker notes must render as empty.',
  failures,
);

const supervisorTask = cloneTask(mockFinalReviewTask);
supervisorTask.taskContext.isSupervisorReview = true;
supervisorTask.workerDecision.decision = 'Pend';
supervisorTask.workerDecision.workerNotes = 'Returning to the worker for more information.';

const supervisorReturnValidation = validateSupervisorReviewDecision(supervisorTask);
assertCheck(supervisorReturnValidation.valid, 'Supervisor send back should require only supervisor notes.', failures);

supervisorTask.workerDecision.decision = 'Withdraw';
const minimalSupervisorWithdraw = validateSupervisorReviewDecision(supervisorTask);
assertCheck(minimalSupervisorWithdraw.valid, 'Supervisor validation should only require a selected decision in the minimal demo model.', failures);

const q21Task = cloneTask(task);
q21Task.notice.selectedReasonCodes = ['Q21'];
q21Task.workerDecision.reasonCode = 'Q21';
q21Task.notice.dynamicTextRequired = true;
q21Task.notice.dynamicText = '';

const q21Validation = validateFinalDecision(q21Task);
assertCheck(q21Validation.valid, 'Q21 completion should not block the minimal decision payload.', failures);

const result = {
  valid: failures.length === 0,
  failures,
  checks: {
    requiredFields: true,
    approvalAllowedWithMinimalFields: minimalApproval.valid,
    approvalAllowedAfterRequiredFields: allowedApproval.valid,
    q21Q22RequireDynamicText: requiresDynamicText(['Q21']) && requiresDynamicText(['Q22']),
    splitInputsComposeTaskData: Boolean(splitInputTask),
    splitPreviousWorkerInputsPreserved: splitInputTask?.previousWorkerReview.decision === 'SendToSupervisor',
    nullableWorkerInputsAccepted: nullableWorkerInputTask?.previousWorkerReview.decision === '',
    supervisorReviewMode: splitInputTask?.taskContext.isSupervisorReview === true && minimalSupervisorWithdraw.valid,
  },
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
