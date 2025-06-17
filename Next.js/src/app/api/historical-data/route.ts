import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange, formatDateForGoogleAds } from '@/utils/dateUtils';
import { calculateAllMetrics } from '@/utils/metricsCalculator';
import { formatDateForAPI } from '@/utils/dateHelpers';
import { handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    const campaignId = searchParams.get('campaignId');
    const adGroupId = searchParams.get('adGroupId');
    const keywordId = searchParams.get('keywordId');
    
    if (!customerId) {
      return handleApiError(new Error('Customer ID is required'), 'Historical Data');
    }

    logger.apiStart('Historical Data', { customerId, dateRange, campaignId, adGroupId, keywordId });

    // Calculate date range
    const days = parseInt(dateRange);
    const endDate = new Date();
    const _startDate = new Date(endDate);
    _startDate.setDate(endDate.getDate() - days);
    const _endDateFormatted = formatDateForAPI(endDate);

    console.log(`Fetching historical data for customer ${customerId} with ${dateRange} days range...`);

    // Calculate date range using utility
    const { startDate, endDate: utilEndDate, startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Create Google Ads connection using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Build query based on what data is requested
    let query = '';
    let entityType = 'account';
    
    if (keywordId) {
      // Keyword-specific historical data
      entityType = 'keyword';
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
        FROM keyword_view
        WHERE ad_group_criterion.criterion_id = ${keywordId}
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ORDER BY segments.date ASC
      `;
    } else if (adGroupId) {
      // Ad Group-specific historical data
      entityType = 'adGroup';
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
        FROM ad_group
        WHERE ad_group.id = ${adGroupId}
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ORDER BY segments.date ASC
      `;
    } else if (campaignId) {
      // Campaign-specific historical data
      entityType = 'campaign';
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
        FROM campaign
        WHERE campaign.id = ${campaignId}
          AND campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ORDER BY segments.date ASC
      `;
    } else {
      // Account-level historical data (existing functionality)
      entityType = 'account';
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
        FROM campaign
        WHERE campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        ORDER BY segments.date ASC
      `;
    }

    console.log(`Executing ${entityType} historical data query:`, query);

    const response = await customer.query(query);

    // Group data by date and aggregate metrics
    const dailyData: { [key: string]: any } = {};

    response.forEach((row: any) => {
      const date = row.segments?.date;
      if (!date) return;

      // Handle different possible date formats
      let formattedDate: string;
      
      if (typeof date === 'string') {
        if (date.includes('-') && date.length === 10) {
          // Already in YYYY-MM-DD format
          formattedDate = date;
        } else if (date.length === 8) {
          // YYYYMMDD format
          const year = date.slice(0, 4);
          const month = date.slice(4, 6);
          const day = date.slice(6, 8);
          formattedDate = `${year}-${month}-${day}`;
        } else {
          console.warn('⚠️ Unexpected date format:', date);
          return;
        }
      } else if (typeof date === 'object' && date.year && date.month && date.day) {
        // Date object format {year: 2025, month: 5, day: 29}
        const year = date.year.toString();
        const month = date.month.toString().padStart(2, '0');
        const day = date.day.toString().padStart(2, '0');
        formattedDate = `${year}-${month}-${day}`;
      } else {
        console.warn('⚠️ Could not parse date:', date);
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
      const cost = day.costMicros / 1000000; // Convert micros to actual currency
      
      // Use metrics calculator utility
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

    console.log(`Successfully retrieved ${historicalData.length} days of historical data`);

    return NextResponse.json({
      success: true,
      data: historicalData
    });

  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch historical data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 