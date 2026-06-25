from __future__ import annotations

from datetime import datetime, timedelta, timezone
from math import ceil
from typing import Any

from pydantic import BaseModel, Field
from uipath.tracing import traced


class Input(BaseModel):
    caseData: dict[str, Any] = Field(
        ..., description="Case data record from UiPath Case Management or Data Service."
    )
    expeditedScreeningResult: str = Field(
        ..., description="Expedited screening result text."
    )
    documentExtraction: Any = Field(
        default=None,
        description="Document extraction data. Accepted as null and ignored.",
    )


class Output(BaseModel):
    caseInfo: dict[str, Any]
    invocationInfo: dict[str, Any]
    agentReview: dict[str, Any]
    humanTaskRecommendation: dict[str, Any] | None
    statusUpdate: dict[str, Any]
    auditEvent: dict[str, Any]
    errors: list[str]


REASON_TEXT = {
    "SNAP_INTERVIEW_REQUIRED": (
        "SNAP application processing requires interview completion before "
        "eligibility determination."
    ),
    "EXPEDITED_INTERVIEW_PRIORITY": (
        "Expedited screening indicates the interview should be prioritized "
        "without making a final eligibility decision."
    ),
    "INTAKE_NOT_READY": (
        "The intake filing result is not ready for interview task creation."
    ),
    "INTERVIEW_TASK_ALREADY_OPEN": (
        "An interview task is already open, so a duplicate task should not be "
        "created."
    ),
    "APPLICANT_RESPONSE_PENDING": (
        "Applicant response is already pending, so another outreach task should "
        "not be created yet."
    ),
    "INCOME_CONFIRMATION_NEEDED": (
        "Reported income includes an item that requires worker confirmation."
    ),
    "ACCOMMODATION_REVIEW": (
        "The applicant requested an accommodation or alternate handling "
        "consideration."
    ),
    "CLEARANCE_CAN_RUN_SEPARATELY": (
        "A clearance possible match can be handled separately while interview "
        "completion is still tracked."
    ),
    "DUE_SOON_PRIORITY": (
        "The eligibility due date is within the configured due soon window."
    ),
    "INTERVIEW_NOT_REQUIRED_YET": (
        "The available inputs do not yet support creating an interview human task."
    ),
    "INPUT_VALIDATION_FAILED": "The input data did not pass required validation.",
}

DEFAULT_POLICY_CONFIG: dict[str, Any] = {
    "snapInterviewGenerallyRequired": True,
    "defaultInterviewMethod": "Phone",
    "allowInPersonIfRequested": True,
    "expeditedInterviewPriority": True,
    "dueSoonDays": 7,
}


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _get_any(source: dict[str, Any], *names: str) -> Any:
    if not isinstance(source, dict):
        return None
    for name in names:
        value = source.get(name)
        if value is not None and value != "":
            return value
    return None


def _add_unique(values: list[str], value: str) -> None:
    if value not in values:
        values.append(value)


def _normalize_priority(value: Any) -> str:
    if isinstance(value, (int, float)):
        if value >= 4:
            return "Critical"
        if value >= 3:
            return "High"
        return "Normal"

    text = str(value or "").strip()
    lowered = text.lower()
    if lowered in {"critical", "urgent", "4"}:
        return "Critical"
    if lowered in {"high", "3"}:
        return "High"
    return "Normal"


def _normalize_interview_method(
    method: Any, default_method: Any, allow_in_person: bool
) -> str:
    text = str(method or "").strip()
    default_text = str(default_method or "Phone").strip() or "Phone"
    lowered = text.lower()
    if not text:
        return default_text
    if lowered == "in person":
        return "In Person" if allow_in_person else default_text
    if lowered == "phone":
        return "Phone"
    if lowered == "virtual":
        return "Virtual"
    return text


