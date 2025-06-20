import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, getApiDateRange } from '../utils/dateHelpers';

// Custom hook for historical data with cache-first strategy
const useHistoricalData = (
  accountId: string | null, 
  dateRange: DateRange | null, 
  forceRefresh = false,
  campaignId?: string | null,
  adGroupId?: string | null,
  keywordId?: string | null
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
      
      // Build cache key based on all parameters
      let cacheKey = `historical_${accountId}_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      if (campaignId) cacheKey += `_campaign_${campaignId}`;
      if (adGroupId) cacheKey += `_adgroup_${adGroupId}`;
      if (keywordId) cacheKey += `_keyword_${keywordId}`;
      
      if (!skipCache) {
        const cachedData = getFromCache<any>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      // Build API URL with optional parameters
      let apiUrl = `/api/historical-data?customerId=${accountId}&dateRange=${apiDateRange.days}`;
      if (campaignId) apiUrl += `&campaignId=${campaignId}`;
      if (adGroupId) apiUrl += `&adGroupId=${adGroupId}`;
      if (keywordId) apiUrl += `&keywordId=${keywordId}`;
      
      const response = await fetch(apiUrl);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        saveToCache(cacheKey, result.data, 30 * 60 * 1000);
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
  }, [accountId, dateRange?.id, dateRange?.startDate?.getTime(), dateRange?.endDate?.getTime(), campaignId, adGroupId, keywordId]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error };
};

export default useHistoricalData; 