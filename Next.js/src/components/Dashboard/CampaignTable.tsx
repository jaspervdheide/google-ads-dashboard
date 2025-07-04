'use client';

import React, { useMemo } from 'react';
import { CampaignData, Campaign } from '../../types';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';
import { calculateTableTotals } from '../../utils/tableHelpers';
import { getPerformanceLevel, PerformanceIndicator, TableTotalsRow } from './shared';

interface CampaignTableProps {
  data: CampaignData | null;
  loading: boolean;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  statusFilter: 'active' | 'all';
  onSort: (column: string) => void;
  onCampaignClick: (campaign: Campaign) => void;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, campaignName: string, campaignId: string) => void;
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
    campaignCount?: number;
  } | null;
}



const CampaignTable: React.FC<CampaignTableProps> = ({
  data,
  loading,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  statusFilter,
  onSort,
  onCampaignClick,
  onMetricHover,
  onMetricLeave,
  totals
}) => {
  // Calculate totals using useMemo at the top level (before any early returns)
  const calculatedTotals = useMemo(() => {
    if (!data?.campaigns) return null;
    return calculateTableTotals(data, statusFilter, new Set(), searchTerm, { field: sortColumn, direction: sortDirection });
  }, [data, statusFilter, searchTerm, sortColumn, sortDirection]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || !data.campaigns) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No campaign data available</p>
      </div>
    );
  }

  // Use calculated totals instead of prop totals
  const displayTotals = calculatedTotals || totals;

  // Filter campaigns based on status and search term
  const filteredCampaigns = data.campaigns
    .filter(campaign => {
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && (campaign.impressions > 0 || campaign.clicks > 0));
      const matchesSearch = !searchTerm || campaign.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let aValue = a[sortColumn as keyof Campaign];
      let bValue = b[sortColumn as keyof Campaign];
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }
      
      // Handle undefined/null values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
      if (bValue == null) return sortDirection === 'asc' ? -1 : 1;
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    })
    .slice(0, pageSize);

  // Calculate performance levels for all metrics
  const allClicks = filteredCampaigns.map(c => c.clicks);
  const allImpressions = filteredCampaigns.map(c => c.impressions);
  const allCtr = filteredCampaigns.map(c => c.ctr);
  const allAvgCpc = filteredCampaigns.map(c => c.avgCpc);
  const allCost = filteredCampaigns.map(c => c.cost);
  const allConversions = filteredCampaigns.map(c => c.conversions);
  const allCpa = filteredCampaigns.map(c => c.cpa);
  const allConversionsValue = filteredCampaigns.map(c => c.conversionsValue);
  const allRoas = filteredCampaigns.map(c => c.roas);

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
                <span>Campaign Name</span>
                {sortColumn === 'name' && (
                  <span className="text-teal-600">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th className="px-1 py-3 w-px border-r border-gray-300">
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
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCampaigns.map((campaign) => (
            <tr 
              key={campaign.id} 
              className="hover:bg-gray-50"
            >
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                onClick={() => onCampaignClick(campaign)}
              >
                {campaign.name}
              </td>
              <td className="px-1 py-4 w-px border-r border-gray-300">
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'clicks', campaign.clicks, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('clicks')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.clicks, allClicks, 'clicks')} />
                  {formatNumber(campaign.clicks)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'impressions', campaign.impressions, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('impressions')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.impressions, allImpressions, 'impressions')} />
                  {formatNumber(campaign.impressions)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'ctr', campaign.ctr, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('ctr')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.ctr, allCtr, 'ctr')} />
                  {formatPercentage(campaign.ctr)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'avgCpc', campaign.avgCpc, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('avgCpc')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.avgCpc, allAvgCpc, 'avgCpc')} />
                  {formatCurrency(campaign.avgCpc)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cost', campaign.cost, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('cost')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.cost, allCost, 'cost')} />
                  {formatCurrency(campaign.cost)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversions', campaign.conversions, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('conversions')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.conversions, allConversions, 'conversions')} />
                  {formatNumber(campaign.conversions)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cpa', campaign.cpa, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('cpa')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.cpa, allCpa, 'cpa')} />
                  {formatCurrency(campaign.cpa)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversionsValue', campaign.conversionsValue, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('conversionsValue')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.conversionsValue, allConversionsValue, 'conversionsValue')} />
                  {formatCurrency(campaign.conversionsValue)}
                </div>
              </td>
              <td 
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'roas', campaign.roas, campaign.name, campaign.id) : undefined}
                onMouseLeave={() => onMetricLeave?.('roas')}
              >
                <div className="flex items-center">
                  <PerformanceIndicator level={getPerformanceLevel(campaign.roas, allRoas, 'roas')} />
                  {campaign.roas.toFixed(2)}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
        {displayTotals && (
          <TableTotalsRow 
            totals={displayTotals}
            itemCount={filteredCampaigns.length}
            itemType="campaigns"
          />
        )}
      </table>
    </div>
  );
};

export default CampaignTable; 