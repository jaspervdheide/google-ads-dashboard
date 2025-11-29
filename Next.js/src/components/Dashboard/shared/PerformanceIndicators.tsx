import React from 'react';

export type PerformanceLevel = 'high' | 'medium' | 'low';

// Helper function to calculate performance percentiles
export const getPerformanceLevel = (
  value: number, 
  allValues: number[], 
  metricType: string
): PerformanceLevel => {
  if (allValues.length < 3) return 'medium';
  
  // Filter out zero values for better percentile calculation
  const nonZeroValues = allValues.filter(v => v > 0);
  if (nonZeroValues.length === 0) return 'medium';
  
  // Sort values based on whether higher or lower is better
  const isHigherBetter = [
    'clicks', 
    'impressions', 
    'ctr', 
    'conversions', 
    'conversionsValue', 
    'conversionRate', 
    'roas',
    'poas',
    'assetCoverage',
    'avgQualityScore',
    'conversions_value',
    'quality_score'
  ].includes(metricType);
  
  const sortedValues = [...nonZeroValues].sort((a, b) => isHigherBetter ? b - a : a - b);
  
  // If the current value is 0 and we're looking at a "higher is better" metric, it's low performance
  if (value === 0 && isHigherBetter) return 'low';
  
  // Calculate percentile thresholds
  const topThreshold = sortedValues[Math.floor(sortedValues.length * 0.33)];
  const bottomThreshold = sortedValues[Math.floor(sortedValues.length * 0.67)];
  
  if (isHigherBetter) {
    if (value >= topThreshold) return 'high';
    if (value >= bottomThreshold) return 'medium';
    return 'low';
  } else {
    // For metrics where lower is better (cost, avgCpc, cpa)
    if (value <= topThreshold) return 'high';
    if (value <= bottomThreshold) return 'medium';
    return 'low';
  }
};

// Get performance indicator styles
export const getPerformanceStyles = (level: PerformanceLevel): string => {
  switch (level) {
    case 'high': return 'bg-green-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-red-500';
    default: return 'bg-gray-400';
  }
};

// Performance indicator component
export const PerformanceIndicator: React.FC<{ level: PerformanceLevel }> = ({ level }) => (
  <div className={`w-2 h-2 rounded-full mr-2 flex-shrink-0 ${getPerformanceStyles(level)}`} />
); 