'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { DateRange } from '@/types/common';

// Keyword data for dashboard drill-down (original hook)
interface KeywordInfo {
  id: string;
  text: string;
  matchType: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  ctr: number;
  avgCpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
}

interface KeywordApiResponse {
  keywords: KeywordInfo[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
  };
}

// Original useKeywordData hook (for dashboard drill-down)
export function useKeywordData(
  selectedAccount: string | null, 
  dateRange: DateRange | null, 
  _skipFetch: boolean = false
) {
  const [data, setData] = useState<KeywordApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!selectedAccount || _skipFetch) {
      setData(null);
      return;
    }

    const days = dateRange?.apiDays || 30;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/keywords-dashboard?customerId=${selectedAccount}&dateRange=${days}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch keywords');
      }

      const result = await response.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err: any) {
      console.error('Error fetching keyword data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, dateRange, _skipFetch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}

// ========================
// Keywords View Hook (for Keywords insights page)
// ========================

import { KeywordData, MarketShareKeyword } from '@/types/keywords';

interface UseKeywordsViewDataProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
}

interface KeywordTotals {
  totalKeywords: number;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  avgSearchImpressionShare: number;
  totalEstimatedSearchVolume: number;
  totalMissedImpressions: number;
}

interface KeywordTrends {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
}

interface MarketShareTotals {
  keywordCount: number;
  totalImpressions: number;
  estimatedSearchVolume: number;
  missedImpressions: number;
  avgImpressionShare: number;
  marketSharePercentage: number;
}

interface MarketShareData {
  keywords: MarketShareKeyword[];
  totals: MarketShareTotals;
}

interface KeywordsViewDataResponse {
  keywords: KeywordData[];
  totals: KeywordTotals;
  trends: KeywordTrends;
  marketShare: MarketShareData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useKeywordsViewData({ selectedAccount, selectedDateRange }: UseKeywordsViewDataProps): KeywordsViewDataResponse {
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [totals, setTotals] = useState<KeywordTotals>({
    totalKeywords: 0,
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversionsValue: 0,
    avgSearchImpressionShare: 0,
    totalEstimatedSearchVolume: 0,
    totalMissedImpressions: 0
  });
  const [trends, setTrends] = useState<KeywordTrends>({
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversionsValue: 0
  });
  const [marketShare, setMarketShare] = useState<MarketShareData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKeywords = useCallback(async () => {
    if (!selectedAccount) {
      setKeywords([]);
      return;
    }

    const dateRange = selectedDateRange?.apiDays || 30;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/keywords?customerId=${selectedAccount}&dateRange=${dateRange}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch keywords: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setKeywords(data.data.keywords);
        setTotals(data.data.totals);
        setTrends(data.data.trends || { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 });
        setMarketShare(data.data.marketShare || null);
      } else {
        throw new Error(data.message || 'Failed to fetch keyword data');
      }
    } catch (err: any) {
      console.error('Error fetching keywords:', err);
      setError(err.message);
      setKeywords([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedDateRange]);

  useEffect(() => {
    fetchKeywords();
  }, [fetchKeywords]);

  return {
    keywords,
    totals,
    trends,
    marketShare,
    loading,
    error,
    refetch: fetchKeywords
  };
}
