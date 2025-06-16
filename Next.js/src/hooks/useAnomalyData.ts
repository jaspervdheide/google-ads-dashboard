import { getFromCache, saveToCache } from '../utils/cacheManager';
import { useState, useEffect, useCallback } from 'react';
import { AnomalyData } from '../types';

const useAnomalyData = (
  accountId: string | null,
  dateRange: string = '30',
  forceRefresh = false
) => {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    if (!accountId) return;

    try {
      setLoading(true);
      setError('');
      
      const cacheKey = `anomalies_${accountId}_${dateRange}days`;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 5); // 5 min TTL for anomalies (fresher data)
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      const response = await fetch(`/api/anomalies?customerId=${accountId}&dateRange=${dateRange}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        saveToCache(cacheKey, result.data);
      } else {
        setError(result.message || 'Failed to fetch anomaly data');
        setData(null);
      }
    } catch (_err) {
      setError('Error fetching anomaly data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error };
};

export default useAnomalyData; 