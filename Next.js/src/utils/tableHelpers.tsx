/**
 * Table utility functions for the Google Ads Dashboard
 * Extracted from the main Dashboard component for better code organization
 */

import React from 'react';
import { Campaign, CampaignData } from '../types';

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
    // Calculate average spend from campaigns with actual spend
    const campaignsWithSpend = campaigns.filter(c => c.cost > 0);
    
    if (campaignsWithSpend.length === 0) {
      console.log(`📊 High Spend filter - No campaigns with spend found`);
      filtered = []; // No campaigns to show if none have spend
    } else {
      const totalSpend = campaignsWithSpend.reduce((sum, c) => sum + c.cost, 0);
      const averageSpend = totalSpend / campaignsWithSpend.length;
      const highSpendThreshold = Math.max(averageSpend * 2, 10); // Double the average, minimum €10
      
      console.log(`📊 High Spend filter - Average: €${averageSpend.toFixed(2)}, Threshold (2x avg, min €10): €${highSpendThreshold.toFixed(2)}`);
      
      // High spend: campaigns that spend double the average
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => c.cost > highSpendThreshold);
      console.log(`📊 High Spend filter result: ${beforeCount} -> ${filtered.length} campaigns (${filtered.length > 0 ? filtered.map(c => `${c.name}: €${c.cost.toFixed(2)}`).join(', ') : 'none'})`);
    }
  }
  
  if (activeFilters.has('low_ctr')) {
    // Low CTR: campaigns with CTR < 2%
    const beforeCount = filtered.length;
    filtered = filtered.filter(c => c.ctr < 2.0);
    console.log(`📊 Low CTR filter result: ${beforeCount} -> ${filtered.length} campaigns`);
  }
  
  if (activeFilters.has('high_cpa')) {
    // High CPA: campaigns with CPA > €20 (only for campaigns with conversions)
    const beforeCount = filtered.length;
    filtered = filtered.filter(c => c.conversions > 0 && c.cpa > 20);
    console.log(`📊 High CPA filter result: ${beforeCount} -> ${filtered.length} campaigns`);
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
  
  // Debug: Log all campaigns before filtering
  console.log('📊 All campaigns before filtering:', campaigns.map(c => ({
    name: c.name, 
    status: c.status,
    clicks: c.clicks,
    impressions: c.impressions
  })));
  
  // Status filter - "Active Only" means campaigns with actual activity
  if (statusFilter === 'active') {
    console.log('📊 Applying ACTIVE filter - filtering for campaigns with activity...');
    const beforeCount = campaigns.length;
    campaigns = campaigns.filter(c => {
      // Consider a campaign "active" if it has impressions OR clicks
      // This filters out campaigns that are ENABLED but have no traffic
      const hasActivity = c.impressions > 0 || c.clicks > 0;
      console.log(`📊 Campaign "${c.name}": impressions=${c.impressions}, clicks=${c.clicks}, hasActivity=${hasActivity}`);
      return hasActivity;
    });
    console.log(`📊 Active filter result: ${beforeCount} -> ${campaigns.length} campaigns (filtered out inactive campaigns)`);
  } else {
    console.log('📊 Showing ALL campaigns (including ENABLED campaigns with no activity)');
  }
  
  console.log(`📊 After status filter (${statusFilter}): ${campaigns.length} campaigns`);
  
  // Apply pre-filters
  if (activeFilters.size > 0) {
    const beforeCount = campaigns.length;
    campaigns = applyPreFilters(campaigns, activeFilters);
    console.log(`📊 Pre-filters applied (${Array.from(activeFilters).join(', ')}): ${beforeCount} -> ${campaigns.length} campaigns`);
  }
  
  // Search filter
  if (campaignSearch.trim()) {
    const searchTerm = campaignSearch.toLowerCase().trim();
    const beforeCount = campaigns.length;
    campaigns = campaigns.filter(c => 
      c.name.toLowerCase().includes(searchTerm) ||
      c.id.toLowerCase().includes(searchTerm)
    );
    console.log(`📊 Search filter "${searchTerm}": ${beforeCount} -> ${campaigns.length} campaigns`);
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
  
  console.log('📊 Final filtered campaigns:', campaigns.length);
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