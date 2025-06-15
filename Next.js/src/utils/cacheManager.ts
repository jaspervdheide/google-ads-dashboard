/**
 * Advanced Cache Manager for Google Ads Dashboard
 * Handles large datasets with automatic cleanup and size management
 */

const CACHE_PREFIX = "kovvar_cache_";
const MAX_CACHE_SIZE = 4 * 1024 * 1024; // 4MB limit (safe under 5MB localStorage limit)
const CACHE_TTL_MINUTES = 30; // Default TTL

interface CacheEntry {
  data: any;
  timestamp: number;
  size: number; // Size in bytes
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  oldestEntry: number;
}

/**
 * Calculates the approximate size of an object in bytes
 */
function calculateObjectSize(obj: any): number {
  return new Blob([JSON.stringify(obj)]).size;
}

/**
 * Gets current cache statistics
 */
function getCacheStats(): CacheStats {
  let totalSize = 0;
  let entryCount = 0;
  let oldestEntry = Date.now();

  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length * 2; // Rough estimate (UTF-16)
          entryCount++;
          try {
            const entry = JSON.parse(item);
            if (entry.timestamp < oldestEntry) {
              oldestEntry = entry.timestamp;
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
    });
  } catch (error) {
    console.error('Error calculating cache stats:', error);
  }

  return { totalSize, entryCount, oldestEntry };
}

/**
 * Removes expired cache entries
 */
function cleanupExpiredEntries(): void {
  try {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const cacheKey = key.replace(CACHE_PREFIX, '');
        if (isExpired(cacheKey, CACHE_TTL_MINUTES)) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  } catch (error) {
    console.error('Error during cache cleanup:', error);
  }
}

/**
 * Removes oldest cache entries when size limit is exceeded
 */
function cleanupOldestEntries(targetReduction: number): void {
  try {
    const entries: Array<{ key: string; timestamp: number; size: number }> = [];
    
    // Collect all cache entries with metadata
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const entry = JSON.parse(item);
            entries.push({
              key,
              timestamp: entry.timestamp,
              size: item.length * 2 // Rough size estimate
            });
          } catch (e) {
            // Remove invalid entries
            localStorage.removeItem(key);
          }
        }
      }
    });
    
    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove oldest entries until we free up enough space
    let freedSpace = 0;
    let removedCount = 0;
    
    for (const entry of entries) {
      if (freedSpace >= targetReduction) break;
      
      localStorage.removeItem(entry.key);
      freedSpace += entry.size;
      removedCount++;
    }
    
    console.log(`🧹 Removed ${removedCount} oldest cache entries, freed ${(freedSpace / 1024).toFixed(1)}KB`);
  } catch (error) {
    console.error('Error during oldest entries cleanup:', error);
  }
}

/**
 * Saves data to cache with size management
 */
