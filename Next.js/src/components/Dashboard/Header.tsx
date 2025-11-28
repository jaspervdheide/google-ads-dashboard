'use client';

import React from 'react';
import { 
  ChevronDown, 
  RefreshCw, 
  Bell, 
  Settings,
  Calendar,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  Globe
} from 'lucide-react';
import { DateRange, Account, AnomalyData } from '../../types';
import { DeviceFilter } from '../../hooks/useFilterState';
import FilterBar from './FilterBar';

// Custom Kovvar Icon Component
const KovvarIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

interface Campaign {
  id: string;
  name: string;
}

interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
}

interface HeaderProps {
  selectedAccount: string;
  selectedAccountData: Account | null;
  filteredAccounts: Account[];
  selectedDateRange: DateRange | null;
  dateRanges: DateRange[];
  anomalyData: AnomalyData | null;
  loading: boolean;
  anomalyLoading: boolean;
  accountDropdownOpen: boolean;
  dateDropdownOpen: boolean;
  anomalyDropdownOpen: boolean;
  customDateModalOpen: boolean;
  onAccountDropdownToggle: () => void;
  onDateDropdownToggle: () => void;
  onAnomalyDropdownToggle: () => void;
  onCustomDateModalToggle: () => void;
  onAccountSelect: (accountId: string) => void;
  onDateRangeSelect: (range: DateRange) => void;
  onRefresh: () => void;
  onAnomalyAccountSelect: (accountId: string) => void;
  onMccOverviewClick?: () => void;
  formatDateRangeDisplay: (range: DateRange) => string;
  formatTimeAgo: (dateString: string) => string;
  formatNumber: (num: number) => string;
  cleanCountryCode: (countryCode: string) => string;
  getDisplayName: (account: Account) => string;
  getSeverityIcon: (severity: 'high' | 'medium' | 'low') => React.ReactNode;
  getSeverityColor: (severity: 'high' | 'medium' | 'low') => string;
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
    onToggleAdGroup: (adGroupId: string) => void;
    onClearAdGroups: () => void;
    onToggleAdGroupDropdown: () => void;
    onDeviceFilterChange: (device: DeviceFilter) => void;
    onToggleDeviceDropdown: () => void;
    onClearAllFilters: () => void;
  };
}

