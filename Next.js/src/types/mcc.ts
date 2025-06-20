/**
 * MCC Overview TypeScript interfaces and types
 * For cross-account dashboard functionality
 */

import { DateRangeInfo } from './common';

// Core account metrics interface
export interface AccountMetrics {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
  campaignCount: number;
  topCampaign: string | null;
  metrics: {
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
  };
}

// Aggregated totals across all accounts
export interface MccTotals {
  accountCount: number;
  campaignCount: number;
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
}

// Main MCC overview data structure
export interface MccOverviewData {
  accounts: AccountMetrics[];
  totals: MccTotals;
  dateRange: DateRangeInfo;
}

// API response structure
export interface MccOverviewResponse {
  success: boolean;
  message: string;
  data: MccOverviewData;
}

// Chart data structure for MCC charts (account-level)
export interface MccChartDataPoint {
  account: string;
  accountId: string;
  countryCode: string;
  [key: string]: string | number; // Dynamic metric values
}

// Account comparison data structure
export interface AccountComparison {
  accountId: string;
  accountName: string;
  countryCode: string;
  currentPeriod: AccountMetrics['metrics'];
  previousPeriod?: AccountMetrics['metrics'];
  percentageChange?: {
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
  };
}

// MCC overview page state
export interface MccViewState {
  selectedMetrics: string[];
  sortBy: keyof AccountMetrics['metrics'] | 'name' | 'countryCode' | 'campaignCount';
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  countryFilter: string[];
  showZeroPerformance: boolean;
}

// MCC table props
export interface MccTableProps {
  accounts: AccountMetrics[];
  totals: MccTotals;
  loading: boolean;
  onSort: (column: string) => void;
  onAccountClick?: (account: AccountMetrics) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  searchTerm: string;
  countryFilter: string[];
  showZeroPerformance: boolean;
}

// Account performance categories for color coding
export type AccountPerformanceCategory = 'excellent' | 'good' | 'average' | 'poor' | 'inactive';

// Helper function type for categorizing account performance
export interface AccountPerformanceClassifier {
  (metrics: AccountMetrics['metrics']): AccountPerformanceCategory;
}

// MCC KPI card configuration
export interface MccKpiCardConfig {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  format: 'currency' | 'number' | 'percentage' | 'decimal';
  icon: string;
  color: string;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
} 