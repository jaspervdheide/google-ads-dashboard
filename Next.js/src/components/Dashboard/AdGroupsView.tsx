import React from 'react';
import { Plus, Target, Search, Zap, Table, BarChart3 } from 'lucide-react';
import AdGroupTable from './AdGroupTable';

interface AdGroupsViewProps {
  realAdGroupData: any;
  adGroupLoading: boolean;
  adGroupTypeFilter: 'all' | 'traditional' | 'asset';
  adGroupViewMode: 'table' | 'graphs';
  adGroupSort: { field: string; direction: 'asc' | 'desc' };
  onAdGroupTypeFilterChange: (filter: 'all' | 'traditional' | 'asset') => void;
  onAdGroupViewModeChange: (mode: 'table' | 'graphs') => void;
  onAdGroupSort: (column: string) => void;
  onAdGroupClick: (adGroup: any) => void;
  onMetricHover: (data: any) => void;
  onMetricLeave: () => void;
}

export default function AdGroupsView({
  realAdGroupData,
  adGroupLoading,
  adGroupTypeFilter,
  adGroupViewMode,
  adGroupSort,
  onAdGroupTypeFilterChange,
  onAdGroupViewModeChange,
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
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Plus className="h-4 w-4" />
            <span>New Ad Group</span>
          </button>
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

              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onAdGroupViewModeChange('table')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    adGroupViewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => onAdGroupViewModeChange('graphs')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    adGroupViewMode === 'graphs'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Graphs</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table or Charts View */}
        <AdGroupTable
          data={realAdGroupData}
          loading={adGroupLoading}
          searchTerm=""
          pageSize={25}
          sortColumn={adGroupSort.field}
          sortDirection={adGroupSort.direction}
          statusFilter="all"
          groupTypeFilter={adGroupTypeFilter}
          viewMode={adGroupViewMode}
          onSort={onAdGroupSort}
          onAdGroupClick={onAdGroupClick}
          onMetricHover={onMetricHover}
          onMetricLeave={onMetricLeave}
        />
      </div>
    </div>
  );
} 