import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { serverCache } from '@/utils/serverCache';
import { KeywordData, KeywordsApiResponse } from '@/types/keywords';

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

    // Generate cache key - use v5 to include triggering keyword data
    const cacheKey = serverCache.generateKey('keywords-v5', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr
    });

    // Check cache first
    const cachedData = serverCache.get<KeywordsApiResponse['data']>(cacheKey);
    if (cachedData) {
      console.log('Keywords API: Returning cached data');
      return NextResponse.json({
        success: true,
        message: 'Keyword data retrieved from cache',
        data: cachedData,
        cached: true
      });
    }

    console.log(`Keywords API: Fetching data for customer ${customerId} from ${startDateStr} to ${endDateStr}`);

    // Create Google Ads connection
    const { customer } = createGoogleAdsConnection(customerId);

    // STEP 1: Query KEYWORD VIEW for market share data (has search_impression_share)
    const keywordQuery = `
      SELECT 
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        campaign.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.search_impression_share,
        metrics.search_top_impression_share,
        metrics.search_absolute_top_impression_share
      FROM keyword_view 
      WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
      LIMIT 500
    `;
    
    console.log('Keywords API: Querying keyword_view for market share data');
    let keywordResponse: any[] = [];
    try {
      keywordResponse = await customer.query(keywordQuery);
      console.log(`Keywords API: Got ${keywordResponse.length} keyword rows with impression share`);
    } catch (e) {
      console.log('Keywords API: keyword_view query failed, continuing with search terms only');
    }
    
    // STEP 2: Query SEARCH TERMS with triggering keyword info
    // segments.keyword.info.text tells us which keyword triggered each search term
    const searchTermQuery = `
      SELECT 
        search_term_view.search_term,
        segments.keyword.info.text,
        segments.keyword.info.match_type,
        ad_group.name,
        campaign.name,
        campaign.advertising_channel_type,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM search_term_view 
      WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
        AND metrics.impressions > 0
      ORDER BY metrics.impressions DESC
      LIMIT 2000
    `;

    console.log('Keywords API: Querying search_term_view for actual search queries');
    const response = await customer.query(searchTermQuery);
    console.log(`Keywords API: Got ${response.length} search term rows`);
    
    // Debug: Log first 3 rows structure to see the actual field paths
    if (response.length > 0) {
      console.log('Keywords API: First row keys:', Object.keys(response[0]));
      console.log('Keywords API: First row full:', JSON.stringify(response[0], null, 2));
    }
    
    // Process results
    const keywordsMap = new Map<string, KeywordData>();
    let skippedEmpty = 0;
    
    for (const row of response) {
      // The google-ads-api library uses camelCase for top-level and can be snake_case for nested
      const rowAny = row as any;
      
      // Get the search term (actual query user typed)
      let searchTermText = 
        rowAny.search_term_view?.search_term ||
        rowAny.searchTermView?.searchTerm ||
        rowAny.searchTermView?.search_term ||
        '';
      
      // Get the triggering keyword (the keyword that matched this search term)
      const triggeringKeyword = 
        rowAny.segments?.keyword?.info?.text ||
        rowAny.segments?.keyword?.info?.matchType ||
        '';
      const triggeringKeywordMatchType = 
        rowAny.segments?.keyword?.info?.match_type ||
        rowAny.segments?.keyword?.info?.matchType ||
        '';
      
      const adGroupName = rowAny.ad_group?.name || rowAny.adGroup?.name || '';
      const campaignName = rowAny.campaign?.name || '';
      const channelType = rowAny.campaign?.advertising_channel_type || '';
      
      // Use search term as the keyword text
      let keywordText = searchTermText;
      // Use the triggering keyword's match type, or default to 'SEARCH_TERM'
      const matchType = triggeringKeywordMatchType || 'SEARCH_TERM';
      
      // Skip empty search terms
      if (!keywordText || keywordText.trim() === '') {
        skippedEmpty++;
        continue;
      }
      
      const impressions = Number(rowAny.metrics?.impressions || 0);
      const clicks = Number(rowAny.metrics?.clicks || 0);
      const costMicros = Number(rowAny.metrics?.cost_micros || 0);
      const conversions = Number(rowAny.metrics?.conversions || 0);
      const conversionsValue = Number(rowAny.metrics?.conversions_value || 0);
      
      const cost = costMicros / 1_000_000;
      const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
      const avgCpc = clicks > 0 ? cost / clicks : 0;
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      const cpa = conversions > 0 ? cost / conversions : 0;
      const roas = cost > 0 ? conversionsValue / cost : 0;
      
      // For search terms, we estimate search volume based on impressions
      // Higher impressions = higher search volume
      const searchImpressionShare = 0; // Not available for search terms
      const estimatedSearchVolume = impressions; // Use impressions as proxy for volume
      const missedImpressions = 0; // Can't calculate without impression share
      
      // Opportunity score based on conversions potential
      // Score higher for terms with high impressions but low conversions (room to improve)
      const opportunityScore = impressions > 100 && conversionRate < 5
        ? Math.min(100, Math.round(Math.log10(impressions) * 20 * (1 - conversionRate / 10)))
        : impressions > 100 ? Math.round(Math.log10(impressions) * 10) : 0;
      
      // Create unique key for aggregation (keyword text only)
      const key = keywordText.toLowerCase();
      
      if (keywordsMap.has(key)) {
        // Aggregate if same keyword/match type appears in multiple ad groups
        const existing = keywordsMap.get(key)!;
        existing.impressions += impressions;
        existing.clicks += clicks;
        existing.cost += cost;
        existing.conversions += conversions;
        existing.conversionsValue += conversionsValue;
        
        // Recalculate derived metrics
        existing.ctr = existing.impressions > 0 ? (existing.clicks / existing.impressions) * 100 : 0;
        existing.avgCpc = existing.clicks > 0 ? existing.cost / existing.clicks : 0;
        existing.conversionRate = existing.clicks > 0 ? (existing.conversions / existing.clicks) * 100 : 0;
        existing.cpa = existing.conversions > 0 ? existing.cost / existing.conversions : 0;
        existing.roas = existing.cost > 0 ? existing.conversionsValue / existing.cost : 0;
        
        // Use weighted average for search impression share
        const totalImpressions = existing.impressions;
        existing.searchImpressionShare = searchImpressionShare; // Take latest
        existing.estimatedSearchVolume = existing.searchImpressionShare > 0 
          ? Math.round(existing.impressions / existing.searchImpressionShare)
          : existing.impressions;
        existing.missedImpressions = Math.max(0, existing.estimatedSearchVolume - existing.impressions);
        existing.opportunityScore = existing.searchImpressionShare > 0 && existing.estimatedSearchVolume > 0
          ? Math.min(100, Math.round((1 - existing.searchImpressionShare) * Math.log10(existing.estimatedSearchVolume) * 25))
          : 0;
      } else {
        keywordsMap.set(key, {
          keyword: keywordText,
          matchType: matchType as 'EXACT' | 'PHRASE' | 'BROAD',
          adGroupName,
          campaignName,
          triggeringKeyword: triggeringKeyword || '', // The keyword that triggered this search term
          triggeringKeywordMatchType: triggeringKeywordMatchType || '',
          impressions,
          clicks,
          cost,
          conversions,
          conversionsValue,
          ctr,
          avgCpc,
          conversionRate,
          cpa,
          roas,
          searchImpressionShare,
          estimatedSearchVolume,
          missedImpressions,
          opportunityScore
        });
      }
    }
    
    // Convert to array and sort by impressions
    const keywords = Array.from(keywordsMap.values())
      .sort((a, b) => b.impressions - a.impressions);
    
    console.log(`Keywords API: Processed ${keywordsMap.size} unique keywords, skipped ${skippedEmpty} empty rows`);

    // Process keyword data for market share insights
    interface MarketShareKeyword {
      keyword: string;
      matchType: string;
      campaignName: string;
      impressions: number;
      clicks: number;
      cost: number;
      conversions: number;
      conversionsValue: number;
      searchImpressionShare: number;
      searchTopImpressionShare: number;
      searchAbsoluteTopImpressionShare: number;
      estimatedSearchVolume: number;
      missedImpressions: number;
      opportunityScore: number;
    }
    
    const marketShareKeywords: MarketShareKeyword[] = [];
    
    for (const row of keywordResponse) {
      const rowAny = row as any;
      const keywordText = rowAny.ad_group_criterion?.keyword?.text 
        || rowAny.adGroupCriterion?.keyword?.text 
        || '';
      
      if (!keywordText) continue;
      
      const impressions = Number(rowAny.metrics?.impressions || 0);
      const clicks = Number(rowAny.metrics?.clicks || 0);
      const conversions = Number(rowAny.metrics?.conversions || 0);
      const conversionsValue = Number(rowAny.metrics?.conversions_value || 0);
      const costMicros = Number(rowAny.metrics?.cost_micros || 0);
      const cost = costMicros / 1_000_000;
      
      const searchImpressionShare = Number(rowAny.metrics?.search_impression_share || 0);
      const searchTopShare = Number(rowAny.metrics?.search_top_impression_share || 0);
      const searchAbsTopShare = Number(rowAny.metrics?.search_absolute_top_impression_share || 0);
      
      // Calculate estimated search volume: Our Impressions / Our Share = Total Market
      const estimatedSearchVolume = searchImpressionShare > 0 
        ? Math.round(impressions / searchImpressionShare) 
        : impressions;
      const missedImpressions = Math.max(0, estimatedSearchVolume - impressions);
      
      // Calculate conversion rate
      const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
      
      // Opportunity score: HIGH if LOW share + HIGH conversion rate (proven intent + room to grow)
      // Formula: (1 - share) gives 0-1, multiply by conv rate bonus
      let opportunityScore = 0;
      if (searchImpressionShare > 0 && searchImpressionShare < 1) {
        const shareOpportunity = (1 - searchImpressionShare) * 50; // 0-50 points for low share
        const conversionBonus = Math.min(conversionRate * 5, 50); // 0-50 points for high conv rate
        opportunityScore = Math.round(shareOpportunity + conversionBonus);
      }
      
      marketShareKeywords.push({
        keyword: keywordText,
        matchType: rowAny.ad_group_criterion?.keyword?.match_type || rowAny.adGroupCriterion?.keyword?.matchType || 'BROAD',
        campaignName: rowAny.campaign?.name || '',
        impressions,
        clicks,
        cost,
        conversions,
        conversionsValue,
        searchImpressionShare,
        searchTopImpressionShare: searchTopShare,
        searchAbsoluteTopImpressionShare: searchAbsTopShare,
        estimatedSearchVolume,
        missedImpressions,
        opportunityScore
      });
    }
    
    // Sort by opportunity score (highest first)
    marketShareKeywords.sort((a, b) => b.opportunityScore - a.opportunityScore);
    
    // Calculate market share totals
    const totalMarketImpressions = marketShareKeywords.reduce((sum, k) => sum + k.impressions, 0);
    const totalEstimatedVolume = marketShareKeywords.reduce((sum, k) => sum + k.estimatedSearchVolume, 0);
    const totalMissedImpressions = marketShareKeywords.reduce((sum, k) => sum + k.missedImpressions, 0);
    const avgImpressionShare = marketShareKeywords.length > 0
      ? marketShareKeywords.reduce((sum, k) => sum + k.searchImpressionShare, 0) / marketShareKeywords.length
      : 0;

    // Calculate totals
    const totals = {
      totalKeywords: keywords.length,
      impressions: keywords.reduce((sum, k) => sum + k.impressions, 0),
      clicks: keywords.reduce((sum, k) => sum + k.clicks, 0),
      cost: keywords.reduce((sum, k) => sum + k.cost, 0),
      conversions: keywords.reduce((sum, k) => sum + k.conversions, 0),
      conversionsValue: keywords.reduce((sum, k) => sum + k.conversionsValue, 0),
      avgSearchImpressionShare: keywords.length > 0 
        ? keywords.reduce((sum, k) => sum + k.searchImpressionShare, 0) / keywords.length 
        : 0,
      totalEstimatedSearchVolume: keywords.reduce((sum, k) => sum + k.estimatedSearchVolume, 0),
      totalMissedImpressions: keywords.reduce((sum, k) => sum + k.missedImpressions, 0)
    };

    // Calculate trends (previous period)
    const days = parseInt(dateRange) || 30;
    const [year, month, day] = endDateStr.split('-').map(Number);
    const currentEnd = new Date(year, month - 1, day);
    
    const previousEnd = new Date(currentEnd);
    previousEnd.setDate(previousEnd.getDate() - days - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - days + 1);
    
    const formatDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };
    
    let trends = { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 };
    
    try {
      const prevQuery = `
        SELECT
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value
        FROM search_term_view
        WHERE segments.date BETWEEN '${formatDate(previousStart)}' AND '${formatDate(previousEnd)}'
          AND metrics.impressions > 0
      `;
      
      const prevResponse = await customer.query(prevQuery);
      
      let prevImpressions = 0, prevClicks = 0, prevCost = 0, prevConversions = 0, prevConversionsValue = 0;
      for (const row of prevResponse) {
        const rowAny = row as any;
        prevImpressions += Number(rowAny.metrics?.impressions || 0);
        prevClicks += Number(rowAny.metrics?.clicks || 0);
        prevConversionsValue += Number(rowAny.metrics?.conversions_value || 0);
        prevCost += Number(rowAny.metrics?.cost_micros || 0) / 1_000_000;
        prevConversions += Number(rowAny.metrics?.conversions || 0);
      }
      
      const calcChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };
      
      trends = {
        impressions: calcChange(totals.impressions, prevImpressions),
        clicks: calcChange(totals.clicks, prevClicks),
        cost: calcChange(totals.cost, prevCost),
        conversions: calcChange(totals.conversions, prevConversions),
        conversionsValue: calcChange(totals.conversionsValue, prevConversionsValue)
      };
    } catch (e) {
      console.warn('Keywords API: Could not calculate trends');
    }

    const responseData = {
      keywords,
      totals,
      trends,
      // Market Share data from keyword_view (has impression share)
      marketShare: {
        keywords: marketShareKeywords,
        totals: {
          keywordCount: marketShareKeywords.length,
          totalImpressions: totalMarketImpressions,
          estimatedSearchVolume: totalEstimatedVolume,
          missedImpressions: totalMissedImpressions,
          avgImpressionShare: avgImpressionShare,
          marketSharePercentage: totalEstimatedVolume > 0 
            ? (totalMarketImpressions / totalEstimatedVolume) * 100 
            : 0
        }
      }
    };

    // Cache the result
    const ttl = serverCache.getSmartTTL(endDateStr, 300);
    serverCache.set(cacheKey, responseData, ttl);

    console.log(`Keywords API: Returning ${keywords.length} keywords`);

    return NextResponse.json({
      success: true,
      message: `Retrieved ${keywords.length} keywords with performance data`,
      data: responseData,
      cached: false
    });

  } catch (error: any) {
    console.error('Keywords API Error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch keyword data',
      error: error.message
    }, { status: 500 });
  }
}
