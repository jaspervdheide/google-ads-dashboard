'use client';

import React, { useMemo } from 'react';
import { Calculator, Search, Package, Zap, MoreHorizontal, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { AdGroup, AdGroupData } from '../../types';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';
import TopAdGroupsPerformance from './TopAdGroupsPerformance';
import GenericPerformanceMatrix from './GenericPerformanceMatrix';
import { adGroupMatrixConfig } from '../../utils/matrixConfigs';

interface AdGroupTableProps {
  data: AdGroupData | null;
  loading: boolean;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  statusFilter: 'active' | 'all';
  groupTypeFilter: 'all' | 'traditional' | 'asset';
  viewMode: 'table' | 'graphs';
  onSort: (column: string) => void;
  onAdGroupClick: (adGroup: AdGroup) => void;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, adGroupName: string, adGroupId: string) => void;
  onMetricLeave?: (metricType?: string) => void;
  totals?: {
    clicks: number;
    impressions: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    cpa: number;
    roas: number;
    adGroupCount?: number;
  } | null;
}

// Performance indicator types
type PerformanceLevel = 'high' | 'medium' | 'low';

// Helper function to calculate performance percentiles
const getPerformanceLevel = (
  value: number, 
  allValues: number[], 
  metricType: string
): PerformanceLevel => {
  if (allValues.length < 3) return 'medium';
  
  // Filter out zero values for better percentile calculation
  const nonZeroValues = allValues.filter(v => v > 0);
  if (nonZeroValues.length === 0) return 'medium';
  
  // Sort values based on whether higher or lower is better
  const isHigherBetter = ['clicks', 'impressions', 'ctr', 'conversions', 'conversionsValue', 'conversionRate', 'roas', 'assetCoverage', 'avgQualityScore'].includes(metricType);
  const sortedValues = [...nonZeroValues].sort((a, b) => isHigherBetter ? b - a : a - b);
  
  // If the current value is 0 and we're looking at a "higher is better" metric, it's low performance
  if (value === 0 && isHigherBetter) return 'low';
  
  // Calculate percentile thresholds
  const topThreshold = sortedValues[Math.floor(sortedValues.length * 0.33)];
  const bottomThreshold = sortedValues[Math.floor(sortedValues.length * 0.67)];
  
  if (isHigherBetter) {
    if (value >= topThreshold) return 'high';
    if (value >= bottomThreshold) return 'medium';
    return 'low';
  } else {
    // For metrics where lower is better (cost, avgCpc, cpa)
    if (value <= topThreshold) return 'high';
    if (value <= bottomThreshold) return 'medium';
    return 'low';
  }
};

// Helper function to get performance indicator color and glow
const getPerformanceStyles = (level: PerformanceLevel): string => {
  const baseStyles = 'inline-block w-1.5 h-1.5 rounded-full mr-2 shadow-sm ring-1 ring-white/20';
  
  switch (level) {
    case 'high': return `${baseStyles} bg-emerald-400 shadow-emerald-200/50`;
    case 'medium': return `${baseStyles} bg-amber-400 shadow-amber-200/50`;
    case 'low': return `${baseStyles} bg-rose-400 shadow-rose-200/50`;
    default: return `${baseStyles} bg-gray-400 shadow-gray-200/50`;
  }
};

// Performance indicator component
const PerformanceIndicator: React.FC<{ level: PerformanceLevel }> = ({ level }) => (
  <div 
    className={getPerformanceStyles(level)}
    title={`Performance: ${level}`}
  />
);

// Campaign type detection based on naming conventions
const detectCampaignType = (campaignName: string): 'search' | 'shopping' | 'performance_max' | 'other' => {
  const nameLower = campaignName.toLowerCase();
  if (nameLower.includes('performance max') || nameLower.includes('pmax')) {
    return 'performance_max';
  }
  if (nameLower.includes('shopping')) {
    return 'shopping';
  }
  if (nameLower.includes('search')) {
    return 'search';
  }
  return 'other';
};

