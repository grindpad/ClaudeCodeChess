/**
 * Simple LRU cache for Lichess Explorer responses, keyed by FEN.
 * Capacity: 200 entries (~16KB max). Evicts least-recently-used on overflow.
 */

const CAPACITY = 200;
const cache = new Map<string, unknown>();

export const explorerCache = {
  get<T>(key: string): T | undefined {
    if (!cache.has(key)) return undefined;
    // Re-insert to mark as most recently used
    const val = cache.get(key) as T;
    cache.delete(key);
    cache.set(key, val);
    return val;
  },

  set<T>(key: string, value: T): void {
    if (cache.has(key)) cache.delete(key);
    cache.set(key, value);
    if (cache.size > CAPACITY) {
      // Evict the oldest entry (first key in insertion order)
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
  },

  has(key: string): boolean {
    return cache.has(key);
  },

  clear(): void {
    cache.clear();
  },
};
