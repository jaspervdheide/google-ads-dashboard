import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { calculateAllMetrics } from '@/utils/metricsCalculator';
import { serverCache, ServerCache } from '@/utils/serverCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    const campaignId = searchParams.get('campaignId');
    const adGroupId = searchParams.get('adGroupId');
    const keywordId = searchParams.get('keywordId');
    const device = searchParams.get('device');
    
    // Map device filter values to Google Ads API enum names
    const deviceMap: { [key: string]: string } = {
      'desktop': 'DESKTOP',
      'mobile': 'MOBILE',
      'tablet': 'TABLET'
    };
    const deviceApiValue = device ? deviceMap[device] : null;
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: 'Customer ID is required'
      }, { status: 400 });
    }

    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('historical', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr,
      campaignId,
      adGroupId,
      keywordId,
      device
    });

    // Check cache first - this is critical for hover chart performance
    const cachedData = serverCache.get<any[]>(cacheKey);
    if (cachedData) {
      const response = NextResponse.json({
        success: true,
        data: cachedData,
        cached: true
      });
      // Historical data can be cached longer - it doesn't change
      response.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=3600');
      return response;
    }

    // Create Google Ads connection using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Build query based on what data is requested
    let query = '';
    let _entityType = 'account';
    
    if (keywordId) {
      // Keyword-specific historical data
      _entityType = 'keyword';
      const deviceSelect = deviceApiValue ? ', segments.device' : '';
      const deviceWhere = deviceApiValue ? `AND segments.device = '${deviceApiValue}'` : '';
      query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversions_value,
          ad_group_criterion.criterion_id,
          ad_group_criterion.keyword.text,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name
          ${deviceSelect}
        FROM keyword_view
        WHERE ad_group_criterion.criterion_id = ${keywordId}
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ${deviceWhere}
        ORDER BY segments.date ASC
      `;
    } else if (adGroupId) {
      // Ad Group-specific historical data
      _entityType = 'adGroup';
      const deviceSelect = deviceApiValue ? ', segments.device' : '';
      const deviceWhere = deviceApiValue ? `AND segments.device = '${deviceApiValue}'` : '';
      query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversions_value,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name
          ${deviceSelect}
        FROM ad_group
        WHERE ad_group.id = ${adGroupId}
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ${deviceWhere}
        ORDER BY segments.date ASC
      `;
    } else if (campaignId) {
      // Campaign-specific historical data
      _entityType = 'campaign';
      const deviceSelect = deviceApiValue ? ', segments.device' : '';
      const deviceWhere = deviceApiValue ? `AND segments.device = '${deviceApiValue}'` : '';
      query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversions_value,
          campaign.id,
          campaign.name
          ${deviceSelect}
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ${deviceWhere}
        ORDER BY segments.date ASC
      `;
    } else {
      // Account-level historical data (existing functionality)
      _entityType = 'account';
      const deviceSelect = deviceApiValue ? ', segments.device' : '';
      const deviceWhere = deviceApiValue ? `AND segments.device = '${deviceApiValue}'` : '';
      query = `
        SELECT
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversions_value
          ${deviceSelect}
        FROM campaign
        WHERE campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ${deviceWhere}
        ORDER BY segments.date ASC
      `;
    }

    const queryResult = await customer.query(query);

    // Group data by date and aggregate metrics
    const dailyData: { [key: string]: any } = {};

    queryResult.forEach((row: any) => {
      const date = row.segments?.date;
      if (!date) return;

      // Handle different possible date formats
      let formattedDate: string;
      
      if (typeof date === 'string') {
        if (date.includes('-') && date.length === 10) {
          formattedDate = date;
        } else if (date.length === 8) {
          const year = date.slice(0, 4);
          const month = date.slice(4, 6);
          const day = date.slice(6, 8);
          formattedDate = `${year}-${month}-${day}`;
        } else {
          return;
        }
      } else if (typeof date === 'object' && date.year && date.month && date.day) {
        const year = date.year.toString();
        const month = date.month.toString().padStart(2, '0');
        const day = date.day.toString().padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      } else {
        return;
      }
      
      if (!dailyData[formattedDate]) {
        const dateObj = new Date(formattedDate);
        dailyData[formattedDate] = {
          date: formattedDate,
          dateFormatted: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionsValue: 0,
          costMicros: 0
        };
      }

      // Aggregate metrics for the day
      dailyData[formattedDate].impressions += row.metrics?.impressions || 0;
      dailyData[formattedDate].clicks += row.metrics?.clicks || 0;
      dailyData[formattedDate].costMicros += row.metrics?.cost_micros || 0;
      dailyData[formattedDate].conversions += row.metrics?.conversions || 0;
      dailyData[formattedDate].conversionsValue += row.metrics?.conversions_value || 0;
    });

    // Calculate derived metrics for each day using utility
    const historicalData = Object.values(dailyData).map((day: any) => {
      const cost = day.costMicros / 1000000;
      
      const calculatedMetrics = calculateAllMetrics({
        impressions: day.impressions,
        clicks: day.clicks,
        cost: cost,
        conversions: day.conversions,
        conversionsValue: day.conversionsValue
      });
      
      return {
        date: day.date,
        dateFormatted: day.dateFormatted,
        ...calculatedMetrics
      };
    });

    // Sort by date
    historicalData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Cache with smart TTL - historical data that doesn't include today can be cached longer
    const ttl = serverCache.getSmartTTL(endDateStr, ServerCache.TTL.METRICS);
    serverCache.set(cacheKey, historicalData, ttl);

    const response = NextResponse.json({
      success: true,
      data: historicalData,
      cached: false
    });
    response.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=3600');
    return response;

  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch historical data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
