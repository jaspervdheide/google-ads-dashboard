import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

// Initialize Google Ads API client
const client = new GoogleAdsApi({
  client_id: process.env.CLIENT_ID!,
  client_secret: process.env.CLIENT_SECRET!,
  developer_token: process.env.DEVELOPER_TOKEN!,
});

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
    
    // Calculate current period
    const currentEndDate = new Date();
    const currentStartDate = new Date();
    currentStartDate.setDate(currentEndDate.getDate() - days);
    
    // Calculate previous period (same duration)
    const previousEndDate = new Date(currentStartDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1); // End one day before current period
    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setDate(previousStartDate.getDate() - days + 1);

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    };

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    // Function to fetch data for a date range
    const fetchPeriodData = async (startDate: Date, endDate: Date) => {
      const query = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM campaign
        WHERE campaign.status = 'ENABLED'
          AND segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
      `;

      console.log(`📊 Fetching data from ${formatDate(startDate)} to ${formatDate(endDate)}`);
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
        totals.cost += (row.metrics?.cost_micros || 0) / 1000000; // Convert micros to currency
        totals.conversions += row.metrics?.conversions || 0;
        totals.conversionsValue += row.metrics?.conversions_value || 0;
      });

      // Calculate derived metrics
      const derivedTotals = {
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
        conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
        poas: totals.cost > 0 ? (totals.conversionsValue / totals.cost) * 100 : 0
      };

      return derivedTotals;
    };

    // Fetch data for both periods
    const [currentPeriod, previousPeriod] = await Promise.all([
      fetchPeriodData(currentStartDate, currentEndDate),
      fetchPeriodData(previousStartDate, previousEndDate)
    ]);

    console.log('📊 Current Period Totals:', currentPeriod);
    console.log('📊 Previous Period Totals:', previousPeriod);

    // Calculate percentage changes for each KPI
    const calculatePercentageChange = (current: number, previous: number): number => {
      if (previous === 0) {
        return current > 0 ? 100 : 0; // If previous was 0 and current > 0, show 100% increase
      }
      return ((current - previous) / previous) * 100;
    };

    const kpiChanges = {
      clicks: calculatePercentageChange(currentPeriod.clicks, previousPeriod.clicks),
      impressions: calculatePercentageChange(currentPeriod.impressions, previousPeriod.impressions),
      ctr: calculatePercentageChange(currentPeriod.ctr, previousPeriod.ctr),
      avgCpc: calculatePercentageChange(currentPeriod.avgCpc, previousPeriod.avgCpc),
      cost: calculatePercentageChange(currentPeriod.cost, previousPeriod.cost),
      conversions: calculatePercentageChange(currentPeriod.conversions, previousPeriod.conversions),
      conversionsValue: calculatePercentageChange(currentPeriod.conversionsValue, previousPeriod.conversionsValue),
      conversionRate: calculatePercentageChange(currentPeriod.conversionRate, previousPeriod.conversionRate),
      cpa: calculatePercentageChange(currentPeriod.cpa, previousPeriod.cpa),
      poas: calculatePercentageChange(currentPeriod.poas, previousPeriod.poas)
    };

    console.log('📊 KPI Percentage Changes:', kpiChanges);

    return NextResponse.json({
      success: true,
      data: {
        changes: kpiChanges,
        currentPeriod: {
          startDate: formatDate(currentStartDate),
          endDate: formatDate(currentEndDate),
          totals: currentPeriod
        },
        previousPeriod: {
          startDate: formatDate(previousStartDate),
          endDate: formatDate(previousEndDate),
          totals: previousPeriod
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