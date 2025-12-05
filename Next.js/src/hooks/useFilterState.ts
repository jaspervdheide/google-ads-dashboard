import { useState, useCallback, useMemo } from 'react';

export type DeviceFilter = 'all' | 'desktop' | 'mobile' | 'tablet';

export interface CampaignFilterItem {
  id: string;
  name: string;
}

export interface AdGroupFilterItem {
  id: string;
  name: string;
  campaignId: string;
  campaignName: string;
}

export interface FilterState {
  // Selected campaign IDs (empty = all campaigns)
  selectedCampaigns: string[];
  // Selected ad group IDs (empty = all ad groups)
  selectedAdGroups: string[];
  // Device filter
  deviceFilter: DeviceFilter;
  // Dropdown open states
  campaignDropdownOpen: boolean;
  adGroupDropdownOpen: boolean;
  deviceDropdownOpen: boolean;
}

export interface UseFilterStateReturn {
  // State
  selectedCampaigns: string[];
  selectedAdGroups: string[];
  deviceFilter: DeviceFilter;
  campaignDropdownOpen: boolean;
  adGroupDropdownOpen: boolean;
  deviceDropdownOpen: boolean;
  
  // Actions
  setSelectedCampaigns: (campaigns: string[]) => void;
  toggleCampaign: (campaignId: string) => void;
  setSelectedAdGroups: (adGroups: string[]) => void;
  toggleAdGroup: (adGroupId: string) => void;
  setDeviceFilter: (device: DeviceFilter) => void;
  clearAllFilters: () => void;
  
  // Dropdown toggles
  toggleCampaignDropdown: () => void;
  toggleAdGroupDropdown: () => void;
  toggleDeviceDropdown: () => void;
  setCampaignDropdownOpen: (open: boolean) => void;
  setAdGroupDropdownOpen: (open: boolean) => void;
  setDeviceDropdownOpen: (open: boolean) => void;
  
  // Helper functions
  hasActiveFilters: boolean;
  getFilterSummary: () => string;
}

export function useFilterState(): UseFilterStateReturn {
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [selectedAdGroups, setSelectedAdGroups] = useState<string[]>([]);
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const [adGroupDropdownOpen, setAdGroupDropdownOpen] = useState(false);
  const [deviceDropdownOpen, setDeviceDropdownOpen] = useState(false);

  // Toggle a single campaign selection
  const toggleCampaign = useCallback((campaignId: string) => {
    setSelectedCampaigns(prev => {
      if (prev.includes(campaignId)) {
        return prev.filter(id => id !== campaignId);
      } else {
        return [...prev, campaignId];
      }
    });
    // Clear ad group selection when campaigns change
    setSelectedAdGroups([]);
  }, []);

  // Toggle a single ad group selection
  const toggleAdGroup = useCallback((adGroupId: string) => {
    setSelectedAdGroups(prev => {
      if (prev.includes(adGroupId)) {
        return prev.filter(id => id !== adGroupId);
      } else {
        return [...prev, adGroupId];
      }
    });
  }, []);

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSelectedCampaigns([]);
    setSelectedAdGroups([]);
    setDeviceFilter('all');
  }, []);

  // Dropdown toggles
  const toggleCampaignDropdown = useCallback(() => {
    setCampaignDropdownOpen(prev => !prev);
    setAdGroupDropdownOpen(false);
    setDeviceDropdownOpen(false);
  }, []);

  const toggleAdGroupDropdown = useCallback(() => {
    setAdGroupDropdownOpen(prev => !prev);
    setCampaignDropdownOpen(false);
    setDeviceDropdownOpen(false);
  }, []);

  const toggleDeviceDropdown = useCallback(() => {
    setDeviceDropdownOpen(prev => !prev);
    setCampaignDropdownOpen(false);
    setAdGroupDropdownOpen(false);
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return selectedCampaigns.length > 0 || selectedAdGroups.length > 0 || deviceFilter !== 'all';
  }, [selectedCampaigns, selectedAdGroups, deviceFilter]);

  // Get a summary string of active filters
  const getFilterSummary = useCallback(() => {
    const parts: string[] = [];
    
    if (selectedCampaigns.length > 0) {
      parts.push(`${selectedCampaigns.length} campaign${selectedCampaigns.length > 1 ? 's' : ''}`);
    }
    
    if (selectedAdGroups.length > 0) {
      parts.push(`${selectedAdGroups.length} ad group${selectedAdGroups.length > 1 ? 's' : ''}`);
    }
    
    if (deviceFilter !== 'all') {
      parts.push(deviceFilter);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No filters';
  }, [selectedCampaigns, selectedAdGroups, deviceFilter]);

  return {
    // State
    selectedCampaigns,
    selectedAdGroups,
    deviceFilter,
    campaignDropdownOpen,
    adGroupDropdownOpen,
    deviceDropdownOpen,
    
    // Actions
    setSelectedCampaigns,
    toggleCampaign,
    setSelectedAdGroups,
    toggleAdGroup,
    setDeviceFilter,
    clearAllFilters,
    
    // Dropdown toggles
    toggleCampaignDropdown,
    toggleAdGroupDropdown,
    toggleDeviceDropdown,
    setCampaignDropdownOpen,
    setAdGroupDropdownOpen,
    setDeviceDropdownOpen,
    
    // Helpers
    hasActiveFilters,
    getFilterSummary,
  };
}

export default useFilterState;



