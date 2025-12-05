/**
 * Keyword-related TypeScript interfaces
 * For Keyword Insights Tab functionality
 */

// Individual keyword data from Google Ads
export interface KeywordData {
  keyword: string;
  matchType: 'EXACT' | 'PHRASE' | 'BROAD';
  adGroupName: string;
  campaignName: string;
  
  // Performance metrics
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  
  // Derived metrics
  ctr: number;
  avgCpc: number;
  conversionRate: number;
  cpa: number;
  roas: number;
  
  // Search volume metrics
  searchImpressionShare: number;      // Our share of the market (0-1)
  estimatedSearchVolume: number;      // Total market searches (calculated)
  missedImpressions: number;          // Impressions we didn't get
  opportunityScore: number;           // 0-100 score based on opportunity
}

// Grouped keyword data (by keyword text, ignoring match type)
export interface GroupedKeywordData {
  keyword: string;
  matchTypes: string[];
  adGroups: string[];
  campaigns: string[];
  
  // Aggregated metrics
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
  
  // Search volume
  searchImpressionShare: number;
  estimatedSearchVolume: number;
  missedImpressions: number;
  opportunityScore: number;
}

// Monthly keyword trend data
export interface KeywordTrendData {
  month: string;
  monthFormatted: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  searchImpressionShare: number;
  estimatedSearchVolume: number;
}

// Market Share keyword data (from keyword_view with impression share)
export interface MarketShareKeyword {
  keyword: string;
  matchType: string;
  campaignName: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionsValue: number;
  searchImpressionShare: number;
  searchTopImpressionShare: number;
  searchAbsoluteTopImpressionShare: number;
  estimatedSearchVolume: number;
  missedImpressions: number;
  opportunityScore: number;
}

// API response
export interface KeywordsApiResponse {
  success: boolean;
  message: string;
  data: {
    keywords: KeywordData[];
    totals: {
      totalKeywords: number;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      avgSearchImpressionShare: number;
      totalEstimatedSearchVolume: number;
      totalMissedImpressions: number;
    };
    trends: {
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
    };
    marketShare: {
      keywords: MarketShareKeyword[];
      totals: {
        keywordCount: number;
        totalImpressions: number;
        estimatedSearchVolume: number;
        missedImpressions: number;
        avgImpressionShare: number;
        marketSharePercentage: number;
      };
    };
  };
  cached: boolean;
}

// View state
export interface KeywordViewState {
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  searchTerm: string;
  filterType: 'all' | 'high-opportunity' | 'low-share' | 'top-performers';
}

