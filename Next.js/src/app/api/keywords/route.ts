import { NextRequest } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { CampaignTypeDetector, MatchTypeUtilities } from '@/utils/queryBuilder';
import { logger } from '@/utils/logger';
import { calculateDerivedMetrics, calculateZeroPerformanceStats, convertCostFromMicros } from '@/utils/apiHelpers';

// Using centralized campaign type detection utility

// Using centralized match type utilities

// Data normalization function
const normalizeKeywordData = (data: any[], type: 'keyword' | 'search_term') => {
  return data.map(item => {
    let matchType = 'SEARCH_TERM';  // Default for search terms
    
    if (type === 'keyword') {
      // Keywords have match types in ad_group_criterion.keyword.match_type
      const rawMatchType = item.ad_group_criterion?.keyword?.match_type;
      
      // Convert numeric enum to string enum for keywords
      matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'BROAD';
    } else if (type === 'search_term') {
      // Search terms have match types from segments.keyword.info.match_type
      const rawMatchType = item.segments?.keyword?.info?.match_type;
      
      if (rawMatchType) {
        // Convert numeric enum to string enum for search terms
        matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'SEARCH_TERM';
      } else {
        matchType = 'SEARCH_TERM'; // Keep as search term if no match type found
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
      ad_group_id: item.ad_group?.id,
      ad_group_name: item.ad_group?.name,
      campaign_id: item.campaign?.id,
      campaign_name: item.campaign?.name,
      campaign_type: item.campaign?.advertising_channel_type,
      detected_campaign_type: CampaignTypeDetector.detectCampaignType(item.campaign?.name || ''),
      // Triggering keyword information (for search terms)
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
      // Calculate CPC and ROAS safely
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

    // Single API summary log
    logger.apiStart('keywords', { customerId, dateRange, dataType });

    // Create Google Ads connection using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));

    // Add date range filter to queries
    const dateFilter = `AND segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'`;

    // Get active keywords with performance data from active campaigns
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

    // Get search terms with performance data from active campaigns  
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

    let keywordsResponse: any[] = [];
    let searchTermsResponse: any[] = [];
    let normalizedKeywords: any[] = [];
    let normalizedSearchTerms: any[] = [];

    if (dataType === 'keywords' || dataType === 'both') {
      try {
        keywordsResponse = await customer.query(keywordsQuery);
        normalizedKeywords = normalizeKeywordData(keywordsResponse, 'keyword');
      } catch (keywordError) {
        logger.error('Error fetching keywords', keywordError);
      }
    }

    if (dataType === 'search_terms' || dataType === 'both') {
      try {
        searchTermsResponse = await customer.query(searchTermsQuery);
        normalizedSearchTerms = normalizeKeywordData(searchTermsResponse, 'search_term');
      } catch (searchTermsError) {
        logger.error('Error fetching search terms', searchTermsError);
      }
    }
    
    // Determine what data to return based on dataType
    let combinedData: any[] = [];
    let summary: any = {};

    if (dataType === 'keywords') {
      combinedData = normalizedKeywords;
      // Calculate summary metrics for keywords only using shared utilities
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
      // Calculate summary metrics for search terms only using shared utilities
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
      // Return both datasets separately to avoid double-counting
      combinedData = [...normalizedKeywords, ...normalizedSearchTerms];
      
      // Calculate summary metrics separately for each type
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

    // Single API completion summary log
    logger.apiComplete('keywords', combinedData.length);
    
    return createSuccessResponse(responseData, `Retrieved ${combinedData.length} items (${normalizedKeywords.length} keywords, ${normalizedSearchTerms.length} search terms)`);

  } catch (error: any) {
    logger.error('Keywords API failed', error);
    return handleApiError(error, 'Keywords Data');
  }
} 