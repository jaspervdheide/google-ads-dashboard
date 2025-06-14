/**
 * Formatting utility functions for the Google Ads Dashboard
 * Extracted from the main Dashboard component for better code organization
 */

export const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(Math.round(num));
};

export const formatCurrency = (num: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  }).format(num);
};

export const formatPercentage = (num: number) => {
  return `${num.toFixed(2)}%`;
};

export const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return formatNumber(num);
};

// Calculate POAS (Profit on Ad Spend)
export const calculatePOAS = (conversionsValue: number, cost: number): number => {
  if (cost === 0) return 0;
  // POAS should be calculated as profit margin, assuming 50% profit margin for example
  // For now, let's show ROAS as percentage until we have actual profit data
  const roasPercentage = (conversionsValue / cost) * 100;
  return roasPercentage > 0 ? roasPercentage : 0;
};

// Format KPI values
export const formatKPIValue = (kpiId: string, value: number): string => {
  // Debug: Log the values being formatted
  console.log(`📊 Formatting ${kpiId}:`, value);
  
  switch (kpiId) {
    case 'clicks':
    case 'impressions':
    case 'conversions':
      return formatNumber(value);
    case 'cost':
    case 'conversionsValue':
    case 'avgCpc':
    case 'cpa':
      return formatCurrency(value);
    case 'ctr':
    case 'conversionRate':
      return formatPercentage(value);
    case 'poas':
      // POAS as percentage
      return value > 0 ? `${value.toFixed(1)}%` : '0.0%';
    default:
      return value.toString();
  }
}; 