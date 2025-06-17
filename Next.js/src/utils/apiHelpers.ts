// Shared API utilities to eliminate DRY violations across API routes

// Unified country account mapping (consolidating duplicates from accounts/route.ts and anomalies/route.ts)
export const COUNTRY_ACCOUNTS = {
  // From accounts/route.ts (more complete mapping)
  "NL": "5756290882",
  "BE": "5735473691", 
  "DE": "1946606314",
  "DK": "8921136631",
  "ES": "4748902087",
  "FI": "8470338623",
  "FR (Ravann)": "2846016798",
  "FR (Tapis)": "7539242704",
  "IT": "8472162607",
  "NO": "3581636329",
  "PL": "8467590750",
  "SE": "8463558543",
  // Additional mappings from anomalies/route.ts for compatibility
  "Netherlands": "5756290882", // Maps to NL
  "Belgium": "5735473691",     // Maps to BE
  "Germany": "1946606314",     // Maps to DE
  "France": "2846016798",      // Maps to FR (Ravann)
  "Spain": "4748902087",       // Maps to ES
  "Italy": "8472162607",       // Maps to IT
  "United Kingdom": "9999999999", // From anomalies (placeholder)
  "Poland": "8467590750",      // Maps to PL
  "Czech Republic": "2222222222", // From anomalies (placeholder)
  "Austria": "3333333333"      // From anomalies (placeholder)
} as const;

// Helper to get country code from customer ID
export const getCountryCodeFromCustomerId = (customerId: string): string => {
  return Object.keys(COUNTRY_ACCOUNTS).find(
    key => COUNTRY_ACCOUNTS[key as keyof typeof COUNTRY_ACCOUNTS] === customerId
  ) || 'Unknown';
};

// Shared metrics calculation functions (consolidating duplicate logic)
export interface RawMetrics {
  impressions: number;
  clicks: number;
  cost: number; // Already converted from micros
  conversions: number;
  conversionsValue: number;
}

export interface DerivedMetrics extends RawMetrics {
  ctr: number;
  avgCpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
}

export const calculateDerivedMetrics = (metrics: RawMetrics): DerivedMetrics => {
  return {
    ...metrics,
    ctr: metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0,
    avgCpc: metrics.clicks > 0 ? metrics.cost / metrics.clicks : 0,
    conversionRate: metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0,
    cpa: metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0,
    roas: metrics.cost > 0 ? metrics.conversionsValue / metrics.cost : 0
  };
};

// Convert cost from micros to currency (consolidating duplicate conversions)
export const convertCostFromMicros = (costMicros: number): number => {
  return costMicros / 1_000_000;
};

// Generic data aggregation helper (consolidating Map-based aggregation patterns)
export const aggregateDataByKey = <T, K extends string | number>(
  data: T[],
  keyExtractor: (item: T) => K,
  aggregator: (existing: any, current: T) => any,
  initializer: (item: T) => any
): Map<K, any> => {
  const aggregationMap = new Map<K, any>();
  
  data.forEach((item) => {
    const key = keyExtractor(item);
    
    if (aggregationMap.has(key)) {
      const existing = aggregationMap.get(key);
      aggregationMap.set(key, aggregator(existing, item));
    } else {
      aggregationMap.set(key, initializer(item));
    }
  });
  
  return aggregationMap;
};

// Summary statistics helper (consolidating duplicate summary calculations)
export const calculateSummaryStatistics = (data: any[], metricFields: string[]) => {
  const totals: any = {};
  
  // Initialize totals
  metricFields.forEach(field => {
    totals[field] = 0;
  });
  
  // Sum all metrics
  data.forEach(item => {
    metricFields.forEach(field => {
      totals[field] += item[field] || 0;
    });
  });
  
  // Calculate derived metrics
  const derivedMetrics = calculateDerivedMetrics({
    impressions: totals.impressions || 0,
    clicks: totals.clicks || 0,
    cost: totals.cost || 0,
    conversions: totals.conversions || 0,
    conversionsValue: totals.conversionsValue || 0
  });
  
  return { ...totals, ...derivedMetrics };
};

// Zero-performance statistics (consolidating duplicate zero-stats calculations)
export const calculateZeroPerformanceStats = (data: any[]) => {
  const zeroClicks = data.filter(item => item.clicks === 0);
  const zeroConversions = data.filter(item => item.conversions === 0);
  
  return {
    zero_clicks_count: zeroClicks.length,
    zero_clicks_percentage: data.length > 0 ? (zeroClicks.length / data.length) * 100 : 0,
    zero_conversions_count: zeroConversions.length,
    zero_conversions_percentage: data.length > 0 ? (zeroConversions.length / data.length) * 100 : 0
  };
}; 