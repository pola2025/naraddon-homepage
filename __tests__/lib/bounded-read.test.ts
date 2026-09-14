/** @jest-environment node */

import {
  buildAscendingCursorFilter,
  buildDescendingCursorFilter,
  buildDescendingDateCursorFilter,
  decodeListCursor,
  encodeListCursor,
  parseListRequest,
  takePage,
} from '@/lib/bounded-read';

describe('bounded list reads', () => {
  it('rejects a requested page size above the server maximum', () => {
    // Given
    const params = new URLSearchParams({ limit: '101' });

    // When
    const result = parseListRequest(params, { defaultLimit: 25, maxLimit: 100 });

    // Then
    expect(result).toEqual({ kind: 'invalid', message: 'limit must be between 1 and 100' });
  });

  it('returns a typed cursor when the cursor is valid', () => {
    // Given
    const encoded = encodeListCursor({
      sortValue: '2026-09-14T00:00:00.000Z',
      id: '68c604c09b8b3d5a8f9f1234',
    });

    // When
    const result = decodeListCursor(encoded);

    // Then
    expect(result).toEqual({
      kind: 'valid',
      cursor: {
        sortValue: '2026-09-14T00:00:00.000Z',
        id: '68c604c09b8b3d5a8f9f1234',
      },
    });
  });

  it('rejects a malformed cursor instead of restarting from the first page', () => {
    // Given
    const params = new URLSearchParams({ cursor: 'not-a-cursor' });

    // When
    const result = parseListRequest(params, { defaultLimit: 25, maxLimit: 50 });

    // Then
    expect(result).toEqual({ kind: 'invalid', message: 'cursor is invalid' });
  });

  it('builds an indexable descending date and id cursor filter', () => {
    // Given
    const cursor = {
      sortValue: '2026-09-14T00:00:00.000Z',
      id: '68c604c09b8b3d5a8f9f1234',
    };

    // When
    const result = buildDescendingDateCursorFilter(cursor, 'createdAt');

    // Then
    expect(result.kind).toBe('valid');
    if (result.kind === 'valid') {
      expect(result.filter).toEqual({
        $or: [
          { createdAt: { $lt: new Date('2026-09-14T00:00:00.000Z') } },
          {
            createdAt: new Date('2026-09-14T00:00:00.000Z'),
            _id: { $lt: '68c604c09b8b3d5a8f9f1234' },
          },
        ],
      });
    }
  });

  it('builds an indexable ascending value and id cursor filter', () => {
    // Given
    const cursor = { sortValue: '가나다', id: '68c604c09b8b3d5a8f9f1234' };

    // When
    const result = buildAscendingCursorFilter(cursor, 'name');

    // Then
    expect(result).toEqual({
      $or: [
        { name: { $gt: '가나다' } },
        { name: '가나다', _id: { $gt: '68c604c09b8b3d5a8f9f1234' } },
      ],
    });
  });

  it('builds an indexable descending value and id cursor filter', () => {
    // Given
    const cursor = { sortValue: 42, id: '68c604c09b8b3d5a8f9f1234' };

    // When
    const result = buildDescendingCursorFilter(cursor, 'views');

    // Then
    expect(result).toEqual({
      $or: [{ views: { $lt: 42 } }, { views: 42, _id: { $lt: '68c604c09b8b3d5a8f9f1234' } }],
    });
  });

  it('returns only the requested rows and emits a next cursor', () => {
    // Given
    const documents = [
      { _id: '68c604c09b8b3d5a8f9f1001', createdAt: new Date('2026-09-14T03:00:00.000Z') },
      { _id: '68c604c09b8b3d5a8f9f1002', createdAt: new Date('2026-09-14T02:00:00.000Z') },
      { _id: '68c604c09b8b3d5a8f9f1003', createdAt: new Date('2026-09-14T01:00:00.000Z') },
    ];

    // When
    const result = takePage(documents, 2, (document) => ({
      sortValue: document.createdAt.toISOString(),
      id: document._id,
    }));

    // Then
    expect(result.items).toEqual(documents.slice(0, 2));
    expect(result.hasMore).toBe(true);
    expect(decodeListCursor(result.nextCursor)).toEqual({
      kind: 'valid',
      cursor: {
        sortValue: '2026-09-14T02:00:00.000Z',
        id: '68c604c09b8b3d5a8f9f1002',
      },
    });
  });
});
