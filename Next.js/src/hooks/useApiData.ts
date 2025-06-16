/**
 * Shared data fetching hook with cache-first strategy
 * Eliminates duplicate cache logic across multiple hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';

interface UseApiDataOptions {
  cacheKey: string;
  apiUrl: string;
  cacheTTL?: number; // Cache TTL in minutes
  enabled?: boolean; // Whether to fetch data
  transform?: (data: any) => any; // Optional data transformation
}

interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

export function useApiData<T = any>({
  cacheKey,
  apiUrl,
  cacheTTL = 30,
  enabled = true,
  transform
}: UseApiDataOptions): UseApiDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    if (!enabled || !cacheKey || !apiUrl) return;

    try {
      setError('');

      // Check cache first unless forcing refresh
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, cacheTTL);
        if (cachedData) {
          setData(transform ? transform(cachedData) : cachedData);
          return;
        }
      }

      // Cache miss - fetch from API
      setLoading(true);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'API request failed');
      }
      
      const processedData = transform ? transform(result.data) : result.data;
      
      // Save to cache
      saveToCache(cacheKey, result.data);
      setData(processedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [cacheKey, apiUrl, cacheTTL, enabled, transform]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
} 