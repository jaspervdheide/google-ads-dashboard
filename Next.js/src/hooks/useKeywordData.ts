import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { KeywordData } from '../types';

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
      
      // Check cache first (30 min TTL) unless forcing refresh
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 30);
        
        if (cachedData) {
          setData(cachedData);
          return;
        }
      }
      
      // Cache miss - fetch from API
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
        dateRange: result.data?.dateRange || { days, startDate: '', endDate: '' },
        customerId: result.data?.customerId || accountId
      };
      
      // Save to cache
      saveToCache(cacheKey, keywordData);
      setData(keywordData);
      
    } catch (err) {
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