def _days_until_due(due_date: str, from_date: str) -> float:
    try:
        due = datetime.fromisoformat(f"{due_date[:10]}T00:00:00+00:00")
        anchor = datetime.fromisoformat(from_date.replace("Z", "+00:00"))
    except ValueError:
        return float("inf")

    anchor_midnight = datetime(
        anchor.year, anchor.month, anchor.day, tzinfo=timezone.utc
    )
    return ceil((due - anchor_midnight).total_seconds() / 86400)


def _raise_priority_for_due_date(
    current_priority: str, due_date: str, due_soon_days: Any, from_date: str
) -> str:
    days = _days_until_due(due_date, from_date)
    due_window = due_soon_days if isinstance(due_soon_days, (int, float)) else 7

    if current_priority == "Critical" or days <= 2:
        return "Critical"
    if days <= due_window:
        return "High"
    return current_priority


def _coerce_int(value: Any, default_value: int) -> int:
    if isinstance(value, bool):
        return default_value
    try:
        return int(float(str(value)))
    except (TypeError, ValueError):
        return default_value


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y"}
    return bool(value)


def _format_case_value(label: str, value: Any, fallback: str) -> str:
    if value is None or value == "":
        return fallback
    text = str(value).strip()
    if not text:
        return fallback
    if text.replace(".", "", 1).isdigit():
        return f"{label} {text}"
    return text


def _date_plus_days(date_value: Any, days: int) -> str:
    text = str(date_value or "").strip()
    if not text:
        return ""
    try:
        base = datetime.fromisoformat(f"{text[:10]}T00:00:00+00:00")
    except ValueError:
        return ""
    return (base + timedelta(days=days)).date().isoformat()


def _expedited_flag(expedited: dict[str, Any]) -> bool:
    return _coerce_bool(_get_any(expedited, "expeditedFlag", "ExpeditedFlag"))


def _parse_expedited_screening_result(value: Any) -> dict[str, Any]:
    text = str(value or "").strip()
    lowered = text.lower().replace("_", " ").replace("-", " ")
    not_expedited = any(
        phrase in lowered
        for phrase in [
            "not expedited",
            "non expedited",
            "not eligible",
            "criteria not met",
            "false",
        ]
    )
    expedited = (
        not not_expedited
        and ("expedited" in lowered or "critical" in lowered or "7 day" in lowered)
    )

    priority = "Normal"
    if expedited or "critical" in lowered:
        priority = "Critical"
    elif "high" in lowered:
        priority = "High"

    return {
        "expeditedDecision": text,
        "expeditedFlag": expedited,
        "slaDays": 7 if expedited else 30,
        "priority": priority,
        "reasonCode": text,
        "recommendedAction": (
            "Prioritize expedited interview and processing."
            if expedited
            else "Continue standard SNAP processing."
        ),
    }


def _derive_due_date(case_data: dict[str, Any], expedited: dict[str, Any]) -> str:
    explicit_due_date = _get_any(
        case_data,
        "EligibilityDueDate",
        "eligibilityDueDate",
        "DueDate",
        "dueDate",
    )
    if explicit_due_date:
        return str(explicit_due_date)[:10]

    filing_date = _get_any(case_data, "FilingDate", "filingDate")
    if not filing_date:
        filing_date = _get_any(case_data, "CreateTime", "createTime")

    default_sla_days = 7 if _expedited_flag(expedited) else 30
    sla_days = _coerce_int(
        _get_any(expedited, "slaDays", "SlaDays", "SLADays"),
        default_sla_days,
    )
    return _date_plus_days(filing_date, sla_days)


