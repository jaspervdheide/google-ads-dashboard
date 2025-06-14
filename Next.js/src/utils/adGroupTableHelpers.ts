import { AdGroup, AdGroupData } from '../types';

export interface AdGroupTableTotals {
  clicks: number;
  impressions: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
  adGroupCount: number;
}

export const calculateAdGroupTableTotals = (
  data: AdGroupData | null,
  statusFilter: 'active' | 'all',
  selectedAdGroups: Set<string>,
  searchTerm: string,
  groupTypeFilter: 'all' | 'traditional' | 'asset',
  adGroupSort: { field: string; direction: 'asc' | 'desc' }
): AdGroupTableTotals | null => {
  if (!data?.adGroups) return null;

  // Filter ad groups based on current filters
  const filteredAdGroups = data.adGroups.filter(adGroup => {
    // Apply status filter
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'active' && (adGroup.impressions > 0 || adGroup.clicks > 0));
    
    // Apply group type filter
    let groupTypeMatch = true;
    if (groupTypeFilter === 'traditional') {
      groupTypeMatch = adGroup.groupType === 'ad_group';
    } else if (groupTypeFilter === 'asset') {
      groupTypeMatch = adGroup.groupType === 'asset_group';
    }
    
    // Apply search filter
    const searchMatch = searchTerm === '' || 
      adGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (adGroup.campaignName && adGroup.campaignName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return statusMatch && groupTypeMatch && searchMatch;
  });

  // Calculate totals
  const totals = filteredAdGroups.reduce((acc, adGroup) => ({
    clicks: acc.clicks + adGroup.clicks,
    impressions: acc.impressions + adGroup.impressions,
    cost: acc.cost + adGroup.cost,
    conversions: acc.conversions + adGroup.conversions,
    conversionsValue: acc.conversionsValue + adGroup.conversionsValue,
  }), {
    clicks: 0,
    impressions: 0,
    cost: 0,
    conversions: 0,
    conversionsValue: 0,
  });

  // Calculate derived metrics
  return {
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
    cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
    roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
    adGroupCount: filteredAdGroups.length
  };
};

// Helper function to get ad group performance statistics
export const getAdGroupPerformanceStats = (adGroups: AdGroup[]) => {
  if (adGroups.length === 0) return null;

  const stats = {
    totalAdGroups: adGroups.length,
    traditionalAdGroups: adGroups.filter(ag => ag.groupType === 'ad_group').length,
    assetGroups: adGroups.filter(ag => ag.groupType === 'asset_group').length,
    activeAdGroups: adGroups.filter(ag => ag.impressions > 0 || ag.clicks > 0).length,
    highPerformingAdGroups: 0,
    averageMetrics: {
      ctr: 0,
      cpa: 0,
      roas: 0,
      assetCoverage: 0
    }
  };

  // Calculate averages
  const totalClicks = adGroups.reduce((sum, ag) => sum + ag.clicks, 0);
  const totalImpressions = adGroups.reduce((sum, ag) => sum + ag.impressions, 0);
  const totalCost = adGroups.reduce((sum, ag) => sum + ag.cost, 0);
  const totalConversions = adGroups.reduce((sum, ag) => sum + ag.conversions, 0);
  const totalConversionsValue = adGroups.reduce((sum, ag) => sum + ag.conversionsValue, 0);
  
  const assetGroupsWithCoverage = adGroups.filter(ag => ag.assetCoverage && ag.assetCoverage > 0);
  const totalAssetCoverage = assetGroupsWithCoverage.reduce((sum, ag) => sum + (ag.assetCoverage || 0), 0);

  stats.averageMetrics = {
    ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
    cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
    roas: totalCost > 0 ? totalConversionsValue / totalCost : 0,
    assetCoverage: assetGroupsWithCoverage.length > 0 ? totalAssetCoverage / assetGroupsWithCoverage.length : 0
  };

  // Count high performing ad groups (top 33% by ROAS)
  const sortedByRoas = [...adGroups].sort((a, b) => b.roas - a.roas);
  const topThreshold = Math.floor(adGroups.length * 0.33);
  stats.highPerformingAdGroups = topThreshold;

  return stats;
}; 