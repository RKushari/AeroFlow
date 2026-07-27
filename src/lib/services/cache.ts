type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class InMemoryCache {
  private cache: Map<string, CacheEntry<any>>;

  constructor() {
    this.cache = new Map();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

// Global instance to persist across Next.js dev server reloads
const globalAny = global as any;
if (!globalAny.cacheService) {
  globalAny.cacheService = new InMemoryCache();
}

export const CacheService: InMemoryCache = globalAny.cacheService;
