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
  useKeywordState,
  useFilterState
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
  const filterState = useFilterState();
  
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
  } = useKeywordData(accountState.selectedAccount, dateState.selectedDateRange, false);

  // Computed values - campaigns list for filter dropdown
  const campaignsForFilter = useMemo(() => {
    if (!campaignData?.campaigns) return [];
    return campaignData.campaigns.map(c => ({
      id: c.id,
      name: c.name
    }));
  }, [campaignData]);

  // Filtered campaign data for KPIs and charts
  const filteredCampaignData = useMemo(() => {
    if (!campaignData) return null;
    if (filterState.selectedCampaigns.length === 0) return campaignData;
    
    const filteredCampaigns = campaignData.campaigns.filter(c => 
      filterState.selectedCampaigns.includes(c.id)
    );
    
    // Recalculate totals for filtered campaigns
    const totals = filteredCampaigns.reduce((acc, c) => ({
      impressions: acc.impressions + c.impressions,
      clicks: acc.clicks + c.clicks,
      cost: acc.cost + c.cost,
      conversions: acc.conversions + c.conversions,
      conversionsValue: acc.conversionsValue + c.conversionsValue,
    }), { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 });
    
    return {
      ...campaignData,
      campaigns: filteredCampaigns,
      totals: {
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
        conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
        cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
      }
    };
  }, [campaignData, filterState.selectedCampaigns]);

  // Ad groups list for filter dropdown
  const adGroupsForFilter = useMemo(() => {
    if (!realAdGroupData?.adGroups) return [];
    return realAdGroupData.adGroups.map((ag: any) => ({
      id: ag.id,
      name: ag.name,
      campaignId: ag.campaignId || '',
      campaignName: ag.campaignName || ''
    }));
  }, [realAdGroupData]);

  const displayedCampaigns = useMemo(() => {
    if (!campaignData) return [];
    
    // First apply the campaign filter if any campaigns are selected
    let filteredData = campaignData;
    if (filterState.selectedCampaigns.length > 0) {
      filteredData = {
        ...campaignData,
        campaigns: campaignData.campaigns.filter(c => 
          filterState.selectedCampaigns.includes(c.id)
        )
      };
    }
    
    return getFilteredAndSortedCampaigns(
      filteredData,
      tableState.statusFilter,
      new Set(), // activeFilters - empty for now
      tableState.campaignSearch,
      { field: tableState.sortBy, direction: tableState.sortOrder }
    );
  }, [campaignData, tableState.campaignSearch, tableState.statusFilter, tableState.sortBy, tableState.sortOrder, filterState.selectedCampaigns]);

  const tableTotals = useMemo(() => {
    if (!campaignData) return { campaignCount: 0, clicks: 0, impressions: 0, cost: 0, conversions: 0, conversionsValue: 0, ctr: 0, avgCpc: 0, cpa: 0, roas: 0 };
    
    // Apply the campaign filter if any campaigns are selected
    let filteredData = campaignData;
    if (filterState.selectedCampaigns.length > 0) {
      filteredData = {
        ...campaignData,
        campaigns: campaignData.campaigns.filter(c => 
          filterState.selectedCampaigns.includes(c.id)
        )
      };
    }
    
    return calculateTableTotals(
      filteredData,
      tableState.statusFilter,
      new Set(), // activeFilters - empty for now
      tableState.campaignSearch,
      { field: tableState.sortBy, direction: tableState.sortOrder }
    );
  }, [campaignData, tableState.campaignSearch, tableState.statusFilter, tableState.sortBy, tableState.sortOrder, filterState.selectedCampaigns]);

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

  // Entity-specific hover handlers
  const handleCampaignMetricHover = (
    event: React.MouseEvent,
    metricType: string,
    metricValue: string | number,
    entityName: string,
    entityId: string
  ) => {
    handleMetricHover(event, metricType, metricValue, entityName, entityId, 'campaign');
  };

  const handleAdGroupMetricHover = (
    event: React.MouseEvent,
    metricType: string,
    metricValue: string | number,
    entityName: string,
    entityId: string
  ) => {
    handleMetricHover(event, metricType, metricValue, entityName, entityId, 'adGroup');
  };

  const handleKeywordMetricHover = (
    event: React.MouseEvent,
    metricType: string,
    metricValue: string | number,
    entityName: string,
    entityId: string
  ) => {
    handleMetricHover(event, metricType, metricValue, entityName, entityId, 'keyword');
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
    onMccOverviewClick: () => tableState.handlePageChange('mcc-overview'),
    formatDateRangeDisplay: dateState.formatDateRangeDisplay,
    formatTimeAgo,
    formatNumber,
    cleanCountryCode,
    getDisplayName,
    getSeverityIcon: getSeverityIconString,
    getSeverityColor: getSeverityColorString,
    // Filter props
    campaigns: campaignsForFilter,
    adGroups: adGroupsForFilter,
    filterState: {
      selectedCampaigns: filterState.selectedCampaigns,
      selectedAdGroups: filterState.selectedAdGroups,
      deviceFilter: filterState.deviceFilter,
      campaignDropdownOpen: filterState.campaignDropdownOpen,
      adGroupDropdownOpen: filterState.adGroupDropdownOpen,
      deviceDropdownOpen: filterState.deviceDropdownOpen,
      hasActiveFilters: filterState.hasActiveFilters,
    },
    filterActions: {
      onToggleCampaign: filterState.toggleCampaign,
      onClearCampaigns: () => filterState.setSelectedCampaigns([]),
      onToggleCampaignDropdown: filterState.toggleCampaignDropdown,
      onToggleAdGroup: filterState.toggleAdGroup,
      onClearAdGroups: () => filterState.setSelectedAdGroups([]),
      onToggleAdGroupDropdown: filterState.toggleAdGroupDropdown,
      onDeviceFilterChange: filterState.setDeviceFilter,
      onToggleDeviceDropdown: filterState.toggleDeviceDropdown,
      onClearAllFilters: filterState.clearAllFilters,
    },
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
    campaignData: filteredCampaignData, // Use filtered data for KPIs
    campaignLoading,
    historicalData,
    historicalLoading,
    kpiPercentageChanges,
    error: accountState.error,
    selectedChartMetrics: chartState.selectedChartMetrics,
    chartType: chartState.chartType,
    dateGranularity: chartState.dateGranularity,
    statusFilter: tableState.statusFilter,
    tableSortColumn: tableState.sortBy,
    tableSortDirection: tableState.sortOrder,
    tableTotals,
    displayedCampaigns,
    onKpiSelection: handleKPISelection,
    onChartTypeChange: chartState.handleChartTypeChange,
    onDateGranularityChange: chartState.handleDateGranularityChange,
    onManualGranularityOverride: () => {},
    onStatusFilterChange: tableState.handleStatusFilterChange,
    onTableSort: handleTableSort,
    onCampaignClick: handleCampaignClick,
    onMetricHover: handleCampaignMetricHover,
    onMetricLeave: handleMetricLeave
  };

  const adGroupsProps = {
    realAdGroupData,
    adGroupLoading,
    adGroupTypeFilter: adGroupState.adGroupTypeFilter,
    adGroupSort: adGroupState.adGroupSort,
    onAdGroupTypeFilterChange: adGroupState.handleAdGroupTypeFilterChange,
    onAdGroupSort: adGroupState.handleAdGroupSort,
    onAdGroupClick: handleAdGroupClick,
    onMetricHover: handleAdGroupMetricHover,
    onMetricLeave: handleMetricLeave
  };

  const keywordsProps = {
    selectedAccount: accountState.selectedAccount,
    selectedDateRange: dateState.selectedDateRange
  };

  const settingsProps = {
    chartType: chartState.chartType,
    setChartType: chartState.handleChartTypeChange
  };

  const mccOverviewProps = {
    selectedDateRange: dateState.selectedDateRange,
    onAccountClick: (account: any) => {
      // When an account is clicked in MCC overview, switch to that account and go to dashboard
      accountState.handleAccountSelect(account.id);
      tableState.handlePageChange('dashboard');
    },
    onMetricHover: handleMetricHover,
    onMetricLeave: handleMetricLeave
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
        keywordsProps={keywordsProps}
        settingsProps={settingsProps}
        mccOverviewProps={mccOverviewProps}
      />
    </DashboardLayout>
  );
} 