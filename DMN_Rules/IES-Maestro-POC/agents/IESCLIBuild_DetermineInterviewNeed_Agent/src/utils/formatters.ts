import type { Priority } from "../types/determineInterviewNeedTypes";

export function formatDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10);
}

export function daysUntilDueDate(dueDate: string, fromDate?: string): number {
  const due = new Date(`${formatDate(dueDate)}T00:00:00Z`);
  const anchor = fromDate ? new Date(fromDate) : new Date();

  if (Number.isNaN(due.getTime()) || Number.isNaN(anchor.getTime())) {
    return Number.POSITIVE_INFINITY;
  }

  const anchorUtc = Date.UTC(
    anchor.getUTCFullYear(),
    anchor.getUTCMonth(),
    anchor.getUTCDate(),
  );
  const dueUtc = Date.UTC(due.getUTCFullYear(), due.getUTCMonth(), due.getUTCDate());
  return Math.ceil((dueUtc - anchorUtc) / 86_400_000);
}

export function derivePriorityFromDueDate(
  currentPriority: Priority,
  dueDate: string,
  dueSoonDays: number,
  fromDate?: string,
): Priority {
  const days = daysUntilDueDate(dueDate, fromDate);

  if (currentPriority === "Critical" || days <= 2) {
    return "Critical";
  }

  if (days <= dueSoonDays) {
    return "High";
  }

  return currentPriority;
}

export function normalizePriority(priority: unknown): Priority {
  if (typeof priority === "number") {
    if (priority >= 4) {
      return "Critical";
    }

    if (priority >= 3) {
      return "High";
    }

    return "Normal";
  }

  const normalized = String(priority || "")
    .trim()
    .toLowerCase();

  if (["critical", "urgent", "4"].includes(normalized)) {
    return "Critical";
  }

  if (["high", "3"].includes(normalized)) {
    return "High";
  }

  return "Normal";
}

export function normalizeInterviewMethod(
  method: string | undefined,
  defaultMethod = "Phone",
  allowInPersonIfRequested = true,
): string {
  const trimmed = (method || "").trim();
  const normalizedDefault = defaultMethod.trim() || "Phone";

  if (!trimmed) {
    return normalizedDefault;
  }

  if (trimmed.toLowerCase() === "in person") {
    return allowInPersonIfRequested ? "In Person" : normalizedDefault;
  }

  if (trimmed.toLowerCase() === "phone") {
    return "Phone";
  }

  if (trimmed.toLowerCase() === "virtual") {
    return "Virtual";
  }

  return trimmed;
}

export function createMissingItemId(
  category: string,
  label: string,
  sequence = 1,
): string {
  const padded = String(sequence).padStart(3, "0");
  const safeLabel = label
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (category.toLowerCase() === "document") {
    return `MI-DOC-${safeLabel || "DOCUMENT"}-${padded}`;
  }

  if (category.toLowerCase() === "income") {
    return `MI-INCOME-${padded}`;
  }

  return `MI-${safeLabel || "ITEM"}-${padded}`;
}

export function safeJoinList(values: string[], fallback = "none"): string {
  const cleanValues = values.map((value) => value.trim()).filter(Boolean);

  if (cleanValues.length === 0) {
    return fallback;
  }

  if (cleanValues.length === 1) {
    return cleanValues[0];
  }

  return `${cleanValues.slice(0, -1).join(", ")} and ${cleanValues.at(-1)}`;
}
