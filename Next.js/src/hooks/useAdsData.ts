'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { DateRange } from '../types/common';

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

  // Fetch data when dependencies change
  useEffect(() => {
    if (!selectedAccount || !adGroupId) {
      setData(null);
      hasDataRef.current = false;
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
          dateRange: selectedDateRange?.days?.toString() || '30',
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
  }, [selectedAccount, adGroupId, selectedDateRange?.days, deviceFilter]);

  const refetch = useCallback(() => {
    if (selectedAccount && adGroupId) {
      hasDataRef.current = false;
      setData(null);
      // Trigger re-fetch by updating a dummy state or just calling the effect
    }
  }, [selectedAccount, adGroupId]);

  return {
    data,
    loading,
    error,
    isRefreshing,
    refetch
  };
}

export default useAdsData;
