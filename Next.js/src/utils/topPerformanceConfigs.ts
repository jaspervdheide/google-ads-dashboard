import { Target, Users, Search, Zap } from 'lucide-react';

// Configuration for Top Campaigns Performance
export const topCampaignsConfig = {
  title: 'Top Campaigns Performance',
  description: 'Best performing campaigns by conversions',
  dataKey: 'campaigns',
  getItems: (data: any) => {
    if (!data?.campaigns || !Array.isArray(data.campaigns)) return [];
    
    return data.campaigns
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((campaign: any) => {
        // Campaigns API returns conversionsValue and cost (already converted from micros)
        const conversionsValue = campaign.conversionsValue || 0;
        const cost = campaign.cost || 0;
        const poas = cost > 0 ? Math.round((conversionsValue / cost) * 100) : 0;
        
        return {
          id: campaign.id || campaign.campaign_id || '',
          name: campaign.name || campaign.campaign_name || 'Unnamed Campaign',
          conversions: campaign.conversions || 0,
          cpa: campaign.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
          trendValue: Math.round(Math.random() * 20 + 5)
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
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((adGroup: any) => {
        // Ad Groups API returns cost and conversionsValue (already converted from micros)
        const conversionsValue = adGroup.conversionsValue || 0;
        const cost = adGroup.cost || 0;
        const poas = cost > 0 ? Math.round((conversionsValue / cost) * 100) : 0;
        
        return {
          id: adGroup.id || adGroup.ad_group_id || '',
          name: adGroup.name || adGroup.ad_group_name || 'Unnamed Ad Group',
          conversions: adGroup.conversions || 0,
          cpa: adGroup.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
          trendValue: Math.round(Math.random() * 20 + 5),
          campaign_name: adGroup.campaignName || adGroup.campaign_name || 'Unknown Campaign',
          groupType: adGroup.groupType || 'ad_group' // Include groupType for distinction
        };
      });
  },
  getTypeInfo: (item: any) => {
    // Distinguish between Ad Groups and Asset Groups based on groupType
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
  dataKey: 'data', // Keywords API returns data in 'data' key
  getItems: (data: any) => {
    // Handle both direct array and nested data structure
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
      .filter((keyword: any) => keyword.type === 'keyword') // Filter out search terms
      .sort((a: any, b: any) => (b.conversions || 0) - (a.conversions || 0))
      .slice(0, 5)
      .map((keyword: any) => {
        // Keywords API returns conversions_value and cost (already converted from micros)
        const conversionsValue = keyword.conversions_value || 0;
        const cost = keyword.cost || 0;
        const poas = cost > 0 ? Math.round((conversionsValue / cost) * 100) : 0;
        
        return {
          id: keyword.id || keyword.keyword_id || keyword.text || '',
          name: keyword.text || keyword.keyword_text || 'Unknown Keyword',
          conversions: keyword.conversions || 0,
          cpa: keyword.cost_per_conversion || keyword.cpa || 0,
          poas: poas,
          spend: Math.round(cost),
          trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
          trendValue: Math.round(Math.random() * 20 + 5),
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