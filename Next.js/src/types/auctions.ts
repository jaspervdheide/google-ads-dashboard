// Auction Insights Types

export interface CompetitorData {
  domain: string;
  impressionShare: number;
  overlapRate: number;
  positionAboveRate: number;
  topOfPageRate: number;
  absoluteTopOfPageRate: number;
  outrankingShare: number;
}

export interface ImpressionShareData {
  impressionShare: number;
  lostByRank: number;
  lostByBudget: number;
  topImpressionShare: number;
  absoluteTopImpressionShare: number;
}

export interface CampaignAuctionData {
  campaignId: string;
  campaignName: string;
  impressionShare: ImpressionShareData;
  competitors: CompetitorData[];
}

export interface AuctionHistoricalData {
  date: string;
  impressionShare: number;
  lostByRank: number;
  lostByBudget: number;
  topImpressionShare: number;
  absoluteTopImpressionShare: number;
}

export interface AuctionTrends {
  impressionShare: number;
  lostByRank: number;
  lostByBudget: number;
  topImpressionShare: number;
}

export interface AuctionApiResponse {
  success: boolean;
  accountLevel: {
    impressionShare: ImpressionShareData;
    competitors: CompetitorData[];
    historical: AuctionHistoricalData[];
  };
  campaignLevel: CampaignAuctionData[];
  trends: AuctionTrends;
  error?: string;
}

export type AuctionMetric = 
  | 'impressionShare' 
  | 'lostByRank' 
  | 'lostByBudget' 
  | 'topImpressionShare' 
  | 'absoluteTopImpressionShare';

export type AuctionViewLevel = 'account' | 'campaign';


