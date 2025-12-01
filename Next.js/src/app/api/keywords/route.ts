import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError } from '@/utils/errorHandler';
import { CampaignTypeDetector, MatchTypeUtilities } from '@/utils/queryBuilder';
import { logger } from '@/utils/logger';
import { calculateDerivedMetrics, calculateZeroPerformanceStats, convertCostFromMicros } from '@/utils/apiHelpers';
import { serverCache, ServerCache } from '@/utils/serverCache';

// Data normalization function
const normalizeKeywordData = (data: any[], type: 'keyword' | 'search_term') => {
  return data.map(item => {
    let matchType = 'SEARCH_TERM';
    
    if (type === 'keyword') {
      const rawMatchType = item.ad_group_criterion?.keyword?.match_type;
      matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'BROAD';
    } else if (type === 'search_term') {
      const rawMatchType = item.segments?.keyword?.info?.match_type;
      if (rawMatchType) {
        matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'SEARCH_TERM';
      } else {
        matchType = 'SEARCH_TERM';
      }
    }
    
    return {
      id: item.ad_group_criterion?.criterion_id || item.search_term_view?.resource_name || `${type}_${item.ad_group?.id || 'unknown'}_${Date.now()}`,
      keyword_text: item.ad_group_criterion?.keyword?.text || item.search_term_view?.search_term,
      match_type: matchType,
      type: type,
      status: item.ad_group_criterion?.status || item.search_term_view?.status || 'ENABLED',
      quality_score: item.ad_group_criterion?.quality_info?.quality_score,
      creative_quality: item.ad_group_criterion?.quality_info?.creative_quality_score || null,
      landing_page_quality: item.ad_group_criterion?.quality_info?.post_click_quality_score || null,
      expected_ctr: item.ad_group_criterion?.quality_info?.search_predicted_ctr || null,
      final_urls: item.ad_group_criterion?.final_urls || [],
      ad_group_id: item.ad_group?.id?.toString(),
      ad_group_name: item.ad_group?.name,
      campaign_id: item.campaign?.id?.toString(),
      campaign_name: item.campaign?.name,
      campaign_type: item.campaign?.advertising_channel_type,
      detected_campaign_type: CampaignTypeDetector.detectCampaignType(item.campaign?.name || ''),
      triggering_keyword: type === 'search_term' ? item.segments?.keyword?.info?.text : null,
      triggering_keyword_match_type: type === 'search_term' ? MatchTypeUtilities.getMatchTypeString(item.segments?.keyword?.info?.match_type) : null,
      impressions: Number(item.metrics?.impressions) || 0,
      clicks: Number(item.metrics?.clicks) || 0,
      cost: item.metrics?.cost_micros ? convertCostFromMicros(Number(item.metrics.cost_micros)) : 0,
      conversions: Number(item.metrics?.conversions) || 0,
      conversions_value: item.metrics?.conversions_value ? Number(item.metrics.conversions_value) : 0,
      cost_per_conversion: item.metrics?.cost_per_conversion ? Number(item.metrics.cost_per_conversion) / 1000000 : 0,
      ctr: item.metrics?.ctr ? Number(item.metrics.ctr) * 100 : 0,
      average_cpc: item.metrics?.average_cpc ? Number(item.metrics.average_cpc) / 1000000 : 0,
      cpc: item.metrics?.clicks > 0 && item.metrics?.cost_micros ? 
           convertCostFromMicros(Number(item.metrics.cost_micros)) / Number(item.metrics.clicks) : 0,
      roas: item.metrics?.cost_micros > 0 && item.metrics?.conversions_value ? 
            Number(item.metrics.conversions_value) / convertCostFromMicros(Number(item.metrics.cost_micros)) : 0,
      impression_share: item.metrics?.search_impression_share || null,
      budget_lost_is: item.metrics?.search_budget_lost_impression_share || null,
      rank_lost_is: item.metrics?.search_rank_lost_impression_share || null
    };
  });
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange');
    const dataType = searchParams.get('dataType') || 'both';

    if (!customerId || !dateRange) {
      return handleValidationError('Missing required parameters: customerId and dateRange');
    }

    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Generate cache key
    const cacheKey = serverCache.generateKey('keywords', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr,
      dataType
    });

    // Check cache first
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        message: `Retrieved ${cachedData.keywords.length} items (cached)`,
        data: cachedData,
        cached: true
      });
    }

    logger.apiStart('keywords', { customerId, dateRange, dataType });

    const { customer } = createGoogleAdsConnection(customerId);

    const dateFilter = `AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'`;

    // Prepare queries to run in parallel
    const queries: Promise<any>[] = [];
    const queryTypes: string[] = [];

    if (dataType === 'keywords' || dataType === 'both') {
      const keywordsQuery = `
        SELECT 
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.criterion_id,
          ad_group_criterion.status,
          ad_group_criterion.quality_info.quality_score,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion,
          metrics.ctr,
          metrics.average_cpc
        FROM keyword_view 
        WHERE campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING')
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.status = 'ENABLED'
          ${dateFilter}
        ORDER BY metrics.impressions DESC
        LIMIT 1000
      `;
      queries.push(customer.query(keywordsQuery).catch((e: Error) => {
        logger.error('Error fetching keywords', e);
        return [];
      }));
      queryTypes.push('keywords');
    }

    if (dataType === 'search_terms' || dataType === 'both') {
      const searchTermsQuery = `
        SELECT 
          search_term_view.search_term,
          search_term_view.status,
          segments.keyword.info.text,
          segments.keyword.info.match_type,
          ad_group.id,
          ad_group.name,
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion,
          metrics.ctr,
          metrics.average_cpc
        FROM search_term_view 
        WHERE campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING', 'PERFORMANCE_MAX')
          AND campaign.status = 'ENABLED'
          AND ad_group.status = 'ENABLED'
          AND search_term_view.status = 'NONE'
          ${dateFilter}
        ORDER BY metrics.impressions DESC
        LIMIT 500
      `;
      queries.push(customer.query(searchTermsQuery).catch((e: Error) => {
        logger.error('Error fetching search terms', e);
        return [];
      }));
      queryTypes.push('search_terms');
    }

    // Execute queries in parallel
    const results = await Promise.all(queries);

    let keywordsResponse: any[] = [];
    let searchTermsResponse: any[] = [];

    results.forEach((result, index) => {
      if (queryTypes[index] === 'keywords') {
        keywordsResponse = result;
      } else if (queryTypes[index] === 'search_terms') {
        searchTermsResponse = result;
      }
    });

    const normalizedKeywords = keywordsResponse.length > 0 ? normalizeKeywordData(keywordsResponse, 'keyword') : [];
    const normalizedSearchTerms = searchTermsResponse.length > 0 ? normalizeKeywordData(searchTermsResponse, 'search_term') : [];
    
    // Determine what data to return based on dataType
    let combinedData: any[] = [];
    let summary: any = {};

    if (dataType === 'keywords') {
      combinedData = normalizedKeywords;
      const rawTotals = {
        impressions: combinedData.reduce((sum, item) => sum + item.impressions, 0),
        clicks: combinedData.reduce((sum, item) => sum + item.clicks, 0),
        cost: combinedData.reduce((sum, item) => sum + item.cost, 0),
        conversions: combinedData.reduce((sum, item) => sum + item.conversions, 0),
        conversionsValue: combinedData.reduce((sum, item) => sum + item.conversions_value, 0)
      };
      
      const derivedMetrics = calculateDerivedMetrics(rawTotals);
      const zeroStats = calculateZeroPerformanceStats(combinedData);

      summary = {
        data_type: 'keywords',
        total_keywords: normalizedKeywords.length,
        total_search_terms: 0,
        total_combined: normalizedKeywords.length,
        total_impressions: derivedMetrics.impressions,
        total_clicks: derivedMetrics.clicks,
        total_cost: derivedMetrics.cost,
        total_conversions: derivedMetrics.conversions,
        total_conversion_value: derivedMetrics.conversionsValue,
        average_ctr: derivedMetrics.ctr,
        average_cpc: derivedMetrics.avgCpc,
        average_cpa: derivedMetrics.cpa,
        overall_roas: derivedMetrics.roas,
        ...zeroStats
      };
    } else if (dataType === 'search_terms') {
      combinedData = normalizedSearchTerms;
      const rawTotals = {
        impressions: combinedData.reduce((sum, item) => sum + item.impressions, 0),
        clicks: combinedData.reduce((sum, item) => sum + item.clicks, 0),
        cost: combinedData.reduce((sum, item) => sum + item.cost, 0),
        conversions: combinedData.reduce((sum, item) => sum + item.conversions, 0),
        conversionsValue: combinedData.reduce((sum, item) => sum + item.conversions_value, 0)
      };
      
      const derivedMetrics = calculateDerivedMetrics(rawTotals);
      const zeroStats = calculateZeroPerformanceStats(combinedData);

      summary = {
        data_type: 'search_terms',
        total_keywords: 0,
        total_search_terms: normalizedSearchTerms.length,
        total_combined: normalizedSearchTerms.length,
        total_impressions: derivedMetrics.impressions,
        total_clicks: derivedMetrics.clicks,
        total_cost: derivedMetrics.cost,
        total_conversions: derivedMetrics.conversions,
        total_conversion_value: derivedMetrics.conversionsValue,
        average_ctr: derivedMetrics.ctr,
        average_cpc: derivedMetrics.avgCpc,
        average_cpa: derivedMetrics.cpa,
        overall_roas: derivedMetrics.roas,
        ...zeroStats
      };
    } else {
      combinedData = [...normalizedKeywords, ...normalizedSearchTerms];
      
      const keywordMetrics = {
        total_impressions: normalizedKeywords.reduce((sum, item) => sum + item.impressions, 0),
        total_clicks: normalizedKeywords.reduce((sum, item) => sum + item.clicks, 0),
        total_cost: normalizedKeywords.reduce((sum, item) => sum + item.cost, 0),
        total_conversions: normalizedKeywords.reduce((sum, item) => sum + item.conversions, 0),
        total_conversion_value: normalizedKeywords.reduce((sum, item) => sum + item.conversions_value, 0),
      };
      
      const searchTermMetrics = {
        total_impressions: normalizedSearchTerms.reduce((sum, item) => sum + item.impressions, 0),
        total_clicks: normalizedSearchTerms.reduce((sum, item) => sum + item.clicks, 0),
        total_cost: normalizedSearchTerms.reduce((sum, item) => sum + item.cost, 0),
        total_conversions: normalizedSearchTerms.reduce((sum, item) => sum + item.conversions, 0),
        total_conversion_value: normalizedSearchTerms.reduce((sum, item) => sum + item.conversions_value, 0),
      };

      summary = {
        data_type: 'both',
        total_keywords: normalizedKeywords.length,
        total_search_terms: normalizedSearchTerms.length,
        total_combined: normalizedKeywords.length + normalizedSearchTerms.length,
        keywords_metrics: {
          ...keywordMetrics,
          average_ctr: keywordMetrics.total_impressions > 0 ? (keywordMetrics.total_clicks / keywordMetrics.total_impressions) * 100 : 0,
          average_cpc: keywordMetrics.total_clicks > 0 ? keywordMetrics.total_cost / keywordMetrics.total_clicks : 0,
        },
        search_terms_metrics: {
          ...searchTermMetrics,
          average_ctr: searchTermMetrics.total_impressions > 0 ? (searchTermMetrics.total_clicks / searchTermMetrics.total_impressions) * 100 : 0,
          average_cpc: searchTermMetrics.total_clicks > 0 ? searchTermMetrics.total_cost / searchTermMetrics.total_clicks : 0,
        },
        warning: "This endpoint returns both keywords and search terms. Be careful not to double-count metrics when aggregating."
      };
    }

    const responseData = {
      keywords: combinedData,
      summary: summary,
      date_range: {
        start_date: startDateStr,
        end_date: endDateStr,
        days: parseInt(dateRange)
      }
    };

    // Cache with smart TTL
    const ttl = serverCache.getSmartTTL(endDateStr, ServerCache.TTL.KEYWORDS);
    serverCache.set(cacheKey, responseData, ttl);

    logger.apiComplete('keywords', combinedData.length);
    
    return NextResponse.json({
      success: true,
      message: `Retrieved ${combinedData.length} items (${normalizedKeywords.length} keywords, ${normalizedSearchTerms.length} search terms)`,
      data: responseData,
      cached: false
    });

  } catch (error: any) {
    logger.error('Keywords API failed', error);
    return handleApiError(error, 'Keywords Data');
  }
}
