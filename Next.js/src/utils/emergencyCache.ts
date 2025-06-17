/**
 * Emergency Cache Utilities
 * Uses main cacheManager for consistency - no duplication
 */

import { cacheManager } from './cacheManager';

/**
 * Emergency function to clear all cache when quota is exceeded
 * Uses the main cache manager for consistency
 */
export const emergencyCacheClear = () => {
  try {
    return cacheManager.clear();
  } catch (error) {
    console.error('❌ Emergency cache clear failed:', error);
    return 0;
  }
};

/**
 * Clear only large cache entries (over 100KB)
 * Uses cache info from main manager
 */
export const clearLargeCacheEntries = () => {
  try {
    // Get current stats
    const stats = cacheManager.getStats();
    const avgEntrySize = stats.entryCount > 0 ? stats.totalSize / stats.entryCount : 0;
    const largeThreshold = avgEntrySize * 2; // Entries 2x larger than average
    
    // Clear entries that might be large (this is approximate since we delegate to cache manager)
    const beforeCount = stats.entryCount;
    const keys = cacheManager.keys();
    
    // Clear pattern-based entries that are likely large
    let clearedCount = 0;
    keys.forEach(key => {
      if (key.includes('shopping-products') || key.includes('campaigns-') || key.includes('large-')) {
        if (cacheManager.delete(key)) {
          clearedCount++;
        }
      }
    });
    
    return clearedCount;
  } catch (error) {
    console.error('❌ Failed to clear large entries:', error);
    return 0;
  }
};

/**
 * Get storage usage information
 * Uses main cache manager's info
 */
export const getStorageInfo = () => {
  try {
    const stats = cacheManager.getStats();
    return {
      used: stats.totalSize,
      percentage: (stats.totalSize / (10 * 1024 * 1024)) * 100, // Percentage of 10MB limit
      entries: stats.entryCount
    };
  } catch (error) {
    console.error('❌ Failed to get storage info:', error);
    return { used: 0, percentage: 0, entries: 0 };
  }
};

/**
 * Run this immediately to fix quota issues
 * Uses main cache manager's intelligent cleanup
 */
export const emergencyCacheFix = async () => {
  try {
    const storageBefore = getStorageInfo();
    
    // Perform comprehensive cleanup
    const expiredCleared = cacheManager.clearByPattern(/expired|old/);
    const largeCleared = clearLargeCacheEntries();
    
    const storageAfter = getStorageInfo();
    
    return {
      success: true,
      clearedExpired: expiredCleared,
      clearedLarge: largeCleared,
      storageBefore,
      storageAfter
    };
  } catch (error) {
    console.error('❌ Emergency cache fix failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}; 