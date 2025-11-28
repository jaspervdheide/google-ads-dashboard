import React from 'react';
import KPICards from './KPICards';
import Charts from './Charts';
import CampaignTable from './CampaignTable';
import DashboardHeader from './DashboardHeader';

interface DashboardViewProps {
  selectedAccount: string;
  filteredAccounts: any[];
  selectedDateRange: any;
  campaignData: any;
  campaignLoading: boolean;
  historicalData: any;
  historicalLoading: boolean;
  kpiPercentageChanges: any;
  error: string;
  selectedChartMetrics: string[];
  chartType: 'line' | 'bar';
  dateGranularity: 'daily' | 'weekly' | 'monthly';
  statusFilter: 'active' | 'all';
  tableSortColumn: string;
  tableSortDirection: 'asc' | 'desc';
  tableTotals: any;
  displayedCampaigns: any[];
  onKpiSelection: (kpiId: string) => void;
  onChartTypeChange: (type: 'line' | 'bar') => void;
  onDateGranularityChange: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  onManualGranularityOverride: (override: boolean) => void;
  onStatusFilterChange: (filter: 'active' | 'all') => void;
  onTableSort: (column: string) => void;
  onCampaignClick: (campaign: any) => void;
  onMetricHover: (data: any) => void;
  onMetricLeave: () => void;
}

export default function DashboardView({
  selectedAccount,
  filteredAccounts,
  selectedDateRange,
  campaignData,
  campaignLoading,
  historicalData,
  historicalLoading,
  kpiPercentageChanges,
  error,
  selectedChartMetrics,
  chartType,
  dateGranularity,
  statusFilter,
  tableSortColumn,
  tableSortDirection,
  tableTotals,
  displayedCampaigns,
  onKpiSelection,
  onChartTypeChange,
  onDateGranularityChange,
  onManualGranularityOverride,
  onStatusFilterChange,
  onTableSort,
  onCampaignClick,
  onMetricHover,
  onMetricLeave
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader
        selectedAccount={selectedAccount}
        filteredAccounts={filteredAccounts}
        selectedDateRange={selectedDateRange}
        campaignData={campaignData}
        campaignLoading={campaignLoading}
        error={error}
      />

      <KPICards
        campaignData={campaignData}
        campaignLoading={campaignLoading}
        kpiPercentageChanges={kpiPercentageChanges}
        selectedChartMetrics={selectedChartMetrics}
        onKpiSelection={onKpiSelection}
      />

      <Charts
        campaignData={campaignData}
        historicalData={historicalData}
        historicalLoading={historicalLoading}
        selectedChartMetrics={selectedChartMetrics}
        chartType={chartType}
        setChartType={onChartTypeChange}
        dateGranularity={dateGranularity}
        setDateGranularity={onDateGranularityChange}
        setManualGranularityOverride={onManualGranularityOverride}
        selectedDateRange={selectedDateRange}
      />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
            <div className="flex items-center space-x-3">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onStatusFilterChange('active')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'active'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => onStatusFilterChange('all')}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    statusFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
        </div>

        <CampaignTable
          data={campaignData}
          loading={campaignLoading}
          searchTerm=""
          pageSize={25}
          sortColumn={tableSortColumn}
          sortDirection={tableSortDirection}
          statusFilter={statusFilter}
          onSort={onTableSort}
          onCampaignClick={onCampaignClick}
          onMetricHover={onMetricHover}
          onMetricLeave={onMetricLeave}
          totals={tableTotals}
        />
      </div>
    </div>
  );
}
