import React, { useEffect, useRef, useState, useMemo } from 'react';
import { X, Target, Layers, Monitor, Smartphone, Tablet, Check, ChevronDown } from 'lucide-react';
import KPICards from './KPICards';
import Charts from './Charts';
import DrillDownTable, { DrillDownState, AdItem, KeywordItem } from './DrillDownTable';
import AdPreviewModal from './AdPreviewModal';
import DashboardHeader from './DashboardHeader';
import { DeviceFilter } from '../../hooks/useFilterState';
import { AdGroupData } from '../../types';

type StatusFilter = 'all' | 'active' | 'paused';

interface Campaign {
  id: string;
  name: string;
  status?: string;
}

interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
  groupType?: 'ad_group' | 'asset_group';
  status?: string;
}

interface DashboardViewProps {
  selectedAccount: string;
  filteredAccounts: any[];
  selectedDateRange: any;
  campaignData: any;
  campaignLoading: boolean;
  isRefreshing?: boolean;
  historicalData: any;
  historicalLoading: boolean;
  historicalRefreshing?: boolean;
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
  // Filter props
  campaigns?: Campaign[];
  adGroups?: AdGroup[];
  filterState?: {
    selectedCampaigns: string[];
    selectedAdGroups: string[];
    deviceFilter: DeviceFilter;
    campaignDropdownOpen: boolean;
    adGroupDropdownOpen: boolean;
    deviceDropdownOpen: boolean;
    hasActiveFilters: boolean;
  };
  filterActions?: {
    onToggleCampaign: (campaignId: string) => void;
    onClearCampaigns: () => void;
    onToggleCampaignDropdown: () => void;
    onSetCampaignDropdownOpen: (open: boolean) => void;
    onToggleAdGroup: (adGroupId: string) => void;
    onClearAdGroups: () => void;
    onToggleAdGroupDropdown: () => void;
    onSetAdGroupDropdownOpen: (open: boolean) => void;
    onDeviceFilterChange: (device: DeviceFilter) => void;
    onToggleDeviceDropdown: () => void;
    onSetDeviceDropdownOpen: (open: boolean) => void;
    onClearAllFilters: () => void;
  };
  // Drill-down props
  drillDownState?: DrillDownState;
  onDrillDownChange?: (update: Partial<DrillDownState>) => void;
  adGroupData?: AdGroupData | null;
  adGroupLoading?: boolean;
  keywordData?: KeywordItem[];
  keywordLoading?: boolean;
  adsData?: AdItem[];
  adsLoading?: boolean;
}

const deviceOptions: { value: DeviceFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Devices', icon: Monitor },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
];

