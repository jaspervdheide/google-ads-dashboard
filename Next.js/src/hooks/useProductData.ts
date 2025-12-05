'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ProductData, GroupedProductData, ProductViewState } from '@/types/products';
import { DateRange } from '@/types';

// Storage key for ProfitMetrics settings (must match SettingsView)
const PROFIT_METRICS_STORAGE_KEY = 'google-ads-dashboard-profit-metrics-accounts';

// Default ProfitMetrics accounts (fallback)
const DEFAULT_PROFIT_METRICS_ACCOUNTS = [
  '1946606314', // DE - Online Fussmatten
  '7539242704', // FR - Tapis Voiture
  '5756290882', // NL - Just Carpets
];

/**
 * Check if an account uses ProfitMetrics based on localStorage settings
 */
function checkProfitMetricsFromSettings(accountId: string): boolean {
  if (typeof window === 'undefined') {
    // Server-side: use defaults
    return DEFAULT_PROFIT_METRICS_ACCOUNTS.includes(accountId);
  }
  
  try {
    const stored = localStorage.getItem(PROFIT_METRICS_STORAGE_KEY);
    if (stored) {
      const accounts = JSON.parse(stored);
      if (Array.isArray(accounts)) {
        return accounts.includes(accountId);
      }
    }
  } catch (e) {
    console.error('Error reading ProfitMetrics settings:', e);
  }
  
  // Fallback to defaults
  return DEFAULT_PROFIT_METRICS_ACCOUNTS.includes(accountId);
}

interface UseProductDataProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
}

interface ProductTotals {
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  estimatedRevenue: number;
  cogsTotal: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roas: number;
  poas: number;
}

interface ProductTrends {
  conversionsValue: number;
  grossProfit: number;
  netProfit: number;
  poas: number;
  cost: number;
}

interface ProductDataResponse {
  products: ProductData[];
  totals: ProductTotals;
  trends: ProductTrends;
  usesProfitMetrics: boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProductData({ selectedAccount, selectedDateRange }: UseProductDataProps): ProductDataResponse {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [totals, setTotals] = useState<ProductTotals>({
    impressions: 0,
    clicks: 0,
    cost: 0,
    conversions: 0,
    conversionsValue: 0,
    estimatedRevenue: 0,
    cogsTotal: 0,
    grossProfit: 0,
    netProfit: 0,
    grossMargin: 0,
    netMargin: 0,
    roas: 0,
    poas: 0
  });
  const [trends, setTrends] = useState<ProductTrends>({
    conversionsValue: 0,
    grossProfit: 0,
    netProfit: 0,
    poas: 0,
    cost: 0
  });
  const [usesProfitMetrics, setUsesProfitMetrics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!selectedAccount) {
      setProducts([]);
      return;
    }

    const dateRange = selectedDateRange?.apiDays || 30;
    
    // Check localStorage for ProfitMetrics setting
    const isProfitMetrics = checkProfitMetricsFromSettings(selectedAccount);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/products?customerId=${selectedAccount}&dateRange=${dateRange}&profitMetrics=${isProfitMetrics}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setProducts(data.data.products);
        setTotals(data.data.totals);
        setTrends(data.data.trends || { conversionsValue: 0, grossProfit: 0, netProfit: 0, poas: 0, cost: 0 });
        setUsesProfitMetrics(data.data.usesProfitMetrics || false);
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
    trends,
    usesProfitMetrics,
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
  groupBy: ProductViewState['groupBy'],
  usesProfitMetrics: boolean = false
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
        group.estimatedRevenue += product.estimatedRevenue || 0;
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
          estimatedRevenue: product.estimatedRevenue || 0,
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
      
      // Use estimatedRevenue for margin calculations (important for ProfitMetrics accounts)
      const revenueBase = usesProfitMetrics ? group.estimatedRevenue : group.conversionsValue;
      group.grossMargin = revenueBase > 0 ? (group.grossProfit / revenueBase) * 100 : 0;
      group.netMargin = revenueBase > 0 ? (group.netProfit / revenueBase) * 100 : 0;
      group.roas = group.cost > 0 ? revenueBase / group.cost : 0;
      group.poas = group.cost > 0 ? group.grossProfit / group.cost : 0;
    }

    // Sort by revenue/profit descending
    return groups.sort((a, b) => b.conversionsValue - a.conversionsValue);
  }, [products, groupBy, usesProfitMetrics]);
}
