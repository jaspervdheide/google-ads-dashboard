import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

// Use same client initialization pattern as existing APIs
const client = new GoogleAdsApi({
  client_id: process.env.CLIENT_ID!,
  client_secret: process.env.CLIENT_SECRET!,
  developer_token: process.env.DEVELOPER_TOKEN!,
});

interface MonthlySearchVolumeData {
  [key: string]: number;
}

interface MonthlyData {
  month: string;
  searchVolume: number;
  clicks: number;
  cost: number;
  formattedMonth: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }

    console.log(`[Keyword Planning] Fetching search volume data for customer ${customerId}`);
    
    // Get customer instance using same pattern
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    // First, get existing keywords from same query pattern as keywords API
    const keywordsQuery = `
      SELECT 
        ad_group_criterion.keyword.text,
        campaign.name,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        segments.date
      FROM keyword_view 
      WHERE campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING')
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date >= '${(() => {
          const date = new Date();
          date.setDate(date.getDate() - parseInt(dateRange));
          return date.toISOString().split('T')[0].replace(/-/g, '');
        })()}'
      ORDER BY metrics.impressions DESC
      LIMIT 1000
    `;

    const keywordsData = await customer.query(keywordsQuery);
    
    // Extract unique keywords for search volume lookup
    const uniqueKeywords = [...new Set(
      keywordsData.map((row: any) => row.ad_group_criterion?.keyword?.text).filter(Boolean)
    )];

    console.log(`[Keyword Planning] Found ${uniqueKeywords.length} unique keywords`);

    // For now, create mock search volume data until we can properly implement the Keyword Planner API
    // The Google Ads API v15+ has changed how keyword planning works
    const monthlySearchVolume: MonthlySearchVolumeData = {};
    const keywordSearchVolumes: { [key: string]: any } = {};
    
    // Generate sample data for demonstration
    uniqueKeywords.forEach((keyword: string) => {
      keywordSearchVolumes[keyword] = {
        averageMonthlySearches: Math.floor(Math.random() * 10000) + 100,
        competitionIndex: Math.random() * 100,
        lowTopOfPageBidMicros: Math.floor(Math.random() * 5000000) + 100000,
        highTopOfPageBidMicros: Math.floor(Math.random() * 10000000) + 1000000,
      };
    });

    // Process clicks data into monthly aggregation (same pattern as campaigns API)
    const monthlyClicks: MonthlySearchVolumeData = {};
    const monthlyCost: MonthlySearchVolumeData = {};
    
    keywordsData.forEach((row: any) => {
      if (row.segments?.date) {
        const dateStr = row.segments.date;
        const monthKey = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}`;
        
        if (!monthlyClicks[monthKey]) {
          monthlyClicks[monthKey] = 0;
          monthlyCost[monthKey] = 0;
        }
        
        monthlyClicks[monthKey] += Number(row.metrics?.clicks) || 0;
        monthlyCost[monthKey] += (Number(row.metrics?.cost_micros) || 0) / 1000000;
      }
    });

    // Generate sample monthly search volume data
    Object.keys(monthlyClicks).forEach(month => {
      monthlySearchVolume[month] = Math.floor(Math.random() * 50000) + 1000;
    });

    // Combine data for visualization
    const combinedMonthlyData: MonthlyData[] = [];
    const allMonths = new Set([
      ...Object.keys(monthlySearchVolume),
      ...Object.keys(monthlyClicks)
    ]);

    Array.from(allMonths).sort().forEach(month => {
      combinedMonthlyData.push({
        month,
        searchVolume: monthlySearchVolume[month] || 0,
        clicks: monthlyClicks[month] || 0,
        cost: monthlyCost[month] || 0,
        formattedMonth: new Date(month + '-01').toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      });
    });

    // Calculate summary metrics
    const totalSearchVolume = combinedMonthlyData.reduce((sum, d) => sum + d.searchVolume, 0);
    const totalClicks = combinedMonthlyData.reduce((sum, d) => sum + d.clicks, 0);
    const totalCost = combinedMonthlyData.reduce((sum, d) => sum + d.cost, 0);
    const marketCaptureRate = totalSearchVolume > 0 ? (totalClicks / totalSearchVolume * 100) : 0;

    return NextResponse.json({
      success: true,
      message: `✅ Retrieved search volume data for ${uniqueKeywords.length} keywords (demo data)`,
      data: {
        monthlyData: combinedMonthlyData,
        summary: {
          totalKeywords: uniqueKeywords.length,
          totalSearchVolume,
          totalClicks,
          totalCost,
          marketCaptureRate
        },
        dateRange: {
          days: parseInt(dateRange),
          monthsAnalyzed: combinedMonthlyData.length
        },
        keywordSearchVolumes // Individual keyword search volumes for drill-down
      }
    });

  } catch (error) {
    console.error('[Keyword Planning] Error:', error);
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch search volume data",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 