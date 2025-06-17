import { useState, useEffect, useCallback } from 'react';
import { AdGroupData, DateRange } from '../types';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { getApiDateRange } from '../utils/dateHelpers';

interface UseAdGroupDataResult {
  data: AdGroupData | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

interface AdGroupApiResponse {
  success: boolean;
  message: string;
  data: {
    groups: any[];
    totals: any;
    statistics: {
      total: number;
      traditional: number;
      asset: number;
    };
    dateRange: {
      days: number;
      startDate: string;
      endDate: string;
    };
    customerId: string;
    groupType: string;
  };
}

export const useAdGroupData = (
  selectedAccount: string | null,
  selectedDateRange: DateRange | null,
  refreshTrigger?: boolean,
  groupType: 'all' | 'traditional' | 'asset' = 'all'
): UseAdGroupDataResult => {
  const [data, setData] = useState<AdGroupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchAdGroupData = useCallback(async () => {
    if (!selectedAccount || !selectedDateRange) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiDateRange = getApiDateRange(selectedDateRange);
      
      // Build cache key with stable date values
      const cacheKey = `adgroups_${selectedAccount}_${apiDateRange.startDate}_${apiDateRange.endDate}_${groupType}`;
      
      // Check cache first
      const cachedData = getFromCache<AdGroupData>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
      
      // Cache miss - fetch from API
      const response = await fetch(
        `/api/ad-groups?customerId=${selectedAccount}&dateRange=${apiDateRange.days}&groupType=${groupType}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result: AdGroupApiResponse = await response.json();
      
      if (result.success && result.data) {
        // Transform API response to match AdGroupData interface
        const transformedData: AdGroupData = {
          adGroups: result.data.groups.map((group: any) => ({
            id: group.id,
            name: group.name,
            status: group.status,
            campaignId: group.campaignId,
            campaignName: group.campaignName,
            campaignType: group.campaignType,
            groupType: group.groupType,
            impressions: group.impressions || 0,
            clicks: group.clicks || 0,
            cost: group.cost || 0,
            ctr: group.ctr || 0,
            avgCpc: group.avgCpc || 0,
            conversions: group.conversions || 0,
            conversionsValue: group.conversionsValue || 0,
            conversionRate: group.conversionRate || 0,
            cpa: group.cpa || 0,
            roas: group.roas || 0,
            // Performance Max specific fields
            adStrength: group.adStrength,
            assetCoverage: group.assetCoverage,
            // Traditional ad group specific fields
            avgQualityScore: group.avgQualityScore
          })),
          campaignId: 'all',
          dateRange: result.data.dateRange,
          customerId: result.data.customerId
        };
        
        // Save to cache with 30 minute TTL
        saveToCache(cacheKey, transformedData, 30 * 60 * 1000);
        
        setData(transformedData);
      } else {
        const errorMessage = result.message || 'Failed to fetch ad groups data';
        console.error('Failed to fetch ad groups data:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching ad groups data';
      console.error('Error fetching ad groups data:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedDateRange?.id, selectedDateRange?.startDate?.getTime(), selectedDateRange?.endDate?.getTime(), groupType]);

  const refetch = useCallback(() => {
    if (selectedAccount && selectedDateRange) {
      const apiDateRange = getApiDateRange(selectedDateRange);
      const cacheKey = `adgroups_${selectedAccount}_${apiDateRange.startDate}_${apiDateRange.endDate}_${groupType}`;
      
      // Clear cache for this key to force fresh fetch
      localStorage.removeItem(cacheKey);
      
      fetchAdGroupData();
    }
  }, [fetchAdGroupData, selectedAccount, selectedDateRange?.id, selectedDateRange?.startDate?.getTime(), selectedDateRange?.endDate?.getTime(), groupType]);

  useEffect(() => {
    fetchAdGroupData();
  }, [fetchAdGroupData, refreshTrigger]);

  return {
    data,
    loading,
    error,
    refetch
  };
}; 