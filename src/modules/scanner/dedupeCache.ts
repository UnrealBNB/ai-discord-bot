import { DEDUPE_CACHE_TTL_MS, DEDUPE_CACHE_MAX_SIZE } from '../../utils/constants.js';

interface CacheEntry {
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export function isMessageProcessed(messageId: string): boolean {
  const entry = cache.get(messageId);

  if (!entry) {
    return false;
  }

  if (Date.now() - entry.timestamp > DEDUPE_CACHE_TTL_MS) {
    cache.delete(messageId);
    return false;
  }

  return true;
}

export function markMessageProcessed(messageId: string): void {
  if (cache.size >= DEDUPE_CACHE_MAX_SIZE) {
    pruneCache();
  }

  cache.set(messageId, { timestamp: Date.now() });
}

export function removeFromCache(messageId: string): void {
  cache.delete(messageId);
}

function pruneCache(): void {
  const now = Date.now();
  const entriesToDelete: string[] = [];

  for (const [key, entry] of cache) {
    if (now - entry.timestamp > DEDUPE_CACHE_TTL_MS) {
      entriesToDelete.push(key);
    }
  }

  for (const key of entriesToDelete) {
    cache.delete(key);
  }

  if (cache.size >= DEDUPE_CACHE_MAX_SIZE) {
    const entries = [...cache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, Math.floor(DEDUPE_CACHE_MAX_SIZE * 0.2));
    for (const [key] of toRemove) {
      cache.delete(key);
    }
  }
}

export function getCacheSize(): number {
  return cache.size;
}

export function clearCache(): void {
  cache.clear();
}
