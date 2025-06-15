import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { DateRange, formatDateForAPI, getApiDateRange } from '../utils/dateHelpers';

// Required interfaces
export interface Campaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate: number;
  cpa: number;
  roas: number;
}

export interface CampaignData {
  campaigns: Campaign[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}



// Custom hook for campaign data with cache-first strategy and KPI percentage changes
const useCampaignData = (
  accountId: string | null, 
  dateRange: DateRange | null, 
  forceRefresh = false
) => {
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [kpiPercentageChanges, setKpiPercentageChanges] = useState<{[key: string]: number}>({});



  const fetchData = useCallback(async (skipCache = false) => {
    console.log("🎯 useCampaignData.fetchData called");
    if (!accountId || !dateRange) return;

    try {
      setLoading(true);
      setError('');
      
      const apiDateRange = getApiDateRange(dateRange);
      const cacheKey = `campaigns_${accountId}_${apiDateRange.days}days`;
      
      let dataFromCache = false;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        if (cachedData) {
          console.log("🎯 CACHE HIT - Using cached campaigns data");
          setData(cachedData);
          dataFromCache = true;
        }
      }
      
      // Fetch fresh data if not from cache
      if (!dataFromCache) {
        console.log("🎯 CACHE MISS - Fetching from API");
        const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=${apiDateRange.days}`);
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
        console.log('🔍 Fetching KPI comparison for:', accountId, 'days:', apiDateRange.days);
        const comparisonResponse = await fetch(`/api/kpi-comparison?customerId=${accountId}&dateRange=${apiDateRange.days}`);
        const comparisonResult = await comparisonResponse.json();
        
        console.log('📊 KPI Comparison Response:', comparisonResult);
        
                  if (comparisonResult.success) {
            console.log('✅ Setting KPI percentage changes:', comparisonResult.data.changes);
            setKpiPercentageChanges(comparisonResult.data.changes);
          } else {
            console.error('❌ KPI comparison failed:', comparisonResult.message);
            // Don't set mock data - leave empty object to show no changes
            setKpiPercentageChanges({});
          }
        } catch (error) {
          console.error('Error fetching KPI comparison:', error);
          // Don't set mock data - leave empty object to show no changes
          setKpiPercentageChanges({});
        }
    } catch (err) {
      setError('Error fetching campaign data');
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange]);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error, kpiPercentageChanges };
};

export default useCampaignData; 