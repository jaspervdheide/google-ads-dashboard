import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, getApiDateRange } from '../utils/dateHelpers';
import { Campaign, CampaignData } from '../types/campaign';

// Use Campaign interface from types/campaign.ts (imported above)

// Extended Campaign interface with impression share data only
export interface ExtendedCampaign extends Campaign {
  impressionShare?: {
    search_impression_share: number;
    search_absolute_top_impression_share: number;
    search_top_impression_share: number;
    search_budget_lost_impression_share: number;
    search_rank_lost_impression_share: number;
    lost_budget_share: number;
    lost_rank_share: number;
    trend: 'up' | 'down' | 'stable';
    trend_value: number;
    competitive_strength: 'strong' | 'moderate' | 'weak';
  };
}

// Use CampaignData interface from types/campaign.ts (imported above)

interface CampaignDataOptions {
  customerId: string;
  dateRange?: string;
  includeImpressionShare?: boolean;
}

interface ExtendedApiResponse {
  success: boolean;
  message: string;
  data: {
    campaigns: ExtendedCampaign[];
    totals: any;
    dateRange: {
      days: number;
      startDate: string;
      endDate: string;
    };
    customerId: string;
    includeAuctionInsights: boolean;
    includeImpressionShare: boolean;
  };
  error?: string;
}

// Original hook for campaign data with cache-first strategy and KPI percentage changes
const useCampaignData = (
  accountId: string | null, 
  dateRange: DateRange | null, 
  forceRefresh = false,
  includeBiddingStrategy = false
) => {
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [kpiPercentageChanges, setKpiPercentageChanges] = useState<{[key: string]: number}>({});

  const fetchData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange) return;

    try {
      setLoading(true);
      setError('');
      
      const apiDateRange = getApiDateRange(dateRange);
      const cacheKey = `campaigns_${accountId}_${apiDateRange.days}days${includeBiddingStrategy ? '_bidding' : ''}`;
      
      let dataFromCache = false;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        if (cachedData) {
          setData(cachedData);
          dataFromCache = true;
        }
      }
      
      // Fetch fresh data if not from cache
      if (!dataFromCache) {
        const params = new URLSearchParams({
          customerId: accountId,
          dateRange: apiDateRange.days.toString()
        });
        
        if (includeBiddingStrategy) {
          params.append('includeBiddingStrategy', 'true');
        }
        
        const response = await fetch(`/api/campaigns?${params}`);
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
          saveToCache(cacheKey, result.data);
        } else {
          setError(result.message || 'Failed to fetch campaign data');
          return; // Don't fetch KPI comparison if main data failed
        }
      }
      
      // Always fetch KPI percentage changes (whether data was cached or fresh)
      try {
        const comparisonResponse = await fetch(`/api/kpi-comparison?customerId=${accountId}&dateRange=${apiDateRange.days}`);
        const comparisonResult = await comparisonResponse.json();
        
        if (comparisonResult.success) {
          setKpiPercentageChanges(comparisonResult.data.changes);
        } else {
          setKpiPercentageChanges({});
        }
      } catch (_error) {
        setKpiPercentageChanges({});
      }
    } catch (_err) {
      setError('Error fetching campaign data');
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange, includeBiddingStrategy]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error, kpiPercentageChanges };
};

export default useCampaignData;

// New hook for extended campaign data with auction insights and impression share
export const useExtendedCampaignData = (options: CampaignDataOptions) => {
  const [data, setData] = useState<ExtendedCampaign[]>([]);
  const [totals, setTotals] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    customerId,
    dateRange = '30',
    includeImpressionShare = false
  } = options;

  const fetchData = useCallback(async (skipCache = false) => {
    if (!customerId) return;

    try {
      setError(null);

      // Build cache key
      const cacheKey = `campaigns_extended_${customerId}_${dateRange}days_impressionShare${includeImpressionShare}`;
      
      // Check cache first (30 min TTL) unless forcing refresh
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        
        if (cachedData) {
          setData(cachedData.campaigns || []);
          setTotals(cachedData.totals || null);
          return;
        }
      }
      
      // Cache miss - fetch from API
      setLoading(true);

      const params = new URLSearchParams({
        customerId,
        dateRange,
        includeImpressionShare: includeImpressionShare.toString()
      });

      const response = await fetch(`/api/campaigns?${params}`);
      const result: ExtendedApiResponse = await response.json();

      if (result.success) {
        // Save to cache
        const cacheData = {
          campaigns: result.data.campaigns,
          totals: result.data.totals
        };
        saveToCache(cacheKey, cacheData);
        
        setData(result.data.campaigns);
        setTotals(result.data.totals);
      } else {
        setError(result.error || result.message);
      }
    } catch (err) {
      console.error('Error fetching extended campaign data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign data');
    } finally {
      setLoading(false);
    }
  }, [customerId, dateRange, includeImpressionShare]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    totals,
    loading,
    error,
    refetch
  };
};

// Hook for search impression share data only
export const useSearchImpressionShareData = (customerId: string, dateRange?: string) => {
  return useExtendedCampaignData({
    customerId,
    dateRange,
    includeImpressionShare: true
  });
};

 