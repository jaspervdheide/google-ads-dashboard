import { NextResponse } from 'next/server';
import { GoogleAdsApi } from 'google-ads-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');
    const dateRange = searchParams.get('dateRange') || '30';
    const groupType = searchParams.get('groupType') || 'all'; // 'all', 'traditional', 'asset'
    
    if (!customerId) {
      return NextResponse.json({
        success: false,
        message: "❌ Customer ID is required"
      }, { status: 400 });
    }

    console.log(`Fetching ad groups and asset groups for customer ${customerId} with ${dateRange} days range, type: ${groupType}...`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    if (parseInt(dateRange) === 1) {
      startDate.setTime(endDate.getTime());
    } else {
      startDate.setDate(endDate.getDate() - parseInt(dateRange));
    }
    
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '');
    const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Initialize Google Ads client
    const client = new GoogleAdsApi({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      developer_token: process.env.DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: customerId,
      refresh_token: process.env.REFRESH_TOKEN!,
      login_customer_id: process.env.MCC_CUSTOMER_ID!,
    });

    let allGroups: any[] = [];

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
              // Mock Performance Max specific fields for now
              adStrength: ['Poor', 'Good', 'Excellent'][Math.floor(Math.random() * 3)] as 'Poor' | 'Good' | 'Excellent',
              assetCoverage: Math.floor(Math.random() * 40) + 60, // 60-100%
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

    // Calculate derived metrics for all groups
    const processedGroups = allGroups.map(group => ({
      ...group,
      cost: group.costMicros / 1_000_000,
      conversionsValue: group.conversionsValueMicros,
      ctr: group.impressions > 0 ? (group.clicks / group.impressions * 100) : 0,
      avgCpc: group.clicks > 0 ? (group.costMicros / group.clicks / 1_000_000) : 0,
      conversionRate: group.clicks > 0 ? (group.conversions / group.clicks * 100) : 0,
      cpa: group.conversions > 0 ? (group.costMicros / group.conversions / 1_000_000) : 0,
      roas: group.costMicros > 0 ? (group.conversionsValueMicros / group.costMicros * 1_000_000) : 0
    }));

    // Calculate totals
    const totals = {
      impressions: processedGroups.reduce((sum, g) => sum + g.impressions, 0),
      clicks: processedGroups.reduce((sum, g) => sum + g.clicks, 0),
      cost: processedGroups.reduce((sum, g) => sum + g.cost, 0),
      conversions: processedGroups.reduce((sum, g) => sum + g.conversions, 0),
      conversionsValue: processedGroups.reduce((sum, g) => sum + g.conversionsValue, 0),
      ctr: 0,
      avgCpc: 0,
      conversionRate: 0,
      cpa: 0,
      roas: 0
    };
    
    totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions * 100) : 0;
    totals.avgCpc = totals.clicks > 0 ? (totals.cost / totals.clicks) : 0;
    totals.conversionRate = totals.clicks > 0 ? (totals.conversions / totals.clicks * 100) : 0;
    totals.cpa = totals.conversions > 0 ? (totals.cost / totals.conversions) : 0;
    totals.roas = totals.cost > 0 ? (totals.conversionsValue / totals.cost) : 0;

    // Get type statistics
    const traditionalCount = processedGroups.filter(g => g.groupType === 'ad_group').length;
    const assetCount = processedGroups.filter(g => g.groupType === 'asset_group').length;

    console.log(`Successfully retrieved ${processedGroups.length} total groups (${traditionalCount} traditional, ${assetCount} asset groups)`);
    
    return NextResponse.json({
      success: true,
      message: `✅ Retrieved ${processedGroups.length} groups for ${dateRange} days`,
      data: {
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
      }
    });

  } catch (error) {
    console.error('Error fetching ad groups and asset groups:', error);
    
    return NextResponse.json({
      success: false,
      message: "❌ Failed to fetch ad groups and asset groups",
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 