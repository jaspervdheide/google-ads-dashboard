export const metricColors = {
  clicks: '#3b82f6',        // blue
  impressions: '#a855f7',   // purple
  ctr: '#22c55e',           // green
  cpc: '#f97316',           // orange
  cost: '#ef4444',          // red
  conversions: '#10b981',   // emerald
  conversionsValue: '#06b6d4', // cyan
  conversionRate: '#6366f1', // indigo
  cpa: '#ec4899',           // pink
  roas: '#eab308',          // yellow
} as const;

export const chartConfig = {
  height: 480,
  lineThickness: 2,
  areaOpacity: 0.15,
  gridOpacity: 0.3,
  borderRadius: 4,
} as const;

// Type exports for TypeScript
export type MetricKey = keyof typeof metricColors;
export type ChartConfigKey = keyof typeof chartConfig;


