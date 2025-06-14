/**
 * Keyword-related TypeScript interfaces and types
 * Extracted from the main Dashboard component for better organization
 */

export interface Keyword {
  id: string;
  text: string;
  match_type: 'EXACT' | 'PHRASE' | 'BROAD';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions?: number;
  conversionsValue?: number;
  cpa?: number;
  roas?: number;
  campaignId?: string;
  adGroupId?: string;
}

export interface KeywordData {
  keywords: Keyword[];
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

export type DataType = 'keywords' | 'search_terms';
export type MatchType = 'EXACT' | 'PHRASE' | 'BROAD' | 'all'; 