import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache } from '@/utils/serverCache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountIds = searchParams.get('accountIds'); // Comma-separated account IDs
    const dateRange = searchParams.get('dateRange') || '30';
    
    if (!accountIds) {
      return NextResponse.json({
        success: false,
        message: 'Account IDs are required'
      }, { status: 400 });
    }

    const accountIdList = accountIds.split(',').filter(Boolean);
    
    if (accountIdList.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'At least one account ID is required'
      }, { status: 400 });
    }

    // Calculate date range
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('mcc-historical', {
      accountIds: accountIdList.sort().join(','),
      startDate: startDateStr,
      endDate: endDateStr
    });

    // Check cache first
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      const response = NextResponse.json({
        success: true,
        data: cachedData,
        cached: true
      });
      response.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=3600');
      return response;
    }

    // Fetch historical data for each account in parallel
    const accountDataPromises = accountIdList.map(async (customerId) => {
      try {
        const { customer } = createGoogleAdsConnection(customerId);
        
        const query = `
          SELECT
            segments.date,
            metrics.impressions,
            metrics.clicks,
            metrics.cost_micros,
            metrics.conversions,
            metrics.conversions_value
          FROM customer
          WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          ORDER BY segments.date ASC
        `;

        const response = await customer.query(query);
        
        const dailyData: { [date: string]: any } = {};
        
        for (const row of response) {
          const date = row.segments?.date;
          if (!date) continue;
          
          const impressions = Number(row.metrics?.impressions || 0);
          const clicks = Number(row.metrics?.clicks || 0);
          const costMicros = Number(row.metrics?.cost_micros || 0);
          const conversions = Number(row.metrics?.conversions || 0);
          const conversionsValue = Number(row.metrics?.conversions_value || 0);
          
          if (!dailyData[date]) {
            dailyData[date] = {
              date,
              impressions: 0,
              clicks: 0,
              cost: 0,
              conversions: 0,
              conversionsValue: 0
            };
          }
          
          dailyData[date].impressions += impressions;
          dailyData[date].clicks += clicks;
          dailyData[date].cost += costMicros / 1000000;
          dailyData[date].conversions += conversions;
          dailyData[date].conversionsValue += conversionsValue;
        }
        
        // Calculate derived metrics
        Object.values(dailyData).forEach((day: any) => {
          day.ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
          day.avgCpc = day.clicks > 0 ? day.cost / day.clicks : 0;
          day.roas = day.cost > 0 ? day.conversionsValue / day.cost : 0;
          day.cpa = day.conversions > 0 ? day.cost / day.conversions : 0;
        });
        
        return {
          customerId,
          data: Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date))
        };
      } catch (error) {
        console.error(`Error fetching historical data for account ${customerId}:`, error);
        return { customerId, data: [], error: true };
      }
    });

    const accountResults = await Promise.all(accountDataPromises);
    
    // Aggregate data by date across all accounts
    const aggregatedByDate: { [date: string]: any } = {};
    
    for (const accountResult of accountResults) {
      if (accountResult.error) continue;
      
      for (const dayData of accountResult.data) {
        const date = dayData.date;
        
        if (!aggregatedByDate[date]) {
          aggregatedByDate[date] = {
            date,
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionsValue: 0
          };
        }
        
        aggregatedByDate[date].impressions += dayData.impressions;
        aggregatedByDate[date].clicks += dayData.clicks;
        aggregatedByDate[date].cost += dayData.cost;
        aggregatedByDate[date].conversions += dayData.conversions;
        aggregatedByDate[date].conversionsValue += dayData.conversionsValue;
      }
    }
    
    // Calculate derived metrics for aggregated data
    const aggregatedData = Object.values(aggregatedByDate)
      .map((day: any) => ({
        ...day,
        ctr: day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0,
        avgCpc: day.clicks > 0 ? day.cost / day.clicks : 0,
        roas: day.cost > 0 ? day.conversionsValue / day.cost : 0,
        cpa: day.conversions > 0 ? day.cost / day.conversions : 0
      }))
      .sort((a: any, b: any) => a.date.localeCompare(b.date));

    const result = {
      aggregated: aggregatedData,
      byAccount: accountResults.filter(r => !r.error)
    };

    // Cache the result
    serverCache.set(cacheKey, result, 'historical');

    const response = NextResponse.json({
      success: true,
      data: result,
      cached: false
    });
    
    response.headers.set('Cache-Control', 'private, max-age=1800, stale-while-revalidate=3600');
    return response;

  } catch (error) {
    console.error('Error in MCC historical data API:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

