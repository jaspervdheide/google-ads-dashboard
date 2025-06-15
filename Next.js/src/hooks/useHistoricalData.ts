import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, formatDateForAPI, getApiDateRange } from '../utils/dateHelpers';



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
    console.log("🎯 useHistoricalData.fetchData called");
    if (!accountId || !dateRange) return;

    try {
      setLoading(true);
      setError('');
      
      const apiDateRange = getApiDateRange(dateRange);
      const cacheKey = `historical_${accountId}_${apiDateRange.days}days`;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        if (cachedData) {
          console.log("🎯 CACHE HIT - Using cached historical data");
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      console.log("🎯 CACHE MISS - Fetching historical data from API");
      const response = await fetch(`/api/historical-data?customerId=${accountId}&dateRange=${apiDateRange.days}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('📊 Historical Data Fetched:', result.data);
        setData(result.data);
        saveToCache(cacheKey, result.data);
      } else {
        console.error('Failed to fetch historical data:', result.message);
        setError(result.message || 'Failed to fetch historical data');
        setData([]);
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Error fetching historical data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error };
};

export default useHistoricalData; 