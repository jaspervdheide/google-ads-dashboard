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
        metrics.search_impression_share,
        segments.date
      FROM keyword_view 
      WHERE campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING')
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND ad_group_criterion.type = 'KEYWORD'
        AND ad_group_criterion.status = 'ENABLED'
        AND segments.date BETWEEN '${(() => {
          const endDate = new Date();
          const startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - parseInt(dateRange));
          return startDate.toISOString().split('T')[0].replace(/-/g, '');
        })()}' AND '${(() => {
          const endDate = new Date();
          return endDate.toISOString().split('T')[0].replace(/-/g, '');
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

    // Process data to calculate real search volume using impression share
    // Formula: Market Search Volume = Your Impressions ÷ Search Impression Share
    const monthlySearchVolume: MonthlySearchVolumeData = {};
    const monthlyClicks: MonthlySearchVolumeData = {};
    const monthlyCost: MonthlySearchVolumeData = {};
    const keywordSearchVolumes: { [key: string]: any } = {};
    
    // Process keywords data into monthly aggregation with real search volume calculation
    keywordsData.forEach((row: any) => {
      if (row.segments?.date) {
        const dateStr = row.segments.date;
        const monthKey = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}`;
        
        // Initialize month if not exists
        if (!monthlyClicks[monthKey]) {
          monthlyClicks[monthKey] = 0;
          monthlyCost[monthKey] = 0;
          monthlySearchVolume[monthKey] = 0;
        }
        
        // Aggregate clicks and cost
        monthlyClicks[monthKey] += Number(row.metrics?.clicks) || 0;
        monthlyCost[monthKey] += (Number(row.metrics?.cost_micros) || 0) / 1000000;
        
        // Calculate market search volume from impression share
        const impressions = Number(row.metrics?.impressions) || 0;
        const searchImpressionShare = Number(row.metrics?.search_impression_share) || 0;
        
        if (impressions > 0 && searchImpressionShare > 0) {
          // Market search volume = impressions ÷ impression share
          const estimatedMarketVolume = Math.round(impressions / searchImpressionShare);
          monthlySearchVolume[monthKey] += estimatedMarketVolume;
          
          // Store individual keyword metrics for detailed analysis
          const keywordText = row.ad_group_criterion?.keyword?.text;
          if (keywordText && !keywordSearchVolumes[keywordText]) {
            keywordSearchVolumes[keywordText] = {
              impressions: impressions,
              impressionShare: searchImpressionShare,
              estimatedMarketVolume: estimatedMarketVolume,
              clicks: Number(row.metrics?.clicks) || 0,
              cost: (Number(row.metrics?.cost_micros) || 0) / 1000000
            };
          }
        }
      }
    });

    console.log(`[Keyword Planning] Processed ${Object.keys(monthlySearchVolume).length} months of data with real search volume calculation`);

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
      message: `✅ Retrieved search volume data for ${uniqueKeywords.length} keywords using real impression share data`,
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
        keywordSearchVolumes, // Individual keyword search volumes for drill-down
        calculationMethod: "search_impression_share" // Indicate the calculation method
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