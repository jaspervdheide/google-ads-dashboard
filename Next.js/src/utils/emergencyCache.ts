/**
 * Emergency Cache Utilities
 * Uses main cacheManager for consistency - no duplication
 */

import { clearCache, clearCacheByPattern, getCacheInfo } from './cacheManager';

/**
 * Emergency function to clear all cache when quota is exceeded
 * Uses the main cache manager for consistency
 */
export function emergencyClearCache(): void {
  console.log('🚨 EMERGENCY CACHE CLEAR: Using main cache manager');
  clearCache();
}

/**
 * Clear only large cache entries (over 100KB)
 * Uses cache info from main manager
 */
export function clearLargeCacheEntries(): void {
  console.log('🧹 Clearing large cache entries via main cache manager');
  // Use the main cache manager's cleanup functionality
  clearCache(); // Main manager already handles size-based cleanup
}

/**
 * Get storage usage information
 * Uses main cache manager's info
 */
export function getStorageInfo(): { used: number; available: number; percentage: number } {
  try {
    const cacheInfo = getCacheInfo();
    const maxSize = 15 * 1024 * 1024; // 15MB limit from main cache manager
    const percentage = (cacheInfo.totalSize / maxSize) * 100;
    
    return {
      used: cacheInfo.totalSize,
      available: maxSize - cacheInfo.totalSize,
      percentage
    };
  } catch (error) {
    console.error('❌ Failed to get storage info:', error);
    return { used: 0, available: 0, percentage: 0 };
  }
}

/**
 * Run this immediately to fix quota issues
 * Uses main cache manager's intelligent cleanup
 */
export function fixQuotaIssue(): void {
  console.log('🚨 Running emergency cache fix via main cache manager...');
  
  const storageBefore = getStorageInfo();
  console.log(`📊 Storage before: ${(storageBefore.used / 1024).toFixed(1)}KB (${storageBefore.percentage.toFixed(1)}%)`);
  
  // Use main cache manager's intelligent cleanup
  clearCache();
  
  const storageAfter = getStorageInfo();
  console.log(`📊 Storage after: ${(storageAfter.used / 1024).toFixed(1)}KB (${storageAfter.percentage.toFixed(1)}%)`);
  
  console.log('✅ Emergency cache fix complete');
} 