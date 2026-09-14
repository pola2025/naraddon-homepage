import { parseAnalyticsDateRange } from '@/lib/bounded-analytics';

describe('analytics date range', () => {
  it('defaults to a bounded recent range', () => {
    // Given
    const params = new URLSearchParams();
    const now = new Date('2026-09-14T00:00:00.000Z');

    // When
    const result = parseAnalyticsDateRange(params, now);

    // Then
    expect(result).toEqual({
      kind: 'valid',
      start: new Date('2026-08-15T00:00:00.000Z'),
      end: now,
    });
  });

  it('rejects a range wider than the maximum', () => {
    // Given
    const params = new URLSearchParams({
      startDate: '2026-01-01T00:00:00.000Z',
      endDate: '2026-09-14T00:00:00.000Z',
    });

    // When
    const result = parseAnalyticsDateRange(params, new Date('2026-09-14T00:00:00.000Z'));

    // Then
    expect(result).toEqual({ kind: 'invalid', message: 'date range must be 90 days or fewer' });
  });

  it('rejects invalid dates', () => {
    // Given
    const params = new URLSearchParams({ startDate: 'not-a-date' });

    // When
    const result = parseAnalyticsDateRange(params, new Date('2026-09-14T00:00:00.000Z'));

    // Then
    expect(result).toEqual({ kind: 'invalid', message: 'date range is invalid' });
  });
});
