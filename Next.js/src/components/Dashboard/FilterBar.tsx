'use client';

import React from 'react';
import { 
  ChevronDown, 
  X, 
  Target, 
  Layers, 
  Monitor,
  Smartphone,
  Tablet,
  Check
} from 'lucide-react';
import { DeviceFilter } from '../../hooks/useFilterState';

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

interface FilterBarProps {
  // Campaign filter
  campaigns: Campaign[];
  selectedCampaigns: string[];
  onToggleCampaign: (campaignId: string) => void;
  onClearCampaigns: () => void;
  campaignDropdownOpen: boolean;
  onToggleCampaignDropdown: () => void;
  
  // Ad Group filter
  adGroups: AdGroup[];
  selectedAdGroups: string[];
  onToggleAdGroup: (adGroupId: string) => void;
  onClearAdGroups: () => void;
  adGroupDropdownOpen: boolean;
  onToggleAdGroupDropdown: () => void;
  
  // Device filter
  deviceFilter: DeviceFilter;
  onDeviceFilterChange: (device: DeviceFilter) => void;
  deviceDropdownOpen: boolean;
  onToggleDeviceDropdown: () => void;
  
  // Clear all
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
}

const deviceOptions: { value: DeviceFilter; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Devices', icon: Monitor },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
];

const FilterBar: React.FC<FilterBarProps> = ({
  campaigns,
  selectedCampaigns,
  onToggleCampaign,
  onClearCampaigns,
  campaignDropdownOpen,
  onToggleCampaignDropdown,
  adGroups,
  selectedAdGroups,
  onToggleAdGroup,
  onClearAdGroups,
  adGroupDropdownOpen,
  onToggleAdGroupDropdown,
  deviceFilter,
  onDeviceFilterChange,
  deviceDropdownOpen,
  onToggleDeviceDropdown,
  hasActiveFilters,
  onClearAllFilters,
}) => {
  // Filter ad groups based on selected campaigns
  const filteredAdGroups = selectedCampaigns.length > 0
    ? adGroups.filter(ag => selectedCampaigns.includes(ag.campaignId))
    : adGroups;

  // Get campaign label for button
  const getCampaignLabel = () => {
    if (selectedCampaigns.length === 0) return 'All Campaigns';
    if (selectedCampaigns.length === 1) {
      const campaign = campaigns.find(c => c.id === selectedCampaigns[0]);
      return campaign?.name || '1 Campaign';
    }
    return `${selectedCampaigns.length} Campaigns`;
  };

  // Get ad group label for button
  const getAdGroupLabel = () => {
    if (selectedAdGroups.length === 0) return 'All Ad Groups';
    if (selectedAdGroups.length === 1) {
      const adGroup = adGroups.find(ag => ag.id === selectedAdGroups[0]);
      return adGroup?.name || '1 Ad Group';
    }
    return `${selectedAdGroups.length} Ad Groups`;
  };

  // Get device label for button
  const getDeviceLabel = () => {
    const option = deviceOptions.find(o => o.value === deviceFilter);
    return option?.label || 'All Devices';
  };

  return (
    <div className="flex items-center space-x-2">
      {/* Separator */}
      <div className="h-6 w-px bg-gray-300 mx-1"></div>
      
      {/* Campaign Filter */}
      <div className="relative">
        <button
          onClick={onToggleCampaignDropdown}
          className={`filter-button flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border ${
            selectedCampaigns.length > 0
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Target className="h-4 w-4" />
          <span className="text-sm font-medium max-w-32 truncate">{getCampaignLabel()}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {campaignDropdownOpen && (
          <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Filter by Campaign</span>
                {selectedCampaigns.length > 0 && (
                  <button
                    onClick={onClearCampaigns}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {campaigns.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  No campaigns available
                </div>
              ) : (
                campaigns.map(campaign => (
                  <button
                    key={campaign.id}
                    onClick={() => onToggleCampaign(campaign.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      selectedCampaigns.includes(campaign.id)
                        ? 'bg-teal-50 text-teal-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedCampaigns.includes(campaign.id)
                        ? 'bg-teal-600 border-teal-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedCampaigns.includes(campaign.id) && (
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
      <div className="relative">
        <button
          onClick={onToggleAdGroupDropdown}
          className={`filter-button flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border ${
            selectedAdGroups.length > 0
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span className="text-sm font-medium max-w-32 truncate">{getAdGroupLabel()}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {adGroupDropdownOpen && (
          <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
            <div className="p-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Filter by Ad Group</span>
                {selectedAdGroups.length > 0 && (
                  <button
                    onClick={onClearAdGroups}
                    className="text-xs text-teal-600 hover:text-teal-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              {selectedCampaigns.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Showing ad groups from {selectedCampaigns.length} selected campaign{selectedCampaigns.length > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {filteredAdGroups.length === 0 ? (
                <div className="px-3 py-4 text-center text-sm text-gray-500">
                  {selectedCampaigns.length > 0 
                    ? 'No ad groups in selected campaigns'
                    : 'No ad groups available'}
                </div>
              ) : (
                filteredAdGroups.map(adGroup => (
                  <button
                    key={adGroup.id}
                    onClick={() => onToggleAdGroup(adGroup.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      selectedAdGroups.includes(adGroup.id)
                        ? 'bg-teal-50 text-teal-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                      selectedAdGroups.includes(adGroup.id)
                        ? 'bg-teal-600 border-teal-600'
                        : 'border-gray-300'
                    }`}>
                      {selectedAdGroups.includes(adGroup.id) && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm truncate">{adGroup.name}</div>
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
      <div className="relative">
        <button
          onClick={onToggleDeviceDropdown}
          className={`filter-button flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors border ${
            deviceFilter !== 'all'
              ? 'bg-teal-50 border-teal-200 text-teal-700'
              : 'bg-gray-50 border-transparent text-gray-700 hover:bg-gray-100'
          }`}
        >
          {deviceFilter === 'mobile' ? (
            <Smartphone className="h-4 w-4" />
          ) : deviceFilter === 'tablet' ? (
            <Tablet className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">{getDeviceLabel()}</span>
          <ChevronDown className="h-3 w-3" />
        </button>

        {deviceDropdownOpen && (
          <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
            <div className="p-2">
              {deviceOptions.map(option => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => onDeviceFilterChange(option.value)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                      deviceFilter === option.value
                        ? 'bg-teal-50 text-teal-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <IconComponent className="h-4 w-4" />
                    <span className="text-sm">{option.label}</span>
                    {deviceFilter === option.value && (
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
      {hasActiveFilters && (
        <button
          onClick={onClearAllFilters}
          className="flex items-center space-x-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <X className="h-3 w-3" />
          <span>Clear</span>
        </button>
      )}
    </div>
  );
};

export default FilterBar;

