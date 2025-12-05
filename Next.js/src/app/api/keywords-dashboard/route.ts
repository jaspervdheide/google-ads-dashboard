import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache } from '@/utils/serverCache';

interface KeywordInfo {
  id: string;
  text: string;
  matchType: string;
  adGroupId: string;
  adGroupName: string;
  campaignId: string;
  campaignName: string;
  status: string;
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';

    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: 'Customer ID is required'
      }, { status: 400 });
    }

    // Calculate date range
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('keywords-dashboard', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr
    });

    // Check cache first
    const cachedData = serverCache.get<{ keywords: KeywordInfo[]; totals: any }>(cacheKey);
    if (cachedData) {
      console.log('Keywords Dashboard API: Returning cached data');
      return NextResponse.json({
        success: true,
        message: 'Keyword data retrieved from cache',
        data: cachedData,
        cached: true
      });
    }

    console.log(`Keywords Dashboard API: Fetching data for customer ${customerId} from ${startDateStr} to ${endDateStr}`);

    // Create Google Ads connection
    const { customer } = createGoogleAdsConnection(customerId);

    // Query keyword performance data
    const query = `
      SELECT
        ad_group_criterion.criterion_id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group.id,
        ad_group.name,
        campaign.id,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM keyword_view
      WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND ad_group_criterion.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `;

    const response = await customer.query(query);
    
    // Process results
    const keywords: KeywordInfo[] = [];
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalCost = 0;
    let totalConversions = 0;
    let totalConversionsValue = 0;

    for (const row of response) {
      const impressions = Number(row.metrics?.impressions || 0);
      const clicks = Number(row.metrics?.clicks || 0);
      const costMicros = Number(row.metrics?.cost_micros || 0);
      const conversions = Number(row.metrics?.conversions || 0);
      const conversionsValue = Number(row.metrics?.conversions_value || 0);
      
      const cost = costMicros / 1_000_000;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgCpc = clicks > 0 ? cost / clicks : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpa = conversions > 0 ? cost / conversions : 0;
      const roas = cost > 0 ? conversionsValue / cost : 0;

      totalImpressions += impressions;
      totalClicks += clicks;
      totalCost += cost;
      totalConversions += conversions;
      totalConversionsValue += conversionsValue;

      keywords.push({
        id: String(row.adGroupCriterion?.criterionId || ''),
        text: row.adGroupCriterion?.keyword?.text || '',
        matchType: row.adGroupCriterion?.keyword?.matchType || 'BROAD',
        status: row.adGroupCriterion?.status || 'ENABLED',
        adGroupId: String(row.adGroup?.id || ''),
        adGroupName: row.adGroup?.name || '',
        campaignId: String(row.campaign?.id || ''),
        campaignName: row.campaign?.name || '',
        impressions,
        clicks,
        cost,
        conversions,
        conversionsValue,
        ctr,
        avgCpc,
        conversionRate,
        cpa,
        roas
      });
    }

    const responseData = {
      keywords,
      totals: {
        impressions: totalImpressions,
        clicks: totalClicks,
        cost: totalCost,
        conversions: totalConversions,
        conversionsValue: totalConversionsValue
      }
    };

    // Cache the result
    const ttl = serverCache.getSmartTTL(endDateStr, 300);
    serverCache.set(cacheKey, responseData, ttl);

    console.log(`Keywords Dashboard API: Returning ${keywords.length} keywords`);

    return NextResponse.json({
      success: true,
      message: `Retrieved ${keywords.length} keywords`,
      data: responseData,
      cached: false
    });

  } catch (error: any) {
    console.error('Keywords Dashboard API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch keyword data',
      error: error.message
    }, { status: 500 });
  }
}


