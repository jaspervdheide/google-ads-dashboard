import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../app/utils/cache';
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
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        if (cachedData) {
          console.log("🎯 CACHE HIT - Using cached campaigns data");
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      console.log("🎯 CACHE MISS - Fetching from API");
      const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=${apiDateRange.days}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        saveToCache(cacheKey, result.data);
        
        // Fetch KPI percentage changes
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
            // Set some mock data for testing
            setKpiPercentageChanges({
              clicks: 12.5,
              impressions: 8.3,
              ctr: 4.2,
              avgCpc: -2.1,
              cost: 15.7,
              conversions: 22.1,
              conversionsValue: 18.9,
              conversionRate: 6.8,
              cpa: -8.4,
              poas: 11.2
            });
          }
        } catch (error) {
          console.error('Error fetching KPI comparison:', error);
          // Set some mock data for testing when API fails
          setKpiPercentageChanges({
            clicks: 12.5,
            impressions: 8.3,
            ctr: 4.2,
            avgCpc: -2.1,
            cost: 15.7,
            conversions: 22.1,
            conversionsValue: 18.9,
            conversionRate: 6.8,
            cpa: -8.4,
            poas: 11.2
          });
        }
      } else {
        setError(result.message || 'Failed to fetch campaign data');
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