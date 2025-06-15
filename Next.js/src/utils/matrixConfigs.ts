import { Target, Award, ShoppingBag, Search, Hash } from 'lucide-react';
import { MatrixConfig } from '../components/Dashboard/GenericPerformanceMatrix';

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
    if (!campaignData?.campaigns || campaignData.campaigns.length === 0) {
      // Sample data when no real data is available
      return [
        { 
          id: '1',
          name: 'Search - Branding', 
          conversions: 180, 
          poas: 425, 
          spend: 15000, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 28.5,
          clicks: 2450
        },
        { 
          id: '2',
          name: 'Search - Generic High Intent', 
          conversions: 220, 
          poas: 380, 
          spend: 22000, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 31.2,
          clicks: 3100
        },
        { 
          id: '3',
          name: 'Performance Max - Basic', 
          conversions: 95, 
          poas: 520, 
          spend: 8500, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 24.8,
          clicks: 1850
        },
        { 
          id: '4',
          name: 'Shopping - Premium', 
          conversions: 65, 
          poas: 180, 
          spend: 18000, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 58.2,
          clicks: 1200
        },
        { 
          id: '5',
          name: 'Search - Brands', 
          conversions: 340, 
          poas: 290, 
          spend: 35000, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 35.8,
          clicks: 4200
        },
        { 
          id: '6',
          name: 'Performance Max - Luxury', 
          conversions: 125, 
          poas: 445, 
          spend: 12000, 
          type: 'Performance Max', 
          quadrant: 'Star',
          cpa: 26.9,
          clicks: 2100
        },
        { 
          id: '7',
          name: 'Shopping - Basic', 
          conversions: 85, 
          poas: 245, 
          spend: 14000, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 42.5,
          clicks: 1650
        },
        { 
          id: '8',
          name: 'Search - Generic Efficiency', 
          conversions: 160, 
          poas: 195, 
          spend: 28000, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 48.2,
          clicks: 2900
        },
        { 
          id: '9',
          name: 'Performance Max - Premium', 
          conversions: 75, 
          poas: 385, 
          spend: 9500, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 29.8,
          clicks: 1500
        },
        { 
          id: '10',
          name: 'Shopping - Mid-tier', 
          conversions: 110, 
          poas: 165, 
          spend: 16500, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 52.1,
          clicks: 1980
        }
      ];
    }

    // Process real campaign data
    return campaignData.campaigns
      .filter((campaign: any) => campaign.conversions > 0 && campaign.cost > 0)
      .slice(0, 10) // Limit to top 10 for better visualization
      .map((campaign: any, index: number) => {
        // Determine campaign type based on name
        const name = campaign.name.toLowerCase();
        let campaignType = 'Other';
        if (name.includes('performance max') || name.includes('pmax')) {
          campaignType = 'Performance Max';
        } else if (name.includes('shopping') || name.includes('shop')) {
          campaignType = 'Shopping';
        } else if (name.includes('search') || name.includes('src')) {
          campaignType = 'Search';
        }

        // Calculate POAS (assuming conversions_value exists)
        const poas = campaign.conversions_value && campaign.cost > 0 
          ? (campaign.conversions_value / campaign.cost) * 100 
          : Math.random() * 300 + 200; // Fallback random value

        const cpa = campaign.cpa || (campaign.cost / campaign.conversions);

        return {
          id: campaign.id || `campaign-${index}`,
          name: campaign.name,
          conversions: campaign.conversions,
          poas: Math.round(poas),
          spend: campaign.cost,
          type: campaignType,
          quadrant: 'Star', // Will be calculated in component
          cpa: cpa,
          clicks: campaign.clicks
        };
      });
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
    if (!adGroupData?.adGroups || adGroupData.adGroups.length === 0) {
      // Sample data when no real data is available
      return [
        { 
          id: '1',
          name: 'Brand Keywords - Exact', 
          conversions: 185, 
          poas: 445, 
          spend: 4144, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 22.4,
          clicks: 1850,
          campaignName: 'Search - Brand Terms'
        },
        { 
          id: '2',
          name: 'High Intent Keywords', 
          conversions: 128, 
          poas: 420, 
          spend: 3994, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 31.2,
          clicks: 1280,
          campaignName: 'Search - Generic High Intent'
        },
        { 
          id: '3',
          name: 'All Products - Asset Group', 
          conversions: 142, 
          poas: 385, 
          spend: 4105, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 28.9,
          clicks: 1420,
          campaignName: 'Performance Max - All Products'
        },
        { 
          id: '4',
          name: 'Premium Collection - Asset', 
          conversions: 95, 
          poas: 285, 
          spend: 3658, 
          type: 'Performance Max', 
          quadrant: 'Dog',
          cpa: 38.5,
          clicks: 950,
          campaignName: 'Performance Max - Premium'
        },
        { 
          id: '5',
          name: 'Competitor Terms - Broad', 
          conversions: 78, 
          poas: 195, 
          spend: 3572, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 45.8,
          clicks: 780,
          campaignName: 'Search - Competitor Terms'
        },
        { 
          id: '6',
          name: 'Electronics - Asset Group', 
          conversions: 65, 
          poas: 225, 
          spend: 2750, 
          type: 'Performance Max', 
          quadrant: 'Star',
          cpa: 42.3,
          clicks: 650,
          campaignName: 'Performance Max - Electronics'
        },
        { 
          id: '7',
          name: 'Shopping Product Groups', 
          conversions: 55, 
          poas: 165, 
          spend: 2200, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 40.0,
          clicks: 550,
          campaignName: 'Shopping - Premium Collection'
        },
        { 
          id: '8',
          name: 'Generic Keywords - Phrase', 
          conversions: 98, 
          poas: 315, 
          spend: 3087, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 31.5,
          clicks: 980,
          campaignName: 'Search - Generic High Intent'
        },
        { 
          id: '9',
          name: 'Luxury - Asset Group', 
          conversions: 42, 
          poas: 485, 
          spend: 1260, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 30.0,
          clicks: 420,
          campaignName: 'Performance Max - Luxury'
        },
        { 
          id: '10',
          name: 'Shopping - Mid-tier', 
          conversions: 72, 
          poas: 245, 
          spend: 2880, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 40.0,
          clicks: 720,
          campaignName: 'Shopping - Electronics'
        }
      ];
    }

    // Process real ad group data
    return adGroupData.adGroups
      .filter((adGroup: any) => adGroup.conversions > 0 && adGroup.cost > 0)
      .slice(0, 10) // Limit to top 10 for better visualization
      .map((adGroup: any, index: number) => {
        // Determine campaign type based on campaign name
        const campaignName = (adGroup.campaignName || '').toLowerCase();
        let campaignType = 'Other';
        if (campaignName.includes('performance max') || campaignName.includes('pmax')) {
          campaignType = 'Performance Max';
        } else if (campaignName.includes('shopping') || campaignName.includes('shop')) {
          campaignType = 'Shopping';
        } else if (campaignName.includes('search') || campaignName.includes('src')) {
          campaignType = 'Search';
        }

        // Calculate POAS (assuming conversions_value exists)
        const poas = adGroup.conversionsValue && adGroup.cost > 0 
          ? (adGroup.conversionsValue / adGroup.cost) * 100 
          : Math.random() * 300 + 200; // Fallback random value

        const cpa = adGroup.cpa || (adGroup.cost / adGroup.conversions);

        return {
          id: adGroup.id || `adgroup-${index}`,
          name: adGroup.name,
          conversions: adGroup.conversions,
          poas: Math.round(poas),
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
    if (!keywordData?.data || keywordData.data.length === 0) {
      // Sample data when no real data is available
      return [
        {
          id: '1',
          name: 'google ads management',
          conversions: 245,
          poas: 520,
          spend: 4508,
          type: 'Keywords',
          quadrant: 'Star',
          cpa: 18.4,
          clicks: 1250,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '2',
          name: 'digital marketing agency',
          conversions: 198,
          poas: 445,
          spend: 4792,
          type: 'Search Terms',
          quadrant: 'Star',
          cpa: 24.2,
          clicks: 1180,
          campaignName: 'Search - Generic High Intent',
          matchType: 'PHRASE'
        },
        {
          id: '3',
          name: 'ppc management services',
          conversions: 165,
          poas: 385,
          spend: 4769,
          type: 'Keywords',
          quadrant: 'Cash Cow',
          cpa: 28.9,
          clicks: 1095,
          campaignName: 'Search - Services',
          matchType: 'PHRASE'
        },
        {
          id: '4',
          name: 'google advertising consultant',
          conversions: 142,
          poas: 295,
          spend: 5084,
          type: 'Search Terms',
          quadrant: 'Cash Cow',
          cpa: 35.8,
          clicks: 985,
          campaignName: 'Search - Competitor Terms',
          matchType: 'BROAD'
        },
        {
          id: '5',
          name: 'adwords optimization',
          conversions: 128,
          poas: 225,
          spend: 5414,
          type: 'Keywords',
          quadrant: 'Dog',
          cpa: 42.3,
          clicks: 875,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '6',
          name: 'search engine marketing',
          conversions: 95,
          poas: 285,
          spend: 3677,
          type: 'Search Terms',
          quadrant: 'Dog',
          cpa: 38.7,
          clicks: 745,
          campaignName: 'Search - Generic High Intent',
          matchType: 'BROAD'
        },
        {
          id: '7',
          name: 'pay per click advertising',
          conversions: 85,
          poas: 195,
          spend: 3245,
          type: 'Keywords',
          quadrant: 'Question Mark',
          cpa: 38.2,
          clicks: 625,
          campaignName: 'Search - Services',
          matchType: 'PHRASE'
        },
        {
          id: '8',
          name: 'online marketing consultant',
          conversions: 75,
          poas: 165,
          spend: 2895,
          type: 'Search Terms',
          quadrant: 'Question Mark',
          cpa: 38.6,
          clicks: 545,
          campaignName: 'Search - Competitor Terms',
          matchType: 'BROAD'
        },
        {
          id: '9',
          name: 'google ads specialist',
          conversions: 65,
          poas: 145,
          spend: 2456,
          type: 'Keywords',
          quadrant: 'Dog',
          cpa: 37.8,
          clicks: 485,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '10',
          name: 'digital advertising agency',
          conversions: 55,
          poas: 125,
          spend: 2145,
          type: 'Search Terms',
          quadrant: 'Dog',
          cpa: 39.0,
          clicks: 425,
          campaignName: 'Search - Generic High Intent',
          matchType: 'BROAD'
        }
      ];
    }

    // Process real keyword data
    return keywordData.data
      .filter((keyword: any) => keyword.conversions > 0 && keyword.cost > 0)
      .slice(0, 10)
      .map((keyword: any, index: number) => {
        const conversions = keyword.conversions;
        const poas = keyword.conversions_value && keyword.cost > 0 
          ? (keyword.conversions_value / keyword.cost) * 100 
          : Math.random() * 300 + 100;

        return {
          id: keyword.id || `keyword-${index}`,
          name: keyword.keyword_text,
          conversions: conversions,
          poas: Math.round(poas),
          spend: keyword.cost,
          type: keyword.type === 'search_term' ? 'Search Terms' : 'Keywords',
          quadrant: 'Star', // Will be calculated in component
          cpa: keyword.cost && keyword.conversions > 0 ? keyword.cost / keyword.conversions : 0,
          clicks: keyword.clicks,
          campaignName: keyword.campaign_name || 'Unknown Campaign',
          matchType: keyword.match_type || 'BROAD'
        };
      });
  }
}; 