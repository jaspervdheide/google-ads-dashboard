import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { calculateComparisonPeriods } from '@/utils/dateUtils';
import { calculateAllMetrics, calculatePercentageChange } from '@/utils/metricsCalculator';
import { convertCostFromMicros } from '@/utils/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange');

    if (!customerId || !dateRange) {
      return NextResponse.json({
        success: false,
        message: 'Customer ID and date range are required'
      }, { status: 400 });
    }

    console.log(`🔍 Fetching KPI comparison for customer ${customerId} with ${dateRange} days range...`);

    const days = parseInt(dateRange);
    
    // Calculate comparison periods using utility
    const { currentPeriod, previousPeriod } = calculateComparisonPeriods(days);

    // Create Google Ads connection using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Function to fetch data for a date range
    const fetchPeriodData = async (startDateStr: string, endDateStr: string) => {
      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
      `;

      console.log(`📊 Fetching data from ${startDateStr} to ${endDateStr}`);
      const response = await customer.query(query);

      // Aggregate all metrics for the period
      let totals = {
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionsValue: 0
      };

      response.forEach((row: any) => {
        totals.impressions += row.metrics?.impressions || 0;
        totals.clicks += row.metrics?.clicks || 0;
        totals.cost += convertCostFromMicros(row.metrics?.cost_micros || 0); // Convert micros to currency
        totals.conversions += row.metrics?.conversions || 0;
        totals.conversionsValue += row.metrics?.conversions_value || 0;
      });

      // Calculate derived metrics using utility
      return calculateAllMetrics(totals);
    };

    // Fetch data for both periods using utility date strings
    const [currentPeriodData, previousPeriodData] = await Promise.all([
      fetchPeriodData(currentPeriod.startDateStr, currentPeriod.endDateStr),
      fetchPeriodData(previousPeriod.startDateStr, previousPeriod.endDateStr)
    ]);

    console.log('📊 Current Period Totals:', currentPeriodData);
    console.log('📊 Previous Period Totals:', previousPeriodData);

    // Calculate percentage changes for each KPI using utility
    const kpiChanges = {
      clicks: calculatePercentageChange(currentPeriodData.clicks, previousPeriodData.clicks),
      impressions: calculatePercentageChange(currentPeriodData.impressions, previousPeriodData.impressions),
      ctr: calculatePercentageChange(currentPeriodData.ctr, previousPeriodData.ctr),
      avgCpc: calculatePercentageChange(currentPeriodData.avgCpc, previousPeriodData.avgCpc),
      cost: calculatePercentageChange(currentPeriodData.cost, previousPeriodData.cost),
      conversions: calculatePercentageChange(currentPeriodData.conversions, previousPeriodData.conversions),
      conversionsValue: calculatePercentageChange(currentPeriodData.conversionsValue, previousPeriodData.conversionsValue),
      conversionRate: calculatePercentageChange(currentPeriodData.conversionRate, previousPeriodData.conversionRate),
      cpa: calculatePercentageChange(currentPeriodData.cpa, previousPeriodData.cpa),
      poas: calculatePercentageChange(currentPeriodData.poas || 0, previousPeriodData.poas || 0)
    };

    console.log('📊 KPI Percentage Changes:', kpiChanges);

    return NextResponse.json({
      success: true,
      data: {
        changes: kpiChanges,
        currentPeriod: {
          startDate: currentPeriod.startDateStr,
          endDate: currentPeriod.endDateStr,
          totals: currentPeriodData
        },
        previousPeriod: {
          startDate: previousPeriod.startDateStr,
          endDate: previousPeriod.endDateStr,
          totals: previousPeriodData
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching KPI comparison:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch KPI comparison',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 