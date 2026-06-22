from pydantic import BaseModel, Field
from uipath.tracing import traced


class Input(BaseModel):
    documentAvailable: bool = Field(
        ..., description="Whether an application document pointer is available."
    )
    myBNumberPresent: bool = Field(
        ..., description="Whether the MyB number is present in the kickoff payload."
    )
    namePresent: bool = Field(
        ..., description="Whether the applicant name is present."
    )
    addressPresent: bool = Field(
        ..., description="Whether a residence address is present."
    )
    noFixedAddressFlag: bool = Field(
        ..., description="Whether the household reports no fixed address."
    )
    signaturePresent: bool = Field(
        ..., description="Whether an applicant or representative signature is present."
    )
    signatureDatePresent: bool = Field(
        ..., description="Whether the signature date is present/readable."
    )
    countyKnown: bool = Field(
        ..., description="Whether the county can be determined for routing."
    )
    snapProgramSelected: bool = Field(
        ..., description="Whether SNAP is selected as the target program."
    )
    applicantEmailPresent: bool = Field(
        ..., description="Whether applicant email is available for outreach."
    )


class Output(BaseModel):
    intakeDecision: str = Field(..., description="Primary intake decision code.")
    filingAccepted: bool = Field(
        ..., description="Whether the filing may move forward."
    )
    missingInfoFlag: bool = Field(
        ..., description="Whether missing or review-required information exists."
    )
    nextStage: str = Field(..., description="Recommended next workflow stage.")
    recommendedAction: str = Field(
        ..., description="Action text for the process or worker."
    )
    reasonCode: str = Field(..., description="Machine-readable decision reason.")
    policyRef: str = Field(..., description="Policy or demo reference for the rule.")


def _result(
    intakeDecision: str,
    filingAccepted: bool,
    missingInfoFlag: bool,
    nextStage: str,
    recommendedAction: str,
    reasonCode: str,
    policyRef: str,
) -> Output:
    return Output(
        intakeDecision=intakeDecision,
        filingAccepted=filingAccepted,
        missingInfoFlag=missingInfoFlag,
        nextStage=nextStage,
        recommendedAction=recommendedAction,
        reasonCode=reasonCode,
        policyRef=policyRef,
    )


@traced()
async def main(input: Input) -> Output:
    """Evaluate IES intake rules using the DMN table's FIRST hit policy."""
    if not input.documentAvailable:
        return _result(
            "INTAKE_DOCUMENT_MISSING",
            False,
            True,
            "Intake",
            "Attach or retrieve the SNAP application PDF before intake validation.",
            "INTAKE_DOC_POINTER_MISSING",
            "POC Intake Bootstrap",
        )

    if not input.myBNumberPresent:
        return _result(
            "INTAKE_MYB_MISSING",
            False,
            True,
            "Intake",
            "Correct the kickoff payload so a MyB number is available.",
            "INTAKE_MYB_MISSING",
            "POC Intake Bootstrap",
        )

    if not input.namePresent:
        return _result(
            "PEND_NAME",
            False,
            True,
            "Interview",
            "Request or verify applicant legal name.",
            "FILING_NAME_MISSING",
            "SNAPSB Section 4 Application Filing",
        )

    if not input.signaturePresent:
        return _result(
            "PEND_SIGNATURE",
            False,
            True,
            "Interview",
            "Request signed application or route to worker signature review.",
            "FILING_SIGNATURE_MISSING",
            "SNAPSB Section 4 Application Filing",
        )

    if not input.addressPresent and not input.noFixedAddressFlag:
        return _result(
            "PEND_ADDRESS",
            False,
            True,
            "Interview",
            "Request residence address or confirm no fixed address.",
            "FILING_ADDRESS_MISSING",
            "SNAPSB Section 4 Application Filing",
        )

    if not input.snapProgramSelected:
        return _result(
            "PROGRAM_SCOPE_REVIEW",
            False,
            True,
            "Intake",
            "Route to worker to confirm SNAP program scope.",
            "NON_SNAP_OR_MIXED_PROGRAM_SELECTION",
            "POC SNAP Scope",
        )

    if not input.countyKnown:
        return _result(
            "COUNTY_TRIAGE_REQUIRED",
            True,
            True,
            "Intake",
            "Route to state/county triage to determine worker group.",
            "COUNTY_UNKNOWN",
            "POC Routing Requirement",
        )

    if not input.signatureDatePresent:
        return _result(
            "SIGNATURE_DATE_REVIEW",
            True,
            True,
            "Interview",
            "Worker should review signature date before final intake completion.",
            "SIGNATURE_DATE_UNREADABLE",
            "LDSS-4826 Certification Signature",
        )

    if not input.applicantEmailPresent:
        return _result(
            "CONTACT_REVIEW_REQUIRED",
            True,
            True,
            "Interview",
            "Worker should confirm applicant outreach contact information.",
            "APPLICANT_EMAIL_MISSING",
            "POC Applicant Outreach",
        )

    return _result(
        "FILING_ACCEPTED",
        True,
        False,
        "Expedited Screening",
        "Proceed to same-day expedited screening.",
        "INTAKE_COMPLETE",
        "SNAPSB Section 4 Application Filing",
    )
