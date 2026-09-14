import { BoundedTtlCache } from '@/lib/bounded-cache';

describe('BoundedTtlCache', () => {
  it('coalesces concurrent reads for the same key', async () => {
    // Given
    const cache = new BoundedTtlCache<string>({ maxEntries: 10, ttlMs: 1_000 });
    let loadCount = 0;
    const load = async () => {
      loadCount += 1;
      return 'value';
    };

    // When
    const values = await Promise.all([
      cache.getOrLoad('same', load),
      cache.getOrLoad('same', load),
    ]);

    // Then
    expect(values).toEqual(['value', 'value']);
    expect(loadCount).toBe(1);
  });

  it('evicts the least recently used entry at the configured capacity', async () => {
    // Given
    const cache = new BoundedTtlCache<string>({ maxEntries: 2, ttlMs: 1_000 });
    await cache.getOrLoad('first', async () => 'first-value');
    await cache.getOrLoad('second', async () => 'second-value');
    await cache.getOrLoad('first', async () => 'unused');

    // When
    await cache.getOrLoad('third', async () => 'third-value');

    // Then
    expect(cache.has('first')).toBe(true);
    expect(cache.has('second')).toBe(false);
    expect(cache.has('third')).toBe(true);
  });

  it('invalidates every cached variant in a namespace', async () => {
    // Given
    const cache = new BoundedTtlCache<string>({ maxEntries: 10, ttlMs: 1_000 });
    await cache.getOrLoad('users:page-1', async () => 'one');
    await cache.getOrLoad('users:page-2', async () => 'two');
    await cache.getOrLoad('news:page-1', async () => 'news');

    // When
    cache.invalidatePrefix('users:');

    // Then
    expect(cache.has('users:page-1')).toBe(false);
    expect(cache.has('users:page-2')).toBe(false);
    expect(cache.has('news:page-1')).toBe(true);
  });
});