export default function DashboardView({
  selectedAccount,
  filteredAccounts,
  selectedDateRange,
  campaignData,
  campaignLoading,
  isRefreshing = false,
  historicalData,
  historicalLoading,
  historicalRefreshing = false,
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
  onMetricLeave,
  campaigns = [],
  adGroups = [],
  filterState,
  filterActions,
  // Drill-down props
  drillDownState,
  onDrillDownChange,
  adGroupData,
  adGroupLoading = false,
  keywordData = [],
  keywordLoading = false,
  adsData = [],
  adsLoading = false,
}: DashboardViewProps) {
  // State for ad preview modal
  const [selectedAd, setSelectedAd] = useState<AdItem | null>(null);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);

  // Handle ad click to show preview modal
  const handleAdClick = (ad: AdItem) => {
    setSelectedAd(ad);
    setIsAdModalOpen(true);
  };

  const handleCloseAdModal = () => {
    setIsAdModalOpen(false);
    setSelectedAd(null);
  };

  // Refs for click outside handling
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const adGroupDropdownRef = useRef<HTMLDivElement>(null);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  // Status filter state for dropdowns (default to 'active' to show only enabled items)
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<StatusFilter>('active');
  const [adGroupStatusFilter, setAdGroupStatusFilter] = useState<StatusFilter>('active');

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterState && filterActions) {
        // Close campaign dropdown if clicked outside
        if (filterState.campaignDropdownOpen && 
            campaignDropdownRef.current && 
            !campaignDropdownRef.current.contains(event.target as Node)) {
          filterActions.onSetCampaignDropdownOpen(false);
        }
        // Close ad group dropdown if clicked outside
        if (filterState.adGroupDropdownOpen && 
            adGroupDropdownRef.current && 
            !adGroupDropdownRef.current.contains(event.target as Node)) {
          filterActions.onSetAdGroupDropdownOpen(false);
        }
        // Close device dropdown if clicked outside
        if (filterState.deviceDropdownOpen && 
            deviceDropdownRef.current && 
            !deviceDropdownRef.current.contains(event.target as Node)) {
          filterActions.onSetDeviceDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterState?.campaignDropdownOpen, filterState?.adGroupDropdownOpen, filterState?.deviceDropdownOpen, filterActions]);

  // Filter and sort campaigns - alphabetically and by status
  const sortedFilteredCampaigns = useMemo(() => {
    let filtered = [...campaigns];
    
    // Apply status filter (API returns ENABLED/PAUSED, filter uses active/paused)
    if (campaignStatusFilter === 'active') {
      filtered = filtered.filter(c => {
        const status = typeof c.status === 'string' ? c.status.toUpperCase() : '';
        return status === 'ENABLED';
      });
    } else if (campaignStatusFilter === 'paused') {
      filtered = filtered.filter(c => {
        const status = typeof c.status === 'string' ? c.status.toUpperCase() : '';
        return status === 'PAUSED';
      });
    }
    
    // Sort alphabetically A-Z
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [campaigns, campaignStatusFilter]);

  // Filter ad groups based on selected campaigns, status, and sort alphabetically
  const filteredAdGroups = useMemo(() => {
    let filtered = filterState && filterState.selectedCampaigns.length > 0
      ? adGroups.filter(ag => filterState.selectedCampaigns.includes(ag.campaignId))
      : [...adGroups];
    
    // Apply status filter (API returns ENABLED/PAUSED, filter uses active/paused)
    if (adGroupStatusFilter === 'active') {
      filtered = filtered.filter(ag => {
        const status = typeof ag.status === 'string' ? ag.status.toUpperCase() : '';
        return status === 'ENABLED';
      });
    } else if (adGroupStatusFilter === 'paused') {
      filtered = filtered.filter(ag => {
        const status = typeof ag.status === 'string' ? ag.status.toUpperCase() : '';
        return status === 'PAUSED';
      });
    }
    
    // Sort alphabetically A-Z
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [adGroups, filterState?.selectedCampaigns, adGroupStatusFilter]);

  // Get campaign label for button
  const getCampaignLabel = () => {
    if (!filterState || filterState.selectedCampaigns.length === 0) return 'All Campaigns';
    if (filterState.selectedCampaigns.length === 1) {
      const campaign = campaigns.find(c => c.id === filterState.selectedCampaigns[0]);
      return campaign?.name || '1 Campaign';
    }
    return `${filterState.selectedCampaigns.length} Campaigns`;
  };

  // Get ad group label for button
  const getAdGroupLabel = () => {
    if (!filterState || filterState.selectedAdGroups.length === 0) return 'All Ad Groups';
    if (filterState.selectedAdGroups.length === 1) {
      const adGroup = adGroups.find(ag => ag.id === filterState.selectedAdGroups[0]);
      return adGroup?.name || '1 Ad Group';
    }
    return `${filterState.selectedAdGroups.length} Ad Groups`;
  };

  // Get device label for button
  const getDeviceLabel = () => {
    if (!filterState) return 'All Devices';
    const option = deviceOptions.find(o => o.value === filterState.deviceFilter);
    return option?.label || 'All Devices';
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        selectedAccount={selectedAccount}
        filteredAccounts={filteredAccounts}
        selectedDateRange={selectedDateRange}
        campaignData={campaignData}
        campaignLoading={campaignLoading}
        error={error}
        selectedAdGroupsCount={filterState?.selectedAdGroups?.length || 0}
      />

      {/* Filter Bar - Below the page header */}
      {filterState && filterActions && (
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-500">Filters:</span>
          
          {/* Campaign Filter */}
          <div className="relative" ref={campaignDropdownRef}>
            <button
              onClick={filterActions.onToggleCampaignDropdown}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.selectedCampaigns.length > 0
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4" />
              <span className="max-w-40 truncate">{getCampaignLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {filterState.campaignDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Filter by Campaign</span>
                    <div className="flex items-center space-x-2">
                      {/* Status Filter Buttons */}
                      <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {(['all', 'active', 'paused'] as StatusFilter[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => setCampaignStatusFilter(status)}
                            className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                              campaignStatusFilter === status
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                      {filterState.selectedCampaigns.length > 0 && (
                        <button
                          onClick={filterActions.onClearCampaigns}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {sortedFilteredCampaigns.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      {campaignStatusFilter !== 'all' 
                        ? `No ${campaignStatusFilter} campaigns available`
                        : 'No campaigns available'}
                    </div>
                  ) : (
                    sortedFilteredCampaigns.map(campaign => (
                      <button
                        key={campaign.id}
                        onClick={() => filterActions.onToggleCampaign(campaign.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                          filterState.selectedCampaigns.includes(campaign.id)
                            ? 'bg-teal-50 text-teal-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          filterState.selectedCampaigns.includes(campaign.id)
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300'
                        }`}>
                          {filterState.selectedCampaigns.includes(campaign.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <span className="text-sm truncate flex-1 text-left">{campaign.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ad Group Filter */}
          <div className="relative" ref={adGroupDropdownRef}>
            <button
              onClick={filterActions.onToggleAdGroupDropdown}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.selectedAdGroups.length > 0
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span className="max-w-40 truncate">{getAdGroupLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {filterState.adGroupDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Filter by Ad Group / Asset Group</span>
                    <div className="flex items-center space-x-2">
                      {/* Status Filter Buttons */}
                      <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {(['all', 'active', 'paused'] as StatusFilter[]).map((status) => (
                          <button
                            key={status}
                            onClick={() => setAdGroupStatusFilter(status)}
                            className={`px-2 py-0.5 text-xs font-medium transition-colors ${
                              adGroupStatusFilter === status
                                ? 'bg-gray-100 text-gray-900'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                      {filterState.selectedAdGroups.length > 0 && (
                        <button
                          onClick={filterActions.onClearAdGroups}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  {filterState.selectedCampaigns.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Showing groups from {filterState.selectedCampaigns.length} selected campaign{filterState.selectedCampaigns.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredAdGroups.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">
                      {adGroupStatusFilter !== 'all'
                        ? `No ${adGroupStatusFilter} ad groups or asset groups available`
                        : filterState.selectedCampaigns.length > 0 
                          ? 'No groups in selected campaigns'
                          : 'No ad groups or asset groups available'}
                    </div>
                  ) : (
                    filteredAdGroups.map(adGroup => (
                      <button
                        key={adGroup.id}
                        onClick={() => filterActions.onToggleAdGroup(adGroup.id)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                          filterState.selectedAdGroups.includes(adGroup.id)
                            ? 'bg-teal-50 text-teal-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          filterState.selectedAdGroups.includes(adGroup.id)
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300'
                        }`}>
                          {filterState.selectedAdGroups.includes(adGroup.id) && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm truncate">{adGroup.name}</span>
                            {adGroup.groupType === 'asset_group' && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                PMax
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{adGroup.campaignName}</div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Device Filter */}
          <div className="relative" ref={deviceDropdownRef}>
            <button
              onClick={filterActions.onToggleDeviceDropdown}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.deviceFilter !== 'all'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filterState.deviceFilter === 'mobile' ? (
                <Smartphone className="h-4 w-4" />
              ) : filterState.deviceFilter === 'tablet' ? (
                <Tablet className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
              <span>{getDeviceLabel()}</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {filterState.deviceDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                <div className="p-2">
                  {deviceOptions.map(option => {
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => filterActions.onDeviceFilterChange(option.value)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                          filterState.deviceFilter === option.value
                            ? 'bg-teal-50 text-teal-700'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span className="text-sm">{option.label}</span>
                        {filterState.deviceFilter === option.value && (
                          <Check className="h-4 w-4 ml-auto" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clear All Filters */}
          {filterState.hasActiveFilters && (
            <button
              onClick={filterActions.onClearAllFilters}
              className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
              <span>Clear all</span>
            </button>
          )}
        </div>
      )}

      <KPICards
        campaignData={campaignData}
        campaignLoading={campaignLoading}
        isRefreshing={isRefreshing}
        kpiPercentageChanges={kpiPercentageChanges}
        selectedChartMetrics={selectedChartMetrics}
        onKpiSelection={onKpiSelection}
      />

      <Charts
        campaignData={campaignData}
        historicalData={historicalData}
        historicalLoading={historicalLoading}
        isRefreshing={historicalRefreshing}
        selectedChartMetrics={selectedChartMetrics}
        chartType={chartType}
        setChartType={onChartTypeChange}
        dateGranularity={dateGranularity}
        setDateGranularity={onDateGranularityChange}
        setManualGranularityOverride={onManualGranularityOverride}
        selectedDateRange={selectedDateRange}
      />

      {/* Drill-Down Campaign Table */}
      {drillDownState && onDrillDownChange ? (
        <DrillDownTable
          campaignData={campaignData}
          adGroupData={adGroupData || null}
          keywordData={keywordData}
          adData={adsData}
          campaignLoading={campaignLoading}
          adGroupLoading={adGroupLoading}
          keywordLoading={keywordLoading}
          adLoading={adsLoading}
          drillDownState={drillDownState}
          onDrillDownChange={onDrillDownChange}
          sortColumn={tableSortColumn}
          sortDirection={tableSortDirection}
          onSort={onTableSort}
          searchTerm=""
          onMetricHover={onMetricHover}
          onMetricLeave={onMetricLeave}
          onAdClick={handleAdClick}
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading campaign table...
        </div>
      )}

      {/* Ad Preview Modal */}
      <AdPreviewModal
        ad={selectedAd}
        isOpen={isAdModalOpen}
        onClose={handleCloseAdModal}
        accountId={selectedAccount}
        dateRange={selectedDateRange?.days || 30}
      />
    </div>
  );
} 
