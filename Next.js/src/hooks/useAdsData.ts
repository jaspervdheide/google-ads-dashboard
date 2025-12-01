'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DateRange } from '../types/common';
import { getFromCache, saveToCache } from '../utils/cacheManager';

export interface AdItem {
  id: string;
  name: string;
  type: string;
  status: string;
  adStrength: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  displayPath: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
}

export interface AdsData {
  ads: AdItem[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    cpa: number;
    roas: number;
  };
  adGroupId: string;
  customerId: string;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
}

export interface UseAdsDataReturn {
  data: AdsData | null;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  refetch: () => void;
}

export function useAdsData(
  selectedAccount: string,
  selectedDateRange: DateRange | null,
  adGroupId: string | null,
  deviceFilter: string = 'all'
): UseAdsDataReturn {
  const [data, setData] = useState<AdsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track if we have existing data for refresh indicator
  const hasDataRef = useRef(false);

  // Generate cache key
  const getCacheKey = useCallback(() => {
    const days = selectedDateRange?.days || 30;
    const deviceSuffix = deviceFilter !== 'all' ? `_${deviceFilter}` : '';
    return `ads_${selectedAccount}_${adGroupId}_${days}${deviceSuffix}`;
  }, [selectedAccount, adGroupId, selectedDateRange?.days, deviceFilter]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (!selectedAccount || !adGroupId) {
      setData(null);
      hasDataRef.current = false;
      return;
    }

    const cacheKey = getCacheKey();

    // Check cache first
    const cachedData = getFromCache<AdsData>(cacheKey);
    if (cachedData) {
      setData(cachedData);
      hasDataRef.current = true;
      return;
    }

    const fetchAdsData = async () => {
      // Show refresh indicator if we already have data, otherwise show loading
      if (hasDataRef.current) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          customerId: selectedAccount,
          adGroupId: adGroupId,
          dateRange: (selectedDateRange?.days || 30).toString(),
        });

        if (deviceFilter && deviceFilter !== 'all') {
          params.append('device', deviceFilter);
        }

        const response = await fetch(`/api/ads?${params}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          setData(result.data);
          hasDataRef.current = true;
          // Cache for 1 hour
          saveToCache(cacheKey, result.data, 60 * 60 * 1000);
        } else {
          throw new Error(result.error || 'Failed to fetch ads');
        }
      } catch (err: any) {
        console.error('Error fetching ads data:', err);
        setError(err.message || 'Failed to fetch ads');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchAdsData();
  }, [selectedAccount, adGroupId, selectedDateRange?.days, deviceFilter, getCacheKey]);

  const refetch = useCallback(() => {
    if (selectedAccount && adGroupId) {
      hasDataRef.current = false;
      setData(null);
      // Clear cache for this key to force fresh fetch
      const cacheKey = getCacheKey();
      // The effect will re-run due to data being null
    }
  }, [selectedAccount, adGroupId, getCacheKey]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    refetch
  };
}

export default useAdsData;