export function saveToCache(key: string, data: any): boolean {
  try {
    // First, clean up expired entries
    cleanupExpiredEntries();
    
    const cacheEntry: CacheEntry = {
      data,
      timestamp: Date.now(),
      size: calculateObjectSize(data)
    };
    
    const serializedEntry = JSON.stringify(cacheEntry);
    const entrySize = serializedEntry.length * 2; // UTF-16 estimate
    
    // Check if this single entry is too large
    if (entrySize > MAX_CACHE_SIZE * 0.8) { // Don't allow single entries over 80% of limit
      console.warn(`⚠️ Cache entry too large (${(entrySize / 1024).toFixed(1)}KB), skipping cache for key: ${key}`);
      return false;
    }
    
    // Check current cache size
    const stats = getCacheStats();
    const projectedSize = stats.totalSize + entrySize;
    
    // If projected size exceeds limit, clean up old entries
    if (projectedSize > MAX_CACHE_SIZE) {
      const excessSize = projectedSize - MAX_CACHE_SIZE;
      const cleanupTarget = excessSize + (MAX_CACHE_SIZE * 0.2); // Clean up 20% extra buffer
      cleanupOldestEntries(cleanupTarget);
    }
    
    // Try to save the entry
    localStorage.setItem(CACHE_PREFIX + key, serializedEntry);
    console.log(`💾 Cached data for key: ${key} (${(entrySize / 1024).toFixed(1)}KB)`);
    return true;
    
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      console.warn(`💾 Storage quota exceeded, attempting aggressive cleanup for key: ${key}`);
      
      // Aggressive cleanup - remove 50% of cache
      const stats = getCacheStats();
      cleanupOldestEntries(stats.totalSize * 0.5);
      
      // Try one more time
      try {
        const cacheEntry: CacheEntry = {
          data,
          timestamp: Date.now(),
          size: calculateObjectSize(data)
        };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
        console.log(`💾 Cached data after cleanup for key: ${key}`);
        return true;
      } catch (retryError) {
        console.error(`❌ Failed to cache even after cleanup for key: ${key}`, retryError);
        return false;
      }
    } else {
      console.error(`❌ Failed to save to cache for key: ${key}`, error);
      return false;
    }
  }
}

/**
 * Retrieves data from cache
 */
export function getFromCache(key: string, maxAgeMinutes: number = CACHE_TTL_MINUTES): any | null {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) {
      return null;
    }
    
    const cacheEntry = JSON.parse(cachedItem) as CacheEntry;
    
    // Check if expired
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    if (now - cacheEntry.timestamp > maxAge) {
      localStorage.removeItem(CACHE_PREFIX + key);
      console.log(`⏰ Cache expired for key: ${key}`);
      return null;
    }
    
    console.log(`🎯 Cache hit for key: ${key}`);
    return cacheEntry.data;
    
  } catch (error) {
    console.error(`❌ Failed to get from cache for key: ${key}`, error);
    // Remove corrupted entry
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (e) {
      // Ignore cleanup errors
    }
    return null;
  }
}

/**
 * Checks if a cache entry is expired
 */
export function isExpired(key: string, maxAgeMinutes: number = CACHE_TTL_MINUTES): boolean {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) return true;
    
    const cacheEntry = JSON.parse(cachedItem) as CacheEntry;
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    
    return (now - cacheEntry.timestamp) > maxAge;
  } catch (error) {
    console.error(`❌ Failed to check expiry for key: ${key}`, error);
    return true;
  }
}

/**
 * Clears all cache entries
 */
export function clearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    console.log(`🧹 Cleared ${clearedCount} cache entries`);
  } catch (error) {
    console.error('❌ Failed to clear cache:', error);
  }
}

/**
 * Clears cache entries by pattern
 */
export function clearCacheByPattern(pattern: string): void {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(pattern)) {
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    console.log(`🧹 Cleared ${clearedCount} cache entries matching pattern: ${pattern}`);
  } catch (error) {
    console.error(`❌ Failed to clear cache by pattern: ${pattern}`, error);
  }
}

/**
 * Gets cache statistics for debugging
 */
export function getCacheInfo(): CacheStats & { entries: string[] } {
  const stats = getCacheStats();
  const entries = Object.keys(localStorage)
    .filter(key => key.startsWith(CACHE_PREFIX))
    .map(key => key.replace(CACHE_PREFIX, ''));
  
  return {
    ...stats,
    entries
  };
}

/**
 * Initializes the cache manager (call this on app startup)
 */
export function initializeCacheManager(): void {
  console.log('🚀 Initializing Cache Manager...');
  
  // Initial cleanup of expired entries
  cleanupExpiredEntries();
  
  // Log current cache status
  const stats = getCacheStats();
  console.log(`📊 Cache Status: ${stats.entryCount} entries, ${(stats.totalSize / 1024).toFixed(1)}KB total`);
  
  // Set up periodic cleanup (every 5 minutes)
  if (typeof window !== 'undefined') {
    setInterval(() => {
      cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }
} 