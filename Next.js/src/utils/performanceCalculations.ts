/**
 * Performance calculation utilities
 * Centralizes metric calculations to follow DRY principle
 */

export interface BaseMetrics {
  cost: number;
  conversions: number;
  conversionsValue: number;
  clicks: number;
  impressions: number;
}

export interface CalculatedMetrics extends BaseMetrics {
  cpa: number;
  poas: number;
  roas: number;
  ctr: number;
  avgCpc: number;
}

/**
 * Calculate POAS (Profit on Ad Spend) as percentage
 */
export const calculatePOAS = (conversionsValue: number, cost: number): number => {
  if (cost <= 0) return 0;
  return Math.round((conversionsValue / cost) * 100);
};

/**
 * Calculate ROAS (Return on Ad Spend) as ratio
 */
export const calculateROAS = (conversionsValue: number, cost: number): number => {
  if (cost <= 0) return 0;
  return Math.round((conversionsValue / cost) * 100) / 100;
};

/**
 * Calculate CPA (Cost Per Acquisition)
 */
export const calculateCPA = (cost: number, conversions: number): number => {
  if (conversions <= 0) return 0;
  return Math.round((cost / conversions) * 100) / 100;
};

/**
 * Calculate CTR (Click Through Rate) as percentage
 */
export const calculateCTR = (clicks: number, impressions: number): number => {
  if (impressions <= 0) return 0;
  return Math.round((clicks / impressions) * 10000) / 100; // 2 decimal places
};

/**
 * Calculate Average CPC (Cost Per Click)
 */
export const calculateAvgCPC = (cost: number, clicks: number): number => {
  if (clicks <= 0) return 0;
  return Math.round((cost / clicks) * 100) / 100;
};

/**
 * Calculate all metrics for a given data item
 */
export const calculateAllMetrics = (item: BaseMetrics): CalculatedMetrics => {
  return {
    ...item,
    cpa: calculateCPA(item.cost, item.conversions),
    poas: calculatePOAS(item.conversionsValue, item.cost),
    roas: calculateROAS(item.conversionsValue, item.cost),
    ctr: calculateCTR(item.clicks, item.impressions),
    avgCpc: calculateAvgCPC(item.cost, item.clicks)
  };
};

/**
 * Determine campaign type from campaign name
 */
export const determineCampaignType = (campaignName: string): string => {
  const name = campaignName.toLowerCase();
  if (name.includes('performance max') || name.includes('pmax')) {
    return 'Performance Max';
  } else if (name.includes('shopping') || name.includes('shop')) {
    return 'Shopping';
  } else if (name.includes('search') || name.includes('src')) {
    return 'Search';
  }
  return 'Other';
};

/**
 * Process and sort items by conversions
 */
export const processTopPerformers = <T extends BaseMetrics & { id: string; name: string }>(
  items: T[],
  limit: number = 5
): Array<T & CalculatedMetrics> => {
  return items
    .filter(item => item.conversions > 0 || item.conversionsValue > 0)
    .map(item => ({
      ...item,
      ...calculateAllMetrics(item)
    }))
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, limit);
};

/**
 * Calculate performance quadrant based on averages
 */
export const calculateQuadrant = (
  conversions: number,
  poas: number,
  avgConversions: number,
  avgPOAS: number
): 'Star' | 'Question Mark' | 'Cash Cow' | 'Dog' => {
  if (conversions >= avgConversions && poas >= avgPOAS) return 'Star';
  if (conversions < avgConversions && poas >= avgPOAS) return 'Question Mark';
  if (conversions >= avgConversions && poas < avgPOAS) return 'Cash Cow';
  return 'Dog';
};

/**
 * Calculate dataset averages for matrix analysis
 */
export const calculateAverages = <T extends { conversions: number; poas?: number }>(
  data: T[]
): { avgConversions: number; avgPOAS: number } => {
  if (data.length === 0) return { avgConversions: 0, avgPOAS: 0 };
  
  const avgConversions = data.reduce((sum, item) => sum + item.conversions, 0) / data.length;
  const avgPOAS = data.reduce((sum, item) => sum + (item.poas || 0), 0) / data.length;
  
  return { avgConversions, avgPOAS };
}; 