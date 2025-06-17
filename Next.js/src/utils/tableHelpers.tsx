/**
 * Table utility functions for the Google Ads Dashboard
 * Extracted from the main Dashboard component for better code organization
 */

import React from 'react';
import { Campaign, CampaignData } from '../types';
import { logger } from './logger';
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage 
} from './index';

// Helper function to get current High Spend threshold
export const getHighSpendThreshold = (campaignData: CampaignData | null) => {
  if (!campaignData || campaignData.campaigns.length === 0) return 0;
  
  const campaigns = campaignData.campaigns;
  const campaignsWithSpend = campaigns.filter(c => c.cost > 0);
  
  // If no campaigns have spend, return 0
  if (campaignsWithSpend.length === 0) return 0;
  
  const totalSpend = campaignsWithSpend.reduce((sum, c) => sum + c.cost, 0);
  const averageSpend = totalSpend / campaignsWithSpend.length;
  const threshold = averageSpend * 2;
  
  // Set a minimum threshold of €10 to avoid very low thresholds
  return Math.max(threshold, 10);
};

export const applyPreFilters = (campaigns: Campaign[], activeFilters: Set<string>) => {
  let filtered = [...campaigns];
  
  if (activeFilters.has('high_spend')) {
    const campaignsWithSpend = campaigns.filter(c => c.cost > 0);
    
    if (campaignsWithSpend.length === 0) {
      filtered = [];
    } else {
      const totalSpend = campaignsWithSpend.reduce((sum, c) => sum + c.cost, 0);
      const averageSpend = totalSpend / campaignsWithSpend.length;
      const highSpendThreshold = Math.max(averageSpend * 2, 10);
      
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => c.cost > highSpendThreshold);
      
      // Only log in debug mode for performance insights
      logger.debug('High Spend filter applied', {
        averageSpend: averageSpend.toFixed(2),
        threshold: highSpendThreshold.toFixed(2),
        beforeCount,
        afterCount: filtered.length
      });
    }
  }
  
  if (activeFilters.has('low_ctr')) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(c => c.ctr < 2.0);
    logger.debug('Low CTR filter applied', { beforeCount, afterCount: filtered.length });
  }
  
  if (activeFilters.has('high_cpa')) {
    const beforeCount = filtered.length;
    filtered = filtered.filter(c => c.conversions > 0 && c.cpa > 20);
    logger.debug('High CPA filter applied', { beforeCount, afterCount: filtered.length });
  }
  
  return filtered;
};

export const getFilteredAndSortedCampaigns = (
  campaignData: CampaignData | null,
  statusFilter: string,
  activeFilters: Set<string>,
  campaignSearch: string,
  campaignSort: { field: string; direction: 'asc' | 'desc' | null }
) => {
  if (!campaignData) return [];
  
  let campaigns = [...campaignData.campaigns];
  const originalCount = campaigns.length;

  // Development-only summary logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Campaign filtering started', { 
      originalCount, 
      statusFilter, 
      searchTerm: campaignSearch ? 'provided' : 'none',
      activeFilters: Array.from(activeFilters)
    });
  }
  
  // Status filter - "Active Only" means campaigns with actual activity
  if (statusFilter === 'active') {
    campaigns = campaigns.filter(c => {
      // Consider a campaign "active" if it has impressions OR clicks
      return c.impressions > 0 || c.clicks > 0;
    });
  }
  
  // Apply pre-filters
  if (activeFilters.size > 0) {
    campaigns = applyPreFilters(campaigns, activeFilters);
  }
  
  // Search filter
  if (campaignSearch.trim()) {
    const searchTerm = campaignSearch.toLowerCase().trim();
    campaigns = campaigns.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm)
    );
  }
  
  // Apply sorting
  if (campaignSort.field && campaignSort.direction) {
    campaigns.sort((a, b) => {
      const field = campaignSort.field;
      let aValue: any = a[field as keyof Campaign];
      let bValue: any = b[field as keyof Campaign];
      
      // Handle numeric fields properly
      const numericFields = ['clicks', 'impressions', 'cost', 'ctr', 'avgCpc', 'conversions', 'conversionsValue', 'cpa', 'roas'];
      
      if (numericFields.includes(field)) {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        // String comparison for text fields
        aValue = String(aValue).toLowerCase();
        bValue = String(bValue).toLowerCase();
      }
      
      let comparison = 0;
      if (aValue < bValue) {
        comparison = -1;
      } else if (aValue > bValue) {
        comparison = 1;
      }
      
      return campaignSort.direction === 'asc' ? comparison : -comparison;
    });
  }

  // Single summary log in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Campaign filtering completed', { 
      originalCount, 
      filteredCount: campaigns.length
    });
  }
  
  return campaigns;
};

export const calculateTableTotals = (
  campaignData: CampaignData | null,
  statusFilter: string,
  activeFilters: Set<string>,
  campaignSearch: string,
  campaignSort: { field: string; direction: 'asc' | 'desc' | null }
) => {
  const campaigns = getFilteredAndSortedCampaigns(campaignData, statusFilter, activeFilters, campaignSearch, campaignSort);
  const totals = campaigns.reduce((acc, campaign) => ({
    clicks: acc.clicks + campaign.clicks,
    impressions: acc.impressions + campaign.impressions,
    cost: acc.cost + campaign.cost,
    conversions: acc.conversions + campaign.conversions,
    conversionsValue: acc.conversionsValue + campaign.conversionsValue,
  }), { clicks: 0, impressions: 0, cost: 0, conversions: 0, conversionsValue: 0 });

  return {
    campaignCount: campaigns.length,
    ...totals,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
    cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
    roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
  };
};

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'ENABLED': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
    case 'PAUSED': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
    case 'REMOVED': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
    default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
  }
};

