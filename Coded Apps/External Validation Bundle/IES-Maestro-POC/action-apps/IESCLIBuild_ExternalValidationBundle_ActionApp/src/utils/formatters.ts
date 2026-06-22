export function formatCurrency(value: number | undefined): string {
  if (typeof value !== "number") {
    return "Not provided";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatDate(value: string): string {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatPercent(value: number | undefined): string {
  if (typeof value !== "number") {
    return "Not provided";
  }

  return `${Math.round(value * 100)}%`;
}

export function formatBoolean(value: boolean): string {
  return value ? "Yes" : "No";
}

export function getConfidenceLabel(value: number): "acceptable" | "review needed" {
  return value >= 0.85 ? "acceptable" : "review needed";
}
