/**
 * Campaign-related TypeScript interfaces and types
 * Extracted from the main Dashboard component for better organization
 */

export interface Account {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
  totalClicks?: number; // Add total clicks for filtering
}

// Bidding strategy interface based on Google Ads API v20
export interface BiddingStrategy {
  id?: string;
  name?: string;
  type: 'MANUAL_CPC' | 'ENHANCED_CPC' | 'MAXIMIZE_CLICKS' | 'MAXIMIZE_CONVERSIONS' | 
        'MAXIMIZE_CONVERSION_VALUE' | 'TARGET_CPA' | 'TARGET_ROAS' | 'TARGET_IMPRESSION_SHARE' | 
        'TARGET_SPEND' | 'PERCENT_CPC' | 'TARGET_CPM';
  // Target ROAS specific fields
  targetRoas?: number; // bidding_strategy.target_roas.target_roas (as decimal, e.g., 3.0 = 300%)
  cpcBidCeilingMicros?: number; // bidding_strategy.target_roas.cpc_bid_ceiling_micros
  cpcBidFloorMicros?: number; // bidding_strategy.target_roas.cpc_bid_floor_micros
  // Target CPA specific fields
  targetCpaMicros?: number; // bidding_strategy.target_cpa.target_cpa_micros
  // Maximize conversion value specific fields
  targetRoasOverride?: number; // bidding_strategy.maximize_conversion_value.target_roas
}

// Campaign metrics interface for additional ROAS-related metrics
export interface CampaignMetrics {
  averageTargetRoas?: number; // metrics.average_target_roas
  targetRoasSimulationPoints?: Array<{
    targetRoas: number;
    estimatedTotalConversions: number;
    estimatedTotalConversionsValue: number;
    estimatedTotalCost: number;
  }>; // bid_simulation_point_list for TARGET_ROAS
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  // Add bidding strategy and metrics for target ROAS functionality
  biddingStrategy?: BiddingStrategy;
  metrics?: CampaignMetrics;
}

export interface CampaignData {
  campaigns: Campaign[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

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