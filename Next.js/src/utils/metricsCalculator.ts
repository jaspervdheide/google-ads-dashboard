/**
 * Interface for raw Google Ads metrics data
 */
export interface RawMetrics {
  impressions: number;
  clicks: number;
  cost: number; // Already converted from micros
  conversions: number;
  conversionsValue: number;
}

/**
 * Interface for calculated derived metrics
 */
export interface DerivedMetrics extends RawMetrics {
  ctr: number;           // Click-through rate (%)
  avgCpc: number;        // Average cost per click
  conversionRate: number; // Conversion rate (%)
  cpa: number;           // Cost per acquisition
  roas: number;          // Return on ad spend
  poas?: number;         // Percentage of ad spend (ROAS as %)
}

/**
 * Calculates click-through rate as percentage
 * @param clicks - Number of clicks
 * @param impressions - Number of impressions
 * @returns CTR as percentage (0-100)
 */
export const calculateCTR = (clicks: number, impressions: number): number => {
  return impressions > 0 ? (clicks / impressions) * 100 : 0;
};

/**
 * Calculates average cost per click
 * @param cost - Total cost (already converted from micros)
 * @param clicks - Number of clicks
 * @returns Average CPC
 */
export const calculateAvgCPC = (cost: number, clicks: number): number => {
  return clicks > 0 ? cost / clicks : 0;
};

/**
 * Calculates conversion rate as percentage
 * @param conversions - Number of conversions
 * @param clicks - Number of clicks
 * @returns Conversion rate as percentage (0-100)
 */
export const calculateConversionRate = (conversions: number, clicks: number): number => {
  return clicks > 0 ? (conversions / clicks) * 100 : 0;
};

/**
 * Calculates cost per acquisition
 * @param cost - Total cost
 * @param conversions - Number of conversions
 * @returns Cost per acquisition
 */
export const calculateCPA = (cost: number, conversions: number): number => {
  return conversions > 0 ? cost / conversions : 0;
};

/**
 * Calculates return on ad spend
 * @param conversionsValue - Total conversion value
 * @param cost - Total cost
 * @returns ROAS ratio
 */
export const calculateROAS = (conversionsValue: number, cost: number): number => {
  return cost > 0 ? conversionsValue / cost : 0;
};

/**
 * Calculates ROAS as percentage (POAS)
 * @param conversionsValue - Total conversion value
 * @param cost - Total cost
 * @returns POAS as percentage
 */
export const calculatePOAS = (conversionsValue: number, cost: number): number => {
  return cost > 0 ? (conversionsValue / cost) * 100 : 0;
};

/**
 * Calculates all derived metrics from raw metrics
 * @param rawMetrics - Object with raw metrics data
 * @returns Object with all calculated metrics
 */
export const calculateAllMetrics = (rawMetrics: RawMetrics): DerivedMetrics => {
  const { impressions, clicks, cost, conversions, conversionsValue } = rawMetrics;
  
  return {
    ...rawMetrics,
    ctr: calculateCTR(clicks, impressions),
    avgCpc: calculateAvgCPC(cost, clicks),
    conversionRate: calculateConversionRate(conversions, clicks),
    cpa: calculateCPA(cost, conversions),
    roas: calculateROAS(conversionsValue, cost),
    poas: calculatePOAS(conversionsValue, cost)
  };
};

/**
 * Calculates percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (-100 to infinity)
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) {
    return current > 0 ? 100 : 0; // If previous was 0 and current > 0, show 100% increase
  }
  return ((current - previous) / previous) * 100;
};

/**
 * Aggregates multiple metric objects into totals
 * @param metricsList - Array of metric objects to aggregate
 * @returns Aggregated totals with calculated derived metrics
 */
export const aggregateMetrics = (metricsList: RawMetrics[]): DerivedMetrics => {
  const totals = metricsList.reduce(
    (acc, metrics) => ({
      impressions: acc.impressions + metrics.impressions,
      clicks: acc.clicks + metrics.clicks,
      cost: acc.cost + metrics.cost,
      conversions: acc.conversions + metrics.conversions,
      conversionsValue: acc.conversionsValue + metrics.conversionsValue,
    }),
    { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 }
  );
  
  return calculateAllMetrics(totals);
}; 