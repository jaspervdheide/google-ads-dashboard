/**
 * Shared data fetching hook with cache-first strategy
 * Eliminates duplicate cache logic across multiple hooks
 */

import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { getApiDateRange } from '../utils/dateHelpers';
import { DateRange } from '../types/common';

// Generic API response interface
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error?: string;
}

// Generic hook options
interface UseApiDataOptions {
  endpoint: string;
  cacheKeyPrefix: string;
  cacheTTL?: number;
  params?: Record<string, string | number | boolean>;
  enabled?: boolean;
  forceRefresh?: boolean;
}

// Generic hook result
interface UseApiDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

/**
 * Unified data fetching hook with cache-first strategy
 * Eliminates DRY violations across campaign, ad group, and keyword hooks
 */
export function useApiData<T>(
  accountId: string | null,
  dateRange: DateRange | null,
  options: UseApiDataOptions
): UseApiDataResult<T> {
  const {
    endpoint,
    cacheKeyPrefix,
    cacheTTL = 30 * 60 * 1000, // 30 minutes default
    params = {},
    enabled = true,
    forceRefresh = false
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange || !enabled) return;

    try {
      setLoading(true);
      setError('');

      const apiDateRange = getApiDateRange(dateRange);
      
      // Build consistent cache key
      const cacheKey = `${cacheKeyPrefix}_${accountId}_${apiDateRange.startDate}_${apiDateRange.endDate}${
        Object.keys(params).length > 0 
          ? '_' + Object.entries(params).map(([k, v]) => `${k}_${v}`).join('_')
          : ''
      }`;

      // Check cache first (unless forcing refresh)
      if (!skipCache && !forceRefresh) {
        const cachedData = getFromCache<T>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }

      // Build API URL with parameters
      const urlParams = new URLSearchParams({
        customerId: accountId,
        dateRange: apiDateRange.days.toString(),
        ...Object.fromEntries(
          Object.entries(params).map(([k, v]) => [k, v.toString()])
        )
      });

      const response = await fetch(`${endpoint}?${urlParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<T> = await response.json();

      if (result.success) {
        // Save to cache
        saveToCache(cacheKey, result.data, cacheTTL);
        setData(result.data);
      } else {
        setError(result.message || 'Failed to fetch data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [
    accountId,
    dateRange?.id,
    dateRange?.startDate?.getTime(),
    dateRange?.endDate?.getTime(),
    endpoint,
    cacheKeyPrefix,
    cacheTTL,
    JSON.stringify(params), // Stable dependency
    enabled,
    forceRefresh
  ]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Specialized hook for campaign data
 */
export function useCampaignApiData(
  accountId: string | null,
  dateRange: DateRange | null,
  options: { 
    forceRefresh?: boolean;
    includeBiddingStrategy?: boolean;
    includeImpressionShare?: boolean;
  } = {}
) {
  return useApiData(accountId, dateRange, {
    endpoint: '/api/campaigns',
    cacheKeyPrefix: 'campaigns',
    params: {
      ...(options.includeBiddingStrategy && { includeBiddingStrategy: true }),
      ...(options.includeImpressionShare && { includeImpressionShare: true })
    },
    forceRefresh: options.forceRefresh
  });
}

/**
 * Specialized hook for ad group data
 */
export function useAdGroupApiData(
  accountId: string | null,
  dateRange: DateRange | null,
  options: {
    forceRefresh?: boolean;
    groupType?: 'all' | 'traditional' | 'asset';
  } = {}
) {
  return useApiData(accountId, dateRange, {
    endpoint: '/api/ad-groups',
    cacheKeyPrefix: 'adgroups',
    params: {
      groupType: options.groupType || 'all'
    },
    forceRefresh: options.forceRefresh
  });
}

/**
 * Specialized hook for keyword data
 */
export function useKeywordApiData(
  accountId: string | null,
  dateRange: DateRange | null,
  options: {
    forceRefresh?: boolean;
    dataType?: 'keywords' | 'search_terms' | 'both';
  } = {}
) {
  return useApiData(accountId, dateRange, {
    endpoint: '/api/keywords',
    cacheKeyPrefix: 'keywords',
    params: {
      dataType: options.dataType || 'both'
    },
    forceRefresh: options.forceRefresh
  });
} 