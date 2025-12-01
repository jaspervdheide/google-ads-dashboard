import { NextRequest as _NextRequest, NextResponse } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError } from '@/utils/errorHandler';
import { calculateDerivedMetrics, convertCostFromMicros } from '@/utils/apiHelpers';
import { logger } from '@/utils/logger';
import { serverCache, ServerCache } from '@/utils/serverCache';

// Helper function to convert complex asset coverage data to percentage
function calculateAssetCoveragePercentage(actionItems: any): number {
  if (!actionItems || !Array.isArray(actionItems)) {
    return 85;
  }
  const basePercentage = 95;
  const reductionPerItem = 10;
  const coverage = Math.max(30, basePercentage - (actionItems.length * reductionPerItem));
  return Math.round(coverage);
}

// Helper function to convert Ad Strength enum to readable text
function getAdStrengthText(adStrength: any): string | null {
  if (!adStrength) return null;
  
  switch (adStrength) {
    case 2:
    case 'AD_STRENGTH_POOR':
      return 'Poor';
    case 3:
    case 'AD_STRENGTH_AVERAGE':
      return 'Average';
    case 4:
    case 'AD_STRENGTH_GOOD':
      return 'Good';
    case 5:
    case 'AD_STRENGTH_EXCELLENT':
      return 'Excellent';
    default:
      return typeof adStrength === 'string' ? adStrength : 'Unknown';
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    const groupType = searchParams.get('groupType') || 'all';
    const device = searchParams.get('device');
    
    const deviceMap: { [key: string]: string } = {
      'desktop': 'DESKTOP',
      'mobile': 'MOBILE',
      'tablet': 'TABLET'
    };
    const deviceApiValue = device ? deviceMap[device] : null;
    
    if (!customerId) {
      return handleValidationError('Customer ID is required');
    }

    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));
    
    // Generate cache key
    const cacheKey = serverCache.generateKey('ad-groups', {
      customerId,
      startDate: startDateStr,
      endDate: endDateStr,
      groupType,
      device
    });

    // Check cache first
    const cachedData = serverCache.get<any>(cacheKey);
    if (cachedData) {
      return NextResponse.json({
        success: true,
        message: `Retrieved ${cachedData.groups.length} groups (cached)`,
        data: cachedData,
        cached: true
      });
    }

    logger.apiStart('ad-groups', { customerId, dateRange, groupType, device });
    
    const { customer } = createGoogleAdsConnection(customerId);

    const allGroups: any[] = [];

    // Build queries
    const deviceSelect = deviceApiValue ? ', segments.device' : '';
    const deviceWhere = deviceApiValue ? `AND segments.device = '${deviceApiValue}'` : '';

    // Prepare all queries to run in parallel
    const queries: Promise<any>[] = [];
    const queryTypes: string[] = [];

    // Traditional ad groups query
    if (groupType === 'all' || groupType === 'traditional') {
      const traditionalAdGroupsQuery = `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc
          ${deviceSelect}
        FROM ad_group
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          AND campaign.advertising_channel_type != 'PERFORMANCE_MAX'
          AND ad_group.status IN ('ENABLED', 'PAUSED')
          ${deviceWhere}
        ORDER BY metrics.cost_micros DESC
      `;
      queries.push(customer.query(traditionalAdGroupsQuery).catch((e: Error) => {
        console.error('Error fetching traditional ad groups:', e);
        return [];
      }));
      queryTypes.push('traditional');

      // Quality Score query (runs in parallel)
      const qualityScoreQuery = `
        SELECT
          ad_group_criterion.ad_group,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.keyword.text
        FROM ad_group_criterion 
        WHERE ad_group_criterion.type = 'KEYWORD'
          AND ad_group_criterion.status IN ('ENABLED', 'PAUSED')
          AND ad_group_criterion.quality_info.quality_score > 0
          AND campaign.advertising_channel_type != 'PERFORMANCE_MAX'
        LIMIT 1000
      `;
      queries.push(customer.query(qualityScoreQuery).catch((e: Error) => {
        console.error('Error fetching Quality Score:', e);
        return [];
      }));
      queryTypes.push('qualityScore');
    }

    // Asset groups query (Performance Max)
    if (groupType === 'all' || groupType === 'asset') {
      const assetGroupsQuery = `
        SELECT
          asset_group.id,
          asset_group.name,
          asset_group.status,
          asset_group.ad_strength,
          asset_group.asset_coverage.ad_strength_action_items,
          campaign.id,
          campaign.name,
          campaign.advertising_channel_type,
          segments.date,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc
          ${deviceSelect}
        FROM asset_group
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
          AND asset_group.status IN ('ENABLED', 'PAUSED')
          ${deviceWhere}
        ORDER BY metrics.cost_micros DESC
      `;
      queries.push(customer.query(assetGroupsQuery).catch((e: Error) => {
        console.error('Error fetching asset groups:', e);
        return [];
      }));
      queryTypes.push('asset');
    }

    // Execute all queries in parallel for maximum speed
    const results = await Promise.all(queries);

    // Process results based on query type
    let traditionalResults: any[] = [];
    let qualityScoreResults: any[] = [];
    let assetResults: any[] = [];

    results.forEach((result, index) => {
      switch (queryTypes[index]) {
        case 'traditional':
          traditionalResults = result;
          break;
        case 'qualityScore':
          qualityScoreResults = result;
          break;
        case 'asset':
          assetResults = result;
          break;
      }
    });

    // Process traditional ad groups
    if (traditionalResults.length > 0) {
      const traditionalGroupMap = new Map();
      
      traditionalResults.forEach((row: any) => {
        const groupId = row.ad_group.id.toString();
        
        if (traditionalGroupMap.has(groupId)) {
          const existing = traditionalGroupMap.get(groupId);
          existing.impressions += row.metrics?.impressions || 0;
          existing.clicks += row.metrics?.clicks || 0;
          existing.costMicros += row.metrics?.cost_micros || 0;
          existing.conversions += row.metrics?.conversions || 0;
          existing.conversionsValueMicros += row.metrics?.conversions_value || 0;
        } else {
          traditionalGroupMap.set(groupId, {
            id: groupId,
            name: row.ad_group.name,
            status: row.ad_group.status === 2 || row.ad_group.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
            campaignId: row.campaign.id.toString(),
            campaignName: row.campaign.name,
            campaignType: row.campaign.advertising_channel_type,
            groupType: 'ad_group',
            impressions: row.metrics?.impressions || 0,
            clicks: row.metrics?.clicks || 0,
            costMicros: row.metrics?.cost_micros || 0,
            conversions: row.metrics?.conversions || 0,
            conversionsValueMicros: row.metrics?.conversions_value || 0,
          });
        }
      });
      
      const traditionalGroups = Array.from(traditionalGroupMap.values());

      // Process Quality Score data
      if (qualityScoreResults.length > 0) {
        const qualityScoreMap = new Map();
        
        qualityScoreResults.forEach((row: any) => {
          const adGroupId = row.ad_group_criterion?.ad_group?.split('/').pop();
          const qualityScore = row.ad_group_criterion?.quality_info?.quality_score;
          
          if (adGroupId && qualityScore && qualityScore > 0) {
            if (!qualityScoreMap.has(adGroupId)) {
              qualityScoreMap.set(adGroupId, { totalScore: 0, count: 0 });
            }
            const data = qualityScoreMap.get(adGroupId);
            data.totalScore += qualityScore;
            data.count += 1;
          }
        });

        traditionalGroups.forEach(group => {
          const qualityData = qualityScoreMap.get(group.id);
          if (qualityData && qualityData.count > 0) {
            group.avgQualityScore = Math.round((qualityData.totalScore / qualityData.count) * 10) / 10;
          } else {
            group.avgQualityScore = null;
          }
        });
      } else {
        traditionalGroups.forEach(group => {
          group.avgQualityScore = null;
        });
      }
      
      allGroups.push(...traditionalGroups);
    }

    // Process asset groups
    if (assetResults.length > 0) {
      const assetGroupMap = new Map();
      
      assetResults.forEach((row: any) => {
        const groupId = row.asset_group.id.toString();
        
        if (assetGroupMap.has(groupId)) {
          const existing = assetGroupMap.get(groupId);
          existing.impressions += row.metrics?.impressions || 0;
          existing.clicks += row.metrics?.clicks || 0;
          existing.costMicros += row.metrics?.cost_micros || 0;
          existing.conversions += row.metrics?.conversions || 0;
          existing.conversionsValueMicros += row.metrics?.conversions_value || 0;
          if (!existing.adStrength && row.asset_group?.ad_strength) {
            existing.adStrength = getAdStrengthText(row.asset_group.ad_strength);
          }
          if (!existing.assetCoverage && row.asset_group?.asset_coverage?.ad_strength_action_items) {
            existing.assetCoverage = calculateAssetCoveragePercentage(row.asset_group.asset_coverage.ad_strength_action_items);
          }
        } else {
          assetGroupMap.set(groupId, {
            id: groupId,
            name: row.asset_group.name,
            status: row.asset_group.status === 2 || row.asset_group.status === 'ENABLED' ? 'ENABLED' : 'PAUSED',
            campaignId: row.campaign.id.toString(),
            campaignName: row.campaign.name,
            campaignType: row.campaign.advertising_channel_type,
            groupType: 'asset_group',
            impressions: row.metrics?.impressions || 0,
            clicks: row.metrics?.clicks || 0,
            costMicros: row.metrics?.cost_micros || 0,
            conversions: row.metrics?.conversions || 0,
            conversionsValueMicros: row.metrics?.conversions_value || 0,
            adStrength: getAdStrengthText(row.asset_group?.ad_strength),
            assetCoverage: calculateAssetCoveragePercentage(row.asset_group?.asset_coverage?.ad_strength_action_items),
          });
        }
      });
      
      const assetGroups = Array.from(assetGroupMap.values());
      allGroups.push(...assetGroups);
    }

    // Calculate derived metrics for all groups
    const processedGroups = allGroups.map(group => {
      const cost = convertCostFromMicros(group.costMicros);
      const derivedMetrics = calculateDerivedMetrics({
        impressions: group.impressions,
        clicks: group.clicks,
        cost: cost,
        conversions: group.conversions,
        conversionsValue: group.conversionsValueMicros
      });

      return {
        ...group,
        ...derivedMetrics,
        conversionsValue: group.conversionsValueMicros
      };
    });

    // Calculate totals
    const rawTotals = {
      impressions: processedGroups.reduce((sum, g) => sum + g.impressions, 0),
      clicks: processedGroups.reduce((sum, g) => sum + g.clicks, 0),
      cost: processedGroups.reduce((sum, g) => sum + g.cost, 0),
      conversions: processedGroups.reduce((sum, g) => sum + g.conversions, 0),
      conversionsValue: processedGroups.reduce((sum, g) => sum + g.conversionsValue, 0)
    };
    
    const totals = calculateDerivedMetrics(rawTotals);

    const traditionalCount = processedGroups.filter(g => g.groupType === 'ad_group').length;
    const assetCount = processedGroups.filter(g => g.groupType === 'asset_group').length;

    logger.apiComplete('ad-groups', processedGroups.length);
    
    const responseData = {
      groups: processedGroups,
      totals,
      statistics: {
        total: processedGroups.length,
        traditional: traditionalCount,
        asset: assetCount
      },
      dateRange: {
        days: parseInt(dateRange),
        startDate: startDateStr,
        endDate: endDateStr
      },
      customerId,
      groupType
    };

    // Cache with smart TTL
    const ttl = serverCache.getSmartTTL(endDateStr, ServerCache.TTL.ENTITY_LIST);
    serverCache.set(cacheKey, responseData, ttl);

    return NextResponse.json({
      success: true,
      message: `Retrieved ${processedGroups.length} groups (${traditionalCount} traditional, ${assetCount} asset)`,
      data: responseData,
      cached: false
    });

  } catch (error) {
    return handleApiError(error, 'Ad Groups Data');
  }
}
