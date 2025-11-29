import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, getApiDateRange } from '../utils/dateHelpers';

export type DeviceFilter = 'all' | 'desktop' | 'mobile' | 'tablet';

// Custom hook for historical data with cache-first strategy
const useHistoricalData = (
  accountId: string | null, 
  dateRange: DateRange | null, 
  forceRefresh = false,
  campaignId?: string | null,
  adGroupId?: string | null,
  keywordId?: string | null,
  deviceFilter: DeviceFilter = 'all'
) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange) return;

    try {
      // If we already have data, show refreshing state instead of full loading
      if (data.length > 0) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');
      
      const apiDateRange = getApiDateRange(dateRange);
      
      // Build cache key based on all parameters
      let cacheKey = `historical_${accountId}_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      if (campaignId) cacheKey += `_campaign_${campaignId}`;
      if (adGroupId) cacheKey += `_adgroup_${adGroupId}`;
      if (keywordId) cacheKey += `_keyword_${keywordId}`;
      if (deviceFilter !== 'all') cacheKey += `_device_${deviceFilter}`;
      
      if (!skipCache) {
        const cachedData = getFromCache<any>(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      }
      
      // Build API URL with optional parameters
      let apiUrl = `/api/historical-data?customerId=${accountId}&dateRange=${apiDateRange.days}`;
      if (campaignId) apiUrl += `&campaignId=${campaignId}`;
      if (adGroupId) apiUrl += `&adGroupId=${adGroupId}`;
      if (keywordId) apiUrl += `&keywordId=${keywordId}`;
      if (deviceFilter !== 'all') apiUrl += `&device=${deviceFilter}`;
      
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
      setIsRefreshing(false);
    }
  }, [accountId, dateRange?.id, dateRange?.startDate?.getTime(), dateRange?.endDate?.getTime(), campaignId, adGroupId, keywordId, deviceFilter]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, isRefreshing, error };
};

export default useHistoricalData; 