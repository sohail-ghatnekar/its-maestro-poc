import type {
  CaseData,
  DetermineInterviewNeedInput,
  ValidationResult,
} from "../types/determineInterviewNeedTypes";

function ok(): ValidationResult {
  return {
    valid: true,
    errors: [],
    warnings: [],
  };
}

function mergeValidationResults(results: ValidationResult[]): ValidationResult {
  const errors = results.flatMap((result) => result.errors);
  const warnings = results.flatMap((result) => result.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function requireString(
  value: unknown,
  fieldName: string,
  errors: string[],
): void {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${fieldName} is required.`);
  }
}

function getAny(source: unknown, ...names: string[]): unknown {
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    return undefined;
  }

  const record = source as Record<string, unknown>;
  for (const name of names) {
    const value = record[name];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

export function validateCaseData(caseData: CaseData): ValidationResult {
  const result = ok();

  requireString(
    getAny(caseData, "MyBNumber", "myBNumber"),
    "caseData.MyBNumber",
    result.errors,
  );
  requireString(getAny(caseData, "Id", "id"), "caseData.Id", result.errors);

  result.valid = result.errors.length === 0;
  return result;
}

export function validateExpeditedScreeningResult(
  expeditedScreeningResult: string,
): ValidationResult {
  const result = ok();

  if (
    typeof expeditedScreeningResult !== "string" ||
    expeditedScreeningResult.trim() === ""
  ) {
    result.errors.push("expeditedScreeningResult must be a non-empty string.");
  }

  result.valid = result.errors.length === 0;
  return result;
}

export function validateInputs(
  inputs: DetermineInterviewNeedInput,
): ValidationResult {
  const requiredGroups: Array<keyof DetermineInterviewNeedInput> = [
    "caseData",
    "expeditedScreeningResult",
  ];

  const groupResult = ok();
  for (const group of requiredGroups) {
    if (!inputs?.[group]) {
      groupResult.errors.push(`${group} input group is required.`);
    }
  }

  if (groupResult.errors.length > 0) {
    groupResult.valid = false;
    return groupResult;
  }

  return mergeValidationResults([
    validateCaseData(inputs.caseData),
    validateExpeditedScreeningResult(inputs.expeditedScreeningResult),
  ]);
}
