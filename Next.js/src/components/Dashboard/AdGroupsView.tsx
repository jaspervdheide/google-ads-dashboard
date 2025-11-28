import React from 'react';
import { Target, Search, Zap } from 'lucide-react';
import AdGroupTable from './AdGroupTable';

interface AdGroupsViewProps {
  realAdGroupData: any;
  adGroupLoading: boolean;
  adGroupTypeFilter: 'all' | 'traditional' | 'asset';
  adGroupSort: { field: string; direction: 'asc' | 'desc' };
  onAdGroupTypeFilterChange: (filter: 'all' | 'traditional' | 'asset') => void;
  onAdGroupSort: (column: string) => void;
  onAdGroupClick: (adGroup: any) => void;
  onMetricHover: (data: any) => void;
  onMetricLeave: () => void;
}

export default function AdGroupsView({
  realAdGroupData,
  adGroupLoading,
  adGroupTypeFilter,
  adGroupSort,
  onAdGroupTypeFilterChange,
  onAdGroupSort,
  onAdGroupClick,
  onMetricHover,
  onMetricLeave
}: AdGroupsViewProps) {
  return (
    <div className="space-y-6">
      {/* Ad Groups Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ad Groups & Asset Groups</h1>
          <p className="text-gray-600 mt-1">Manage and optimize your ad groups and Performance Max asset groups</p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Ad Group Performance</h2>
            <div className="flex items-center space-x-3">
              {/* Group Type Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onAdGroupTypeFilterChange('all')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    adGroupTypeFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span>All Groups</span>
                </button>
                <button
                  onClick={() => onAdGroupTypeFilterChange('traditional')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    adGroupTypeFilter === 'traditional'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Search className="w-4 h-4" />
                  <span>Ad Groups</span>
                </button>
                <button
                  onClick={() => onAdGroupTypeFilterChange('asset')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    adGroupTypeFilter === 'asset'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Asset Groups</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table View */}
        <AdGroupTable
          data={realAdGroupData}
          loading={adGroupLoading}
          searchTerm=""
          pageSize={25}
          sortColumn={adGroupSort.field}
          sortDirection={adGroupSort.direction}
          statusFilter="all"
          groupTypeFilter={adGroupTypeFilter}
          viewMode="table"
          onSort={onAdGroupSort}
          onAdGroupClick={onAdGroupClick}
          onMetricHover={onMetricHover}
          onMetricLeave={onMetricLeave}
        />
      </div>
    </div>
  );
}
