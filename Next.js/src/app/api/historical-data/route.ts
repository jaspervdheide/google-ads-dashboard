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

    console.log(`Fetching historical data for customer ${customerId} with ${dateRange} days range...`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(dateRange));

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0].replace(/-/g, '');
    };

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    // Query for daily historical data
    const query = `
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
        AND segments.date BETWEEN '${formatDate(startDate)}' AND '${formatDate(endDate)}'
      ORDER BY segments.date ASC
    `;

    console.log('Executing historical data query:', query);

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

    // Calculate derived metrics for each day
    const historicalData = Object.values(dailyData).map((day: any) => {
      day.cost = day.costMicros / 1000000; // Convert micros to actual currency
      day.ctr = day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0;
      day.avgCpc = day.clicks > 0 ? day.cost / day.clicks : 0;
      day.conversionRate = day.clicks > 0 ? (day.conversions / day.clicks) * 100 : 0;
      day.cpa = day.conversions > 0 ? day.cost / day.conversions : 0;
      day.roas = day.cost > 0 ? day.conversionsValue / day.cost : 0;
      day.poas = day.cost > 0 ? (day.conversionsValue / day.cost) * 100 : 0; // POAS as percentage
      
      // Remove costMicros as it's not needed in the response
      delete day.costMicros;
      
      return day;
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