const Header: React.FC<HeaderProps> = ({
  selectedAccount,
  selectedAccountData,
  filteredAccounts,
  selectedDateRange,
  dateRanges,
  anomalyData,
  loading,
  anomalyLoading,
  accountDropdownOpen,
  dateDropdownOpen,
  anomalyDropdownOpen,
  onAccountDropdownToggle,
  onDateDropdownToggle,
  onAnomalyDropdownToggle,
  onCustomDateModalToggle,
  onAccountSelect,
  onDateRangeSelect,
  onRefresh,
  onAnomalyAccountSelect,
  onMccOverviewClick,
  formatDateRangeDisplay,
  formatTimeAgo,
  formatNumber,
  cleanCountryCode,
  getDisplayName,
  getSeverityIcon,
  getSeverityColor,
  campaigns = [],
  adGroups = [],
  filterState,
  filterActions,
}) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded-lg">
            <KovvarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Kovvar</h1>
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center space-x-3">
          {/* Account Switcher */}
          {selectedAccountData && (
            <div className="relative">
              <button
                onClick={onAccountDropdownToggle}
                className="account-button flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-0"
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {cleanCountryCode(selectedAccountData.countryCode)}
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-32">
                    {selectedAccountData.name}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {/* Account Dropdown */}
              {accountDropdownOpen && (
                <div className="account-dropdown absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => onAccountSelect(account.id)}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                          account.id === selectedAccount ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        <div className="font-medium">{getDisplayName(account)}</div>
                        <div className="text-sm text-gray-500">
                          {account.currency} • {account.totalClicks ? formatNumber(account.totalClicks) : '0'} clicks
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={onDateDropdownToggle}
              className="date-button flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-0"
            >
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {selectedDateRange ? selectedDateRange.name : 'Last 30 days'}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-40">
                  {selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'May 5 - Jun 4, 2025'}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            
            {/* Date Range Dropdown */}
            {dateDropdownOpen && (
              <div className="date-dropdown absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2 max-h-80 overflow-y-auto">
                  {dateRanges.map((range) => {
                    const IconComponent = range.icon;
                    const isSelected = selectedDateRange?.id === range.id;
                    return (
                      <button
                        key={range.id}
                        onClick={() => onDateRangeSelect(range)}
                        className={`w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        <IconComponent className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {range.name}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                            {formatDateRangeDisplay(range)}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Custom Date Range Option */}
                  <button
                    onClick={onCustomDateModalToggle}
                    className="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-3 text-gray-900 border-t border-gray-100 mt-2 pt-3"
                  >
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">Custom</div>
                      <div className="text-xs text-gray-500">Choose your own date range</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Filter Bar - Campaign, Ad Group, Device filters */}
          {filterState && filterActions && (
            <FilterBar
              campaigns={campaigns}
              selectedCampaigns={filterState.selectedCampaigns}
              onToggleCampaign={filterActions.onToggleCampaign}
              onClearCampaigns={filterActions.onClearCampaigns}
              campaignDropdownOpen={filterState.campaignDropdownOpen}
              onToggleCampaignDropdown={filterActions.onToggleCampaignDropdown}
              adGroups={adGroups}
              selectedAdGroups={filterState.selectedAdGroups}
              onToggleAdGroup={filterActions.onToggleAdGroup}
              onClearAdGroups={filterActions.onClearAdGroups}
              adGroupDropdownOpen={filterState.adGroupDropdownOpen}
              onToggleAdGroupDropdown={filterActions.onToggleAdGroupDropdown}
              deviceFilter={filterState.deviceFilter}
              onDeviceFilterChange={filterActions.onDeviceFilterChange}
              deviceDropdownOpen={filterState.deviceDropdownOpen}
              onToggleDeviceDropdown={filterActions.onToggleDeviceDropdown}
              hasActiveFilters={filterState.hasActiveFilters}
              onClearAllFilters={filterActions.onClearAllFilters}
            />
          )}

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={onAnomalyDropdownToggle}
              className="anomaly-button p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {anomalyData && anomalyData.summary.total > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {anomalyData.summary.total > 9 ? '9+' : anomalyData.summary.total}
                </span>
              )}
            </button>

            {/* Anomaly Dropdown */}
            {anomalyDropdownOpen && (
              <div className="anomaly-dropdown absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Anomaly Alerts</h3>
                    <button
                      onClick={onAnomalyDropdownToggle}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {anomalyData && (
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3 text-red-500" />
                        <span>{anomalyData.summary.high} High</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3 text-yellow-500" />
                        <span>{anomalyData.summary.medium} Medium</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Info className="h-3 w-3 text-blue-500" />
                        <span>{anomalyData.summary.low} Low</span>
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="max-h-72 overflow-y-auto">
                  {anomalyLoading ? (
                    <div className="p-4 text-center">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-sm text-gray-600">Analyzing anomalies...</p>
                    </div>
                  ) : anomalyData && anomalyData.anomalies.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {anomalyData.anomalies.map((anomaly) => (
                        <div
                          key={anomaly.id}
                          className={`p-4 border-l-4 ${getSeverityColor(anomaly.severity)} hover:bg-gray-50 transition-colors`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              {getSeverityIcon(anomaly.severity)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2">
                                  <h4 className="font-medium text-gray-900 text-sm">{anomaly.title}</h4>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                    {anomaly.countryCode}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-500">{formatTimeAgo(anomaly.detectedAt)}</span>
                                  <button
                                    onClick={() => onAnomalyAccountSelect(anomaly.accountId)}
                                    className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                                  >
                                    <span>View Account</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Add padding at the bottom to ensure last item is fully visible */}
                      <div className="h-2"></div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No anomalies detected</p>
                      <p className="text-xs text-gray-400 mt-1">Your campaigns are performing normally</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MCC Overview Button */}
          <button
            onClick={onMccOverviewClick || (() => window.location.href = '/mcc-overview')}
            className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors"
            title="MCC Overview - All Accounts"
          >
            <Globe className="h-4 w-4" />
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Refresh all data"
          >
            <div className={`${loading ? 'animate-spin' : ''}`}>
              <RefreshCw className="h-4 w-4" />
            </div>
          </button>

          {/* Settings */}
          <button className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header; 