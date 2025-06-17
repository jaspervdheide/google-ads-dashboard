import React from 'react';
import { Search, Package, Zap, MoreHorizontal } from 'lucide-react';

export type CampaignType = 'search' | 'shopping' | 'performance_max' | 'other';

// Detect campaign type from campaign name
export const detectCampaignType = (campaignName: string): CampaignType => {
  const nameLower = campaignName.toLowerCase();
  if (nameLower.includes('performance max') || nameLower.includes('pmax')) {
    return 'performance_max';
  }
  if (nameLower.includes('shopping')) {
    return 'shopping';
  }
  if (nameLower.includes('search') || nameLower.includes('text') || nameLower.includes('keyword')) {
    return 'search';
  }
  return 'other';
};

// Get campaign type indicator icon and styling
export const getCampaignTypeIndicator = (campaignType: CampaignType) => {
  switch (campaignType) {
    case 'search':
      return <Search className="h-4 w-4 text-blue-500" />;
    case 'shopping':
      return <Package className="h-4 w-4 text-green-500" />;
    case 'performance_max':
      return <Zap className="h-4 w-4 text-purple-500" />;
    default:
      return <MoreHorizontal className="h-4 w-4 text-gray-500" />;
  }
}; 