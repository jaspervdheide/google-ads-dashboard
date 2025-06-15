import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { getApiDateRange } from '../utils';
import { DateRange } from '../types/common';

interface KeywordData {
  keywords: Array<{
    id: string;
    keyword_text: string;
    match_type: 'EXACT' | 'PHRASE' | 'BROAD' | 'SEARCH_TERM';
    type: 'keyword' | 'search_term';
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    cpc: number;
    conversions: number;
    conversions_value: number;
    roas: number;
    quality_score?: number;
    ad_group_name: string;
    campaign_name: string;
    triggering_keyword?: string;
    status: string;
  }>;
  summary: any;
  totalKeywords: number;
}

export function useKeywordData(
  accountId: string,
  dateRange: DateRange,
  forceRefresh: boolean = false,
  dataType: 'keywords' | 'search_terms' | 'both' = 'both'
) {
  const [data, setData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchKeywordData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange) return;

    try {
      setLoading(true);
      setError('');

      const apiDateRange = getApiDateRange(dateRange);
      
      // Build cache key
      const cacheKey = `keywords_${accountId}_${apiDateRange.days}days_${dataType}`;
      console.log('🎯 Keywords Cache check:', { cacheKey, accountId, days: apiDateRange.days, dataType });
      
      // Check cache first (30 min TTL) unless forcing refresh
      if (!skipCache && !forceRefresh) {
        const cachedData = getFromCache(cacheKey, 30);
        
        if (cachedData) {
          console.log('🎯 CACHE HIT - Using cached keywords data');
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      // Cache miss - fetch from API
      console.log('🎯 CACHE MISS - Fetching keywords from API');
      
      const response = await fetch(
        `/api/keywords?customerId=${accountId}&dateRange=${apiDateRange.days}&dataType=${dataType}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch keywords data');
      }
      
      const keywordData: KeywordData = {
        keywords: result.data?.keywords || [],
        summary: result.data?.summary || null,
        totalKeywords: result.data?.keywords?.length || 0
      };
      
      // Save to cache
      saveToCache(cacheKey, keywordData);
      console.log('💾 Saved keywords to cache successfully', { cacheKey });
      
      setData(keywordData);
      
      console.log(`📊 Keywords loaded from API:`, {
        dataType,
        totalItems: keywordData.keywords.length,
        summary: keywordData.summary
      });
      
    } catch (err) {
      console.error('Error fetching keyword data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch keyword data');
    } finally {
      setLoading(false);
    }
  }, [accountId, dateRange, dataType]);

  useEffect(() => {
    fetchKeywordData(forceRefresh);
  }, [fetchKeywordData, forceRefresh]);

  const refetch = useCallback(() => fetchKeywordData(true), [fetchKeywordData]);

  return { data, loading, error, refetch };
} 