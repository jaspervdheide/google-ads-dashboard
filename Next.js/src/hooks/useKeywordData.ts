import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';

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
  dateRange: string = '30',
  forceRefresh: boolean = false,
  dataType: 'keywords' | 'search_terms' | 'both' = 'both'
) {
  const [data, setData] = useState<KeywordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchKeywordData = useCallback(async (skipCache = false) => {
    if (!accountId || !dateRange) return;

    try {
      setError('');

      // Build cache key using simple dateRange string (same pattern as other hooks)
      const days = parseInt(dateRange) || 30;
      
      // Build cache key
      const cacheKey = `keywords_${accountId}_${days}days_${dataType}`;
      console.log('🎯 Keywords Cache check:', { cacheKey, accountId, days, dataType });
      
      // Check cache first (30 min TTL) unless forcing refresh
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        
        if (cachedData) {
          console.log('🎯 CACHE HIT - Using cached keywords data (no loading state)');
          setData(cachedData);
          // Don't set loading to false here since we never set it to true for cache hits
          return;
        }
      }
      
      // Cache miss - fetch from API (only now set loading to true)
      console.log('🎯 CACHE MISS - Fetching keywords from API');
      setLoading(true);
      
      const response = await fetch(
        `/api/keywords?customerId=${accountId}&dateRange=${days}&dataType=${dataType}`
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
  }, [accountId, dateRange, dataType, forceRefresh]);

  useEffect(() => {
    fetchKeywordData();
  }, [fetchKeywordData]);

  const refetch = useCallback(() => fetchKeywordData(true), [fetchKeywordData]);

  return { data, loading, error, refetch };
} 