import { useKeywordApiData } from './useApiData';
import { DateRange } from '../types/common';

// Define the keyword data structure to match the API response
export interface KeywordItem {
  id: string;
  keyword_text: string;
  match_type: 'EXACT' | 'PHRASE' | 'BROAD' | 'SEARCH_TERM';
  type: 'keyword' | 'search_term';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversions_value: number;
  roas: number;
  quality_score?: number;
  ad_group_id: string;
  ad_group_name: string;
  campaign_id: string;
  campaign_name: string;
  triggering_keyword?: string;
  status: string;
}

export interface KeywordData {
  keywords: KeywordItem[];
  summary?: any;
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

/**
 * Simplified keyword data hook using unified API pattern
 * Eliminates DRY violations and excessive logging
 */
export function useKeywordData(
  accountId: string | null,
  dateRange: DateRange | null,
  forceRefresh: boolean = false,
  dataType: 'keywords' | 'search_terms' | 'both' = 'both'
) {
  // The unified hook returns KeywordData directly from the API
  return useKeywordApiData(accountId, dateRange, {
    forceRefresh,
    dataType
  }) as { data: KeywordData | null; loading: boolean; error: string; refetch: () => void };
} 