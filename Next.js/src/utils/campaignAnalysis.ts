import { Campaign, CampaignData } from '../types';

export type CampaignType = 'Search' | 'Performance Max' | 'Shopping' | 'Other';

export interface CampaignsByType {
  Search: Campaign[];
  'Performance Max': Campaign[];
  Shopping: Campaign[];
  Other: Campaign[];
}

export interface MetricsByType {
  Search: number;
  'Performance Max': number;
  Shopping: number;
  Other: number;
}

/**
 * Categorizes campaigns into types based on campaign name patterns
 * @param campaigns - Array of campaigns to categorize
 * @returns Object with campaigns grouped by type
 */
export const getCampaignsByType = (campaigns: Campaign[] | null): CampaignsByType => {
  const result: CampaignsByType = {
    Search: [],
    'Performance Max': [],
    Shopping: [],
    Other: []
  };

  if (!campaigns) {
    return result;
  }

  campaigns.forEach(campaign => {
    const name = campaign.name.toLowerCase();
    
    // Check for Performance Max patterns
    if (name.includes('performance max') || 
        name.includes('pmax') || 
        name.includes('pm ') ||
        name.includes(' pm') ||
        name.includes('_pm_') ||
        name.includes('-pm-')) {
      result['Performance Max'].push(campaign);
    }
    // Check for Shopping patterns
    else if (name.includes('shopping') || 
             name.includes('shop') ||
             name.includes('product') ||
             name.includes('merchant') ||
             name.includes('pla')) {
      result.Shopping.push(campaign);
    }
    // Check for Search patterns (most common, so check last)
    else if (name.includes('search') || 
             name.includes('src') ||
             name.includes('keyword') ||
             name.includes('text') ||
             name.includes('brand') ||
             name.includes('generic') ||
             // If none of the above patterns match, assume it's search
             (!name.includes('display') && 
              !name.includes('video') && 
              !name.includes('youtube'))) {
      result.Search.push(campaign);
    }
    // Everything else goes to Other
    else {
      result.Other.push(campaign);
    }
  });

  return result;
};

/**
 * Calculates total conversions by campaign type
 * @param campaigns - Array of campaigns or CampaignData object
 * @returns Object with conversion totals by type
 */
export const calculateConversionsByType = (campaigns: Campaign[] | CampaignData | null): MetricsByType => {
  const result: MetricsByType = {
    Search: 0,
    'Performance Max': 0,
    Shopping: 0,
    Other: 0
  };

  if (!campaigns) {
    return result;
  }

  // Handle both Campaign[] and CampaignData input
  const campaignArray = Array.isArray(campaigns) ? campaigns : campaigns.campaigns;
  
  if (!campaignArray) {
    return result;
  }

  const campaignsByType = getCampaignsByType(campaignArray);

  // Sum conversions for each type
  Object.keys(campaignsByType).forEach(type => {
    const typedType = type as CampaignType;
    result[typedType] = campaignsByType[typedType].reduce((sum, campaign) => {
      return sum + (campaign.conversions || 0);
    }, 0);
  });

  return result;
};

/**
 * Calculates average CPA by campaign type
 * @param campaigns - Array of campaigns or CampaignData object
 * @returns Object with average CPA by type
 */
export const calculateCPAByType = (campaigns: Campaign[] | CampaignData | null): MetricsByType => {
  const result: MetricsByType = {
    Search: 0,
    'Performance Max': 0,
    Shopping: 0,
    Other: 0
  };

  if (!campaigns) {
    return result;
  }

  // Handle both Campaign[] and CampaignData input
  const campaignArray = Array.isArray(campaigns) ? campaigns : campaigns.campaigns;
  
  if (!campaignArray) {
    return result;
  }

  const campaignsByType = getCampaignsByType(campaignArray);

  // Calculate average CPA for each type
  Object.keys(campaignsByType).forEach(type => {
    const typedType = type as CampaignType;
    const campaignsOfType = campaignsByType[typedType];
    
    // Only calculate CPA for campaigns with conversions
    const campaignsWithConversions = campaignsOfType.filter(campaign => 
      campaign.conversions > 0 && campaign.cpa > 0
    );
    
    if (campaignsWithConversions.length === 0) {
      result[typedType] = 0;
    } else {
      // Calculate weighted average CPA (total cost / total conversions)
      const totalCost = campaignsWithConversions.reduce((sum, campaign) => sum + campaign.cost, 0);
      const totalConversions = campaignsWithConversions.reduce((sum, campaign) => sum + campaign.conversions, 0);
      
      result[typedType] = totalConversions > 0 ? totalCost / totalConversions : 0;
    }
  });

  return result;
};

/**
 * Calculates total cost by campaign type
 * @param campaigns - Array of campaigns or CampaignData object
 * @returns Object with cost totals by type
 */
export const calculateCostByType = (campaigns: Campaign[] | CampaignData | null): MetricsByType => {
  const result: MetricsByType = {
    Search: 0,
    'Performance Max': 0,
    Shopping: 0,
    Other: 0
  };

  if (!campaigns) {
    return result;
  }

  // Handle both Campaign[] and CampaignData input
  const campaignArray = Array.isArray(campaigns) ? campaigns : campaigns.campaigns;
  
  if (!campaignArray) {
    return result;
  }

  const campaignsByType = getCampaignsByType(campaignArray);

  // Sum cost for each type
  Object.keys(campaignsByType).forEach(type => {
    const typedType = type as CampaignType;
    result[typedType] = campaignsByType[typedType].reduce((sum, campaign) => {
      return sum + (campaign.cost || 0);
    }, 0);
  });

  return result;
};

/**
 * Gets campaign count by type
 * @param campaigns - Array of campaigns or CampaignData object
 * @returns Object with campaign counts by type
 */
export const getCampaignCountByType = (campaigns: Campaign[] | CampaignData | null): MetricsByType => {
  const result: MetricsByType = {
    Search: 0,
    'Performance Max': 0,
    Shopping: 0,
    Other: 0
  };

  if (!campaigns) {
    return result;
  }

  // Handle both Campaign[] and CampaignData input
  const campaignArray = Array.isArray(campaigns) ? campaigns : campaigns.campaigns;
  
  if (!campaignArray) {
    return result;
  }

  const campaignsByType = getCampaignsByType(campaignArray);

  // Count campaigns for each type
  Object.keys(campaignsByType).forEach(type => {
    const typedType = type as CampaignType;
    result[typedType] = campaignsByType[typedType].length;
  });

  return result;
}; 