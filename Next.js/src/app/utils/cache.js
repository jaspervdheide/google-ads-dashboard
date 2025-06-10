// Simple localStorage cache utility
const CACHE_PREFIX = "kovvar_cache_";

export function saveToCache(key, data) {
  try {
    const cacheEntry = { data: data, timestamp: Date.now() };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
    console.log(`💾 Cached data for key: ${key}`);
  } catch (error) {
    console.error("Failed to save to cache:", error);
  }
}

export function getFromCache(key, maxAgeMinutes) {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) return null;
    const cacheEntry = JSON.parse(cachedItem);
    if (isExpired(key, maxAgeMinutes)) {
      localStorage.removeItem(CACHE_PREFIX + key);
      console.log(`⏰ Cache expired for key: ${key}`);
      return null;
    }
    console.log(`🎯 Cache hit for key: ${key}`);
    return cacheEntry.data;
  } catch (error) {
    console.error("Failed to get from cache:", error);
    return null;
  }
}

export function clearCache() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log("🧹 Cache cleared");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
}

export function isExpired(key, maxAgeMinutes) {
  try {
    const cachedItem = localStorage.getItem(CACHE_PREFIX + key);
    if (!cachedItem) return true;
    const cacheEntry = JSON.parse(cachedItem);
    const now = Date.now();
    const maxAge = maxAgeMinutes * 60 * 1000;
    return (now - cacheEntry.timestamp) > maxAge;
  } catch (error) {
    console.error("Failed to check cache expiry:", error);
    return true;
  }
} 