import React, { useState } from 'react';
import { Table, BarChart3, Shield } from 'lucide-react';
import KPICards from './KPICards';
import Charts from './Charts';
import CampaignTable from './CampaignTable';
import DashboardHeader from './DashboardHeader';
import ConversionsByTypeChart from './ConversionsByTypeChart';
import TopCampaignsPerformance from './TopCampaignsPerformance';
import GenericPerformanceMatrix from './GenericPerformanceMatrix';
import SearchImpressionShareWidget from './SearchImpressionShareWidget';
import KeywordCpcConversionChart from './KeywordCpcConversionChart';
import { campaignMatrixConfig } from '../../utils/matrixConfigs';

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
  campaignViewMode: 'table' | 'charts';
  tableSortColumn: string;
  tableSortDirection: 'asc' | 'desc';
  tableTotals: any;
  displayedCampaigns: any[];
  onKpiSelection: (kpiId: string) => void;
  onChartTypeChange: (type: 'line' | 'bar') => void;
  onDateGranularityChange: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  onManualGranularityOverride: (override: boolean) => void;
  onStatusFilterChange: (filter: 'active' | 'all') => void;
  onCampaignViewModeChange: (mode: 'table' | 'charts') => void;
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
  campaignViewMode,
  tableSortColumn,
  tableSortDirection,
  tableTotals,
  displayedCampaigns,
  onKpiSelection,
  onChartTypeChange,
  onDateGranularityChange,
  onManualGranularityOverride,
  onStatusFilterChange,
  onCampaignViewModeChange,
  onTableSort,
  onCampaignClick,
  onMetricHover,
  onMetricLeave
}: DashboardViewProps) {
  const [currentChartPage, setCurrentChartPage] = useState(1);

  const chartPages = [
    {
      id: 1,
      title: 'Performance',
      description: 'Campaign performance and conversion analysis',
      icon: BarChart3
    },
    {
      id: 2,
      title: 'Competitive',
      description: 'Search impression share and visibility analysis',
      icon: Shield
    }
  ];

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

              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onCampaignViewModeChange('table')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    campaignViewMode === 'table'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Table className="w-4 h-4" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => onCampaignViewModeChange('charts')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                    campaignViewMode === 'charts'
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

        {campaignViewMode === 'table' ? (
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
        ) : (
          <div className="space-y-8">
            <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Campaign Analytics</h2>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {chartPages.find(p => p.id === currentChartPage)?.description}
                  </p>
                </div>
                
                {/* Chart Page Navigation - Moved to align with toggles above */}
                <div className="flex items-center space-x-2">
                  {chartPages.map(page => {
                    const IconComponent = page.icon;
                    return (
                      <button
                        key={page.id}
                        onClick={() => setCurrentChartPage(page.id)}
                        className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          currentChartPage === page.id
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{page.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart Content */}
            {currentChartPage === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="flex flex-col h-full">
                <TopCampaignsPerformance campaignData={campaignData} />
              </div>
              
              <div className="flex flex-col space-y-8 h-full">
                <ConversionsByTypeChart campaignData={campaignData} />
                <GenericPerformanceMatrix 
                  data={campaignData} 
                  config={campaignMatrixConfig} 
                />
              </div>
            </div>
            )}

            {currentChartPage === 2 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col h-full">
                  <SearchImpressionShareWidget 
                    customerId={selectedAccount}
                    dateRange={selectedDateRange?.days?.toString() || '30'}
                    className="h-full"
                  />
                </div>
                
                <div className="flex flex-col space-y-8 h-full">
                  <KeywordCpcConversionChart 
                    customerId={selectedAccount}
                    dateRange={selectedDateRange?.days?.toString() || '30'}
                    className="h-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 