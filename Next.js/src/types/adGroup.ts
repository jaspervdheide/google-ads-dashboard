/**
 * Ad Group-related TypeScript interfaces and types
 * Extracted from the main Dashboard component for better organization
 */

import { DateRangeInfo } from './common';

export interface AdGroup {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName?: string;
  campaignType?: string;
  groupType?: 'ad_group' | 'asset_group';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate?: number;
  cpa: number;
  roas: number;
  // Performance Max specific fields
  adStrength?: 'Poor' | 'Good' | 'Excellent';
  assetCoverage?: number;
  // Traditional ad group specific fields
  avgQualityScore?: number | null;
}

export interface AdGroupData {
  adGroups: AdGroup[];
  campaignId: string;
  dateRange: DateRangeInfo;
  customerId: string;
} 