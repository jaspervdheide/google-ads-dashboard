import { useState, useEffect, useCallback, useRef } from 'react';
import { MccOverviewData } from '@/types/mcc';
import { getFromCache, saveToCache } from '@/utils/cacheManager';
import { DateRange, getApiDateRange } from '@/utils/dateHelpers';

interface UseMccOverviewDataResult {
  data: MccOverviewData | null;
  loading: boolean;
  error: string;
  refetch: () => void;
  retryCount: number;
}

export function useMccOverviewData(selectedDateRange: DateRange | null): UseMccOverviewDataResult {
  const [data, setData] = useState<MccOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchMccData = useCallback(async (skipCache = false, currentRetry = 0) => {
    if (!selectedDateRange) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiDateRange = getApiDateRange(selectedDateRange);

      // Build cache key with dynamic date range
      const cacheKey = `mcc_overview_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      const cacheTTL = 30 * 60 * 1000; // 30 minutes cache

      // Check cache first (unless forcing refresh)
      if (!skipCache && currentRetry === 0) {
        const cachedData = getFromCache<MccOverviewData>(cacheKey);
        if (cachedData) {
          console.log("📦 USING CACHED MCC OVERVIEW DATA");
          setData(cachedData);
          setLoading(false);
          setRetryCount(0);
          return;
        }
      }

      console.log(`🔄 FETCHING MCC OVERVIEW DATA (attempt ${currentRetry + 1}) for ${apiDateRange.days} days`);

      // Fetch from API with timeout and date range parameter
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/mcc-overview?dateRange=${apiDateRange.days}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        // Save to cache
        saveToCache(cacheKey, result.data, cacheTTL);
        setData(result.data);
        setRetryCount(0);
        console.log("✅ MCC OVERVIEW DATA FETCHED SUCCESSFULLY");
      } else {
        throw new Error(result.message || 'Failed to fetch MCC overview data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch MCC overview data';
      
      // Retry logic with exponential backoff
      const maxRetries = 3;
      if (currentRetry < maxRetries && !errorMessage.includes('abort')) {
        const retryDelay = Math.pow(2, currentRetry) * 1000; // 1s, 2s, 4s
        console.log(`⚠️ MCC OVERVIEW FETCH FAILED (attempt ${currentRetry + 1}), retrying in ${retryDelay}ms:`, errorMessage);
        
        setRetryCount(currentRetry + 1);
        
        retryTimeoutRef.current = setTimeout(() => {
          fetchMccData(skipCache, currentRetry + 1);
        }, retryDelay);
        
        return;
      }
      
      setError(errorMessage);
      setRetryCount(currentRetry);
      console.error('❌ MCC OVERVIEW FETCH FAILED (final):', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDateRange]);

  const refetch = useCallback(() => {
    console.log("🔄 REFRESHING MCC OVERVIEW DATA");
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setRetryCount(0);
    fetchMccData(true, 0);
  }, [fetchMccData]);

  // Initial data fetch and re-fetch when date range changes
  useEffect(() => {
    fetchMccData(false, 0);
    
    // Cleanup timeout on unmount
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [fetchMccData]);

  return {
    data,
    loading,
    error,
    refetch,
    retryCount
  };
} 