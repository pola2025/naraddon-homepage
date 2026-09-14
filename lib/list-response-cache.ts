import { BoundedTtlCache } from '@/lib/bounded-cache';

export const publicListResponseCache = new BoundedTtlCache<string>({
  maxEntries: 64,
  ttlMs: 30_000,
  maxValueBytes: 512 * 1024,
});

export const adminStatsResponseCache = new BoundedTtlCache<string>({
  maxEntries: 32,
  ttlMs: 30_000,
  maxValueBytes: 1024 * 1024,
});
