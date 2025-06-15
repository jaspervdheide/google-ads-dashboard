import { NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { CampaignTypeDetector, MatchTypeUtilities } from '@/utils/queryBuilder';
import { logger } from '@/utils/logger';

// Using centralized campaign type detection utility

// Using centralized match type utilities

// Data normalization function
const normalizeKeywordData = (data: any[], type: 'keyword' | 'search_term') => {
  return data.map(item => {
    let matchType = 'SEARCH_TERM';  // Default for search terms
    
    if (type === 'keyword') {
      // Keywords have match types in ad_group_criterion.keyword.match_type
      const rawMatchType = item.ad_group_criterion?.keyword?.match_type;
      console.log(`[Keywords API] Keyword "${item.ad_group_criterion?.keyword?.text}" - Raw match type: "${rawMatchType}" (${typeof rawMatchType})`);
      
      // Convert numeric enum to string enum for keywords
      matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'BROAD';
    } else if (type === 'search_term') {
      // Search terms have match types from segments.keyword.info.match_type
      const rawMatchType = item.segments?.keyword?.info?.match_type;
      const keywordText = item.segments?.keyword?.info?.text;
      
      if (rawMatchType) {
        console.log(`[Keywords API] Search term "${item.search_term_view?.search_term}" - Raw match type: "${rawMatchType}" (${typeof rawMatchType}) from keyword: "${keywordText}"`);
        // Convert numeric enum to string enum for search terms
        matchType = MatchTypeUtilities.getMatchTypeString(rawMatchType) || 'SEARCH_TERM';
      } else {
        matchType = 'SEARCH_TERM'; // Keep as search term if no match type found
      }
    }
    
    return {
      id: item.ad_group_criterion?.criterion_id || item.search_term_view?.resource_name || `search_term_${Math.random()}`,
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
      cost: item.metrics?.cost_micros ? Number(item.metrics.cost_micros) / 1000000 : 0,
      conversions: Number(item.metrics?.conversions) || 0,
      conversions_value: item.metrics?.conversions_value ? Number(item.metrics.conversions_value) : 0,
      ctr: item.metrics?.ctr ? Number(item.metrics.ctr) * 100 : 0,
      average_cpc: item.metrics?.average_cpc ? Number(item.metrics.average_cpc) / 1000000 : 0,
      // Calculate CPC and ROAS safely
      cpc: item.metrics?.clicks > 0 && item.metrics?.cost_micros ? 
           (Number(item.metrics.cost_micros) / 1000000) / Number(item.metrics.clicks) : 0,
      roas: item.metrics?.cost_micros > 0 && item.metrics?.conversions_value ? 
            Number(item.metrics.conversions_value) / (Number(item.metrics.cost_micros) / 1000000) : 0,
      impression_share: item.metrics?.search_impression_share || null,
      budget_lost_is: item.metrics?.search_budget_lost_impression_share || null,
      rank_lost_is: item.metrics?.search_rank_lost_impression_share || null
    };
  });
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get('customerId');
  const dateRange = parseInt(searchParams.get('dateRange') || '30');
  const dataType = searchParams.get('dataType') || 'keywords'; // keywords, search_terms, or both

  console.log(`[Keywords API] Request received - customerId: ${customerId}, dateRange: ${dateRange}, dataType: ${dataType}`);

  if (!customerId) {
    return handleValidationError('Customer ID is required');
  }

  try {
    console.log(`[Keywords API] Fetching ${dataType} for customer ${customerId} with ${dateRange} days range...`);

    // Create Google Ads connection using utility
    const { customer } = createGoogleAdsConnection(customerId);

    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(dateRange);

    logger.apiStart('Keywords', { customerId, dateRange, dataType, startDate: startDateStr, endDate: endDateStr });

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
      LIMIT 5000
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
        metrics.ctr,
        metrics.average_cpc
      FROM search_term_view 
      WHERE campaign.advertising_channel_type IN ('SEARCH', 'SHOPPING', 'PERFORMANCE_MAX')
        AND campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
        AND search_term_view.status = 'NONE'
        ${dateFilter}
      ORDER BY metrics.impressions DESC
      LIMIT 2000
    `;

    let keywordsResponse: any[] = [];
    let searchTermsResponse: any[] = [];
    let normalizedKeywords: any[] = [];
    let normalizedSearchTerms: any[] = [];

    if (dataType === 'keywords' || dataType === 'both') {
      logger.queryStart('Keywords', customerId);
      try {
        keywordsResponse = await customer.query(keywordsQuery);
        logger.queryComplete('Keywords', keywordsResponse.length, customerId);
        normalizedKeywords = normalizeKeywordData(keywordsResponse, 'keyword');
      } catch (keywordError) {
        logger.error('Error fetching keywords', keywordError, { customerId });
      }
    }

    if (dataType === 'search_terms' || dataType === 'both') {
      logger.queryStart('Search Terms', customerId);
      try {
        searchTermsResponse = await customer.query(searchTermsQuery);
        logger.queryComplete('Search Terms', searchTermsResponse.length, customerId);
        normalizedSearchTerms = normalizeKeywordData(searchTermsResponse, 'search_term');
      } catch (searchTermsError) {
        logger.error('Error fetching search terms', searchTermsError, { customerId });
      }
    }
    
    // Log sample of keywords with match types for debugging
    if (normalizedKeywords.length > 0) {
      const sampleKeywords = normalizedKeywords.slice(0, 5).map(k => ({
        text: k.keyword_text,
        matchType: k.match_type,
        type: k.type
      }));
      logger.sampleData('keywords with match types', sampleKeywords);
    }
    
    // Determine what data to return based on dataType
    let combinedData: any[] = [];
    let summary: any = {};

    if (dataType === 'keywords') {
      combinedData = normalizedKeywords;
      // Calculate summary metrics for keywords only
      const totalImpressions = combinedData.reduce((sum, item) => sum + item.impressions, 0);
      const totalClicks = combinedData.reduce((sum, item) => sum + item.clicks, 0);
      const totalCost = combinedData.reduce((sum, item) => sum + item.cost, 0);
      const totalConversions = combinedData.reduce((sum, item) => sum + item.conversions, 0);
      const totalConversionValue = combinedData.reduce((sum, item) => sum + item.conversions_value, 0);

      summary = {
        data_type: 'keywords',
        total_keywords: normalizedKeywords.length,
        total_search_terms: 0,
        total_combined: normalizedKeywords.length,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_cost: totalCost,
        total_conversions: totalConversions,
        total_conversion_value: totalConversionValue,
        average_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
        average_cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        average_cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        overall_roas: totalCost > 0 ? totalConversionValue / totalCost : 0,
        // Zero-clicks statistics for maintenance metrics
        zero_clicks_count: combinedData.filter(item => item.clicks === 0).length,
        zero_clicks_percentage: combinedData.length > 0 ? (combinedData.filter(item => item.clicks === 0).length / combinedData.length) * 100 : 0,
        // Zero-conversions statistics for maintenance metrics
        zero_conversions_count: combinedData.filter(item => item.conversions === 0).length,
        zero_conversions_percentage: combinedData.length > 0 ? (combinedData.filter(item => item.conversions === 0).length / combinedData.length) * 100 : 0,
      };
    } else if (dataType === 'search_terms') {
      combinedData = normalizedSearchTerms;
      // Calculate summary metrics for search terms only
      const totalImpressions = combinedData.reduce((sum, item) => sum + item.impressions, 0);
      const totalClicks = combinedData.reduce((sum, item) => sum + item.clicks, 0);
      const totalCost = combinedData.reduce((sum, item) => sum + item.cost, 0);
      const totalConversions = combinedData.reduce((sum, item) => sum + item.conversions, 0);
      const totalConversionValue = combinedData.reduce((sum, item) => sum + item.conversions_value, 0);

      summary = {
        data_type: 'search_terms',
        total_keywords: 0,
        total_search_terms: normalizedSearchTerms.length,
        total_combined: normalizedSearchTerms.length,
        total_impressions: totalImpressions,
        total_clicks: totalClicks,
        total_cost: totalCost,
        total_conversions: totalConversions,
        total_conversion_value: totalConversionValue,
        average_ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
        average_cpc: totalClicks > 0 ? totalCost / totalClicks : 0,
        average_cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
        overall_roas: totalCost > 0 ? totalConversionValue / totalCost : 0,
        // Zero-clicks statistics for maintenance metrics (mainly for keywords)
        zero_clicks_count: combinedData.filter(item => item.clicks === 0).length,
        zero_clicks_percentage: combinedData.length > 0 ? (combinedData.filter(item => item.clicks === 0).length / combinedData.length) * 100 : 0,
        // Zero-conversions statistics for search terms maintenance
        zero_conversions_count: combinedData.filter(item => item.conversions === 0).length,
        zero_conversions_percentage: combinedData.length > 0 ? (combinedData.filter(item => item.conversions === 0).length / combinedData.length) * 100 : 0,
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
        days: dateRange
      }
    };

    logger.apiComplete('Keywords', combinedData.length);
    return createSuccessResponse(responseData, `✅ Retrieved ${combinedData.length} items (${normalizedKeywords.length} keywords, ${normalizedSearchTerms.length} search terms)`);

  } catch (error) {
    return handleApiError(error, 'Keywords Data');
  }
} 