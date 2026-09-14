type CacheOptions = {
  readonly maxEntries: number;
  readonly ttlMs: number;
  readonly maxValueBytes?: number;
};

type CacheEntry<T> = {
  readonly value: T;
  readonly expiresAt: number;
};

export class BoundedTtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;
  private readonly maxValueBytes: number;

  constructor(options: CacheOptions) {
    if (options.maxEntries < 1 || options.ttlMs < 1) {
      throw new RangeError('cache limits must be positive');
    }

    this.maxEntries = options.maxEntries;
    this.ttlMs = options.ttlMs;
    this.maxValueBytes = options.maxValueBytes ?? 512 * 1024;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  get(key: string): T | null {
    const entry = this.entries.get(key);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      return null;
    }

    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  async getOrLoad(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const pending = this.inFlight.get(key);
    if (pending) {
      return pending;
    }

    const loadPromise = load();
    this.inFlight.set(key, loadPromise);

    try {
      const value = await loadPromise;
      if (this.measureValue(value) <= this.maxValueBytes) {
        this.set(key, value);
      }
      return value;
    } finally {
      this.inFlight.delete(key);
    }
  }

  invalidatePrefix(prefix: string): void {
    this.entries.forEach((_entry, key) => {
      if (key.startsWith(prefix)) {
        this.entries.delete(key);
      }
    });
  }

  private set(key: string, value: T): void {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (typeof oldestKey !== 'string') {
        return;
      }
      this.entries.delete(oldestKey);
    }
  }

  private measureValue(value: T): number {
    try {
      return Buffer.byteLength(JSON.stringify(value), 'utf8');
    } catch (error) {
      if (error instanceof TypeError) {
        return Number.POSITIVE_INFINITY;
      }
      throw error;
    }
  }
}