export const getPerformanceIndicator = (campaign: Campaign, metric: string, campaignData: CampaignData | null): 'high' | 'medium' | 'low' => {
  if (!campaignData) return 'medium';
  const allCampaigns = campaignData.campaigns;
  if (allCampaigns.length < 3) return 'medium';

  // Get all non-zero values to avoid skewing the thresholds
  const nonZeroValues = allCampaigns
    .map(c => c[metric as keyof Campaign] as number)
    .filter(val => val > 0)
    .sort((a, b) => b - a);

  if (nonZeroValues.length === 0) return 'medium';

  const value = campaign[metric as keyof Campaign] as number;
  const highThreshold = nonZeroValues[Math.floor(nonZeroValues.length * 0.33)];
  const lowThreshold = nonZeroValues[Math.floor(nonZeroValues.length * 0.67)];

  // For metrics where lower values are better
  if (['cost', 'avgCpc', 'cpa'].includes(metric)) {
    if (value === 0) return 'medium';
    if (value <= lowThreshold) return 'high';
    if (value <= highThreshold) return 'medium';
    return 'low';
  }

  // For metrics where higher values are better
  if (value === 0) return 'low';
  if (value >= highThreshold) return 'high';
  if (value >= lowThreshold) return 'medium';
  return 'low';
};

export const getPerformanceColor = (level: 'high' | 'medium' | 'low'): string => {
  switch (level) {
    case 'high': return 'before:bg-emerald-500';
    case 'medium': return 'before:bg-amber-500';
    case 'low': return 'before:bg-rose-500';
    default: return 'before:bg-gray-400';
  }
};

export const getPerformanceIndicatorClass = (metric: string) => {
  return `
    relative pl-4
    before:content-[''] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2
    before:w-2 before:h-2 before:rounded-full
    text-gray-700
  `;
};

// Performance level indicators
export const PerformanceIndicator: React.FC<{ level: 'high' | 'medium' | 'low' }> = ({ level }) => {
  const colors = {
    high: 'bg-green-400',
    medium: 'bg-yellow-400', 
    low: 'bg-red-400'
  };
  
  return <div className={`w-2 h-2 rounded-full ${colors[level]} mr-2`} />;
};

export const getPerformanceLevel = (value: number, allValues: number[], metric: string): 'high' | 'medium' | 'low' => {
  if (allValues.length === 0) return 'medium';
  
  const sorted = [...allValues].sort((a, b) => a - b);
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  
  return value >= p75 ? 'high' : value <= p25 ? 'low' : 'medium';
};

export const filterAndSortCampaigns = (
  campaigns: any[],
  statusFilter: string,
  searchTerm: string,
  sortColumn: string,
  sortDirection: 'asc' | 'desc',
  pageSize: number,
  activeFilters: Set<string> = new Set()
) => {
  if (!Array.isArray(campaigns)) {
    logger.warn('Invalid campaigns data provided to filterAndSortCampaigns');
    return [];
  }

  let filteredCampaigns = [...campaigns];
  const originalCount = filteredCampaigns.length;

  // Development-only detailed logging
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Campaign filtering started', { 
      originalCount, 
      statusFilter, 
      searchTerm: searchTerm ? 'provided' : 'none',
      activeFilters: Array.from(activeFilters)
    });
  }

  // Apply status filter
  if (statusFilter === 'active') {
    filteredCampaigns = filteredCampaigns.filter(c => {
      const hasActivity = c.impressions > 0 || c.clicks > 0;
      return hasActivity;
    });
  }

  // Apply pre-filters (campaign type filters)
  if (activeFilters.size > 0) {
    const beforeCount = filteredCampaigns.length;
    filteredCampaigns = filteredCampaigns.filter(campaign => {
      return Array.from(activeFilters).some(filter => {
        switch (filter) {
          case 'Search':
            return campaign.campaignType === 'SEARCH';
          case 'Shopping':
            return campaign.campaignType === 'SHOPPING';
          case 'Performance Max':
            return campaign.campaignType === 'PERFORMANCE_MAX';
          case 'Display':
            return campaign.campaignType === 'DISPLAY';
          default:
            return false;
        }
      });
    });
  }

  // Apply search filter
  if (searchTerm) {
    const beforeCount = filteredCampaigns.length;
    filteredCampaigns = filteredCampaigns.filter(campaign =>
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Sort campaigns
  filteredCampaigns.sort((a, b) => {
    let aValue = a[sortColumn];
    let bValue = b[sortColumn];
    
    if (aValue === undefined || aValue === null) return 1;
    if (bValue === undefined || bValue === null) return -1;
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Apply pagination
  const paginatedCampaigns = filteredCampaigns.slice(0, pageSize);

  // Single summary log in development
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Campaign filtering completed', { 
      originalCount, 
      filteredCount: filteredCampaigns.length,
      paginatedCount: paginatedCampaigns.length
    });
  }

  return paginatedCampaigns;
}; 