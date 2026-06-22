from pydantic import BaseModel, Field
from uipath.tracing import traced


class Input(BaseModel):
    filingAccepted: bool = Field(
        ..., description="Whether the intake filing has been accepted."
    )
    expeditedInputsComplete: bool = Field(
        ..., description="Whether all inputs required for expedited screening are complete."
    )
    priorExpeditedVerificationOutstanding: bool = Field(
        ...,
        description=(
            "Whether prior expedited postponed verification remains outstanding."
        ),
    )
    destituteMigrantSeasonalFarmworker: bool = Field(
        ...,
        description=(
            "Whether the household is a destitute migrant or seasonal farmworker "
            "household."
        ),
    )
    grossMonthlyIncome: float = Field(
        ..., description="Household gross monthly income."
    )
    liquidResources: float = Field(
        ..., description="Household liquid resources."
    )
    homelessHousehold: bool = Field(
        ..., description="Whether all household members are homeless."
    )
    shelterAndUtilityCosts: float = Field(
        ..., description="Monthly shelter and utility costs."
    )


class Output(BaseModel):
    expeditedDecision: str = Field(
        ..., description="Primary expedited screening decision code."
    )
    expeditedFlag: bool = Field(
        ..., description="Whether the case qualifies for expedited handling."
    )
    slaDays: float = Field(
        ..., description="Service-level target in days for the next action."
    )
    priority: str = Field(..., description="Recommended processing priority.")
    nextStage: str = Field(..., description="Recommended next workflow stage.")
    recommendedAction: str = Field(
        ..., description="Action text for the process or worker."
    )
    reasonCode: str = Field(..., description="Machine-readable decision reason.")
    policyRef: str = Field(..., description="Policy or demo reference for the rule.")


def _result(
    expeditedDecision: str,
    expeditedFlag: bool,
    slaDays: float,
    priority: str,
    nextStage: str,
    recommendedAction: str,
    reasonCode: str,
    policyRef: str,
) -> Output:
    return Output(
        expeditedDecision=expeditedDecision,
        expeditedFlag=expeditedFlag,
        slaDays=slaDays,
        priority=priority,
        nextStage=nextStage,
        recommendedAction=recommendedAction,
        reasonCode=reasonCode,
        policyRef=policyRef,
    )


@traced()
async def main(input: Input) -> Output:
    """Evaluate expedited SNAP screening using the DMN table's FIRST hit policy."""
    if not input.filingAccepted:
        return _result(
            "EXPEDITED_WAIT_FOR_INTAKE",
            False,
            0.0,
            "High",
            "Intake",
            "Complete intake filing review before expedited screening.",
            "EXPEDITED_INTAKE_NOT_ACCEPTED",
            "SNAPSB Section 4 Expedited Screening",
        )

    if not input.expeditedInputsComplete:
        return _result(
            "EXPEDITED_UNDETERMINED",
            False,
            0.0,
            "High",
            "Interview",
            "Worker must complete expedited screening inputs.",
            "EXPEDITED_INPUTS_MISSING",
            "SNAPSB Section 4 Expedited Screening",
        )

    if input.priorExpeditedVerificationOutstanding:
        return _result(
            "EXPEDITED_VERIFICATION_REVIEW",
            False,
            0.0,
            "High",
            "Interview",
            "Review prior pended verification before expedited action.",
            "EXPEDITED_PRIOR_VERIFICATION_OUTSTANDING",
            "SNAPSB Section 4 Expedited Processing",
        )

    if input.destituteMigrantSeasonalFarmworker and input.liquidResources <= 100:
        return _result(
            "EXPEDITED_MIGRANT_SEASONAL",
            True,
            7.0,
            "Critical",
            "Interview",
            "Prioritize same-day expedited interview and processing.",
            "EXPEDITED_DESTITUTE_MIGRANT_SEASONAL",
            "SNAPSB Section 4 Expedited Criteria",
        )

    if input.grossMonthlyIncome < 150 and input.liquidResources <= 100:
        return _result(
            "EXPEDITED_LOW_INCOME_RESOURCE",
            True,
            7.0,
            "Critical",
            "Interview",
            "Prioritize same-day expedited interview and processing.",
            "EXPEDITED_GROSS_UNDER_150_RESOURCES_UNDER_100",
            "SNAPSB Section 4 Expedited Criteria",
        )

    if input.homelessHousehold:
        return _result(
            "EXPEDITED_HOMELESS_HOUSEHOLD",
            True,
            7.0,
            "Critical",
            "Interview",
            "Prioritize expedited processing for homeless household.",
            "EXPEDITED_HOMELESS",
            "SNAPSB Glossary Expedited Application Processing Service",
        )

    income_resources_minus_shelter = (
        input.grossMonthlyIncome + input.liquidResources - input.shelterAndUtilityCosts
    )
    if income_resources_minus_shelter < 0:
        return _result(
            "EXPEDITED_SHELTER_COST",
            True,
            7.0,
            "Critical",
            "Interview",
            "Prioritize same-day expedited interview and processing.",
            "EXPEDITED_INCOME_RESOURCES_LESS_THAN_SHELTER",
            "SNAPSB Section 4 Expedited Criteria",
        )

    return _result(
        "NOT_EXPEDITED",
        False,
        30.0,
        "Normal",
        "Documents",
        "Continue standard SNAP processing.",
        "EXPEDITED_CRITERIA_NOT_MET",
        "SNAPSB Normal Processing Standard",
    )
