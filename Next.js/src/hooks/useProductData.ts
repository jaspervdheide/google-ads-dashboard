import { useState, useEffect, useCallback } from 'react';
import { DateRange } from '../types';
import { getFromCache, saveToCache } from '../utils/cacheManager';
import { getApiDateRange } from '../utils/dateHelpers';

export interface ShoppingProduct {
  id: string;
  itemId: string;
  productTypeLevel2: string; // Material
  productTypeLevel3: string; // Make
  productTypeLevel4: string; // Model
  productTypeLevel5: string; // Type
  price: number;
  campaignId: string;
  campaignName: string;
  campaignType: number; // 4 = Shopping, 13 = Performance Max
  campaignTypeDisplay: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  leadCostOfGoodsSold: number;
  ctr: number;
  avgCpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  poas: number; // Profit on Ad Spend
}

export interface ProductDataResponse {
  products: ShoppingProduct[];
  totals: {
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
    totalLeadCogs: number;
    averagePoas: number;
  };
  statistics: {
    total: number;
    shopping: number;
    performanceMax: number;
  };
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

interface UseProductDataResult {
  data: ProductDataResponse | null;
  loading: boolean;
  error: string;
  refetch: () => void;
}

export const useProductData = (
  selectedAccount: string | null,
  selectedDateRange: DateRange | null,
  refreshTrigger?: boolean
): UseProductDataResult => {
  const [data, setData] = useState<ProductDataResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchProductData = useCallback(async () => {
    if (!selectedAccount || !selectedDateRange) {
      setData(null);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const apiDateRange = getApiDateRange(selectedDateRange);
      
      // Build cache key with stable date values
      const cacheKey = `products_${selectedAccount}_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      
      // Check cache first
      const cachedData = getFromCache<ProductDataResponse>(cacheKey);
      
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }
      
      console.log(`🛍️ Fetching shopping products for account ${selectedAccount} with ${apiDateRange.days} days range...`);
      
      // Cache miss - fetch from API
      const response = await fetch(
        `/api/shopping-products?customerId=${selectedAccount}&dateRange=${apiDateRange.days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`✅ Successfully loaded ${result.data.products.length} shopping products`);
        
        // Save to cache with 30 minute TTL
        saveToCache(cacheKey, result.data, 30 * 60 * 1000);
        
        setData(result.data);
      } else {
        const errorMessage = result.message || 'Failed to fetch shopping products';
        console.error('Failed to fetch shopping products:', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching shopping products';
      console.error('Error fetching shopping products:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedDateRange?.id, selectedDateRange?.startDate?.getTime(), selectedDateRange?.endDate?.getTime()]);

  const refetch = useCallback(() => {
    if (selectedAccount && selectedDateRange) {
      const apiDateRange = getApiDateRange(selectedDateRange);
      const cacheKey = `products_${selectedAccount}_${apiDateRange.startDate}_${apiDateRange.endDate}`;
      
      // Clear cache for this key to force fresh fetch
      import('../utils/cacheManager').then(({ cacheManager }) => {
        cacheManager.delete(cacheKey);
      });
      
      fetchProductData();
    }
  }, [fetchProductData, selectedAccount, selectedDateRange?.id, selectedDateRange?.startDate?.getTime(), selectedDateRange?.endDate?.getTime()]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData, refreshTrigger]);

  return {
    data,
    loading,
    error,
    refetch
  };
}; 