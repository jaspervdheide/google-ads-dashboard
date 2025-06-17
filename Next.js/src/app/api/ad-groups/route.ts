import { NextRequest as _NextRequest } from 'next/server';
import { createGoogleAdsConnection } from '@/utils/googleAdsClient';
import { getFormattedDateRange } from '@/utils/dateUtils';
import { handleValidationError, handleApiError, createSuccessResponse } from '@/utils/errorHandler';
import { calculateDerivedMetrics, convertCostFromMicros } from '@/utils/apiHelpers';

// Helper function to convert complex asset coverage data to percentage
function calculateAssetCoveragePercentage(actionItems: any): number {
  if (!actionItems || !Array.isArray(actionItems)) {
    return 85; // Default good coverage percentage
  }
  
  // Simple calculation: fewer action items = better coverage
  // If no action items, coverage is excellent (95%)
  // Each action item reduces coverage by ~10%
  const basePercentage = 95;
  const reductionPerItem = 10;
  const coverage = Math.max(30, basePercentage - (actionItems.length * reductionPerItem));
  
  return Math.round(coverage);
}

// Helper function to convert Ad Strength enum to readable text
function getAdStrengthText(adStrength: any): string | null {
  if (!adStrength) return null;
  
  // Google Ads API returns numeric values for ad strength
  // 2 = Poor, 3 = Average, 4 = Good, 5 = Excellent
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
    const groupType = searchParams.get('groupType') || 'all'; // 'all', 'traditional', 'asset'
    
    if (!customerId) {
      return handleValidationError('Customer ID is required');
    }

    console.log(`Fetching ad groups and asset groups for customer ${customerId} with ${dateRange} days range, type: ${groupType}...`);
    
    // Calculate date range using utility
    const { startDateStr, endDateStr } = getFormattedDateRange(parseInt(dateRange));
    
    // Initialize Google Ads client and customer using utility
    const { customer } = createGoogleAdsConnection(customerId);

    const allGroups: any[] = [];

    // Query for traditional ad groups (non-Performance Max)
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
        FROM ad_group 
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          AND campaign.advertising_channel_type != 'PERFORMANCE_MAX'
          AND ad_group.status IN ('ENABLED', 'PAUSED')
        ORDER BY metrics.cost_micros DESC
      `;

      console.log('Executing traditional ad groups query:', traditionalAdGroupsQuery);
      
      try {
        const traditionalResults = await customer.query(traditionalAdGroupsQuery);
        
        // Process traditional ad groups
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
              status: row.ad_group.status,
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
        
        // Fetch Quality Score data for traditional ad groups
        if (traditionalGroups.length > 0) {
          console.log('Fetching Quality Score data for traditional ad groups...');
          
          // Try a simpler Quality Score query without date filter first
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
          
          try {
            console.log('Executing Quality Score query:', qualityScoreQuery);
            const qualityScoreResults = await customer.query(qualityScoreQuery);
            console.log(`Quality Score query returned ${qualityScoreResults.length} results`);
            
            // Calculate average Quality Score per ad group
            const qualityScoreMap = new Map();
            
            qualityScoreResults.forEach((row: any, index: number) => {
              const adGroupId = row.ad_group_criterion?.ad_group?.split('/').pop();
              const qualityScore = row.ad_group_criterion?.quality_info?.quality_score;
              const keywordText = row.ad_group_criterion?.keyword?.text;
              
              // Log first few results for debugging
              if (index < 5) {
                console.log(`Quality Score result ${index}:`, {
                  adGroupId,
                  qualityScore,
                  keywordText,
                  fullAdGroupPath: row.ad_group_criterion?.ad_group
                });
              }
              
              if (adGroupId && qualityScore && qualityScore > 0) {
                if (!qualityScoreMap.has(adGroupId)) {
                  qualityScoreMap.set(adGroupId, {
                    totalScore: 0,
                    count: 0
                  });
                }
                
                const data = qualityScoreMap.get(adGroupId);
                
                data.totalScore += qualityScore;
                data.count += 1;
              }
            });
            
            console.log(`Quality Score map has ${qualityScoreMap.size} ad groups with data`);
            
            // Add Quality Score to traditional ad groups
            traditionalGroups.forEach(group => {
              const qualityData = qualityScoreMap.get(group.id);
              if (qualityData && qualityData.count > 0) {
                group.avgQualityScore = Math.round((qualityData.totalScore / qualityData.count) * 10) / 10;
                console.log(`Ad Group ${group.id} (${group.name}) - Quality Score: ${group.avgQualityScore} (from ${qualityData.count} keywords)`);
              } else {
                group.avgQualityScore = null; // No Quality Score data available
                console.log(`Ad Group ${group.id} (${group.name}) - No Quality Score data`);
              }
            });
            
            console.log(`Successfully calculated Quality Score for ${qualityScoreMap.size} ad groups`);
          } catch (error) {
            console.error('Error fetching Quality Score data:', error);
            // Add null Quality Score to all groups if query fails
            traditionalGroups.forEach(group => {
              group.avgQualityScore = null;
            });
          }
        }
        
        allGroups.push(...traditionalGroups);
        
        console.log(`Successfully retrieved ${traditionalGroups.length} traditional ad groups`);
      } catch (error) {
        console.error('Error fetching traditional ad groups:', error);
      }
    }

    // Query for Performance Max asset groups
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
        FROM asset_group 
        WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
          AND campaign.advertising_channel_type = 'PERFORMANCE_MAX'
          AND asset_group.status IN ('ENABLED', 'PAUSED')
        ORDER BY metrics.cost_micros DESC
      `;

      console.log('Executing Performance Max asset groups query:', assetGroupsQuery);
      
      try {
        const assetResults = await customer.query(assetGroupsQuery);
        
        // Process asset groups
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
            // Update Performance Max fields if not already set
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
              status: row.asset_group.status,
              campaignId: row.campaign.id.toString(),
              campaignName: row.campaign.name,
              campaignType: row.campaign.advertising_channel_type,
              groupType: 'asset_group',
              impressions: row.metrics?.impressions || 0,
              clicks: row.metrics?.clicks || 0,
              costMicros: row.metrics?.cost_micros || 0,
              conversions: row.metrics?.conversions || 0,
              conversionsValueMicros: row.metrics?.conversions_value || 0,
              // Performance Max specific fields from Google Ads API
              adStrength: getAdStrengthText(row.asset_group?.ad_strength),
              assetCoverage: calculateAssetCoveragePercentage(row.asset_group?.asset_coverage?.ad_strength_action_items),
            });
          }
        });
        
        const assetGroups = Array.from(assetGroupMap.values());
        allGroups.push(...assetGroups);
        
        console.log(`Successfully retrieved ${assetGroups.length} Performance Max asset groups`);
      } catch (error) {
        console.error('Error fetching Performance Max asset groups:', error);
      }
    }

    // Calculate derived metrics for all groups using shared utility
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
        conversionsValue: group.conversionsValueMicros // Keep original field name for compatibility
      };
    });

    // Calculate totals using shared utility
    const rawTotals = {
      impressions: processedGroups.reduce((sum, g) => sum + g.impressions, 0),
      clicks: processedGroups.reduce((sum, g) => sum + g.clicks, 0),
      cost: processedGroups.reduce((sum, g) => sum + g.cost, 0),
      conversions: processedGroups.reduce((sum, g) => sum + g.conversions, 0),
      conversionsValue: processedGroups.reduce((sum, g) => sum + g.conversionsValue, 0)
    };
    
    const totals = calculateDerivedMetrics(rawTotals);

    // Get type statistics
    const traditionalCount = processedGroups.filter(g => g.groupType === 'ad_group').length;
    const assetCount = processedGroups.filter(g => g.groupType === 'asset_group').length;

    console.log(`Successfully retrieved ${processedGroups.length} total groups (${traditionalCount} traditional, ${assetCount} asset groups)`);
    
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

    return createSuccessResponse(responseData, `✅ Retrieved ${processedGroups.length} groups (${traditionalCount} traditional, ${assetCount} asset) for ${dateRange} days`);

  } catch (error) {
    return handleApiError(error, 'Ad Groups Data');
  }
} 