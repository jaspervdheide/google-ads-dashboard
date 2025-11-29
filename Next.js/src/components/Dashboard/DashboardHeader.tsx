'use client';

import React from 'react';
import { Account, CampaignData, DateRange } from '../../types';
import { formatDateRangeDisplay, getDisplayName } from '../../utils';

interface DashboardHeaderProps {
  selectedAccount: string;
  filteredAccounts: Account[];
  selectedDateRange: DateRange | null;
  campaignData: CampaignData | null;
  campaignLoading: boolean;
  error: string;
  selectedAdGroupsCount?: number;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  selectedAccount,
  filteredAccounts,
  selectedDateRange,
  campaignData,
  campaignLoading,
  error,
  selectedAdGroupsCount = 0
}) => {
  return (
    <div className="flex items-center justify-between">
      {/* Title Section (Left) */}
      <div>
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {/* Status Indicator Dot */}
          <div className={`w-2 h-2 rounded-full ${
            !campaignLoading && !error && campaignData 
              ? 'bg-green-500' 
              : 'bg-blue-500'
          }`} />
        </div>
        {/* Subtitle: Account + Date Range */}
        <p className="text-gray-600 mt-1">
          {selectedAccount && filteredAccounts.length > 0
            ? (() => {
                const account = filteredAccounts.find(acc => acc.id === selectedAccount);
                const accountName = account ? getDisplayName(account) : 'Unknown Account';
                const dateRange = selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'Last 30 days';
                return (
                  <>
                    <span className="font-medium text-gray-700">{accountName}</span>
                    <span> • {dateRange}</span>
                  </>
                );
              })()
            : selectedDateRange 
              ? formatDateRangeDisplay(selectedDateRange)
              : 'Select an account to view data'
          }
        </p>
      </div>

      {/* Status Section (Right) */}
      <div className="flex items-center space-x-4 text-sm">
        {/* Live Data Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            !campaignLoading && !error && campaignData 
              ? 'bg-green-500' 
              : 'bg-blue-500'
          }`} />
          <span className="text-gray-600">
            {!campaignLoading && !error && campaignData ? 'Live data' : 'Cached data'}
          </span>
        </div>

        {/* Dot Separator and Campaign/Ad Group Count */}
        {(campaignData?.campaigns || selectedAdGroupsCount > 0) && (
          <>
            <div className="text-gray-400">•</div>
            <span className="text-gray-600">
              {selectedAdGroupsCount > 0 
                ? `${selectedAdGroupsCount} ad group${selectedAdGroupsCount !== 1 ? 's' : ''}`
                : `${campaignData?.campaigns?.length || 0} campaign${(campaignData?.campaigns?.length || 0) !== 1 ? 's' : ''}`
              }
            </span>
          </>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader; 