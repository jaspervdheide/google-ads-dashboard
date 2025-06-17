/**
 * Enhanced cache manager with intelligent cleanup and storage optimization
 * Provides centralized caching with automatic cleanup and storage monitoring
 */

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  size: number; // Approximate size in bytes
}

export interface CacheStats {
  entryCount: number;
  totalSize: number; // in bytes
  oldestEntry: number; // timestamp
  newestEntry: number; // timestamp
}

class CacheManager {
  private cache = new Map<string, CacheEntry>();
  private readonly MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly MAX_ENTRY_SIZE = 2 * 1024 * 1024; // 2MB per entry
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly CLEANUP_THRESHOLD = 0.8; // Clean when 80% full

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // Fallback estimation
      return JSON.stringify(data).length * 2;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    try {
      let totalSize = 0;
      let oldestEntry = Date.now();
      let newestEntry = 0;

      for (const entry of this.cache.values()) {
        totalSize += entry.size;
        if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
        if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
      }

      return {
        entryCount: this.cache.size,
        totalSize,
        oldestEntry: this.cache.size > 0 ? oldestEntry : 0,
        newestEntry: this.cache.size > 0 ? newestEntry : 0
      };
    } catch (error) {
      console.error('Error calculating cache stats:', error);
      return { entryCount: 0, totalSize: 0, oldestEntry: 0, newestEntry: 0 };
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): number {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.timestamp + entry.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error during cache cleanup:', error);
      return 0;
    }
  }

  /**
   * Remove oldest entries to free up space
   */
  private cleanupOldest(targetSize: number): number {
    try {
      // Sort entries by timestamp (oldest first)
      const entries = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp
      );

      let freedSpace = 0;
      let removedCount = 0;

      for (const [key, entry] of entries) {
        if (freedSpace >= targetSize) break;
        
        this.cache.delete(key);
        freedSpace += entry.size;
        removedCount++;
      }

      return removedCount;
    } catch (error) {
      console.error('Error during oldest entries cleanup:', error);
      return 0;
    }
  }

  /**
   * Intelligent cache cleanup based on size and age
   */
  private performIntelligentCleanup(): void {
    // First, clean expired entries
    this.cleanupExpired();

    const stats = this.getStats();
    
    // If still over threshold, remove oldest entries
    if (stats.totalSize > this.MAX_CACHE_SIZE * this.CLEANUP_THRESHOLD) {
      const targetCleanup = stats.totalSize - (this.MAX_CACHE_SIZE * 0.6); // Clean to 60%
      this.cleanupOldest(targetCleanup);
    }
  }

  /**
   * Set cache entry with intelligent size management
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): boolean {
    try {
      const entrySize = this.calculateSize(data);
      
      // Skip if entry is too large
      if (entrySize > this.MAX_ENTRY_SIZE) {
        console.warn(`⚠️ Cache entry too large (${(entrySize / 1024).toFixed(1)}KB), skipping cache for key: ${key}`);
        return false;
      }

      // Check if we need cleanup before adding
      const stats = this.getStats();
      if (stats.totalSize + entrySize > this.MAX_CACHE_SIZE) {
        this.performIntelligentCleanup();
      }

      // Create cache entry
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        size: entrySize
      };

      this.cache.set(key, entry);

      // Retry with aggressive cleanup if still failing
      const newStats = this.getStats();
      if (newStats.totalSize > this.MAX_CACHE_SIZE) {
        console.warn(`💾 Storage quota exceeded, attempting aggressive cleanup for key: ${key}`);
        
        // Aggressive cleanup - remove 50% of entries
        const targetCleanup = newStats.totalSize * 0.5;
        this.cleanupOldest(targetCleanup);
        
        // Try to set again
        try {
          this.cache.set(key, entry);
        } catch (retryError) {
          console.error(`❌ Failed to cache even after cleanup for key: ${key}`, retryError);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to save to cache for key: ${key}`, error);
      return false;
    }
  }

  /**
   * Get cache entry with expiration check
   */
  get<T>(key: string): T | null {
    try {
      const entry = this.cache.get(key);
      if (!entry) return null;

      const now = Date.now();
      
      // Check if expired
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
        return null;
      }

      return entry.data as T;
    } catch (error) {
      console.error(`❌ Failed to get from cache for key: ${key}`, error);
      return null;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Check if key is expired without retrieving data
   */
  isExpired(key: string): boolean {
    try {
      const entry = this.cache.get(key);
      if (!entry) return true;

      const now = Date.now();
      return now > entry.timestamp + entry.ttl;
    } catch (error) {
      console.error(`❌ Failed to check expiry for key: ${key}`, error);
      return true;
    }
  }

  /**
   * Delete specific cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): number {
    try {
      const clearedCount = this.cache.size;
      this.cache.clear();
      return clearedCount;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      return 0;
    }
  }

  /**
   * Clear cache entries matching pattern
   */
  clearByPattern(pattern: RegExp): number {
    try {
      let clearedCount = 0;
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
          clearedCount++;
        }
      }
      return clearedCount;
    } catch (error) {
      console.error(`❌ Failed to clear cache by pattern: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Initialize cache manager
   */
  init(): void {
    // Perform initial cleanup
    this.cleanupExpired();
    
    const stats = this.getStats();
    if (stats.entryCount > 0) {
      // Only log if there are entries to report
    }
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Initialize on module load
cacheManager.init();

// Backward compatibility exports
export const getFromCache = <T>(key: string): T | null => cacheManager.get<T>(key);
export const saveToCache = <T>(key: string, data: T, ttl?: number): boolean => cacheManager.set(key, data, ttl); 