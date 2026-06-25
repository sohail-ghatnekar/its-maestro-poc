import type { IncomeItem } from '../types/finalReviewTypes';

export function formatDate(value: string): string {
  if (!value) {
    return 'Not provided';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

export function formatDateTime(value: string): string {
  if (!value) {
    return 'Not provided';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatBoolean(value: boolean): string {
  return value ? 'Yes' : 'No';
}

export function summarizeGrossIncome(items: IncomeItem[]): string {
  if (!items.length) {
    return 'No income items found';
  }

  return items
    .map((item) => `${item.person}: ${formatCurrency(item.grossAmount)} ${(item.frequency || 'Unknown').toLowerCase()}`)
    .join('; ');
}

export function toStatusClass(status: string | null | undefined): string {
  const normalized = status?.toLowerCase() || '';

  if (normalized.includes('approved') || normalized.includes('complete') || normalized.includes('resolved')) {
    return 'status-green';
  }

  if (normalized.includes('denied') || normalized.includes('error') || normalized.includes('blocked')) {
    return 'status-red';
  }

  if (normalized.includes('missing') || normalized.includes('pending') || normalized.includes('not started')) {
    return 'status-yellow';
  }

  if (normalized.includes('supervisor')) {
    return 'status-purple';
  }

  return 'status-blue';
}
