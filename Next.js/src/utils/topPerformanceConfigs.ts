import { Target, Users, Search, Zap } from 'lucide-react';
import { calculatePOAS } from './performanceCalculations';

// Configuration for Top Campaigns Performance
export const topCampaignsConfig = {
  title: 'Top Campaigns Performance',
  description: 'Best performing campaigns by conversions',
  dataKey: 'campaigns',
  getItems: (data: any) => {
    if (!data?.campaigns || !Array.isArray(data.campaigns)) return [];
    
    return data.campaigns
      .filter((campaign: any) => campaign.conversions > 0 || campaign.conversionsValue > 0)
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((campaign: any) => {
        const conversionsValue = campaign.conversionsValue || 0;
        const cost = campaign.cost || 0;
        const poas = calculatePOAS(conversionsValue, cost);
        
        return {
          id: campaign.id || campaign.campaign_id || '',
          name: campaign.name || campaign.campaign_name || 'Unnamed Campaign',
          conversions: campaign.conversions || 0,
          cpa: campaign.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: 'up', // Default to positive trend - TODO: Calculate from historical data
          trendValue: 0 // Default to 0 - TODO: Calculate from historical data
        };
      });
  },
  getTypeInfo: () => ({
    type: 'Campaign',
    icon: Target,
    colorClass: 'bg-blue-100 text-blue-600'
  }),
  getExtraInfo: (item: any) => {
    const status = item.status || 'ENABLED';
    return {
      label: 'Status',
      value: status,
      colorClass: status === 'ENABLED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
    };
  },
  getSubtitle: (item: any) => {
    const impressions = item.impressions || 0;
    const clicks = item.clicks || 0;
    return `${impressions.toLocaleString()} impressions • ${clicks.toLocaleString()} clicks`;
  }
};

// Configuration for Top Ad Groups Performance
export const topAdGroupsConfig = {
  title: 'Top Ad/Asset Groups Performance',
  description: 'Best performing ad groups by conversions',
  dataKey: 'adGroups',
  getItems: (data: any) => {
    if (!data?.adGroups || !Array.isArray(data.adGroups)) return [];
    
    return data.adGroups
      .filter((adGroup: any) => adGroup.conversions > 0 || adGroup.conversionsValue > 0)
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((adGroup: any) => {
        const conversionsValue = adGroup.conversionsValue || 0;
        const cost = adGroup.cost || 0;
        const poas = calculatePOAS(conversionsValue, cost);
        
        return {
          id: adGroup.id || adGroup.ad_group_id || '',
          name: adGroup.name || adGroup.ad_group_name || 'Unnamed Ad Group',
          conversions: adGroup.conversions || 0,
          cpa: adGroup.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: 'up', // Default to positive trend - TODO: Calculate from historical data
          trendValue: 0, // Default to 0 - TODO: Calculate from historical data
          campaign_name: adGroup.campaignName || adGroup.campaign_name || 'Unknown Campaign',
          groupType: adGroup.groupType || 'ad_group'
        };
      });
  },
  getTypeInfo: (item: any) => {
    const isAssetGroup = item.groupType === 'asset_group';
    return {
      type: isAssetGroup ? 'Asset Group' : 'Ad Group',
      icon: isAssetGroup ? Zap : Users,
      colorClass: isAssetGroup ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
    };
  },
  getExtraInfo: (item: any) => {
    const status = item.status || 'ENABLED';
    return {
      label: 'Status',
      value: status,
      colorClass: status === 'ENABLED' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'
    };
  },
  getSubtitle: (item: any) => {
    return `Campaign: ${item.campaign_name || 'Unknown'}`;
  }
};

// Configuration for Top Keywords Performance
export const topKeywordsConfig = {
  title: 'Top Keywords Performance',
  description: 'Best performing keywords by conversions',
  dataKey: 'data',
  getItems: (data: any) => {
    let keywords = [];
    if (Array.isArray(data)) {
      keywords = data;
    } else if (data?.data && Array.isArray(data.data)) {
      keywords = data.data;
    } else if (data?.keywords && Array.isArray(data.keywords)) {
      keywords = data.keywords;
    }
    
    if (!keywords.length) return [];
    
    return keywords
      .filter((keyword: any) => keyword.type === 'keyword' && (keyword.conversions > 0 || keyword.conversions_value > 0))
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((keyword: any) => {
        const conversionsValue = keyword.conversions_value || 0;
        const cost = keyword.cost || 0;
        const poas = calculatePOAS(conversionsValue, cost);
        
        return {
          id: keyword.id || keyword.keyword_id || keyword.text || '',
          name: keyword.text || keyword.keyword_text || 'Unknown Keyword',
          conversions: keyword.conversions || 0,
          cpa: keyword.cost_per_conversion || keyword.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: 'up', // Default to positive trend - TODO: Calculate from historical data
          trendValue: 0, // Default to 0 - TODO: Calculate from historical data
          matchType: keyword.matchType || keyword.match_type || 'Unknown',
          campaign_name: keyword.campaign_name || keyword.campaignName || 'Unknown Campaign'
        };
      });
  },
  getTypeInfo: () => ({
    type: 'Keyword',
    icon: Search,
    colorClass: 'bg-teal-100 text-teal-600'
  }),
  getExtraInfo: (item: any) => {
    const matchType = item.matchType || 'Unknown';
    const colorMap: { [key: string]: string } = {
      'Exact': 'bg-green-100 text-green-600',
      'Phrase': 'bg-blue-100 text-blue-600',
      'Broad': 'bg-orange-100 text-orange-600'
    };
    return {
      label: 'Match Type',
      value: matchType,
      colorClass: colorMap[matchType] || 'bg-gray-100 text-gray-600'
    };
  },
  getSubtitle: (item: any) => {
    return `Campaign: ${item.campaign_name || 'Unknown'}`;
  }
}; 