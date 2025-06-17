import { Target, Award, ShoppingBag, Search, Hash } from 'lucide-react';
import { MatrixConfig } from '../components/Dashboard/GenericPerformanceMatrix';
import { 
  calculatePOAS, 
  calculateCPA, 
  determineCampaignType
} from './performanceCalculations';

// Campaign Performance Matrix Configuration
export const campaignMatrixConfig: MatrixConfig = {
  title: 'Campaign Performance Matrix',
  description: 'Conversions vs POAS analysis with strategic quadrants',
  filterTypes: ['Search', 'Performance Max', 'Shopping'],
  getTypeColor: (type: string) => {
    switch (type) {
      case 'Search': return '#3b82f6';
      case 'Performance Max': return '#10b981';
      case 'Shopping': return '#8b5cf6';
      default: return '#6b7280';
    }
  },
  getTypeIcon: (type: string) => {
    switch (type) {
      case 'Search': return Target;
      case 'Performance Max': return Award;
      case 'Shopping': return ShoppingBag;
      default: return Target;
    }
  },
  processData: (campaignData: any) => {
    if (!campaignData?.campaigns || !Array.isArray(campaignData.campaigns) || campaignData.campaigns.length === 0) {
      return [];
    }

    // Process real campaign data only
    const processedCampaigns = campaignData.campaigns
      .filter((campaign: any) => {
        // Include campaigns that have either conversions > 0 OR conversion value > 0, and cost > 0
        const hasConversions = (campaign.conversions > 0) || (campaign.conversionsValue > 0);
        const hasCost = campaign.cost > 0;
        return hasConversions && hasCost;
      })
      .slice(0, 10) // Limit to top 10 for better visualization
      .map((campaign: any, index: number) => {
        const campaignType = determineCampaignType(campaign.name);
        const poas = calculatePOAS(campaign.conversionsValue || 0, campaign.cost || 0);
        const cpa = campaign.cpa || calculateCPA(campaign.cost || 0, campaign.conversions || 0);

        return {
          id: campaign.id || `campaign-${index}`,
          name: campaign.name,
          conversions: campaign.conversions,
          poas: poas,
          spend: campaign.cost,
          type: campaignType,
          quadrant: 'Star', // Will be calculated in component
          cpa: cpa,
          clicks: campaign.clicks
        };
      });
      
    return processedCampaigns;
  }
};

// Ad Group Performance Matrix Configuration
export const adGroupMatrixConfig: MatrixConfig = {
  title: 'Ad Group Performance Matrix',
  description: 'Conversions vs POAS analysis with strategic quadrants',
  filterTypes: ['Search', 'Performance Max', 'Shopping'],
  getTypeColor: (type: string) => {
    switch (type) {
      case 'Search': return '#3b82f6';
      case 'Performance Max': return '#10b981';
      case 'Shopping': return '#8b5cf6';
      default: return '#6b7280';
    }
  },
  getTypeIcon: (type: string) => {
    switch (type) {
      case 'Search': return Target;
      case 'Performance Max': return Award;
      case 'Shopping': return ShoppingBag;
      default: return Target;
    }
  },
  processData: (adGroupData: any) => {
    if (!adGroupData?.adGroups || !Array.isArray(adGroupData.adGroups) || adGroupData.adGroups.length === 0) {
      return [];
    }

    // Process real ad group data only
    return adGroupData.adGroups
      .filter((adGroup: any) => {
        const hasConversions = (adGroup.conversions > 0) || (adGroup.conversionsValue > 0);
        const hasCost = adGroup.cost > 0;
        return hasConversions && hasCost;
      })
      .slice(0, 10)
      .map((adGroup: any, index: number) => {
        // Determine campaign type based on campaign name
        const campaignName = (adGroup.campaignName || '').toLowerCase();
        const campaignType = determineCampaignType(campaignName);
        const poas = calculatePOAS(adGroup.conversionsValue || 0, adGroup.cost || 0);
        const cpa = adGroup.cpa || calculateCPA(adGroup.cost || 0, adGroup.conversions || 0);

        return {
          id: adGroup.id || `adgroup-${index}`,
          name: adGroup.name,
          conversions: adGroup.conversions,
          poas: poas,
          spend: adGroup.cost,
          type: campaignType,
          quadrant: 'Star', // Will be calculated in component
          cpa: cpa,
          clicks: adGroup.clicks,
          campaignName: adGroup.campaignName || 'Unknown Campaign'
        };
      });
  }
};

// Keyword Performance Matrix Configuration
export const keywordMatrixConfig: MatrixConfig = {
  title: 'Keyword Performance Matrix',
  description: 'Conversions vs POAS analysis with strategic quadrants',
  filterTypes: ['Keywords', 'Search Terms'],
  getTypeColor: (type: string) => {
    switch (type) {
      case 'Keywords': return '#3b82f6';
      case 'Search Terms': return '#10b981';
      default: return '#6b7280';
    }
  },
  getTypeIcon: (type: string) => {
    switch (type) {
      case 'Keywords': return Target;
      case 'Search Terms': return Search;
      default: return Hash;
    }
  },
  processData: (keywordData: any) => {
    if (!keywordData?.data || !Array.isArray(keywordData.data) || keywordData.data.length === 0) {
      return [];
    }

    // Process real keyword data only
    return keywordData.data
      .filter((keyword: any) => {
        const hasConversions = (keyword.conversions > 0) || (keyword.conversions_value > 0);
        const hasCost = keyword.cost > 0;
        return hasConversions && hasCost;
      })
      .slice(0, 10)
      .map((keyword: any, index: number) => {
        const poas = calculatePOAS(keyword.conversions_value || 0, keyword.cost || 0);
        const cpa = calculateCPA(keyword.cost || 0, keyword.conversions || 0);

        return {
          id: keyword.id || `keyword-${index}`,
          name: keyword.keyword_text,
          conversions: keyword.conversions,
          poas: poas,
          spend: keyword.cost,
          type: keyword.type === 'search_term' ? 'Search Terms' : 'Keywords',
          quadrant: 'Star', // Will be calculated in component
          cpa: cpa,
          clicks: keyword.clicks,
          campaignName: keyword.campaign_name || 'Unknown Campaign',
          matchType: keyword.match_type || 'BROAD'
        };
      });
  }
}; 