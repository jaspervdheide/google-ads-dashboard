import { useState, useEffect, useCallback } from 'react';
import { getFromCache, saveToCache } from '../utils/cacheManager';

// Required interfaces
export interface Anomaly {
  id: string;
  accountId: string;
  accountName: string;
  countryCode: string;
  severity: 'high' | 'medium' | 'low';
  type: 'business' | 'statistical';
  category: string;
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  detectedAt: string;
}

export interface AnomalyData {
  anomalies: Anomaly[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

// Custom hook for anomaly data with cache-first strategy
const useAnomalyData = (forceRefresh = false) => {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchData = useCallback(async (skipCache = false) => {
    console.log("🎯 useAnomalyData.fetchData called");
    
    try {
      setLoading(true);
      setError('');
      
      const cacheKey = `anomalies_global`;
      
      if (!skipCache) {
        const cachedData = getFromCache(cacheKey, 5); // 5 min TTL for anomalies (fresher data)
        if (cachedData) {
          console.log("🎯 CACHE HIT - Using cached anomaly data");
          setData(cachedData);
          setLoading(false);
          return;
        }
      }
      
      console.log("🎯 CACHE MISS - Fetching anomalies from API");
      const response = await fetch('/api/anomalies');
      const result = await response.json();
      
      console.log("🔍 Anomalies API Response:", {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : null,
        anomaliesCount: result.data?.anomalies?.length || 0
      });
      
      if (response.ok && result.success && result.data) {
        // The API now returns { success: true, data: { anomalies: [...], summary: {...} } }
        setData(result.data);
        saveToCache(cacheKey, result.data);
        console.log("💾 Saved anomalies to cache");
      } else {
        console.error('Failed to fetch anomalies:', result.error || 'Unknown error');
        setError(result.error || 'Failed to fetch anomalies');
      }
    } catch (err) {
      console.error('Error fetching anomalies:', err);
      setError('Error fetching anomalies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(forceRefresh);
  }, [fetchData, forceRefresh]);

  return { data, loading, error };
};

export default useAnomalyData; 