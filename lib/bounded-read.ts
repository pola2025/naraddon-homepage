const CURSOR_VERSION = 1;
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const INTEGER_PATTERN = /^\d+$/;

export type ListCursor = {
  readonly sortValue: string | number;
  readonly id: string;
};

type CursorResult =
  | { readonly kind: 'valid'; readonly cursor: ListCursor }
  | { readonly kind: 'invalid' };

export type ListRequestResult =
  | {
      readonly kind: 'valid';
      readonly request: {
        readonly limit: number;
        readonly cursor: ListCursor | null;
      };
    }
  | { readonly kind: 'invalid'; readonly message: string };

type PageResult<T> = {
  readonly items: readonly T[];
  readonly hasMore: boolean;
  readonly nextCursor: string | null;
};

type CursorFilterResult =
  | { readonly kind: 'valid'; readonly filter: Record<string, unknown> }
  | { readonly kind: 'invalid' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function encodeListCursor(cursor: ListCursor): string {
  return Buffer.from(
    JSON.stringify({ version: CURSOR_VERSION, sortValue: cursor.sortValue, id: cursor.id }),
    'utf8'
  ).toString('base64url');
}

export function decodeListCursor(rawCursor: string | null): CursorResult {
  if (!rawCursor || rawCursor.length > 512) {
    return { kind: 'invalid' };
  }

  try {
    const decoded: unknown = JSON.parse(Buffer.from(rawCursor, 'base64url').toString('utf8'));
    if (!isRecord(decoded)) {
      return { kind: 'invalid' };
    }

    const sortValue = decoded.sortValue;
    const validSortValue =
      typeof sortValue === 'string' ||
      (typeof sortValue === 'number' && Number.isFinite(sortValue));

    if (
      decoded.version !== CURSOR_VERSION ||
      !validSortValue ||
      typeof decoded.id !== 'string' ||
      !OBJECT_ID_PATTERN.test(decoded.id)
    ) {
      return { kind: 'invalid' };
    }

    return { kind: 'valid', cursor: { sortValue, id: decoded.id } };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return { kind: 'invalid' };
    }
    throw error;
  }
}

export function parseListRequest(
  searchParams: URLSearchParams,
  options: { readonly defaultLimit: number; readonly maxLimit: number }
): ListRequestResult {
  const rawLimit = searchParams.get('limit');
  const limit = rawLimit === null ? options.defaultLimit : Number(rawLimit);

  if (
    (rawLimit !== null && !INTEGER_PATTERN.test(rawLimit)) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > options.maxLimit
  ) {
    return {
      kind: 'invalid',
      message: `limit must be between 1 and ${options.maxLimit}`,
    };
  }

  const rawCursor = searchParams.get('cursor');
  if (rawCursor === null) {
    return { kind: 'valid', request: { limit, cursor: null } };
  }

  const cursorResult = decodeListCursor(rawCursor);
  if (cursorResult.kind === 'invalid') {
    return { kind: 'invalid', message: 'cursor is invalid' };
  }

  return { kind: 'valid', request: { limit, cursor: cursorResult.cursor } };
}

export function buildDescendingDateCursorFilter(
  cursor: ListCursor,
  field: string,
  createId?: (id: string) => unknown
): CursorFilterResult {
  if (typeof cursor.sortValue !== 'string') {
    return { kind: 'invalid' };
  }

  const date = new Date(cursor.sortValue);
  if (Number.isNaN(date.getTime()) || date.toISOString() !== cursor.sortValue) {
    return { kind: 'invalid' };
  }

  const id = createId ? createId(cursor.id) : cursor.id;
  return {
    kind: 'valid',
    filter: {
      $or: [{ [field]: { $lt: date } }, { [field]: date, _id: { $lt: id } }],
    },
  };
}

export function buildAscendingCursorFilter(
  cursor: ListCursor,
  field: string,
  createId?: (id: string) => unknown
): Record<string, unknown> {
  const id = createId ? createId(cursor.id) : cursor.id;
  return {
    $or: [{ [field]: { $gt: cursor.sortValue } }, { [field]: cursor.sortValue, _id: { $gt: id } }],
  };
}

export function buildDescendingCursorFilter(
  cursor: ListCursor,
  field: string,
  createId?: (id: string) => unknown
): Record<string, unknown> {
  const id = createId ? createId(cursor.id) : cursor.id;
  return {
    $or: [{ [field]: { $lt: cursor.sortValue } }, { [field]: cursor.sortValue, _id: { $lt: id } }],
  };
}

export function takePage<T>(
  documents: readonly T[],
  limit: number,
  getCursor: (document: T) => ListCursor
): PageResult<T> {
  const hasMore = documents.length > limit;
  const items = documents.slice(0, limit);
  const lastItem = items.at(-1);

  return {
    items,
    hasMore,
    nextCursor: hasMore && lastItem ? encodeListCursor(getCursor(lastItem)) : null,
  };
}
