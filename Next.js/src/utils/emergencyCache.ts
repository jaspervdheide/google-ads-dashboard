/**
 * Emergency Cache Utilities
 * Quick fixes for cache quota issues
 */

const CACHE_PREFIX = "kovvar_cache_";

/**
 * Emergency function to clear all cache when quota is exceeded
 */
export function emergencyClearCache(): void {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    let clearedSize = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          clearedSize += item.length * 2; // Rough size estimate
        }
        localStorage.removeItem(key);
        clearedCount++;
      }
    });
    
    console.log(`🚨 EMERGENCY CACHE CLEAR: Removed ${clearedCount} entries, freed ${(clearedSize / 1024).toFixed(1)}KB`);
    
    // Also clear any other potential cache entries
    keys.forEach(key => {
      if (key.includes('cache') || key.includes('kovvar')) {
        try {
          localStorage.removeItem(key);
          console.log(`🧹 Also removed: ${key}`);
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Emergency cache clear failed:', error);
  }
}

/**
 * Clear only large cache entries (over 100KB)
 */
export function clearLargeCacheEntries(): void {
  try {
    const keys = Object.keys(localStorage);
    let clearedCount = 0;
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item && item.length > 100 * 1024) { // Over 100KB
          localStorage.removeItem(key);
          clearedCount++;
          console.log(`🧹 Removed large cache entry: ${key} (${(item.length / 1024).toFixed(1)}KB)`);
        }
      }
    });
    
    console.log(`🧹 Cleared ${clearedCount} large cache entries`);
  } catch (error) {
    console.error('❌ Failed to clear large cache entries:', error);
  }
}

/**
 * Get storage usage information
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  try {
    let used = 0;
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length * 2; // UTF-16 estimate
      }
    });
    
    const maxSize = 5 * 1024 * 1024; // 5MB typical limit
    const percentage = (used / maxSize) * 100;
    
    return {
      used,
      available: maxSize - used,
      percentage
    };
  } catch (error) {
    console.error('❌ Failed to get storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * Run this immediately to fix quota issues
 */
export function fixQuotaIssue(): void {
  console.log('🚨 Running emergency cache fix...');
  
  const storageBefore = getStorageInfo();
  console.log(`📊 Storage before: ${(storageBefore.used / 1024).toFixed(1)}KB (${storageBefore.percentage.toFixed(1)}%)`);
  
  // Try clearing large entries first
  clearLargeCacheEntries();
  
  const storageAfter = getStorageInfo();
  console.log(`📊 Storage after: ${(storageAfter.used / 1024).toFixed(1)}KB (${storageAfter.percentage.toFixed(1)}%)`);
  
  // If still over 80%, do emergency clear
  if (storageAfter.percentage > 80) {
    console.log('🚨 Still over capacity, doing emergency clear...');
    emergencyClearCache();
  }
  
  console.log('✅ Emergency cache fix complete');
} 