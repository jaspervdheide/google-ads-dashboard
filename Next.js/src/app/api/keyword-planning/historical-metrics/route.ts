import { NextRequest, NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

// Use same client initialization pattern as existing APIs
const client = new GoogleAdsApi({
  client_id: process.env.CLIENT_ID!,
  client_secret: process.env.CLIENT_SECRET!,
  developer_token: process.env.DEVELOPER_TOKEN!,
});

interface MonthlyData {
  month: string;
  searchVolume: number;
  clicks: number;
  cost: number;
  formattedMonth: string;
  competitionLevel: string;
  marketShareCaptured: number;
  avgImpressionShare: number;
}

interface KeywordMetrics {
  keyword: string;
  avgMonthlySearches: number;
  impressions: number;
  clicks: number;
  cost: number;
  impressionShare: number;
  estimatedMarketVolume: number;
  competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  missedOpportunity: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId: string | null = searchParams.get('customerId');
    const dateRange: string = searchParams.get('dateRange') || '30';
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }

    console.log(`[Keyword Planning] Fetching enhanced keyword metrics for customer ${customerId}`);
    
    // Get customer instance using same pattern
    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    // Enhanced query to get comprehensive keyword data
    const keywordsQuery = `
      SELECT 
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        campaign.name,
        campaign.advertising_channel_type,
        metrics.clicks,
        metrics.impressions,
        metrics.cost_micros,
        metrics.search_impression_share,
        metrics.search_exact_match_impression_share,
        metrics.search_top_impression_share,
        metrics.ctr,
        metrics.average_cpc,
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
    
    console.log(`[Keyword Planning] Found ${keywordsData.length} keyword records`);

    if (keywordsData.length === 0) {
      return NextResponse.json({
        success: false,
        message: "❌ No keywords found for analysis"
      }, { status: 404 });
    }

    // Process and aggregate keyword data with enhanced market intelligence
    const keywordMetrics: { [key: string]: KeywordMetrics } = {};
    const monthlyAggregates: { [key: string]: {
      searchVolume: number;
      clicks: number;
      cost: number;
      impressionShares: number[];
      competitionLevels: string[];
    }} = {};

    keywordsData.forEach((row: any) => {
      const keyword = row.ad_group_criterion?.keyword?.text;
      const dateStr = row.segments?.date;
      
      if (keyword && dateStr) {
        const monthKey = `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}`;
        
        // Initialize keyword metrics
        if (!keywordMetrics[keyword]) {
          keywordMetrics[keyword] = {
            keyword,
            avgMonthlySearches: 0,
            impressions: 0,
            clicks: 0,
            cost: 0,
            impressionShare: 0,
            estimatedMarketVolume: 0,
            competitionLevel: 'MEDIUM',
            missedOpportunity: 0
          };
        }

        // Aggregate keyword data
        const impressions = Number(row.metrics?.impressions) || 0;
        const clicks = Number(row.metrics?.clicks) || 0;
        const cost = (Number(row.metrics?.cost_micros) || 0) / 1000000;
        const impressionShare = Number(row.metrics?.search_impression_share) || 0;
        const ctr = Number(row.metrics?.ctr) || 0;

        keywordMetrics[keyword].impressions += impressions;
        keywordMetrics[keyword].clicks += clicks;
        keywordMetrics[keyword].cost += cost;
        
        // Calculate enhanced market intelligence
        if (impressions > 0 && impressionShare > 0) {
          const estimatedMarketVolume = Math.round(impressions / impressionShare);
          keywordMetrics[keyword].estimatedMarketVolume += estimatedMarketVolume;
          keywordMetrics[keyword].impressionShare = Math.max(keywordMetrics[keyword].impressionShare, impressionShare);
          
          // Determine competition level based on impression share and CTR
          if (impressionShare < 0.3 || ctr < 0.02) {
            keywordMetrics[keyword].competitionLevel = 'HIGH';
          } else if (impressionShare > 0.7 && ctr > 0.05) {
            keywordMetrics[keyword].competitionLevel = 'LOW';
          } else {
            keywordMetrics[keyword].competitionLevel = 'MEDIUM';
          }
        }

        // Initialize monthly aggregates
        if (!monthlyAggregates[monthKey]) {
          monthlyAggregates[monthKey] = {
            searchVolume: 0,
            clicks: 0,
            cost: 0,
            impressionShares: [],
            competitionLevels: []
          };
        }

        // Aggregate monthly data
        if (impressions > 0 && impressionShare > 0) {
          const monthlyMarketVolume = Math.round(impressions / impressionShare);
          monthlyAggregates[monthKey].searchVolume += monthlyMarketVolume;
          monthlyAggregates[monthKey].impressionShares.push(impressionShare);
        }
        
        monthlyAggregates[monthKey].clicks += clicks;
        monthlyAggregates[monthKey].cost += cost;
        monthlyAggregates[monthKey].competitionLevels.push(keywordMetrics[keyword].competitionLevel);
      }
    });

    // Calculate missed opportunities for each keyword
    Object.values(keywordMetrics).forEach(keyword => {
      if (keyword.impressionShare > 0) {
        keyword.missedOpportunity = keyword.estimatedMarketVolume - keyword.impressions;
        keyword.avgMonthlySearches = Math.round(keyword.estimatedMarketVolume / Math.max(1, parseInt(dateRange) / 30));
      }
    });

    // Convert to monthly data format
    const monthlyData: MonthlyData[] = Object.entries(monthlyAggregates)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([monthKey, data]) => {
        const avgImpressionShare = data.impressionShares.length > 0 
          ? data.impressionShares.reduce((sum, share) => sum + share, 0) / data.impressionShares.length 
          : 0;
        
        const marketShareCaptured = data.searchVolume > 0 ? (data.clicks / data.searchVolume * 100) : 0;
        
        // Determine overall competition level for the month
        const competitionCounts = data.competitionLevels.reduce((acc: any, level) => {
          acc[level] = (acc[level] || 0) + 1;
          return acc;
        }, {});
        
        const dominantCompetition = Object.entries(competitionCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'MEDIUM';

        return {
          month: monthKey,
          searchVolume: data.searchVolume,
          clicks: data.clicks,
          cost: data.cost,
          formattedMonth: new Date(monthKey + '-01').toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          }),
          competitionLevel: dominantCompetition,
          marketShareCaptured,
          avgImpressionShare: avgImpressionShare * 100
        };
      });

    // Calculate summary metrics
    const totalSearchVolume = monthlyData.reduce((sum, d) => sum + d.searchVolume, 0);
    const totalClicks = monthlyData.reduce((sum, d) => sum + d.clicks, 0);
    const totalCost = monthlyData.reduce((sum, d) => sum + d.cost, 0);
    const marketCaptureRate = totalSearchVolume > 0 ? (totalClicks / totalSearchVolume * 100) : 0;
    const avgImpressionShare = monthlyData.length > 0 
      ? monthlyData.reduce((sum, d) => sum + d.avgImpressionShare, 0) / monthlyData.length 
      : 0;

    // Get top opportunities (keywords with high missed opportunity)
    const topOpportunities = Object.values(keywordMetrics)
      .sort((a, b) => b.missedOpportunity - a.missedOpportunity)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      message: `✅ Enhanced keyword intelligence for ${Object.keys(keywordMetrics).length} keywords`,
      data: {
        monthlyData,
        summary: {
          totalKeywords: Object.keys(keywordMetrics).length,
          totalSearchVolume,
          totalClicks,
          totalCost,
          marketCaptureRate,
          avgImpressionShare,
          totalMissedOpportunity: topOpportunities.reduce((sum, k) => sum + k.missedOpportunity, 0)
        },
        dateRange: {
          days: parseInt(dateRange),
          monthsAnalyzed: monthlyData.length
        },
        keywordDetails: keywordMetrics,
        topOpportunities,
        calculationMethod: "enhanced_impression_share_analysis",
        dataSource: "Google Ads Performance Data + Market Intelligence"
      }
    });

  } catch (error) {
    console.error('[Keyword Planning] Error:', error);
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch keyword historical metrics",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 