'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductData, GroupedProductData, ProductViewState } from '@/types/products';
import { DateRange } from '@/types';
import { getFromCache, saveToCache } from '@/utils/cacheManager';

interface UseProductDataProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
}

interface ProductDataResponse {
  products: ProductData[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionsValue: number;
    cogsTotal: number;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    roas: number;
    poas: number;
  };
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProductData({ selectedAccount, selectedDateRange }: UseProductDataProps): ProductDataResponse {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [totals, setTotals] = useState<ProductDataResponse['totals']>({
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversionsValue: 0,
    cogsTotal: 0,
    grossProfit: 0,
    netProfit: 0,
    grossMargin: 0,
    netMargin: 0,
    roas: 0,
    poas: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!selectedAccount) {
      setProducts([]);
      return;
    }

    const dateRange = selectedDateRange?.apiDays || 30;
    const cacheKey = `products-${selectedAccount}-${dateRange}`;

    // Check client-side cache
    const cached = getFromCache(cacheKey);
    if (cached) {
      setProducts(cached.products);
      setTotals(cached.totals);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/products?customerId=${selectedAccount}&dateRange=${dateRange}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setTotals(data.data.totals);

        // Cache the response
        saveToCache(cacheKey, data.data, 5 * 60 * 1000); // 5 minutes
      } else {
        throw new Error(data.message || 'Failed to fetch product data');
      }
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedDateRange]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    totals,
    loading,
    error,
    refetch: fetchProducts
  };
}

/**
 * Hook to group product data by various dimensions
 */
export function useGroupedProducts(
  products: ProductData[],
  groupBy: ProductViewState['groupBy']
): GroupedProductData[] {
  return useMemo(() => {
    if (!products.length) return [];

    const groupMap = new Map<string, GroupedProductData>();

    for (const product of products) {
      let groupName: string;

      switch (groupBy) {
        case 'category':
          groupName = product.categoryName || 'Unknown';
          break;
        case 'make':
          groupName = product.make || 'Unknown Make';
          break;
        case 'model':
          groupName = product.makeModel || product.model || 'Unknown Model';
          break;
        case 'material':
          groupName = product.materialName || 'Unknown Material';
          break;
        case 'sku':
        default:
          groupName = product.sku;
          break;
      }

      if (groupMap.has(groupName)) {
        const group = groupMap.get(groupName)!;
        group.itemCount++;
        group.impressions += product.impressions;
        group.clicks += product.clicks;
        group.cost += product.cost;
        group.conversions += product.conversions;
        group.conversionsValue += product.conversionsValue;
        group.cogsTotal += product.cogsTotal;
        group.grossProfit += product.grossProfit;
        group.netProfit += product.netProfit;
      } else {
        groupMap.set(groupName, {
          groupName,
          groupType: groupBy,
          itemCount: 1,
          impressions: product.impressions,
          clicks: product.clicks,
          cost: product.cost,
          conversions: product.conversions,
          conversionsValue: product.conversionsValue,
          ctr: 0,
          avgCpc: 0,
          cogsTotal: product.cogsTotal,
          grossProfit: product.grossProfit,
          netProfit: product.netProfit,
          grossMargin: 0,
          netMargin: 0,
          roas: 0,
          poas: 0
        });
      }
    }

    // Calculate derived metrics for each group
    const groups = Array.from(groupMap.values());
    for (const group of groups) {
      group.ctr = group.impressions > 0 ? (group.clicks / group.impressions) * 100 : 0;
      group.avgCpc = group.clicks > 0 ? group.cost / group.clicks : 0;
      group.grossMargin = group.conversionsValue > 0 ? (group.grossProfit / group.conversionsValue) * 100 : 0;
      group.netMargin = group.conversionsValue > 0 ? (group.netProfit / group.conversionsValue) * 100 : 0;
      group.roas = group.cost > 0 ? group.conversionsValue / group.cost : 0;
      group.poas = group.cost > 0 ? group.grossProfit / group.cost : 0;
    }

    // Sort by revenue descending
    return groups.sort((a, b) => b.conversionsValue - a.conversionsValue);
  }, [products, groupBy]);
}