def _build_internal_data(data: dict[str, Any]) -> dict[str, Any]:
    case_data = data.get("caseData") or {}
    expedited = _parse_expedited_screening_result(
        data.get("expeditedScreeningResult")
    )
    created_by = _get_any(case_data, "CreatedBy", "createdBy") or {}

    my_b_number = str(_get_any(case_data, "MyBNumber", "myBNumber") or "")
    case_id = str(
        _get_any(case_data, "Id", "id", "CaseRecordNumber", "caseRecordNumber") or ""
    )
    create_time = str(
        _get_any(case_data, "CreateTime", "createTime", "UpdateTime", "updateTime")
        or _now_utc()
    )
    applicant_email = str(
        _get_any(case_data, "ApplicantEmail", "applicantEmail") or ""
    )
    assigned_worker = str(
        _get_any(case_data, "AssignedWorker", "assignedWorker") or ""
    )
    priority = _get_any(case_data, "Priority", "priority")
    if priority is None:
        priority = _get_any(expedited, "priority", "Priority")

    return {
        "taskContext": {
            "requestId": f"REQ-INTERVIEW-NEED-{my_b_number or case_id}",
            "source": "caseData",
            "createdAtUtc": create_time,
            "requestedBy": str(
                _get_any(created_by, "Email", "email", "Name", "name") or "system"
            ),
            "priority": _normalize_priority(priority),
            "isReevaluation": False,
        },
        "invocationInfo": {
            "invocationId": str(
                _get_any(case_data, "MaestroProcessID", "maestroProcessID") or case_id
            ),
            "invocationReason": "Determine Interview Need from case data",
            "previousInvocationId": "",
            "isRekickEvaluation": False,
        },
        "caseInfo": {
            "caseRecordNumber": case_id,
            "caseId": case_id,
            "myBNumber": my_b_number,
            "applicantName": str(
                _get_any(case_data, "ApplicantName", "applicantName", "Name", "name")
                or ""
            ),
            "applicantEmail": applicant_email,
            "county": str(_get_any(case_data, "County", "county") or ""),
            "derivedRegion": "",
            "filingDate": str(
                _get_any(case_data, "FilingDate", "filingDate") or ""
            )[:10],
            "eligibilityDueDate": _derive_due_date(case_data, expedited),
            "currentStatus": _format_case_value(
                "Status",
                _get_any(case_data, "CurrentStatus", "currentStatus"),
                "Pending Review",
            ),
            "currentStage": _format_case_value(
                "Stage",
                _get_any(case_data, "CurrentStage", "currentStage"),
                "Intake",
            ),
            "statusCode": str(
                _get_any(case_data, "CurrentStatus", "currentStatus") or ""
            ),
            "expeditedFlag": _expedited_flag(expedited),
            "assignedWorker": assigned_worker,
            "folderId": str(
                _get_any(case_data, "FolderID", "FolderId", "folderId") or ""
            ),
            "clearancePossibleMatch": _coerce_bool(
                _get_any(
                    case_data,
                    "ClearancePossibleMatch",
                    "clearancePossibleMatch",
                )
            ),
        },
        "applicationExtraction": {
            "preferredInterviewMethod": str(
                _get_any(
                    case_data,
                    "PreferredInterviewMethod",
                    "preferredInterviewMethod",
                )
                or "Phone"
            ),
            "requestedAccommodation": _coerce_bool(
                _get_any(
                    case_data,
                    "RequestedAccommodation",
                    "requestedAccommodation",
                )
            ),
            "income": [],
        },
        "intakeRuleResult": {
            "filingAccepted": True,
        },
        "expeditedScreeningResult": expedited,
        "priorInterviewState": {
            "interviewTaskAlreadyOpen": False,
            "lastInterviewCompleted": False,
            "lastInterviewCompletedAtUtc": "",
            "lastOutcome": "",
            "lastMissingInfoItems": [],
            "applicantResponsePending": False,
        },
        "policyConfig": dict(DEFAULT_POLICY_CONFIG),
        "auditInfo": {
            "events": [],
        },
    }


def _safe_token(value: str) -> str:
    token = "".join(char if char.isalnum() else "_" for char in value.upper())
    return "_".join(part for part in token.split("_") if part)


def _missing_item_id(category: str, label: str, sequence: int = 1) -> str:
    if category == "Income":
        return f"MI-INCOME-{sequence:03d}"
    return f"MI-{_safe_token(label) or 'ITEM'}-{sequence:03d}"


