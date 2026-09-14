const DAY_MS = 24 * 60 * 60 * 1_000;
const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

export type AnalyticsDateRangeResult =
  | { readonly kind: 'valid'; readonly start: Date; readonly end: Date }
  | { readonly kind: 'invalid'; readonly message: string };

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAnalyticsDateRange(
  searchParams: URLSearchParams,
  now = new Date()
): AnalyticsDateRangeResult {
  const rawStart = searchParams.get('startDate');
  const rawEnd = searchParams.get('endDate');
  const parsedStart = parseDate(rawStart);
  const parsedEnd = parseDate(rawEnd);

  if ((rawStart && !parsedStart) || (rawEnd && !parsedEnd)) {
    return { kind: 'invalid', message: 'date range is invalid' };
  }

  const end = parsedEnd || now;
  const start = parsedStart || new Date(end.getTime() - DEFAULT_DAYS * DAY_MS);
  const duration = end.getTime() - start.getTime();

  if (duration < 0) {
    return { kind: 'invalid', message: 'date range is invalid' };
  }
  if (duration > MAX_DAYS * DAY_MS) {
    return { kind: 'invalid', message: `date range must be ${MAX_DAYS} days or fewer` };
  }

  return { kind: 'valid', start, end };
}
