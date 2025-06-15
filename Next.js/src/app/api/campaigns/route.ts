import { NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30'; // Default to 30 days
    const includeImpressionShare = searchParams.get('includeImpressionShare') === 'true';
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }

    console.log(`Fetching campaign performance for customer ${customerId} with ${dateRange} days range...`);
    if (includeImpressionShare) console.log('Including search impression share data...');
    
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

    query += `
      FROM campaign
      WHERE campaign.status = 'ENABLED'
        AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
      ORDER BY metrics.impressions DESC
    `;

    console.log('Executing campaign performance query...');
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
          status: row.campaign.status === 2 ? 'ENABLED' : 'PAUSED', // Convert status number to string
          impressions: row.metrics.impressions || 0,
          clicks: row.metrics.clicks || 0,
          costMicros: row.metrics.cost_micros || 0,
          conversions: row.metrics.conversions || 0,
          conversionsValueMicros: row.metrics.conversions_value || 0,
        };

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
      const processedCampaign: any = {
        ...campaign,
        cost: campaign.costMicros / 1_000_000, // Convert micros to currency
        conversionsValue: campaign.conversionsValueMicros, // conversions_value is already in currency format, not micros
        ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions * 100) : 0,
        avgCpc: campaign.clicks > 0 ? (campaign.costMicros / campaign.clicks / 1_000_000) : 0,
        conversionRate: campaign.clicks > 0 ? (campaign.conversions / campaign.clicks * 100) : 0,
        cpa: campaign.conversions > 0 ? (campaign.costMicros / campaign.conversions / 1_000_000) : 0,
        roas: campaign.costMicros > 0 ? (campaign.conversionsValueMicros / campaign.costMicros * 1_000_000) : 0 // Multiply by 1M since cost is in micros but conversions_value is in currency
      };

      // Add formatted impression share data for widgets
      if (includeImpressionShare) {
        // Convert decimal values to percentages (Google Ads API returns 0.0-1.0, we need 0-100)
        const impressionSharePercent = (campaign.searchImpressionShare || 0) * 100;
        const absoluteTopPercent = (campaign.searchAbsoluteTopImpressionShare || 0) * 100;
        const topImpressionPercent = (campaign.searchTopImpressionShare || 0) * 100;
        const budgetLostPercent = (campaign.searchBudgetLostImpressionShare || 0) * 100;
        const rankLostPercent = (campaign.searchRankLostImpressionShare || 0) * 100;
        
        // Debug logging for impression share values
        console.log(`Campaign: ${campaign.name}`);
        console.log(`  Raw impression share: ${campaign.searchImpressionShare}`);
        console.log(`  Converted to percentage: ${impressionSharePercent}%`);
        
        processedCampaign.impressionShare = {
          search_impression_share: impressionSharePercent,
          search_absolute_top_impression_share: absoluteTopPercent,
          search_top_impression_share: topImpressionPercent,
          search_budget_lost_impression_share: budgetLostPercent,
          search_rank_lost_impression_share: rankLostPercent,
          lost_budget_share: budgetLostPercent,
          lost_rank_share: rankLostPercent,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable', // TODO: Calculate actual trend
          trend_value: Math.floor(Math.random() * 10) - 5, // TODO: Calculate actual trend value
          competitive_strength: impressionSharePercent > 70 ? 'strong' : impressionSharePercent > 40 ? 'moderate' : 'weak'
        };
      }

      return processedCampaign;
    });
    
    // Calculate totals
    const totals: any = {
      impressions: campaigns.reduce((sum, c) => sum + c.impressions, 0),
      clicks: campaigns.reduce((sum, c) => sum + c.clicks, 0),
      cost: campaigns.reduce((sum, c) => sum + c.cost, 0),
      conversions: campaigns.reduce((sum, c) => sum + c.conversions, 0),
      conversionsValue: campaigns.reduce((sum, c) => sum + c.conversionsValue, 0),
      ctr: 0,
      avgCpc: 0,
      conversionRate: 0,
      cpa: 0,
      roas: 0
    };
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
    totals.avgCpc = totals.clicks > 0 ? (totals.cost / totals.clicks) : 0;
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0;
    totals.cpa = totals.conversions > 0 ? (totals.cost / totals.conversions) : 0;
    totals.roas = totals.cost > 0 ? (totals.conversionsValue / totals.cost) : 0;

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

    console.log(`Successfully retrieved ${campaigns.length} campaigns`);
    
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
        includeImpressionShare
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