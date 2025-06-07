// Simple localStorage cache utility
const CACHE_PREFIX = 'kovvar_cache_';

/**
 * Save data to localStorage with timestamp
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 */
export function saveToCache(key, data) {
  try {
    const cacheEntry = {
      data: data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
    console.log(`💾 Cached data for key: ${key}`);
  } catch (error) {
    console.error('Failed to save to cache:', error);
  }
}

/**
 * Get data from localStorage if not expired
 * @param {string} key - Cache key
 * @param {number} maxAgeMinutes - Maximum age in minutes
 * @returns {any|null} - Cached data or null if expired/not found
 */
export function getFromCache(key, maxAgeMinutes) {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) {
      return null;
    }

    const cacheEntry = JSON.parse(cachedItem);
    
    if (isExpired(key, maxAgeMinutes)) {
      localStorage.removeItem(CACHE_PREFIX + key);
      console.log(`⏰ Cache expired for key: ${key}`);
      return null;
    }

    console.log(`🎯 Cache hit for key: ${key}`);
    return cacheEntry.data;
  } catch (error) {
    console.error('Failed to get from cache:', error);
    return null;
  }
}

/**
 * Clear all cached data
 */
export function clearCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('🧹 Cache cleared');
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Check if cache entry is expired
 * @param {string} key - Cache key
 * @param {number} maxAgeMinutes - Maximum age in minutes
 * @returns {boolean} - True if expired or not found
 */
export function isExpired(key, maxAgeMinutes) {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) {
      return true;
    }

    const cacheEntry = JSON.parse(cachedItem);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000; // Convert minutes to milliseconds
    
    return (now - cacheEntry.timestamp) > maxAge;
  } catch (error) {
    console.error('Failed to check cache expiry:', error);
    return true;
  }
} 