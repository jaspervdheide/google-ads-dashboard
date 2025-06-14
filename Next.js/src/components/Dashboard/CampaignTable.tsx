'use client';

import React from 'react';
import { CampaignData, Campaign } from '../../types';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';

interface CampaignTableProps {
  data: CampaignData | null;
  loading: boolean;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onCampaignClick: (campaign: Campaign) => void;
}

const CampaignTable: React.FC<CampaignTableProps> = ({
  data,
  loading,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  onSort,
  onCampaignClick
}) => {
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading campaigns...</p>
      </div>
    );
  }

  if (!data?.campaigns || data.campaigns.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-600">No campaigns found</p>
      </div>
    );
  }

  // Filter and sort campaigns
  const filteredCampaigns = data.campaigns
    .filter(campaign => 
      campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      let aValue = a[sortColumn as keyof Campaign];
      let bValue = b[sortColumn as keyof Campaign];
      
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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('name')}
            >
              Campaign Name
              {sortColumn === 'name' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
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
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CTR
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              CPC
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cost
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredCampaigns.map((campaign) => (
            <tr 
              key={campaign.id} 
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onCampaignClick(campaign)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {campaign.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  campaign.status === 'ENABLED' 
                    ? 'bg-green-100 text-green-800'
                    : campaign.status === 'PAUSED'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {campaign.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(campaign.clicks)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatNumber(campaign.impressions)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatPercentage(campaign.ctr)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(campaign.avgCpc)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(campaign.cost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CampaignTable; 