def _join_list(values: list[str]) -> str:
    clean_values = [value for value in values if value]
    if not clean_values:
        return "none"
    if len(clean_values) == 1:
        return clean_values[0]
    return f"{', '.join(clean_values[:-1])} and {clean_values[-1]}"


def _validate(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    required_groups = [
        "caseData",
        "expeditedScreeningResult",
    ]
    for group in required_groups:
        if not data.get(group):
            errors.append(f"{group} input group is required.")

    if errors:
        return errors

    case_data = data["caseData"]
    if not str(_get_any(case_data, "MyBNumber", "myBNumber") or "").strip():
        errors.append("caseData.MyBNumber is required.")
    if not str(_get_any(case_data, "Id", "id") or "").strip():
        errors.append("caseData.Id is required.")

    if not isinstance(data["expeditedScreeningResult"], str):
        errors.append("expeditedScreeningResult must be a string.")

    return errors


def _heuristics(data: dict[str, Any]) -> dict[str, Any]:
    task_context = data["taskContext"]
    case_info = data["caseInfo"]
    application = data["applicationExtraction"]
    intake = data["intakeRuleResult"]
    expedited = data["expeditedScreeningResult"]
    prior = data["priorInterviewState"]
    policy = data["policyConfig"]

    result = {
        "interviewNeeded": False,
        "recommendedInterviewMethod": _normalize_interview_method(
            application.get("preferredInterviewMethod"),
            policy.get("defaultInterviewMethod", "Phone"),
            bool(policy.get("allowInPersonIfRequested", True)),
        ),
        "recommendedPriority": _normalize_priority(task_context.get("priority")),
        "shouldCreateHumanTask": False,
        "shouldRekickInterviewTask": False,
        "reasonCodes": [],
        "missingInfoItems": [],
        "recommendedWorkerActions": [],
        "nextRecommendedStep": "Continue standard SNAP processing",
    }

    if not intake.get("filingAccepted"):
        result["nextRecommendedStep"] = "Resolve intake filing issue"
        _add_unique(result["reasonCodes"], "INTAKE_NOT_READY")
        result["recommendedWorkerActions"].append(
            "Resolve intake filing issue before creating an interview task."
        )
        return result

    task_creation_blocked = False
    if prior.get("interviewTaskAlreadyOpen"):
        task_creation_blocked = True
        _add_unique(result["reasonCodes"], "INTERVIEW_TASK_ALREADY_OPEN")
        result["recommendedWorkerActions"].append("Do not create duplicate task.")

    if prior.get("applicantResponsePending"):
        task_creation_blocked = True
        _add_unique(result["reasonCodes"], "APPLICANT_RESPONSE_PENDING")
        result["recommendedWorkerActions"].append(
            "Wait for applicant response before creating another task."
        )

    if policy.get("snapInterviewGenerallyRequired") and not prior.get(
        "lastInterviewCompleted"
    ):
        result["interviewNeeded"] = True
        result["shouldCreateHumanTask"] = not task_creation_blocked
        result["nextRecommendedStep"] = (
            "Use existing interview or applicant response workflow"
            if task_creation_blocked
            else "Create Interview and Missing Info human task"
        )
        _add_unique(result["reasonCodes"], "SNAP_INTERVIEW_REQUIRED")
        result["recommendedWorkerActions"].append(
            "Create Interview and Missing Info human task."
        )

    if expedited.get("expeditedFlag") and policy.get("expeditedInterviewPriority"):
        result["recommendedPriority"] = "Critical"
        _add_unique(result["reasonCodes"], "EXPEDITED_INTERVIEW_PRIORITY")
        result["recommendedWorkerActions"].append(
            "Prioritize interview scheduling for expedited screening."
        )

    if any(item.get("requiresWorkerConfirmation") for item in application.get("income", [])):
        _add_unique(result["reasonCodes"], "INCOME_CONFIRMATION_NEEDED")
        result["missingInfoItems"].append(
            {
                "itemId": _missing_item_id("Income", "Income", 1),
                "label": "Confirm fluctuating part-time income",
                "category": "Income",
                "required": True,
                "source": "applicationExtraction",
            }
        )
        result["recommendedWorkerActions"].append(
            "Confirm income details during phone interview."
        )

    if application.get("requestedAccommodation"):
        _add_unique(result["reasonCodes"], "ACCOMMODATION_REVIEW")
        result["recommendedWorkerActions"].append(
            "Confirm accommodation needs before interview scheduling."
        )

    if case_info.get("clearancePossibleMatch"):
        _add_unique(result["reasonCodes"], "CLEARANCE_CAN_RUN_SEPARATELY")
        result["recommendedWorkerActions"].append(
            "Clearance can run separately, but interview completion should still "
            "be tracked."
        )

    if result["missingInfoItems"] and not task_creation_blocked:
        result["shouldCreateHumanTask"] = True
        if not result["interviewNeeded"]:
            result["nextRecommendedStep"] = "Create missing information human task"

    before_due = result["recommendedPriority"]
    result["recommendedPriority"] = _raise_priority_for_due_date(
        before_due,
        str(case_info.get("eligibilityDueDate", "")),
        policy.get("dueSoonDays", 7),
        str(task_context.get("createdAtUtc", "")),
    )
    if result["recommendedPriority"] != before_due:
        _add_unique(result["reasonCodes"], "DUE_SOON_PRIORITY")

    if result["shouldCreateHumanTask"]:
        result["nextRecommendedStep"] = "Create Interview and Missing Info human task"

    if not result["interviewNeeded"] and not result["reasonCodes"]:
        _add_unique(result["reasonCodes"], "INTERVIEW_NOT_REQUIRED_YET")

    return result


def _reasons(reason_codes: list[str]) -> list[dict[str, str]]:
    return [
        {
            "reasonCode": code,
            "reasonText": REASON_TEXT.get(
                code, "The deterministic review identified this advisory condition."
            ),
        }
        for code in reason_codes
    ]


def _summary(data: dict[str, Any], heuristic: dict[str, Any]) -> str:
    reason_codes = heuristic["reasonCodes"]
    if "INTAKE_NOT_READY" in reason_codes:
        return (
            "Interview task creation is not recommended yet because the intake "
            "filing result must be corrected first. This advisory does not "
            "approve or deny benefits, and the worker remains responsible for "
            "the case."
        )
    if "INTERVIEW_TASK_ALREADY_OPEN" in reason_codes:
        return (
            "Interview completion still needs to be tracked, but a duplicate "
            "Interview and Missing Info human task is not recommended because "
            "one is already open. The worker remains responsible for next steps."
        )
    if "APPLICANT_RESPONSE_PENDING" in reason_codes:
        return (
            "A new Interview and Missing Info human task is not recommended yet "
            "because applicant response is already pending. The worker remains "
            "responsible for reviewing the response."
        )

    labels = [item["label"] for item in heuristic["missingInfoItems"]]
    missing_phrase = (
        f" and missing information review is recommended for {_join_list(labels)}"
        if labels
        else ""
    )
    if heuristic["interviewNeeded"] and heuristic["shouldCreateHumanTask"]:
        return (
            "Interview human task creation is recommended because SNAP interview "
            f"completion is required{missing_phrase}. This is advisory only, "
            "and the worker remains responsible for the case."
        )
    if heuristic["interviewNeeded"]:
        return (
            "Interview completion is recommended for tracking, but a new human "
            "task is not recommended at this moment. This is advisory only, and "
            "the worker remains responsible for the case."
        )
    return (
        "Interview human task creation is not recommended yet for "
        f"{data['caseInfo'].get('myBNumber', '')}. This is advisory only, and "
        "the worker remains responsible for the case."
    )


def _suggested_message(heuristic: dict[str, Any]) -> str:
    if "INTAKE_NOT_READY" in heuristic["reasonCodes"]:
        return (
            "Additional filing information may be needed before the SNAP "
            "application can move to interview scheduling."
        )
    if heuristic["missingInfoItems"]:
        return (
            "Additional information may be needed for your SNAP application. "
            "Please be prepared to confirm household income and provide clearer "
            "documents if requested."
        )
    if heuristic["interviewNeeded"]:
        return (
            "An interview may be needed for your SNAP application. Please be "
            "prepared to confirm application details with a worker."
        )
    return "No applicant outreach message is recommended by this advisory review at this time."


def _confidence(heuristic: dict[str, Any]) -> float:
    confidence = 0.93
    if "INCOME_CONFIRMATION_NEEDED" in heuristic["reasonCodes"]:
        confidence -= 0.01
    if "INTAKE_NOT_READY" in heuristic["reasonCodes"]:
        confidence = 0.94
    if "EXPEDITED_INTERVIEW_PRIORITY" in heuristic["reasonCodes"]:
        confidence = min(confidence, 0.91)
    return round(confidence, 2)


def _agent_review(data: dict[str, Any], heuristic: dict[str, Any]) -> dict[str, Any]:
    return {
        "agentName": "IESCLIBuild_DetermineInterviewNeedAgent",
        "reviewType": "Determine Interview Need",
        "advisoryOnly": True,
        "interviewNeeded": heuristic["interviewNeeded"],
        "recommendedInterviewMethod": heuristic["recommendedInterviewMethod"],
        "recommendedPriority": heuristic["recommendedPriority"],
        "shouldCreateHumanTask": heuristic["shouldCreateHumanTask"],
        "shouldRekickInterviewTask": heuristic["shouldRekickInterviewTask"],
        "summary": _summary(data, heuristic),
        "reasons": _reasons(heuristic["reasonCodes"]),
        "missingInfoItems": heuristic["missingInfoItems"],
        "recommendedWorkerActions": heuristic["recommendedWorkerActions"],
        "suggestedApplicantMessage": _suggested_message(heuristic),
        "confidence": _confidence(heuristic),
        "workerApprovalRequired": True,
    }


def _human_task(data: dict[str, Any], heuristic: dict[str, Any]) -> dict[str, Any] | None:
    if not heuristic["shouldCreateHumanTask"]:
        return None
    county = "".join(
        char if char.isalnum() else "_" for char in data["caseInfo"].get("county", "")
    ).strip("_")
    has_missing_info = bool(heuristic["missingInfoItems"])
    if heuristic["interviewNeeded"] and has_missing_info:
        reason = "Interview required and missing information follow-up may be needed."
    elif heuristic["interviewNeeded"]:
        reason = "Interview required for SNAP case processing."
    else:
        reason = "Missing information follow-up may be needed."
    task = {
        "taskName": "Interview and Missing Info",
        "taskType": "Human Task",
        "assignedGroup": f"{county or 'County'}_SNAP_Workers",
        "priority": heuristic["recommendedPriority"],
        "invocationReason": reason,
        "formHints": {
            "showInterviewFields": heuristic["interviewNeeded"],
            "showMissingInfoChecklist": has_missing_info,
            "showApplicantOutreachDraft": True,
        },
    }
    assigned_worker = data["caseInfo"].get("assignedWorker")
    if assigned_worker:
        task["assignedWorker"] = assigned_worker
    return task


def _status(data: dict[str, Any], heuristic: dict[str, Any]) -> dict[str, Any]:
    reason_codes = heuristic["reasonCodes"]
    if "INTAKE_NOT_READY" in reason_codes:
        return {
            "currentStatus": "Pending Correction",
            "currentStage": "Intake",
            "nextRecommendedStep": "Resolve intake filing issue",
        }
    if "APPLICANT_RESPONSE_PENDING" in reason_codes:
        return {
            "currentStatus": "Pending Applicant Response",
            "currentStage": data["caseInfo"].get("currentStage", "Interview"),
            "nextRecommendedStep": "Wait for applicant response",
        }
    if "INTERVIEW_TASK_ALREADY_OPEN" in reason_codes:
        return {
            "currentStatus": "In Progress",
            "currentStage": "Interview",
            "nextRecommendedStep": "Use existing Interview and Missing Info human task",
        }
    if heuristic["shouldCreateHumanTask"]:
        return {
            "currentStatus": "In Progress",
            "currentStage": "Interview",
            "nextRecommendedStep": "Create Interview and Missing Info human task",
        }
    return {
        "currentStatus": "Pending Review",
        "currentStage": data["caseInfo"].get("currentStage", "Intake"),
        "nextRecommendedStep": heuristic["nextRecommendedStep"],
    }


def _audit(data: dict[str, Any], event_type: str, notes: str) -> dict[str, Any]:
    return {
        "eventType": event_type,
        "timestampUtc": _now_utc(),
        "actor": "agent",
        "actorType": "Agent",
        "notes": notes,
        "myBNumber": data.get("caseInfo", {}).get("myBNumber", ""),
        "invocationId": data.get("invocationInfo", {}).get("invocationId", ""),
    }


def _validation_failure(data: dict[str, Any], errors: list[str]) -> Output:
    return Output(
        caseInfo={
            "caseRecordNumber": data.get("caseInfo", {}).get("caseRecordNumber", ""),
            "myBNumber": data.get("caseInfo", {}).get("myBNumber", ""),
        },
        invocationInfo={
            "invocationId": data.get("invocationInfo", {}).get("invocationId", ""),
            "finalAction": "DetermineInterviewNeed",
        },
        agentReview={
            "agentName": "IESCLIBuild_DetermineInterviewNeedAgent",
            "reviewType": "Determine Interview Need",
            "advisoryOnly": True,
            "interviewNeeded": False,
            "recommendedInterviewMethod": "Phone",
            "recommendedPriority": "High",
            "shouldCreateHumanTask": False,
            "shouldRekickInterviewTask": False,
            "summary": (
                "Input validation failed, so interview task creation is not "
                "recommended. This advisory does not approve or deny benefits, "
                "and the worker remains responsible for the case."
            ),
            "reasons": [
                {
                    "reasonCode": "INPUT_VALIDATION_FAILED",
                    "reasonText": " ".join(errors),
                }
            ],
            "missingInfoItems": [],
            "recommendedWorkerActions": [
                "Correct required input data before creating an interview task."
            ],
            "suggestedApplicantMessage": (
                "Additional information may be needed before interview scheduling "
                "can be reviewed."
            ),
            "confidence": 0,
            "workerApprovalRequired": True,
        },
        humanTaskRecommendation=None,
        statusUpdate={
            "currentStatus": "Validation Failed",
            "currentStage": data.get("caseInfo", {}).get("currentStage", "Intake"),
            "nextRecommendedStep": "Correct required input data",
        },
        auditEvent=_audit(
            data,
            "DetermineInterviewNeedValidationFailed",
            "Determine Interview Need agent could not complete advisory review due to invalid input.",
        ),
        errors=errors,
    )


@traced()
async def main(input: Input) -> Output:
    """Return an advisory Determine Interview Need review without external calls."""
    raw_data = input.model_dump()
    data = _build_internal_data(raw_data)
    errors = _validate(raw_data)
    if errors:
        return _validation_failure(data, errors)

    heuristic = _heuristics(data)
    return Output(
        caseInfo={
            "caseRecordNumber": data["caseInfo"].get("caseRecordNumber", ""),
            "myBNumber": data["caseInfo"].get("myBNumber", ""),
        },
        invocationInfo={
            "invocationId": data["invocationInfo"].get("invocationId", ""),
            "finalAction": "DetermineInterviewNeed",
        },
        agentReview=_agent_review(data, heuristic),
        humanTaskRecommendation=_human_task(data, heuristic),
        statusUpdate=_status(data, heuristic),
        auditEvent=_audit(
            data,
            "DetermineInterviewNeedCompleted",
            "Determine Interview Need agent completed advisory review.",
        ),
        errors=[],
    )
