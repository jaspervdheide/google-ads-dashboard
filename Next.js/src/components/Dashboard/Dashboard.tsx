'use client';

import React, { useMemo, useState, useCallback } from 'react';
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

import { useAdsData } from '../../hooks/useAdsData';
import type { DrillDownState, DrillDownLevel, PageSize, TabType } from './DrillDownTable';

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
  
  // Drill-down state for campaign table navigation
  const [drillDownState, setDrillDownState] = useState<DrillDownState>({
    level: 'campaigns',
    selectedCampaign: null,
    selectedAdGroup: null,
    activeTab: 'keywords',
    keywordTypeFilter: 'all',
    adStrengthFilter: 'all',
    metricFilters: [],
    pageSize: 10,
    currentPage: 1
  });

  // Handle drill-down state changes
  const handleDrillDownChange = useCallback((update: Partial<DrillDownState>) => {
    setDrillDownState(prev => ({ ...prev, ...update }));
  }, []);
  
  // Hover chart hook
  const { 
    hoverChart, 
    handleMetricHover, 
    handleMetricLeave, 
    handleChartHover, 
    handleChartLeave 
  } = useHoverChart();

  // Data hooks - pass device filter for device-segmented data
  const { 
    data: campaignData, 
    loading: campaignLoading, 
    isRefreshing: campaignRefreshing,
    kpiPercentageChanges 
  } = useCampaignData(
    accountState.selectedAccount, 
    dateState.selectedDateRange, 
    false, 
    false, // includeBiddingStrategy
    filterState.deviceFilter
  );

  // Determine which campaign/ad group to filter historical data by
  const historicalCampaignId = filterState.selectedCampaigns.length === 1 
    ? filterState.selectedCampaigns[0] 
    : null;
  const historicalAdGroupId = filterState.selectedAdGroups.length === 1 
    ? filterState.selectedAdGroups[0] 
    : null;

  const { 
    data: historicalData, 
    loading: historicalLoading,
    isRefreshing: historicalRefreshing
  } = useHistoricalData(
    accountState.selectedAccount, 
    dateState.selectedDateRange, 
    false, 
    historicalCampaignId, // campaignId - filters chart to selected campaign
    historicalAdGroupId, // adGroupId - filters chart to selected ad group
    null, // keywordId
    filterState.deviceFilter // deviceFilter
  );

  const { 
    data: anomalyData, 
    loading: anomalyLoading
  } = useAnomalyData(accountState.selectedAccount, '30', false);

  const { 
    data: realAdGroupData, 
    loading: adGroupLoading,
    isRefreshing: adGroupRefreshing
  } = useAdGroupData(accountState.selectedAccount, dateState.selectedDateRange, false, 'all', filterState.deviceFilter);

  const { 
    data: keywordData, 
    loading: keywordLoading
  } = useKeywordData(accountState.selectedAccount, dateState.selectedDateRange, false);

  // Ads data - only fetch when drilled into an ad group
  const {
    data: adsData,
    loading: adsLoading
  } = useAdsData(
    accountState.selectedAccount,
    dateState.selectedDateRange,
    drillDownState.selectedAdGroup?.id || null,
    filterState.deviceFilter
  );

  // Computed values - campaigns list for filter dropdown
  const campaignsForFilter = useMemo(() => {
    if (!campaignData?.campaigns) return [];
    return campaignData.campaigns.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status || 'ENABLED'
    }));
  }, [campaignData]);

  // Filtered campaign data for KPIs and charts
  // If ad groups are selected, use ad group data; otherwise use campaign data
  const filteredCampaignData = useMemo(() => {
    // If ad groups are selected, aggregate ad group metrics
    if (filterState.selectedAdGroups.length > 0 && realAdGroupData?.adGroups) {
      const selectedAdGroups = realAdGroupData.adGroups.filter((ag: any) => 
        filterState.selectedAdGroups.includes(ag.id)
      );
      
      if (selectedAdGroups.length === 0) return campaignData;
      
      // Aggregate metrics from selected ad groups
      const totals = selectedAdGroups.reduce((acc: any, ag: any) => ({
        impressions: acc.impressions + (ag.impressions || 0),
        clicks: acc.clicks + (ag.clicks || 0),
        cost: acc.cost + (ag.cost || 0),
        conversions: acc.conversions + (ag.conversions || 0),
        conversionsValue: acc.conversionsValue + (ag.conversionsValue || 0),
      }), { impressions: 0, clicks: 0, cost: 0, conversions: 0, conversionsValue: 0 });
      
      // Return a campaign-data-like structure with aggregated ad group metrics
      return {
        ...campaignData,
        campaigns: [], // No campaigns when filtering by ad groups
        totals: {
          ...totals,
          ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
          avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
          conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
          cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
          roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
        }
      };
    }
    
    // If no campaign data, return null
    if (!campaignData) return null;
    
    // If no campaign filter, return all campaign data
    if (filterState.selectedCampaigns.length === 0) return campaignData;
    
    // Filter by selected campaigns
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
  }, [campaignData, filterState.selectedCampaigns, filterState.selectedAdGroups, realAdGroupData]);

  // Ad groups list for filter dropdown (includes both Ad Groups and Asset Groups)
  const adGroupsForFilter = useMemo(() => {
    if (!realAdGroupData?.adGroups) return [];
    return realAdGroupData.adGroups.map((ag: any) => ({
      id: ag.id,
      name: ag.name,
      campaignId: ag.campaignId || '',
      campaignName: ag.campaignName || '',
      groupType: ag.groupType || 'ad_group', // 'ad_group' or 'asset_group'
      status: ag.status || 'ENABLED'
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
    // If ad groups are selected, calculate totals from ad groups
    if (filterState.selectedAdGroups.length > 0 && realAdGroupData?.adGroups) {
      const selectedAdGroups = realAdGroupData.adGroups.filter((ag: any) => 
        filterState.selectedAdGroups.includes(ag.id)
      );
      
      const totals = selectedAdGroups.reduce((acc: any, ag: any) => ({
        clicks: acc.clicks + (ag.clicks || 0),
        impressions: acc.impressions + (ag.impressions || 0),
        cost: acc.cost + (ag.cost || 0),
        conversions: acc.conversions + (ag.conversions || 0),
        conversionsValue: acc.conversionsValue + (ag.conversionsValue || 0),
      }), { clicks: 0, impressions: 0, cost: 0, conversions: 0, conversionsValue: 0 });
      
      return {
        campaignCount: selectedAdGroups.length,
        ...totals,
        ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
        avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
        cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
        roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
      };
    }
    
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
  }, [campaignData, tableState.campaignSearch, tableState.statusFilter, tableState.sortBy, tableState.sortOrder, filterState.selectedCampaigns, filterState.selectedAdGroups, realAdGroupData]);

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
    isRefreshing: campaignRefreshing || adGroupRefreshing || historicalRefreshing, // For smooth data transitions
    historicalData,
    historicalLoading,
    historicalRefreshing, // For smooth chart transitions
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
    onMetricLeave: handleMetricLeave,
    // Filter props - now in dashboard content area
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
      onSetCampaignDropdownOpen: filterState.setCampaignDropdownOpen,
      onToggleAdGroup: filterState.toggleAdGroup,
      onClearAdGroups: () => filterState.setSelectedAdGroups([]),
      onToggleAdGroupDropdown: filterState.toggleAdGroupDropdown,
      onSetAdGroupDropdownOpen: filterState.setAdGroupDropdownOpen,
      onDeviceFilterChange: filterState.setDeviceFilter,
      onToggleDeviceDropdown: filterState.toggleDeviceDropdown,
      onSetDeviceDropdownOpen: filterState.setDeviceDropdownOpen,
      onClearAllFilters: filterState.clearAllFilters,
    },
    // Drill-down props
    drillDownState,
    onDrillDownChange: handleDrillDownChange,
    adGroupData: realAdGroupData,
    adGroupLoading,
    keywordData: keywordData?.keywords || [],
    keywordLoading,
    adsData: adsData?.ads || [],
    adsLoading,
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

  const productsProps = {
    selectedAccount: accountState.selectedAccount,
    selectedDateRange: dateState.selectedDateRange,
    chartType: chartState.chartType,
    setChartType: chartState.handleChartTypeChange,
    dateGranularity: chartState.dateGranularity,
    setDateGranularity: chartState.handleDateGranularityChange
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
        settingsProps={settingsProps}
        mccOverviewProps={mccOverviewProps}
        productsProps={productsProps}
      />
    </DashboardLayout>
  );
} 