import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache } from '@/utils/serverCache';
import { 
  AuctionApiResponse, 
  CompetitorData, 
  ImpressionShareData,
  CampaignAuctionData,
  AuctionHistoricalData,
  AuctionTrends 
} from '@/types/auctions';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const dateRange = searchParams.get('dateRange') || '30';

  if (!customerId) {
    return NextResponse.json({ success: false, error: 'Customer ID required' }, { status: 400 });
  }

  // Calculate date range using utility (returns YYYYMMDD format)
  const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));
  
  // Convert YYYYMMDD to YYYY-MM-DD for GAQL
  const formatForGaql = (yyyymmdd: string) => 
    `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
  
  const formattedStartDate = formatForGaql(startDateStr);
  const formattedEndDate = formatForGaql(endDateStr);

  // Cache key
  const cacheKey = `auctions-v2-${customerId}-${formattedStartDate}-${formattedEndDate}`;
  const cached = serverCache.get<AuctionApiResponse>(cacheKey);
  if (cached) {
    console.log('[Auctions API] Returning cached data');
    return NextResponse.json(cached);
  }

  try {
    const { customer } = createGoogleAdsConnection(customerId);

    console.log(`[Auctions API] Fetching data for ${customerId} from ${formattedStartDate} to ${formattedEndDate}`);

    // Query 1: Account-level impression share data with daily breakdown
    // Note: Must query from campaign resource to get date segments with impression share
    const accountQuery = `
      SELECT
        segments.date,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_top_impression_share,
        metrics.search_absolute_top_impression_share,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
        AND campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING', 'PERFORMANCE_MAX')
        AND campaign.status != 'REMOVED'
    `;

    // Query 2: Campaign-level impression share (aggregated, no date segment)
    const campaignQuery = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share,
        metrics.search_top_impression_share,
        metrics.search_absolute_top_impression_share,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
        AND campaign.status != 'REMOVED'
        AND campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING', 'PERFORMANCE_MAX')
    `;

    // Query 3: Auction insights (competitors)
    // Using segments.domain to identify competitor domains
    const auctionQuery = `
      SELECT
        segments.domain,
        metrics.auction_insight_search_impression_share,
        metrics.auction_insight_search_overlap_rate,
        metrics.auction_insight_search_position_above_rate,
        metrics.auction_insight_search_top_impression_percentage,
        metrics.auction_insight_search_absolute_top_impression_percentage,
        metrics.auction_insight_search_outranking_share
      FROM campaign_auction_insights
      WHERE segments.date BETWEEN '${formattedStartDate}' AND '${formattedEndDate}'
    `;

    // Execute queries in parallel
    const [accountResults, campaignResults, auctionResults] = await Promise.all([
      customer.query(accountQuery).catch(err => {
        console.log('[Auctions API] Account query error:', err?.message || err?.errors?.[0]?.message || JSON.stringify(err));
        return [];
      }),
      customer.query(campaignQuery).catch(err => {
        console.log('[Auctions API] Campaign query error:', err?.message || err?.errors?.[0]?.message || JSON.stringify(err));
        return [];
      }),
      customer.query(auctionQuery).catch(err => {
        console.log('[Auctions API] Auction insights query error:', err?.message || err?.errors?.[0]?.message || JSON.stringify(err));
        return [];
      })
    ]);

    console.log(`[Auctions API] Results - Account: ${accountResults.length}, Campaign: ${campaignResults.length}, Auction: ${auctionResults.length}`);

    // Log first row for debugging
    if (accountResults.length > 0) {
      console.log('[Auctions API] First account row:', JSON.stringify(accountResults[0], null, 2));
    }

    // Process account-level data (daily) - aggregate by date with weighted averages
    const dailyData = new Map<string, {
      impressions: number;
      impressionShareSum: number;
      lostByRankSum: number;
      lostByBudgetSum: number;
      topShareSum: number;
      absoluteTopShareSum: number;
      count: number;
    }>();

    for (const row of accountResults) {
      const date = row.segments?.date;
      const impressions = row.metrics?.impressions || 0;
      const impressionShare = row.metrics?.search_impression_share || 0;
      const lostByRank = row.metrics?.search_rank_lost_impression_share || 0;
      const lostByBudget = row.metrics?.search_budget_lost_impression_share || 0;
      const topShare = row.metrics?.search_top_impression_share || 0;
      const absoluteTopShare = row.metrics?.search_absolute_top_impression_share || 0;

      if (date && impressions > 0) {
        const existing = dailyData.get(date) || {
          impressions: 0,
          impressionShareSum: 0,
          lostByRankSum: 0,
          lostByBudgetSum: 0,
          topShareSum: 0,
          absoluteTopShareSum: 0,
          count: 0
        };

        // Weight by impressions for proper aggregation
        existing.impressions += impressions;
        existing.impressionShareSum += impressionShare * impressions;
        existing.lostByRankSum += lostByRank * impressions;
        existing.lostByBudgetSum += lostByBudget * impressions;
        existing.topShareSum += topShare * impressions;
        existing.absoluteTopShareSum += absoluteTopShare * impressions;
        existing.count++;
        
        dailyData.set(date, existing);
      }
    }

    // Convert to historical array with weighted averages
    const historical: AuctionHistoricalData[] = [];
    let totalImpressionShare = 0;
    let totalLostByRank = 0;
    let totalLostByBudget = 0;
    let totalTopShare = 0;
    let totalAbsoluteTopShare = 0;
    let totalImpressions = 0;

    const sortedDates = Array.from(dailyData.keys()).sort();
    for (const date of sortedDates) {
      const data = dailyData.get(date)!;
      const weight = data.impressions;
      
      const avgImpressionShare = weight > 0 ? (data.impressionShareSum / weight) : 0;
      const avgLostByRank = weight > 0 ? (data.lostByRankSum / weight) : 0;
      const avgLostByBudget = weight > 0 ? (data.lostByBudgetSum / weight) : 0;
      const avgTopShare = weight > 0 ? (data.topShareSum / weight) : 0;
      const avgAbsoluteTopShare = weight > 0 ? (data.absoluteTopShareSum / weight) : 0;

      historical.push({
        date,
        impressionShare: avgImpressionShare * 100,
        lostByRank: avgLostByRank * 100,
        lostByBudget: avgLostByBudget * 100,
        topImpressionShare: avgTopShare * 100,
        absoluteTopImpressionShare: avgAbsoluteTopShare * 100
      });

      // Accumulate for overall averages
      totalImpressionShare += data.impressionShareSum;
      totalLostByRank += data.lostByRankSum;
      totalLostByBudget += data.lostByBudgetSum;
      totalTopShare += data.topShareSum;
      totalAbsoluteTopShare += data.absoluteTopShareSum;
      totalImpressions += weight;
    }

    console.log(`[Auctions API] Processed ${historical.length} days of data, total impressions: ${totalImpressions}`);

    // Calculate weighted averages for account level
    const accountImpressionShare: ImpressionShareData = {
      impressionShare: totalImpressions > 0 ? (totalImpressionShare / totalImpressions) * 100 : 0,
      lostByRank: totalImpressions > 0 ? (totalLostByRank / totalImpressions) * 100 : 0,
      lostByBudget: totalImpressions > 0 ? (totalLostByBudget / totalImpressions) * 100 : 0,
      topImpressionShare: totalImpressions > 0 ? (totalTopShare / totalImpressions) * 100 : 0,
      absoluteTopImpressionShare: totalImpressions > 0 ? (totalAbsoluteTopShare / totalImpressions) * 100 : 0
    };

    // Process campaign-level data - aggregate by campaign
    const campaignMap = new Map<string, {
      campaignId: string;
      campaignName: string;
      impressions: number;
      impressionShareSum: number;
      lostByRankSum: number;
      lostByBudgetSum: number;
      topShareSum: number;
      absoluteTopShareSum: number;
    }>();
    
    for (const row of campaignResults) {
      const campaignId = String(row.campaign?.id || '');
      const campaignName = row.campaign?.name || 'Unknown';
      const impressions = row.metrics?.impressions || 0;
      
      const existing = campaignMap.get(campaignId) || {
        campaignId,
        campaignName,
        impressions: 0,
        impressionShareSum: 0,
        lostByRankSum: 0,
        lostByBudgetSum: 0,
        topShareSum: 0,
        absoluteTopShareSum: 0
      };

      existing.impressions += impressions;
      existing.impressionShareSum += (row.metrics?.search_impression_share || 0) * impressions;
      existing.lostByRankSum += (row.metrics?.search_rank_lost_impression_share || 0) * impressions;
      existing.lostByBudgetSum += (row.metrics?.search_budget_lost_impression_share || 0) * impressions;
      existing.topShareSum += (row.metrics?.search_top_impression_share || 0) * impressions;
      existing.absoluteTopShareSum += (row.metrics?.search_absolute_top_impression_share || 0) * impressions;
      
      campaignMap.set(campaignId, existing);
    }

    // Convert campaign map to final structure
    const campaignLevel: CampaignAuctionData[] = Array.from(campaignMap.values())
      .filter(c => c.impressions > 0)
      .map(c => ({
        campaignId: c.campaignId,
        campaignName: c.campaignName,
        impressionShare: {
          impressionShare: c.impressions > 0 ? (c.impressionShareSum / c.impressions) * 100 : 0,
          lostByRank: c.impressions > 0 ? (c.lostByRankSum / c.impressions) * 100 : 0,
          lostByBudget: c.impressions > 0 ? (c.lostByBudgetSum / c.impressions) * 100 : 0,
          topImpressionShare: c.impressions > 0 ? (c.topShareSum / c.impressions) * 100 : 0,
          absoluteTopImpressionShare: c.impressions > 0 ? (c.absoluteTopShareSum / c.impressions) * 100 : 0
        },
        competitors: []
      }))
      .sort((a, b) => b.impressionShare.impressionShare - a.impressionShare.impressionShare);

    // Process competitor data
    const competitors: CompetitorData[] = [];
    const competitorMap = new Map<string, CompetitorData>();

    for (const row of auctionResults) {
      const domain = row.segments?.domain || 'Unknown';
      
      if (!competitorMap.has(domain) && domain !== 'Unknown') {
        competitorMap.set(domain, {
          domain,
          impressionShare: (row.metrics?.auction_insight_search_impression_share || 0) * 100,
          overlapRate: (row.metrics?.auction_insight_search_overlap_rate || 0) * 100,
          positionAboveRate: (row.metrics?.auction_insight_search_position_above_rate || 0) * 100,
          topOfPageRate: (row.metrics?.auction_insight_search_top_impression_percentage || 0) * 100,
          absoluteTopOfPageRate: (row.metrics?.auction_insight_search_absolute_top_impression_percentage || 0) * 100,
          outrankingShare: (row.metrics?.auction_insight_search_outranking_share || 0) * 100
        });
      }
    }

    competitors.push(...competitorMap.values());
    competitors.sort((a, b) => b.impressionShare - a.impressionShare);

    // Calculate trends (compare first half vs second half of period)
    const midPoint = Math.floor(historical.length / 2);
    const firstHalf = historical.slice(0, midPoint);
    const secondHalf = historical.slice(midPoint);

    const avgFirst = (arr: AuctionHistoricalData[], key: keyof AuctionHistoricalData) => 
      arr.length > 0 ? arr.reduce((sum, d) => sum + (d[key] as number), 0) / arr.length : 0;

    const trends: AuctionTrends = {
      impressionShare: avgFirst(secondHalf, 'impressionShare') - avgFirst(firstHalf, 'impressionShare'),
      lostByRank: avgFirst(secondHalf, 'lostByRank') - avgFirst(firstHalf, 'lostByRank'),
      lostByBudget: avgFirst(secondHalf, 'lostByBudget') - avgFirst(firstHalf, 'lostByBudget'),
      topImpressionShare: avgFirst(secondHalf, 'topImpressionShare') - avgFirst(firstHalf, 'topImpressionShare')
    };

    const response: AuctionApiResponse = {
      success: true,
      accountLevel: {
        impressionShare: accountImpressionShare,
        competitors: competitors.slice(0, 20), // Top 20 competitors
        historical
      },
      campaignLevel,
      trends
    };

    // Cache for 15 minutes
    serverCache.set(cacheKey, response, 900);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Auctions API] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

