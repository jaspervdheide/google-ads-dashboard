/**
 * Server-Side Cache for Google Ads API responses
 * 
 * Smart TTL based on data type:
 * - Historical data (>1 day old): 24 hours (immutable)
 * - Today's data: 5 minutes (changes throughout day)
 * - Campaign/Ad Group lists: 15 minutes
 * - Real-time metrics: 5 minutes
 */

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  size: number;
}

class ServerCache {
  private cache = new Map<string, CacheEntry>();
  private stats = { hits: 0, misses: 0 };
  private readonly MAX_ENTRIES = 500;
  private readonly MAX_SIZE_MB = 50;

  // TTL Constants (in milliseconds)
  static readonly TTL = {
    // Historical data from past days - immutable, cache for 24 hours
    HISTORICAL_PAST: 24 * 60 * 60 * 1000,
    
    // Today's data - changes throughout day, 5 min cache
    HISTORICAL_TODAY: 5 * 60 * 1000,
    
    // Campaign/Ad Group list - 15 minutes
    ENTITY_LIST: 15 * 60 * 1000,
    
    // KPI aggregates - 5 minutes
    METRICS: 5 * 60 * 1000,
    
    // Account list - 1 hour (rarely changes)
    ACCOUNTS: 60 * 60 * 1000,
    
    // Keywords/Search terms - 15 minutes
    KEYWORDS: 15 * 60 * 1000,
    
    // Ads data - 15 minutes
    ADS: 15 * 60 * 1000,
  };

  /**
   * Generate a cache key from request parameters
   */
  generateKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .filter(k => params[k] !== null && params[k] !== undefined)
      .map(k => `${k}=${params[k]}`)
      .join('&');
    return `${prefix}:${sortedParams}`;
  }

  /**
   * Determine optimal TTL based on date range
   * If the date range includes only historical data (not today), use longer TTL
   */
  getSmartTTL(endDateStr: string, baseTTL: number): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endDate = new Date(endDateStr);
    endDate.setHours(0, 0, 0, 0);
    
    // If end date is before today, data is fully historical
    if (endDate < today) {
      return ServerCache.TTL.HISTORICAL_PAST;
    }
    
    // Otherwise use the base TTL (data includes today)
    return baseTTL;
  }

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.timestamp + entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, ttl: number): void {
    // Cleanup if too many entries
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.cleanup();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete keys matching a pattern
   */
  deleteByPattern(pattern: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Delete all keys for a specific customer
   */
  invalidateCustomer(customerId: string): number {
    return this.deleteByPattern(`customerId=${customerId}`);
  }

  /**
   * Cleanup expired entries and oldest entries if over limit
   */
  cleanup(): void {
    const now = Date.now();
    const entries: Array<[string, CacheEntry]> = [];

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      } else {
        entries.push([key, entry]);
      }
    }

    // If still over limit, remove oldest 20%
    if (entries.length > this.MAX_ENTRIES * 0.9) {
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = Math.floor(entries.length * 0.2);
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      entries: this.cache.size,
      size: this.cache.size // Simplified size estimate
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  /**
   * Log cache performance (for debugging)
   */
  logPerformance(): void {
    const stats = this.getStats();
    console.log(`📊 Cache Stats: ${stats.entries} entries, ${this.getHitRate().toFixed(1)}% hit rate (${stats.hits} hits, ${stats.misses} misses)`);
  }
}

// Export singleton instance
export const serverCache = new ServerCache();

// Export class for TTL constants
export { ServerCache };

// Helper function to wrap API calls with caching
export async function withCache<T>(
  key: string,
  ttl: number,
  fetchFn: () => Promise<T>
): Promise<{ data: T; cached: boolean }> {
  // Try cache first
  const cached = serverCache.get<T>(key);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // Fetch fresh data
  const data = await fetchFn();
  
  // Store in cache
  serverCache.set(key, data, ttl);
  
  return { data, cached: false };
}



