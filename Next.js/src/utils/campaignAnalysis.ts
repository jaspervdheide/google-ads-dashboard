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

/**
 * ROAS Performance Analysis Interface
 */
export interface RoasAnalysis {
  campaignsWithTargets: number;
  campaignsExceedingTarget: number;
  campaignsUnderperforming: number;
  averageAchievedRoas: number;
  averageTargetRoas: number;
  portfolioRoas: number;
  targetGap: number; // achieved - target
  reachLimitedCampaigns: number; // campaigns potentially limited by high target ROAS
}

export interface RoasAnalysisByType {
  Search: RoasAnalysis;
  'Performance Max': RoasAnalysis;
  Shopping: RoasAnalysis;
  Other: RoasAnalysis;
}

/**
 * Analyzes ROAS performance by campaign type
 * Determines if campaigns meet their ROAS targets and if targets are limiting reach
 * @param campaigns - Array of campaigns or CampaignData object
 * @returns Object with ROAS analysis by type
 */
export const calculateRoasAnalysisByType = (campaigns: Campaign[] | CampaignData | null): RoasAnalysisByType => {
  const result: RoasAnalysisByType = {
    Search: createEmptyRoasAnalysis(),
    'Performance Max': createEmptyRoasAnalysis(),
    Shopping: createEmptyRoasAnalysis(),
    Other: createEmptyRoasAnalysis()
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

  // Analyze ROAS for each type
  Object.keys(campaignsByType).forEach(type => {
    const typedType = type as CampaignType;
    const campaignsOfType = campaignsByType[typedType];
    
    result[typedType] = analyzeRoasPerformance(campaignsOfType);
  });

  return result;
};

/**
 * Creates an empty ROAS analysis object
 */
function createEmptyRoasAnalysis(): RoasAnalysis {
  return {
    campaignsWithTargets: 0,
    campaignsExceedingTarget: 0,
    campaignsUnderperforming: 0,
    averageAchievedRoas: 0,
    averageTargetRoas: 0,
    portfolioRoas: 0,
    targetGap: 0,
    reachLimitedCampaigns: 0
  };
}

/**
 * Analyzes ROAS performance for a group of campaigns
 */
function analyzeRoasPerformance(campaigns: Campaign[]): RoasAnalysis {
  if (campaigns.length === 0) {
    return createEmptyRoasAnalysis();
  }

  // Filter campaigns with valid cost and conversion data
  const validCampaigns = campaigns.filter(campaign => 
    campaign.cost > 0 && campaign.conversionsValue > 0
  );

  if (validCampaigns.length === 0) {
    return createEmptyRoasAnalysis();
  }

  // Calculate achieved ROAS for each campaign (POAS = Profit on Ad Spend)
  const campaignRoasData = validCampaigns.map(campaign => {
    const achievedRoas = (campaign.conversionsValue / campaign.cost) * 100;
    
    // Get target ROAS from bidding strategy
    let targetRoas: number | null = null;
    
    if (campaign.biddingStrategy?.type === 'TARGET_ROAS' && campaign.biddingStrategy?.targetRoas) {
      // Convert from decimal to percentage (API returns as decimal, e.g., 3.0 = 300%)
      targetRoas = campaign.biddingStrategy.targetRoas * 100;
    } else if (campaign.biddingStrategy?.type === 'MAXIMIZE_CONVERSION_VALUE' && campaign.biddingStrategy?.targetRoasOverride) {
      // For Maximize Conversion Value with target ROAS override
      targetRoas = campaign.biddingStrategy.targetRoasOverride * 100;
    } else if (campaign.metrics?.averageTargetRoas) {
      // Fallback to metrics.average_target_roas if available
      targetRoas = campaign.metrics.averageTargetRoas * 100;
    }

    return {
      campaign,
      achievedRoas,
      targetRoas,
      hasTarget: targetRoas !== null,
      exceedsTarget: targetRoas ? achievedRoas >= targetRoas * 1.1 : false,
      underperforms: targetRoas ? achievedRoas < targetRoas * 0.9 : false,
      // Check if campaign might be reach-limited by high target ROAS
      // High target (>400%) with low impression share could indicate reach limitation
      potentiallyReachLimited: targetRoas && targetRoas > 400 && campaign.impressions < 1000
    };
  });

  // Calculate metrics
  const campaignsWithTargets = campaignRoasData.filter(d => d.hasTarget).length;
  const campaignsExceedingTarget = campaignRoasData.filter(d => d.exceedsTarget).length;
  const campaignsUnderperforming = campaignRoasData.filter(d => d.underperforms).length;
  const reachLimitedCampaigns = campaignRoasData.filter(d => d.potentiallyReachLimited).length;

  // Calculate averages
  const totalCost = validCampaigns.reduce((sum, campaign) => sum + campaign.cost, 0);
  const totalValue = validCampaigns.reduce((sum, campaign) => sum + campaign.conversionsValue, 0);
  const portfolioRoas = (totalValue / totalCost) * 100;

  const averageAchievedRoas = campaignRoasData.reduce((sum, d) => sum + d.achievedRoas, 0) / campaignRoasData.length;
  
  const campaignsWithTargetRoas = campaignRoasData.filter(d => d.hasTarget);
  const averageTargetRoas = campaignsWithTargetRoas.length > 0 
    ? campaignsWithTargetRoas.reduce((sum, d) => sum + (d.targetRoas || 0), 0) / campaignsWithTargetRoas.length
    : 0;

  const targetGap = averageAchievedRoas - averageTargetRoas;

  return {
    campaignsWithTargets,
    campaignsExceedingTarget,
    campaignsUnderperforming,
    averageAchievedRoas,
    averageTargetRoas,
    portfolioRoas,
    targetGap,
    reachLimitedCampaigns
  };
} 