// Get campaign type indicator
const getCampaignTypeIndicator = (campaignType: 'search' | 'shopping' | 'performance_max' | 'other') => {
  const indicators = {
    'search': { icon: Search, color: 'text-blue-600', bg: 'bg-blue-100' },
    'shopping': { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
    'performance_max': { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100' },
    'other': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-100' }
  };
  return indicators[campaignType];
};

// Get group type badge styles
const getGroupTypeBadge = (groupType: 'ad_group' | 'asset_group') => {
  return groupType === 'asset_group' 
    ? 'bg-purple-100 text-purple-800 border border-purple-200'
    : 'bg-blue-100 text-blue-800 border border-blue-200';
};

// Get ad strength badge styles
const getAdStrengthBadge = (strength: 'Poor' | 'Good' | 'Excellent') => {
  switch (strength) {
    case 'Excellent': return 'bg-green-100 text-green-800 border border-green-200';
    case 'Good': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    case 'Poor': return 'bg-red-100 text-red-800 border border-red-200';
  }
};

// Ad Group Type Distribution Chart Component
const AdGroupTypeDistribution: React.FC<{ data: AdGroupData | null }> = ({ data }) => {
  // Calculate group type distribution from real data
  const groupTypeDistribution = useMemo(() => {
    if (!data?.adGroups) {
      return [
        { 
          name: 'Traditional Ad Groups', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#3b82f6' 
        },
        { 
          name: 'Asset Groups (Performance Max)', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#10b981' 
        }
      ];
    }

    const traditionalGroups = data.adGroups.filter(ag => ag.groupType === 'ad_group');
    const assetGroups = data.adGroups.filter(ag => ag.groupType === 'asset_group');

    const traditionalConversions = traditionalGroups.reduce((sum, ag) => sum + ag.conversions, 0);
    const assetConversions = assetGroups.reduce((sum, ag) => sum + ag.conversions, 0);
    
    const traditionalCPA = traditionalGroups.length > 0 
      ? traditionalGroups.reduce((sum, ag) => sum + ag.cpa, 0) / traditionalGroups.length 
      : 0;
    const assetCPA = assetGroups.length > 0 
      ? assetGroups.reduce((sum, ag) => sum + ag.cpa, 0) / assetGroups.length 
      : 0;

    return [
      { 
        name: 'Traditional Ad Groups', 
        value: traditionalGroups.length,
        conversions: traditionalConversions,
        avgCPA: traditionalCPA,
        color: '#3b82f6' 
      },
      { 
        name: 'Asset Groups (Performance Max)', 
        value: assetGroups.length,
        conversions: assetConversions,
        avgCPA: assetCPA,
        color: '#10b981' 
      }
    ].filter(item => item.value > 0); // Only show groups that exist
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              Count: <span className="font-medium text-gray-900">{data.value} groups</span>
            </p>
            <p className="text-gray-600">
              Conversions: <span className="font-medium text-gray-900">{formatNumber(data.conversions)}</span>
            </p>
            <p className="text-gray-600">
              Avg CPA: <span className="font-medium text-gray-900">{formatCurrency(data.avgCPA)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (groupTypeDistribution.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No ad groups found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Ad Group Type Distribution</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live Data</span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={groupTypeDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {groupTypeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with Metrics */}
      <div className="mt-4 space-y-2">
        {groupTypeDistribution.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-700 font-medium">{item.name}</span>
              <span className="text-gray-500">({item.value} groups)</span>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="font-medium text-gray-900">{item.conversions.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">conv.</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">€{item.avgCPA.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">CPA</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {groupTypeDistribution.reduce((sum, item) => sum + item.conversions, 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Total Conversions</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              €{groupTypeDistribution.length > 0 ? (groupTypeDistribution.reduce((sum, item) => sum + item.avgCPA, 0) / groupTypeDistribution.length).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-gray-600">Average CPA</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {groupTypeDistribution.length}
            </div>
            <div className="text-xs text-gray-600">Group Types</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdGroupTable: React.FC<AdGroupTableProps> = ({
  data,
  loading,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  statusFilter,
  groupTypeFilter,
  viewMode,
  onSort,
  onAdGroupClick,
  onMetricHover,
  onMetricLeave,
  totals
}) => {
  // Filter and sort ad groups - moved before early returns to fix React Hook error
  const filteredAdGroups = useMemo(() => {
    if (!data?.adGroups) return [];
    
    return data.adGroups
      .filter(adGroup => {
        // Apply status filter
        const statusMatch = statusFilter === 'all' || 
          (statusFilter === 'active' && (adGroup.impressions > 0 || adGroup.clicks > 0));
        
        // Apply group type filter
        let groupTypeMatch = true;
        if (groupTypeFilter === 'traditional') {
          groupTypeMatch = adGroup.groupType === 'ad_group';
        } else if (groupTypeFilter === 'asset') {
          groupTypeMatch = adGroup.groupType === 'asset_group';
        }
        
        // Apply search filter
        const searchMatch = adGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (adGroup.campaignName && adGroup.campaignName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return statusMatch && groupTypeMatch && searchMatch;
      })
      .sort((a, b) => {
        let aValue = a[sortColumn as keyof AdGroup];
        let bValue = b[sortColumn as keyof AdGroup];
        
        // Handle undefined and null values
        if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      })
      .slice(0, pageSize);
  }, [data?.adGroups, statusFilter, groupTypeFilter, searchTerm, sortColumn, sortDirection, pageSize]);

  // Calculate performance levels for all metrics
  const allClicks = filteredAdGroups.map(ag => ag.clicks);
  const allImpressions = filteredAdGroups.map(ag => ag.impressions);
  const allCtr = filteredAdGroups.map(ag => ag.ctr);
  const allAvgCpc = filteredAdGroups.map(ag => ag.avgCpc);
  const allCost = filteredAdGroups.map(ag => ag.cost);
  const allConversions = filteredAdGroups.map(ag => ag.conversions);
  const allCpa = filteredAdGroups.map(ag => ag.cpa);
  const allConversionsValue = filteredAdGroups.map(ag => ag.conversionsValue);
  const allRoas = filteredAdGroups.map(ag => ag.roas);
  const allQualityScores = filteredAdGroups.map(ag => ag.avgQualityScore || 0).filter(score => score > 0);

  // Calculate table totals
  const calculatedTotals = useMemo(() => {
    const totals = filteredAdGroups.reduce((acc, adGroup) => ({
      clicks: acc.clicks + adGroup.clicks,
      impressions: acc.impressions + adGroup.impressions,
      cost: acc.cost + adGroup.cost,
      conversions: acc.conversions + adGroup.conversions,
      conversionsValue: acc.conversionsValue + adGroup.conversionsValue,
    }), {
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
    });

    // Calculate derived metrics
    return {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
      roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
      adGroupCount: filteredAdGroups.length
    };
  }, [filteredAdGroups]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading ad groups...</p>
      </div>
    );
  }

  if (!data?.adGroups || data.adGroups.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Target className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-600">No ad groups found</p>
      </div>
    );
  }

  // Show charts view
  if (viewMode === 'graphs') {
    return (
      /* Premium Charts View */
      <div className="space-y-8">
        {/* Sophisticated Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Ad Group Performance Analytics</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprehensive insights into your ad group performance metrics and trends
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Ad Groups</span>
                <div className="text-lg font-bold text-gray-900">
                  {data?.adGroups?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col h-full">
            <TopAdGroupsPerformance adGroupData={data} />
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col justify-between h-full">
            <AdGroupTypeDistribution data={data} />
                            <GenericPerformanceMatrix 
                  data={data} 
                  config={adGroupMatrixConfig} 
                />
          </div>
        </div>
      </div>
    );
  }

  const displayTotals = calculatedTotals || totals;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
              onClick={() => onSort('name')}
            >
              <div className="flex items-center space-x-1">
                <span>Ad Group Name</span>
                {sortColumn === 'name' && (
                  <span className="text-teal-600">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('campaignName')}
            >
              Campaign
              {sortColumn === 'campaignName' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('clicks')}
            >
              Clicks
              {sortColumn === 'clicks' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('impressions')}
            >
              Impressions
              {sortColumn === 'impressions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('ctr')}
            >
              CTR
              {sortColumn === 'ctr' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('avgCpc')}
            >
              CPC
              {sortColumn === 'avgCpc' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('cost')}
            >
              Cost
              {sortColumn === 'cost' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('conversions')}
            >
              Conversions
              {sortColumn === 'conversions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('cpa')}
            >
              CPA
              {sortColumn === 'cpa' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('conversionsValue')}
            >
              Conversion Value
              {sortColumn === 'conversionsValue' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('roas')}
            >
              POAS
              {sortColumn === 'roas' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('adStrength')}
            >
              Ad Strength
              {sortColumn === 'adStrength' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            {/* Conditional column based on group type filter */}
            {groupTypeFilter === 'traditional' && (
              <th 
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('avgQualityScore')}
              >
                Quality Score
                {sortColumn === 'avgQualityScore' && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            )}
            {groupTypeFilter === 'asset' && (
              <th 
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('assetCoverage')}
              >
                Asset Coverage
                {sortColumn === 'assetCoverage' && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredAdGroups.map((adGroup) => {
            const campaignType = detectCampaignType(adGroup.campaignName || '');
            const typeIndicator = getCampaignTypeIndicator(campaignType);
            
            return (
              <tr 
                key={adGroup.id} 
                className="hover:bg-gray-50"
              >
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                  onClick={() => onAdGroupClick(adGroup)}
                >
                  {adGroup.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded flex items-center justify-center ${typeIndicator.bg}`}>
                      {React.createElement(typeIndicator.icon, { 
                        className: `h-3 w-3 ${typeIndicator.color}` 
                      })}
                    </div>
                    <span className="font-medium">{adGroup.campaignName}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupTypeBadge(adGroup.groupType || 'ad_group')}`}>
                    {adGroup.groupType === 'asset_group' ? 'Asset Group' : 'Ad Group'}
                  </span>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'clicks', adGroup.clicks, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('clicks')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.clicks, allClicks, 'clicks')} />
                    {formatNumber(adGroup.clicks)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'impressions', adGroup.impressions, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('impressions')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.impressions, allImpressions, 'impressions')} />
                    {formatNumber(adGroup.impressions)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'ctr', adGroup.ctr, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('ctr')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.ctr, allCtr, 'ctr')} />
                    {formatPercentage(adGroup.ctr)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'avgCpc', adGroup.avgCpc, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('avgCpc')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.avgCpc, allAvgCpc, 'avgCpc')} />
                    {formatCurrency(adGroup.avgCpc)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cost', adGroup.cost, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('cost')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.cost, allCost, 'cost')} />
                    {formatCurrency(adGroup.cost)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversions', adGroup.conversions, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('conversions')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.conversions, allConversions, 'conversions')} />
                    {formatNumber(adGroup.conversions)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cpa', adGroup.cpa, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('cpa')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.cpa, allCpa, 'cpa')} />
                    {formatCurrency(adGroup.cpa)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversionsValue', adGroup.conversionsValue, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('conversionsValue')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.conversionsValue, allConversionsValue, 'conversionsValue')} />
                    {formatCurrency(adGroup.conversionsValue)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'roas', adGroup.roas, adGroup.name, adGroup.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('roas')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(adGroup.roas, allRoas, 'roas')} />
                    {adGroup.roas.toFixed(2)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {adGroup.adStrength ? (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdStrengthBadge(adGroup.adStrength)}`}>
                      {adGroup.adStrength}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                {/* Conditional column based on group type filter */}
                {groupTypeFilter === 'traditional' && (
                  <td 
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                    onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'avgQualityScore', adGroup.avgQualityScore || 0, adGroup.name, adGroup.id) : undefined}
                    onMouseLeave={() => onMetricLeave?.('avgQualityScore')}
                  >
                    {adGroup.avgQualityScore !== null && adGroup.avgQualityScore !== undefined ? (
                      <div className="flex items-center justify-center">
                        <PerformanceIndicator level={getPerformanceLevel(adGroup.avgQualityScore, allQualityScores, 'avgQualityScore')} />
                        <span className={`font-medium ${
                          adGroup.avgQualityScore >= 7 ? 'text-green-600' : 
                          adGroup.avgQualityScore >= 4 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {adGroup.avgQualityScore.toFixed(1)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                )}
                {groupTypeFilter === 'asset' && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {adGroup.assetCoverage ? (
                      <div className="flex items-center justify-end space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              adGroup.assetCoverage >= 80 ? 'bg-green-500' : 
                              adGroup.assetCoverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${adGroup.assetCoverage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {adGroup.assetCoverage}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
        {displayTotals && (
          <tfoot className="bg-gray-50 border-t-2 border-gray-200">
            <tr className="font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div className="flex items-center">
                  <Calculator className="h-4 w-4 text-gray-500 mr-2" />
                  Totals ({displayTotals.adGroupCount || filteredAdGroups.length} ad groups)
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(displayTotals.clicks)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(displayTotals.impressions)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatPercentage(displayTotals.ctr)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(displayTotals.avgCpc)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(displayTotals.cost)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(displayTotals.conversions)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(displayTotals.cpa)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(displayTotals.conversionsValue)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {displayTotals.roas.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
              {/* Conditional column for footer */}
              {groupTypeFilter === 'traditional' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                  {allQualityScores.length > 0 ? (
                    <span className="text-xs text-gray-500">
                      Avg: {(allQualityScores.reduce((a, b) => a + b, 0) / allQualityScores.length).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
              )}
              {groupTypeFilter === 'asset' && (
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"></td>
              )}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default AdGroupTable; 