import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, getApiDateRange } from '../utils/dateHelpers';

// Custom hook for historical data with cache-first strategy
const useHistoricalData = (
  accountId: string | null, 
  dateRange: DateRange | null, 
  forceRefresh = false
) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange) return;

    try {
      setLoading(true);
      setError('');
      
      const apiDateRange = getApiDateRange(dateRange);
      // Use a more stable cache key based on actual date values
      const cacheKey = `historical_${accountId}_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`/api/historical-data?customerId=${accountId}&dateRange=${apiDateRange.days}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        saveToCache(cacheKey, result.data);
      } else {
        setError(result.message || 'Failed to fetch historical data');
        setData([]);
      }
    } catch (_err) {
      setError('Error fetching historical data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange?.id, dateRange?.startDate?.getTime(), dateRange?.endDate?.getTime()]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error };
};

export default useHistoricalData; 