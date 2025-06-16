'use client';

import React, { useMemo } from 'react';
import { 
  formatNumber, 
  formatDateRangeDisplay,
  getFilteredAndSortedCampaigns, 
  calculateTableTotals,
  cleanCountryCode,
  getDisplayName,
  formatTimeAgo,
  getSeverityIcon,
  getSeverityColor
} from '../../utils';

import {
  useCampaignData,
  useHistoricalData,
  useAnomalyData,
  useAdGroupData,
  useHoverChart,
  useKeywordData,
  useAccountState,
  useDropdownState,
  useTableState,
  useChartState,
  useDateRangeState,
  useAdGroupState,
  useKeywordState
} from '../../hooks';

import { DashboardLayout, PageRouter } from './';

export default function Dashboard() {
  // Wrapper functions to adapt severity helpers for component use
  const getSeverityIconString = (severity: string) => {
    // Return a simple icon based on severity for string contexts
    return severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
  };

  const getSeverityColorString = (severity: string) => {
    // Return color class based on severity for string contexts
    return severity === 'high' ? 'text-red-600' : severity === 'medium' ? 'text-yellow-600' : 'text-green-600';
  };

  // Custom hooks for state management
  const accountState = useAccountState();
  const dropdownState = useDropdownState();
  const tableState = useTableState();
  const chartState = useChartState();
  const dateState = useDateRangeState();
  const adGroupState = useAdGroupState();
  const keywordState = useKeywordState();
  
  // Hover chart hook
  const { 
    hoverChart, 
    handleMetricHover, 
    handleMetricLeave, 
    handleChartHover, 
    handleChartLeave 
  } = useHoverChart();

  // Data hooks
  const { 
    data: campaignData, 
    loading: campaignLoading, 
    kpiPercentageChanges 
  } = useCampaignData(accountState.selectedAccount, dateState.selectedDateRange, false);

  const { 
    data: historicalData, 
    loading: historicalLoading
  } = useHistoricalData(accountState.selectedAccount, dateState.selectedDateRange, false);

  const { 
    data: anomalyData, 
    loading: anomalyLoading
  } = useAnomalyData(accountState.selectedAccount, '30', false);

  const { 
    data: realAdGroupData, 
    loading: adGroupLoading
  } = useAdGroupData(accountState.selectedAccount, dateState.selectedDateRange, false, 'all');

  const { 
    data: keywordData, 
    loading: keywordLoading
  } = useKeywordData(accountState.selectedAccount, '30', false);

  // Computed values
  const displayedCampaigns = useMemo(() => {
    if (!campaignData) return [];
    return getFilteredAndSortedCampaigns(
      campaignData,
      tableState.statusFilter,
      new Set(), // activeFilters - empty for now
      tableState.campaignSearch,
      { field: tableState.sortBy, direction: tableState.sortOrder }
    );
  }, [campaignData, tableState.campaignSearch, tableState.statusFilter, tableState.sortBy, tableState.sortOrder]);

  const tableTotals = useMemo(() => {
    if (!campaignData) return { campaignCount: 0, clicks: 0, impressions: 0, cost: 0, conversions: 0, conversionsValue: 0, ctr: 0, avgCpc: 0, cpa: 0, roas: 0 };
    return calculateTableTotals(
      campaignData,
      tableState.statusFilter,
      new Set(), // activeFilters - empty for now
      tableState.campaignSearch,
      { field: tableState.sortBy, direction: tableState.sortOrder }
    );
  }, [campaignData, tableState.campaignSearch, tableState.statusFilter, tableState.sortBy, tableState.sortOrder]);

  // Event handlers
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleKPISelection = (kpiId: string) => {
    const currentMetrics = chartState.selectedChartMetrics;
    const newMetrics = currentMetrics.includes(kpiId)
      ? currentMetrics.filter(m => m !== kpiId)
      : [...currentMetrics, kpiId];
    chartState.handleChartMetricsChange(newMetrics);
  };

  const handleTableSort = (column: string) => {
    tableState.handleSort(column);
  };

  const handleCampaignClick = (campaign: any) => {
    console.log('Campaign clicked:', campaign);
  };

  const handleAdGroupClick = (adGroup: any) => {
    console.log('Ad group clicked:', adGroup);
  };

  const handleAdGroupSort = (column: string) => {
    tableState.handleSort(column);
  };

  // Props objects for components
  const headerProps = {
    selectedAccount: accountState.selectedAccount,
    selectedAccountData: accountState.selectedAccountData,
    filteredAccounts: accountState.filteredAccounts,
    selectedDateRange: dateState.selectedDateRange,
    dateRanges: dateState.dateRanges,
    anomalyData,
    loading: accountState.loading,
    anomalyLoading,
    accountDropdownOpen: dropdownState.accountDropdownOpen,
    dateDropdownOpen: dropdownState.dateDropdownOpen,
    anomalyDropdownOpen: dropdownState.anomalyDropdownOpen,
    customDateModalOpen: dropdownState.customDateModalOpen,
    onAccountDropdownToggle: dropdownState.toggleAccountDropdown,
    onDateDropdownToggle: dropdownState.toggleDateDropdown,
    onAnomalyDropdownToggle: dropdownState.toggleAnomalyDropdown,
    onCustomDateModalToggle: dropdownState.toggleCustomDateModal,
    onAccountSelect: dropdownState.handleAccountSelect(accountState.handleAccountSelect),
    onDateRangeSelect: dropdownState.handleDateRangeSelect(dateState.handleDateRangeSelect),
    onRefresh: handleRefresh,
    onAnomalyAccountSelect: dropdownState.handleAnomalyAccountSelect(accountState.handleAccountSelect),
    formatDateRangeDisplay: dateState.formatDateRangeDisplay,
    formatTimeAgo,
    formatNumber,
    cleanCountryCode,
    getDisplayName,
    getSeverityIcon: getSeverityIconString,
    getSeverityColor: getSeverityColorString
  };

  const sidebarProps = {
    currentPage: tableState.currentPage,
    filteredAccounts: accountState.filteredAccounts,
    onPageChange: tableState.handlePageChange
  };

  const modalProps = {
    customDateModalOpen: dropdownState.customDateModalOpen,
    customDateRange: dateState.customDateRange,
    onCustomDateModalClose: dropdownState.closeCustomDateModal,
    onCustomDateApply: dateState.handleCustomDateApply,
    onCustomDateChange: dateState.handleCustomDateChange
  };

  const hoverProps = {
    hoverChart,
    onChartHover: handleChartHover,
    onChartLeave: handleChartLeave
  };

  const dropdownStates = {
    accountDropdownOpen: dropdownState.accountDropdownOpen,
    dateDropdownOpen: dropdownState.dateDropdownOpen,
    setAccountDropdownOpen: dropdownState.setAccountDropdownOpen,
    setDateDropdownOpen: dropdownState.setDateDropdownOpen
  };

  // Page-specific props
  const dashboardProps = {
    selectedAccount: accountState.selectedAccount,
    filteredAccounts: accountState.filteredAccounts,
    selectedDateRange: dateState.selectedDateRange,
    campaignData,
    campaignLoading,
    historicalData,
    historicalLoading,
    kpiPercentageChanges,
    error: accountState.error,
    selectedChartMetrics: chartState.selectedChartMetrics,
    chartType: chartState.chartType,
    dateGranularity: chartState.dateGranularity,
    statusFilter: tableState.statusFilter,
    campaignViewMode: tableState.viewMode,
    tableSortColumn: tableState.sortBy,
    tableSortDirection: tableState.sortOrder,
    tableTotals,
    displayedCampaigns,
    onKpiSelection: handleKPISelection,
    onChartTypeChange: chartState.handleChartTypeChange,
    onDateGranularityChange: chartState.handleDateGranularityChange,
    onManualGranularityOverride: () => {},
    onStatusFilterChange: tableState.handleStatusFilterChange,
    onCampaignViewModeChange: tableState.handleViewModeChange,
    onTableSort: handleTableSort,
    onCampaignClick: handleCampaignClick,
    onMetricHover: handleMetricHover,
    onMetricLeave: handleMetricLeave
  };

  const adGroupsProps = {
    realAdGroupData,
    adGroupLoading,
    adGroupTypeFilter: adGroupState.adGroupTypeFilter,
    adGroupViewMode: adGroupState.adGroupViewMode,
    adGroupSort: adGroupState.adGroupSort,
    onAdGroupTypeFilterChange: adGroupState.handleAdGroupTypeFilterChange,
    onAdGroupViewModeChange: adGroupState.handleAdGroupViewModeChange,
    onAdGroupSort: adGroupState.handleAdGroupSort,
    onAdGroupClick: handleAdGroupClick,
    onMetricHover: handleMetricHover,
    onMetricLeave: handleMetricLeave
  };

  const analyticsProps = {
    campaignData,
    displayedCampaigns
  };

  const keywordsProps = {
    selectedAccount: accountState.selectedAccount,
    selectedDateRange: dateState.selectedDateRange
  };

  const settingsProps = {
    chartType: chartState.chartType,
    setChartType: chartState.handleChartTypeChange
  };

  // Loading and error states
  if (accountState.loading && !campaignData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (accountState.error && !campaignData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-medium">Error loading dashboard</div>
          <p className="mt-2 text-gray-600">{accountState.error}</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      headerProps={headerProps}
      sidebarProps={sidebarProps}
      modalProps={modalProps}
      hoverProps={hoverProps}
      dropdownStates={dropdownStates}
    >
      <PageRouter 
        currentPage={tableState.currentPage}
        dashboardProps={dashboardProps}
        adGroupsProps={adGroupsProps}
        analyticsProps={analyticsProps}
        keywordsProps={keywordsProps}
        settingsProps={settingsProps}
      />
    </DashboardLayout>
  );
} 