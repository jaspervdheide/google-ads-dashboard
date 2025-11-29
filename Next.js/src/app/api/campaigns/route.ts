import { NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { calculateDerivedMetrics, convertCostFromMicros } from '@/utils/apiHelpers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30'; // Default to 30 days
    const includeImpressionShare = searchParams.get('includeImpressionShare') === 'true';
    const includeBiddingStrategy = searchParams.get('includeBiddingStrategy') === 'true';
    const device = searchParams.get('device'); // 'desktop', 'mobile', 'tablet', or null for all
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }
    
    // Map device filter to Google Ads device enum names
    const deviceMap: Record<string, string> = {
      'desktop': 'DESKTOP',
      'mobile': 'MOBILE',
      'tablet': 'TABLET',
    };


    
    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));
    
    // Initialize Google Ads client and customer using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Base query for campaign performance data
    let query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.ctr,
        metrics.average_cpc,
        metrics.conversions,
        metrics.conversions_value`;

    // Add search impression share metrics if requested
    if (includeImpressionShare) {
      query += `,
        metrics.search_impression_share,
        metrics.search_absolute_top_impression_share,
        metrics.search_top_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share`;
    }

    // Add bidding strategy fields if requested
    if (includeBiddingStrategy) {
      query += `,
        campaign.bidding_strategy_type,
        campaign.target_roas.target_roas,
        campaign.target_cpa.target_cpa_micros,
        campaign.maximize_conversion_value.target_roas`;
    }

    // Add device segment to SELECT clause if device filter is specified
    if (device && deviceMap[device]) {
      query += `,
        segments.device`;
    }

    // Build WHERE clause with optional device filter
    // Fetch both ENABLED and PAUSED campaigns (not REMOVED)
    // Exclude experiments and drafts - only get BASE campaigns
    let whereClause = `
      FROM campaign
      WHERE campaign.status IN ('ENABLED', 'PAUSED')
        AND campaign.experiment_type = 'BASE'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'`;
    
    // Add device filter if specified
    if (device && deviceMap[device]) {
      whereClause += `
        AND segments.device = '${deviceMap[device]}'`;
    }
    
    whereClause += `
      ORDER BY metrics.impressions DESC
    `;
    
    query += whereClause;


    const results = await customer.query(query);
    
    // Process results and aggregate by campaign
    const campaignMap = new Map();
    
    results.forEach((row: any) => {
      const campaignId = row.campaign.id.toString();
      
      if (campaignMap.has(campaignId)) {
        // Aggregate metrics
        const existing = campaignMap.get(campaignId);
        existing.impressions += row.metrics.impressions || 0;
        existing.clicks += row.metrics.clicks || 0;
        existing.costMicros += row.metrics.cost_micros || 0;
        existing.conversions += row.metrics.conversions || 0;
        existing.conversionsValueMicros += row.metrics.conversions_value || 0;

        // Aggregate impression share metrics (take average for percentages)
        if (includeImpressionShare) {
          existing.searchImpressionShare = (existing.searchImpressionShare + (row.metrics.search_impression_share || 0)) / 2;
          existing.searchAbsoluteTopImpressionShare = (existing.searchAbsoluteTopImpressionShare + (row.metrics.search_absolute_top_impression_share || 0)) / 2;
          existing.searchTopImpressionShare = (existing.searchTopImpressionShare + (row.metrics.search_top_impression_share || 0)) / 2;
          existing.searchBudgetLostImpressionShare = (existing.searchBudgetLostImpressionShare + (row.metrics.search_budget_lost_impression_share || 0)) / 2;
          existing.searchRankLostImpressionShare = (existing.searchRankLostImpressionShare + (row.metrics.search_rank_lost_impression_share || 0)) / 2;
        }
      } else {
        // New campaign entry
        const campaignData: any = {
          id: campaignId,
          name: row.campaign.name,
          status: row.campaign.status === 2 || row.campaign.status === 'ENABLED' ? 'ENABLED' : 'PAUSED', // Convert status to string (handles both numeric and string values)
          impressions: row.metrics.impressions || 0,
          clicks: row.metrics.clicks || 0,
          costMicros: row.metrics.cost_micros || 0,
          conversions: row.metrics.conversions || 0,
          conversionsValueMicros: row.metrics.conversions_value || 0,
        };

        // Add bidding strategy data if requested
        if (includeBiddingStrategy) {
          campaignData.biddingStrategyType = row.campaign.bidding_strategy_type;
          campaignData.targetRoas = row.campaign.target_roas?.target_roas;
          campaignData.targetCpaMicros = row.campaign.target_cpa?.target_cpa_micros;
          campaignData.maximizeConversionValueTargetRoas = row.campaign.maximize_conversion_value?.target_roas;
        }

        // Add impression share data if requested
        if (includeImpressionShare) {
          campaignData.searchImpressionShare = row.metrics.search_impression_share || 0;
          campaignData.searchAbsoluteTopImpressionShare = row.metrics.search_absolute_top_impression_share || 0;
          campaignData.searchTopImpressionShare = row.metrics.search_top_impression_share || 0;
          campaignData.searchBudgetLostImpressionShare = row.metrics.search_budget_lost_impression_share || 0;
          campaignData.searchRankLostImpressionShare = row.metrics.search_rank_lost_impression_share || 0;
        }

        campaignMap.set(campaignId, campaignData);
      }
    });
    
    // Convert map to array and calculate derived metrics
    const campaigns = Array.from(campaignMap.values()).map(campaign => {
      const cost = convertCostFromMicros(campaign.costMicros);
      const derivedMetrics = calculateDerivedMetrics({
        impressions: campaign.impressions,
        clicks: campaign.clicks,
        cost: cost,
        conversions: campaign.conversions,
        conversionsValue: campaign.conversionsValueMicros
      });
      
      const processedCampaign: any = {
        ...campaign,
        ...derivedMetrics,
        conversionsValue: campaign.conversionsValueMicros // Keep original field name for compatibility
      };

      // Add formatted impression share data for widgets
      if (includeImpressionShare) {
        // Convert decimal values to percentages (Google Ads API returns 0.0-1.0, we need 0-100)
        const impressionSharePercent = (campaign.searchImpressionShare || 0) * 100;
        const absoluteTopPercent = (campaign.searchAbsoluteTopImpressionShare || 0) * 100;
        const topImpressionPercent = (campaign.searchTopImpressionShare || 0) * 100;
        const budgetLostPercent = (campaign.searchBudgetLostImpressionShare || 0) * 100;
        const rankLostPercent = (campaign.searchRankLostImpressionShare || 0) * 100;
        

        
        processedCampaign.impressionShare = {
          search_impression_share: impressionSharePercent,
          search_absolute_top_impression_share: absoluteTopPercent,
          search_top_impression_share: topImpressionPercent,
          search_budget_lost_impression_share: budgetLostPercent,
          search_rank_lost_impression_share: rankLostPercent,
          lost_budget_share: budgetLostPercent,
          lost_rank_share: rankLostPercent,
          trend: 'stable', // TODO: Calculate actual trend from historical data
          trend_value: 0, // TODO: Calculate actual trend value from historical data
          competitive_strength: impressionSharePercent > 70 ? 'strong' : impressionSharePercent > 40 ? 'moderate' : 'weak'
        };
      }

      // Add formatted bidding strategy data
      if (includeBiddingStrategy) {
        // Map bidding strategy type enum to readable string
        const biddingStrategyTypeMap: { [key: number]: string } = {
          2: 'MANUAL_CPC',
          3: 'MANUAL_CPM',
          4: 'MANUAL_CPV',
          6: 'MAXIMIZE_CONVERSIONS',
          7: 'MAXIMIZE_CONVERSION_VALUE',
          8: 'TARGET_CPA',
          9: 'TARGET_IMPRESSION_SHARE',
          10: 'TARGET_ROAS',
          11: 'TARGET_SPEND',
          12: 'PERCENT_CPC',
          13: 'TARGET_CPM',
          14: 'ENHANCED_CPC'
        };

        const biddingStrategyType = biddingStrategyTypeMap[campaign.biddingStrategyType] || 'UNKNOWN';
        
        processedCampaign.biddingStrategy = {
          type: biddingStrategyType,
          targetRoas: campaign.targetRoas, // Already in decimal format from API
          targetCpaMicros: campaign.targetCpaMicros,
          targetRoasOverride: campaign.maximizeConversionValueTargetRoas
        };


      }

      return processedCampaign;
    });
    
    // Calculate totals using shared utility
    const rawTotals = {
      impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      cost: campaigns.reduce((sum, c) => sum + c.cost, 0),
      conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      conversionsValue: campaigns.reduce((sum, c) => sum + c.conversionsValue, 0)
    };
    
    const totals: any = calculateDerivedMetrics(rawTotals);

    // Add impression share totals if requested
    if (includeImpressionShare && campaigns.length > 0) {
      totals.impressionShare = {
        avgSearchImpressionShare: campaigns.reduce((sum, c) => sum + (c.impressionShare?.search_impression_share || 0), 0) / campaigns.length,
        avgSearchAbsoluteTopImpressionShare: campaigns.reduce((sum, c) => sum + (c.impressionShare?.search_absolute_top_impression_share || 0), 0) / campaigns.length,
        avgSearchTopImpressionShare: campaigns.reduce((sum, c) => sum + (c.impressionShare?.search_top_impression_share || 0), 0) / campaigns.length,
        avgSearchBudgetLostImpressionShare: campaigns.reduce((sum, c) => sum + (c.impressionShare?.search_budget_lost_impression_share || 0), 0) / campaigns.length,
        avgSearchRankLostImpressionShare: campaigns.reduce((sum, c) => sum + (c.impressionShare?.search_rank_lost_impression_share || 0), 0) / campaigns.length
      };
    }

    let message = `✅ Retrieved ${campaigns.length} campaigns for ${dateRange} days`;
    if (includeImpressionShare) message += ' with impression share data';
    if (includeBiddingStrategy) message += ' with bidding strategy data';


    
    return NextResponse.json({
      success: true,
      message,
      data: {
        campaigns,
        totals,
        dateRange: {
          days: parseInt(dateRange),
          startDate: startDateStr,
          endDate: endDateStr
        },
        customerId,
        includeImpressionShare,
        includeBiddingStrategy
      }
    });

  } catch (error) {
    console.error('Error fetching campaign performance:', error);
    
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch campaign performance",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 