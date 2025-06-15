import { Target, Users, Search } from 'lucide-react';

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
      .map((campaign: any) => ({
        id: campaign.id || campaign.campaign_id || '',
        name: campaign.name || campaign.campaign_name || 'Unnamed Campaign',
        conversions: campaign.conversions || 0,
        cpa: campaign.cost_per_conversion || campaign.cpa || 0,
        poas: Math.round((campaign.conversions_value || 0) / (campaign.cost_micros / 1000000 || 1) * 100) || 0,
        spend: Math.round((campaign.cost_micros || 0) / 1000000) || 0,
        trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
        trendValue: Math.round(Math.random() * 20 + 5)
      }));
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
      .map((adGroup: any) => ({
        id: adGroup.id || adGroup.ad_group_id || '',
        name: adGroup.name || adGroup.ad_group_name || 'Unnamed Ad Group',
        conversions: adGroup.conversions || 0,
        cpa: adGroup.cost_per_conversion || adGroup.cpa || 0,
        poas: Math.round((adGroup.conversions_value || 0) / (adGroup.cost_micros / 1000000 || 1) * 100) || 0,
        spend: Math.round((adGroup.cost_micros || 0) / 1000000) || 0,
        trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
        trendValue: Math.round(Math.random() * 20 + 5),
        campaign_name: adGroup.campaign_name || 'Unknown Campaign'
      }));
  },
  getTypeInfo: () => ({
    type: 'Ad Group',
    icon: Users,
    colorClass: 'bg-purple-100 text-purple-600'
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
      .map((keyword: any) => ({
        id: keyword.id || keyword.keyword_id || keyword.text || '',
        name: keyword.text || keyword.keyword_text || 'Unknown Keyword',
        conversions: keyword.conversions || 0,
        cpa: keyword.cost_per_conversion || keyword.cpa || 0,
        poas: Math.round((keyword.conversions_value || 0) / (keyword.cost_micros / 1000000 || 1) * 100) || 0,
        spend: Math.round((keyword.cost_micros || 0) / 1000000) || 0,
        trend: Math.random() > 0.5 ? 'up' : 'down', // Mock trend data
        trendValue: Math.round(Math.random() * 20 + 5),
        matchType: keyword.matchType || keyword.match_type || 'Unknown'
      }));
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
    const impressions = item.impressions || 0;
    const clicks = item.clicks || 0;
    return `${impressions.toLocaleString()} impressions • ${clicks.toLocaleString()} clicks`;
  }
}; 