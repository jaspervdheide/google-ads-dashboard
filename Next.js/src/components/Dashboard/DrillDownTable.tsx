'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { ChevronRight, ChevronLeft, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { Campaign, CampaignData } from '../../types';
import { AdGroup, AdGroupData } from '../../types';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';
import { 
  getPerformanceLevel, 
  PerformanceIndicator,
  detectCampaignType,
  getCampaignTypeIndicator,
  TableTotalsRow
} from './shared';

// =============================================================================
// TYPES
// =============================================================================

export type DrillDownLevel = 'campaigns' | 'adGroups' | 'keywords' | 'ads';
export type PageSize = 10 | 25 | 50;
export type TabType = 'keywords' | 'ads';
export type KeywordTypeFilter = 'all' | 'keywords' | 'search_terms';
export type AdStrengthFilter = 'all' | 'excellent' | 'good' | 'average' | 'poor';

export interface MetricFilter {
  column: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  value: number;
}

export interface DrillDownState {
  level: DrillDownLevel;
  selectedCampaign: Campaign | null;
  selectedAdGroup: AdGroup | null;
  activeTab: TabType;
  keywordTypeFilter: KeywordTypeFilter;
  adStrengthFilter: AdStrengthFilter;
  metricFilters: MetricFilter[];
  pageSize: PageSize;
  currentPage: number;
}

export interface KeywordItem {
  id: string;
  keyword_text: string;
  match_type: string;
  type: 'keyword' | 'search_term';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  cpc: number;
  conversions: number;
  conversions_value: number;
  roas: number;
  quality_score?: number;
  ad_group_id?: string;
  ad_group_name: string;
  campaign_id?: string;
  campaign_name: string;
}

export interface AdItem {
  id: string;
  name: string;
  type: string;
  status: string;
  adStrength: string;
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  displayPath: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  cpa: number;
  roas: number;
}

interface DrillDownTableProps {
  // Data
  campaignData: CampaignData | null;
  adGroupData: AdGroupData | null;
  keywordData: KeywordItem[] | null;
  adData: AdItem[] | null;
  
  // Loading states
  campaignLoading: boolean;
  adGroupLoading: boolean;
  keywordLoading: boolean;
  adLoading: boolean;
  
  // Drill-down state
  drillDownState: DrillDownState;
  onDrillDownChange: (state: Partial<DrillDownState>) => void;
  
  // Sort state
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  
  // Search
  searchTerm: string;
  
  // Hover card handlers
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, entityName: string, entityId: string) => void;
  onMetricLeave?: (metricType?: string) => void;
  
  // Ad preview
  onAdClick?: (ad: AdItem) => void;
}

// =============================================================================
// BREADCRUMB COMPONENT
// =============================================================================

interface BreadcrumbProps {
  level: DrillDownLevel;
  campaign: Campaign | null;
  adGroup: AdGroup | null;
  onNavigate: (level: DrillDownLevel) => void;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ level, campaign, adGroup, onNavigate }) => {
  return (
    <div className="flex items-center text-sm">
      <button
        onClick={() => onNavigate('campaigns')}
        className={`${level === 'campaigns' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
      >
        All Campaigns
      </button>
      
      {campaign && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
          <button
            onClick={() => onNavigate('adGroups')}
            className={`${level === 'adGroups' ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'} truncate`}
            style={{ maxWidth: '250px' }}
          >
            {campaign.name}
          </button>
        </>
      )}
      
      {adGroup && (
        <>
          <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
          <span className="text-gray-900 font-medium truncate" style={{ maxWidth: '250px' }}>
            {adGroup.name}
          </span>
        </>
      )}
    </div>
  );
};

// =============================================================================
// PAGINATION COMPONENT
// =============================================================================

interface PaginationProps {
  currentPage: number;
  pageSize: PageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center space-x-4">
        <span className="text-sm text-gray-700">
          Showing {startItem}-{endItem} of {totalItems}
        </span>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Per page:</span>
          {([10, 25, 50] as PageSize[]).map(size => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              className={`px-2 py-1 text-sm rounded ${
                pageSize === size
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-700">
          Page {currentPage} of {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// SORT HEADER COMPONENT
// =============================================================================

interface SortHeaderProps {
  column: string;
  label: string;
  currentSort: string;
  direction: 'asc' | 'desc';
  onSort: (column: string) => void;
  className?: string;
}

const SortHeader: React.FC<SortHeaderProps> = ({ column, label, currentSort, direction, onSort, className = '' }) => (
  <th
    className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${className}`}
    onClick={() => onSort(column)}
  >
    <div className="flex items-center space-x-1">
      <span>{label}</span>
      {currentSort === column && (
        <span className="text-teal-600">
          {direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      )}
    </div>
  </th>
);


// =============================================================================
// MAIN DRILLDOWN TABLE COMPONENT
// =============================================================================

const DrillDownTable: React.FC<DrillDownTableProps> = ({
  campaignData,
  adGroupData,
  keywordData,
  adData,
  campaignLoading,
  adGroupLoading,
  keywordLoading,
  adLoading,
  drillDownState,
  onDrillDownChange,
  sortColumn,
  sortDirection,
  onSort,
  searchTerm,
  onMetricHover,
  onMetricLeave,
  onAdClick
}) => {
  const { level, selectedCampaign, selectedAdGroup, activeTab, keywordTypeFilter, metricFilters, pageSize, currentPage } = drillDownState;

  // State for metric filter dropdown
  const [filterDropdownOpen, setFilterDropdownOpen] = useState<string | null>(null);
  const [tempFilterValue, setTempFilterValue] = useState<string>('');
  const [tempFilterOperator, setTempFilterOperator] = useState<'>' | '<' | '=' | '>=' | '<='>('>=');
  const filterDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close filter dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setFilterDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply metric filter
  const applyMetricFilter = (column: string) => {
    const value = parseFloat(tempFilterValue);
    if (isNaN(value)) return;
    const newFilter: MetricFilter = { column, operator: tempFilterOperator, value };
    const existingFilters = metricFilters.filter(f => f.column !== column);
    onDrillDownChange({ metricFilters: [...existingFilters, newFilter], currentPage: 1 });
    setFilterDropdownOpen(null);
    setTempFilterValue('');
  };

  // Remove metric filter
  const removeMetricFilter = (column: string) => {
    onDrillDownChange({ metricFilters: metricFilters.filter(f => f.column !== column), currentPage: 1 });
  };

  // Clear all metric filters
  const clearAllMetricFilters = () => {
    onDrillDownChange({ metricFilters: [], currentPage: 1 });
  };

  // Check if item passes all metric filters
  const passesMetricFilters = (item: any): boolean => {
    return metricFilters.every(filter => {
      const itemValue = item[filter.column] || 0;
      switch (filter.operator) {
        case '>': return itemValue > filter.value;
        case '<': return itemValue < filter.value;
        case '=': return itemValue === filter.value;
        case '>=': return itemValue >= filter.value;
        case '<=': return itemValue <= filter.value;
        default: return true;
      }
    });
  };

  // Get active filter for a column
  const getActiveFilter = (column: string): MetricFilter | undefined => {
    return metricFilters.find(f => f.column === column);
  };

  // Handle navigation
  const handleNavigate = useCallback((targetLevel: DrillDownLevel) => {
    if (targetLevel === 'campaigns') {
      onDrillDownChange({
        level: 'campaigns',
        selectedCampaign: null,
        selectedAdGroup: null,
        currentPage: 1
      });
    } else if (targetLevel === 'adGroups') {
      onDrillDownChange({
        level: 'adGroups',
        selectedAdGroup: null,
        currentPage: 1
      });
    }
  }, [onDrillDownChange]);

  // Handle campaign click - drill into ad groups
  const handleCampaignClick = useCallback((campaign: Campaign) => {
    onDrillDownChange({
      level: 'adGroups',
      selectedCampaign: campaign,
      selectedAdGroup: null,
      currentPage: 1
    });
  }, [onDrillDownChange]);

  // Handle ad group click - drill into keywords/ads
  const handleAdGroupClick = useCallback((adGroup: AdGroup) => {
    onDrillDownChange({
      level: 'keywords',
      selectedAdGroup: adGroup,
      activeTab: 'keywords',
      currentPage: 1
    });
  }, [onDrillDownChange]);

  // Filter and paginate campaigns
  const filteredCampaigns = useMemo(() => {
    if (!campaignData?.campaigns) return [];
    
    return campaignData.campaigns
      .filter(c => {
        // Only show ENABLED campaigns (Active filter)
        const isActive = c.status === 'ENABLED';
        const matchesSearch = !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase());
        return isActive && matchesSearch;
      })
      .sort((a, b) => {
        let aVal = a[sortColumn as keyof Campaign];
        let bVal = b[sortColumn as keyof Campaign];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase() as any;
        if (typeof bVal === 'string') bVal = bVal.toLowerCase() as any;
        if (sortDirection === 'asc') return aVal < bVal ? -1 : 1;
        return aVal > bVal ? -1 : 1;
      });
  }, [campaignData, searchTerm, sortColumn, sortDirection]);

  // Filter ad groups for selected campaign
  const filteredAdGroups = useMemo(() => {
    if (!adGroupData?.adGroups || !selectedCampaign) return [];
    
    return adGroupData.adGroups
      .filter(ag => {
        const matchesCampaign = ag.campaignId === selectedCampaign.id;
        const isActive = ag.status === 'ENABLED';
        const matchesSearch = !searchTerm || ag.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCampaign && isActive && matchesSearch;
      })
      .sort((a, b) => {
        let aVal = a[sortColumn as keyof AdGroup];
        let bVal = b[sortColumn as keyof AdGroup];
        if (typeof aVal === 'string') aVal = aVal.toLowerCase() as any;
        if (typeof bVal === 'string') bVal = bVal.toLowerCase() as any;
        if (sortDirection === 'asc') return aVal < bVal ? -1 : 1;
        return aVal > bVal ? -1 : 1;
      });
  }, [adGroupData, selectedCampaign, searchTerm, sortColumn, sortDirection]);

  // Check if selected ad group is a Performance Max asset group
  const isAssetGroup = selectedAdGroup?.groupType === 'asset_group';

  // Filter keywords for selected ad group (only for non-PMax campaigns)
  const filteredKeywords = useMemo(() => {
    if (!keywordData || !selectedAdGroup || isAssetGroup) return [];
    
    return keywordData
      .filter(k => {
        // Match by ad group ID (convert both to string for comparison)
        const keywordAdGroupId = k.ad_group_id?.toString();
        const selectedId = selectedAdGroup.id?.toString();
        const matchesAdGroup = keywordAdGroupId === selectedId || k.ad_group_name === selectedAdGroup.name;
        const matchesSearch = !searchTerm || k.keyword_text.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filter by keyword type (keyword vs search_term)
        let matchesType = true;
        if (keywordTypeFilter === 'keywords') {
          matchesType = k.type === 'keyword';
        } else if (keywordTypeFilter === 'search_terms') {
          matchesType = k.type === 'search_term';
        }
        
        // Apply metric filters
        const passesFilters = passesMetricFilters(k);
        
        return matchesAdGroup && matchesSearch && matchesType && passesFilters;
      })
      .sort((a, b) => {
        const aVal = a[sortColumn as keyof KeywordItem] || 0;
        const bVal = b[sortColumn as keyof KeywordItem] || 0;
        if (sortDirection === 'asc') return aVal < bVal ? -1 : 1;
        return aVal > bVal ? -1 : 1;
      });
  }, [keywordData, selectedAdGroup, searchTerm, sortColumn, sortDirection, isAssetGroup, keywordTypeFilter, metricFilters]);

  // Filter ads for selected ad group - only show ENABLED (active) ads
  const filteredAds = useMemo(() => {
    if (!adData || !selectedAdGroup) return [];
    
    const { adStrengthFilter } = drillDownState;
    
    return adData
      .filter(ad => {
        // Only show active/enabled ads
        const isActive = ad.status === 'ENABLED';
        const matchesSearch = !searchTerm || 
          ad.headlines.some(h => h.toLowerCase().includes(searchTerm.toLowerCase())) ||
          ad.descriptions.some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));
        
        // Filter by ad strength (using adStrength property)
        let matchesStrength = true;
        if (adStrengthFilter && adStrengthFilter !== 'all') {
          const strengthMap: Record<string, string[]> = {
            'excellent': ['EXCELLENT'],
            'good': ['GOOD'],
            'average': ['AVERAGE'],
            'poor': ['POOR', 'UNSPECIFIED']
          };
          const adStrengthValue = ad.adStrength?.toUpperCase() || '';
          matchesStrength = strengthMap[adStrengthFilter]?.includes(adStrengthValue) || false;
        }
        
        // Apply metric filters
        const passesFilters = passesMetricFilters(ad);
        
        return isActive && matchesSearch && matchesStrength && passesFilters;
      })
      .sort((a, b) => {
        const aVal = a[sortColumn as keyof AdItem] || 0;
        const bVal = b[sortColumn as keyof AdItem] || 0;
        if (sortDirection === 'asc') return aVal < bVal ? -1 : 1;
        return aVal > bVal ? -1 : 1;
      });
  }, [adData, selectedAdGroup, searchTerm, sortColumn, sortDirection, metricFilters, drillDownState]);

  // Get current data based on level
  const getCurrentData = () => {
    switch (level) {
      case 'campaigns': return filteredCampaigns;
      case 'adGroups': return filteredAdGroups;
      case 'keywords': return activeTab === 'keywords' ? filteredKeywords : filteredAds;
      case 'ads': return filteredAds;
      default: return [];
    }
  };

  const currentData = getCurrentData();
  const totalItems = currentData.length;
  const paginatedData = currentData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Get loading state
  const isLoading = level === 'campaigns' ? campaignLoading 
    : level === 'adGroups' ? adGroupLoading 
    : activeTab === 'keywords' ? keywordLoading : adLoading;

  // Performance level arrays for indicators
  const allClicks = paginatedData.map((item: any) => item.clicks || 0);
  const allImpressions = paginatedData.map((item: any) => item.impressions || 0);
  const allCtr = paginatedData.map((item: any) => item.ctr || 0);
  const allCost = paginatedData.map((item: any) => item.cost || 0);
  const allConversions = paginatedData.map((item: any) => item.conversions || 0);
  const allRoas = paginatedData.map((item: any) => item.roas || 0);

  // =============================================================================
  // RENDER CAMPAIGNS TABLE
  // =============================================================================
  const renderCampaignsTable = () => (
    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '1px' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '40px' }} />
      </colgroup>
      <thead className="bg-gray-50">
        <tr>
          <SortHeader column="name" label="Campaign Name" currentSort={sortColumn} direction={sortDirection} onSort={onSort} className="font-semibold text-gray-700" />
          <th className="px-1 py-3 border-r border-gray-300" />
          <SortHeader column="clicks" label="Clicks" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="impressions" label="Impr." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="ctr" label="CTR" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="avgCpc" label="CPC" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="cost" label="Cost" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="conversions" label="Conv." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="cpa" label="CPA" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="conversionsValue" label="Conv. Val." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="roas" label="POAS" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(paginatedData as Campaign[]).map(campaign => (
          <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleCampaignClick(campaign)}>
            <td className="px-4 py-3">
              <div className="flex items-center space-x-2 min-w-0">
                <span className="flex-shrink-0">{getCampaignTypeIndicator(detectCampaignType(campaign.name))}</span>
                <span className="text-sm font-medium text-gray-900 truncate" title={campaign.name}>{campaign.name}</span>
              </div>
            </td>
            <td className="px-1 py-3 border-r border-gray-300" />
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'clicks', campaign.clicks, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('clicks')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.clicks, allClicks, 'clicks')} />
                {formatNumber(campaign.clicks)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'impressions', campaign.impressions, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('impressions')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.impressions, allImpressions, 'impressions')} />
                {formatNumber(campaign.impressions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'ctr', campaign.ctr, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('ctr')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.ctr, allCtr, 'ctr')} />
                {formatPercentage(campaign.ctr)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'avgCpc', campaign.avgCpc, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('avgCpc')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.avgCpc, allCost, 'avgCpc')} />
                {formatCurrency(campaign.avgCpc)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'cost', campaign.cost, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('cost')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.cost, allCost, 'cost')} />
                {formatCurrency(campaign.cost)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'conversions', campaign.conversions, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('conversions')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.conversions, allConversions, 'conversions')} />
                {formatNumber(campaign.conversions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'cpa', campaign.cpa, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('cpa')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.cpa, allCost, 'cpa')} />
                {formatCurrency(campaign.cpa)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'conversionsValue', campaign.conversionsValue, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('conversionsValue')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.conversionsValue, allCost, 'conversionsValue')} />
                {formatCurrency(campaign.conversionsValue)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'roas', campaign.roas, campaign.name, campaign.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('roas')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(campaign.roas, allRoas, 'roas')} />
                {campaign.roas.toFixed(2)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
              <ChevronRight className="h-4 w-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // =============================================================================
  // RENDER AD GROUPS TABLE
  // =============================================================================
  const renderAdGroupsTable = () => (
    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '20%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '1px' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '40px' }} />
      </colgroup>
      <thead className="bg-gray-50">
        <tr>
          <SortHeader column="name" label="Ad Group" currentSort={sortColumn} direction={sortDirection} onSort={onSort} className="font-semibold text-gray-700" />
          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
          <th className="px-1 py-3 border-r border-gray-300" />
          <SortHeader column="clicks" label="Clicks" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="impressions" label="Impr." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="ctr" label="CTR" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="avgCpc" label="CPC" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="cost" label="Cost" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="conversions" label="Conv." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="cpa" label="CPA" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="conversionsValue" label="Conv. Val." currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <SortHeader column="roas" label="POAS" currentSort={sortColumn} direction={sortDirection} onSort={onSort} />
          <th className="px-4 py-3" />
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(paginatedData as AdGroup[]).map(adGroup => (
          <tr key={adGroup.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleAdGroupClick(adGroup)}>
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              <div className="truncate" title={adGroup.name}>{adGroup.name}</div>
            </td>
            <td className="px-3 py-3">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                adGroup.groupType === 'asset_group' 
                  ? 'bg-purple-100 text-purple-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {adGroup.groupType === 'asset_group' ? 'Asset Group' : 'Ad Group'}
              </span>
            </td>
            <td className="px-1 py-3 w-px border-r border-gray-300" />
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'clicks', adGroup.clicks, adGroup.name, adGroup.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('clicks')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.clicks, allClicks, 'clicks')} />
                {formatNumber(adGroup.clicks)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm"
              onMouseEnter={onMetricHover ? (e) => { e.stopPropagation(); onMetricHover(e, 'impressions', adGroup.impressions, adGroup.name, adGroup.id); } : undefined}
              onMouseLeave={() => onMetricLeave?.('impressions')}
            >
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.impressions, allImpressions, 'impressions')} />
                {formatNumber(adGroup.impressions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.ctr, allCtr, 'ctr')} />
                {formatPercentage(adGroup.ctr)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.avgCpc, allCost, 'avgCpc')} />
                {formatCurrency(adGroup.avgCpc)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.cost, allCost, 'cost')} />
                {formatCurrency(adGroup.cost)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.conversions, allConversions, 'conversions')} />
                {formatNumber(adGroup.conversions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.cpa, allCost, 'cpa')} />
                {formatCurrency(adGroup.cpa)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.conversionsValue, allCost, 'conversionsValue')} />
                {formatCurrency(adGroup.conversionsValue)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(adGroup.roas, allRoas, 'roas')} />
                {adGroup.roas.toFixed(2)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400">
              <ChevronRight className="h-4 w-4" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // =============================================================================
  // RENDER KEYWORDS TABLE
  // =============================================================================
  
  // Handle filter click
  const handleFilterClick = (column: string) => {
    if (filterDropdownOpen === column) {
      setFilterDropdownOpen(null);
    } else {
      setFilterDropdownOpen(column);
      const existing = getActiveFilter(column);
      if (existing) {
        setTempFilterOperator(existing.operator);
        setTempFilterValue(existing.value.toString());
      } else {
        setTempFilterOperator('>=');
        setTempFilterValue('');
      }
    }
  };

  // Quick filter presets based on column type
  const getQuickFilters = (column: string): { label: string; operator: '>' | '<' | '=' | '>=' | '<='; value: number }[] => {
    switch (column) {
      case 'clicks':
        return [
          { label: '> 100', operator: '>', value: 100 },
          { label: '> 50', operator: '>', value: 50 },
          { label: '= 0', operator: '=', value: 0 },
        ];
      case 'cost':
        return [
          { label: '> €100', operator: '>', value: 100 },
          { label: '> €50', operator: '>', value: 50 },
          { label: '< €10', operator: '<', value: 10 },
        ];
      case 'conversions':
        return [
          { label: '= 0', operator: '=', value: 0 },
          { label: '> 0', operator: '>', value: 0 },
          { label: '> 10', operator: '>', value: 10 },
        ];
      case 'roas':
        return [
          { label: '< 1', operator: '<', value: 1 },
          { label: '> 2', operator: '>', value: 2 },
          { label: '> 5', operator: '>', value: 5 },
        ];
      case 'ctr':
        return [
          { label: '< 1%', operator: '<', value: 1 },
          { label: '> 5%', operator: '>', value: 5 },
          { label: '> 10%', operator: '>', value: 10 },
        ];
      default:
        return [
          { label: '> 0', operator: '>', value: 0 },
          { label: '= 0', operator: '=', value: 0 },
        ];
    }
  };

  // Render premium filter dropdown
  const renderFilterDropdown = (column: string, label: string) => {
    if (filterDropdownOpen !== column) return null;
    const quickFilters = getQuickFilters(column);
    const activeFilter = getActiveFilter(column);
    
    return (
      <div 
        ref={filterDropdownRef}
        className="absolute left-0 z-50 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 w-[280px]"
        style={{ boxShadow: '0 20px 40px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">Filter by {label}</span>
            {activeFilter && (
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                Active
              </span>
            )}
          </div>
        </div>

        {/* Quick filters */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Quick filters</div>
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((qf, idx) => (
              <button
                key={idx}
                onClick={() => {
                  const newFilter: MetricFilter = { column, operator: qf.operator, value: qf.value };
                  const existingFilters = metricFilters.filter(f => f.column !== column);
                  onDrillDownChange({ metricFilters: [...existingFilters, newFilter], currentPage: 1 });
                  setFilterDropdownOpen(null);
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all"
              >
                {qf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom filter */}
        <div className="px-4 py-3">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Custom filter</div>
          <div className="flex items-center gap-2">
            <select 
              value={tempFilterOperator}
              onChange={(e) => setTempFilterOperator(e.target.value as any)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium text-gray-700"
            >
              <option value=">">&gt;</option>
              <option value="<">&lt;</option>
              <option value="=">=</option>
              <option value=">=">&ge;</option>
              <option value="<=">&le;</option>
            </select>
            <input
              type="number"
              value={tempFilterValue}
              onChange={(e) => setTempFilterValue(e.target.value)}
              placeholder="Enter value"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && applyMetricFilter(column)}
            />
            <button
              onClick={() => applyMetricFilter(column)}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Clear filter footer */}
        {activeFilter && (
          <div className="px-4 py-2 bg-red-50 border-t border-red-100">
            <button
              onClick={() => { removeMetricFilter(column); setFilterDropdownOpen(null); }}
              className="text-xs font-medium text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Remove this filter
            </button>
          </div>
        )}
      </div>
    );
  };

  // Render filterable header cell with fixed width
  const renderFilterableHeader = (column: string, label: string) => {
    const activeFilter = getActiveFilter(column);
    // Define fixed widths for each column type
    const widthMap: Record<string, string> = {
      'clicks': 'w-[90px]',
      'impressions': 'w-[90px]',
      'ctr': 'w-[80px]',
      'cpc': 'w-[80px]',
      'avgCpc': 'w-[80px]',
      'cost': 'w-[100px]',
      'conversions': 'w-[80px]',
      'conversions_value': 'w-[100px]',
      'conversionsValue': 'w-[100px]',
      'roas': 'w-[80px]',
    };
    const width = widthMap[column] || 'w-[90px]';
    
    return (
      <th className={`${width} px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider relative group`}>
        <div className="flex items-center gap-1">
          <span 
            className="cursor-pointer hover:text-gray-900 transition-colors whitespace-nowrap"
            onClick={() => onSort(column)}
          >
            {label}
          </span>
          {sortColumn === column && (
            <span className="text-teal-600 flex-shrink-0">
              {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); handleFilterClick(column); }}
            className={`flex-shrink-0 p-1 rounded-md transition-all ${
              activeFilter 
                ? 'text-blue-600 bg-blue-100 shadow-sm' 
                : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
            }`}
            title={activeFilter ? `${label} ${activeFilter.operator} ${activeFilter.value}` : `Filter by ${label}`}
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
        </div>
        {renderFilterDropdown(column, label)}
      </th>
    );
  };

  // Helper to capitalize filter column names
  const formatColumnName = (column: string): string => {
    const nameMap: Record<string, string> = {
      'clicks': 'Clicks',
      'impressions': 'Impressions',
      'ctr': 'CTR',
      'cpc': 'CPC',
      'avgCpc': 'CPC',
      'cost': 'Cost',
      'conversions': 'Conversions',
      'conversions_value': 'Conv. Value',
      'conversionsValue': 'Conv. Value',
      'roas': 'ROAS',
      'quality_score': 'Quality Score'
    };
    return nameMap[column] || column;
  };

  const renderKeywordsTable = () => {
    // Determine header label based on filter
    const keywordHeaderLabel = keywordTypeFilter === 'search_terms' ? 'Search Term' : 
                               keywordTypeFilter === 'keywords' ? 'Keyword' : 'Search Term';
    
    return (
    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '20%' }} />
        {keywordTypeFilter === 'all' && <col style={{ width: '8%' }} />}
        <col style={{ width: '7%' }} />
        <col style={{ width: '1px' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '9%' }} />
        <col style={{ width: '7%' }} />
        {keywordTypeFilter !== 'search_terms' && <col style={{ width: '5%' }} />}
      </colgroup>
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('keyword_text')}>
            <div className="flex items-center space-x-1">
              <span>{keywordHeaderLabel}</span>
              {sortColumn === 'keyword_text' && (
                <span className="text-teal-600">
                  {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              )}
            </div>
          </th>
          {keywordTypeFilter === 'all' && (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
          )}
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Match</th>
          <th className="px-1 py-3 border-r border-gray-300" />
          {renderFilterableHeader('clicks', 'Clicks')}
          {renderFilterableHeader('impressions', 'Impr.')}
          {renderFilterableHeader('ctr', 'CTR')}
          {renderFilterableHeader('cpc', 'CPC')}
          {renderFilterableHeader('cost', 'Cost')}
          {renderFilterableHeader('conversions', 'Conv.')}
          {renderFilterableHeader('conversions_value', 'Conv. Val.')}
          {renderFilterableHeader('roas', 'ROAS')}
          {keywordTypeFilter !== 'search_terms' && (
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('quality_score')}>
              <div className="flex items-center space-x-1">
                <span>QS</span>
                {sortColumn === 'quality_score' && (
                  <span className="text-teal-600">
                    {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                )}
              </div>
            </th>
          )}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(paginatedData as KeywordItem[]).map((keyword, idx) => (
          <tr key={`${keyword.id}-${idx}`} className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm font-medium text-gray-900">
              <div className="truncate max-w-[200px]" title={keyword.keyword_text}>
                {keyword.keyword_text}
              </div>
            </td>
            {keywordTypeFilter === 'all' && (
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  keyword.type === 'keyword' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {keyword.type === 'keyword' ? 'Keyword' : 'Search Term'}
                </span>
              </td>
            )}
            <td className="px-4 py-3 whitespace-nowrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                keyword.match_type === 'EXACT' ? 'bg-purple-100 text-purple-800' :
                keyword.match_type === 'PHRASE' ? 'bg-orange-100 text-orange-800' :
                keyword.match_type === 'SEARCH_TERM' ? 'bg-gray-100 text-gray-700' :
                'bg-teal-100 text-teal-800'
              }`}>
                {keyword.match_type === 'SEARCH_TERM' ? '—' : keyword.match_type}
              </span>
            </td>
            <td className="px-1 py-3 w-px border-r border-gray-300" />
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.clicks, allClicks, 'clicks')} />
                {formatNumber(keyword.clicks)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.impressions, allImpressions, 'impressions')} />
                {formatNumber(keyword.impressions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.ctr, allCtr, 'ctr')} />
                {formatPercentage(keyword.ctr)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.cpc, allCost, 'cpc')} />
                {formatCurrency(keyword.cpc)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.cost, allCost, 'cost')} />
                {formatCurrency(keyword.cost)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.conversions, allConversions, 'conversions')} />
                {formatNumber(keyword.conversions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.conversions_value, allCost, 'conversions_value')} />
                {formatCurrency(keyword.conversions_value)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(keyword.roas, allRoas, 'roas')} />
                {keyword.roas.toFixed(2)}
              </div>
            </td>
            {keywordTypeFilter !== 'search_terms' && (
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {keyword.quality_score ? (
                  <span className={`font-medium ${
                    keyword.quality_score >= 7 ? 'text-green-600' :
                    keyword.quality_score >= 4 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {keyword.quality_score}/10
                  </span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );};

  // =============================================================================
  // RENDER ADS TABLE
  // =============================================================================
  const renderAdsTable = () => (
    <table className="w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '25%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '1px' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '8%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '7%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '7%' }} />
      </colgroup>
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => onSort('name')}>
            <div className="flex items-center space-x-1">
              <span>Ad</span>
              {sortColumn === 'name' && (
                <span className="text-teal-600">
                  {sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </span>
              )}
            </div>
          </th>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
          <th className="px-1 py-3 border-r border-gray-300" />
          {renderFilterableHeader('clicks', 'Clicks')}
          {renderFilterableHeader('impressions', 'Impr.')}
          {renderFilterableHeader('ctr', 'CTR')}
          {renderFilterableHeader('avgCpc', 'CPC')}
          {renderFilterableHeader('cost', 'Cost')}
          {renderFilterableHeader('conversions', 'Conv.')}
          {renderFilterableHeader('conversionsValue', 'Conv. Val.')}
          {renderFilterableHeader('roas', 'ROAS')}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {(paginatedData as AdItem[]).map(ad => (
          <tr key={ad.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onAdClick?.(ad)}>
            <td className="px-4 py-3">
              <div className="w-[260px]" title={`${ad.headlines[0] || ''}\n${ad.descriptions[0] || ''}`}>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {ad.headlines[0] || 'Untitled Ad'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {ad.descriptions[0] || ''}
                </p>
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                ad.adStrength === 'EXCELLENT' ? 'bg-green-100 text-green-800' :
                ad.adStrength === 'GOOD' ? 'bg-blue-100 text-blue-800' :
                ad.adStrength === 'AVERAGE' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {ad.adStrength}
              </span>
            </td>
            <td className="px-1 py-3 w-px border-r border-gray-300" />
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.clicks, allClicks, 'clicks')} />
                {formatNumber(ad.clicks)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.impressions, allImpressions, 'impressions')} />
                {formatNumber(ad.impressions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.ctr, allCtr, 'ctr')} />
                {formatPercentage(ad.ctr)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.avgCpc, allCost, 'avgCpc')} />
                {formatCurrency(ad.avgCpc)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.cost, allCost, 'cost')} />
                {formatCurrency(ad.cost)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.conversions, allConversions, 'conversions')} />
                {formatNumber(ad.conversions)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.conversionsValue, allCost, 'conversionsValue')} />
                {formatCurrency(ad.conversionsValue)}
              </div>
            </td>
            <td className="px-4 py-3 whitespace-nowrap text-sm">
              <div className="flex items-center">
                <PerformanceIndicator level={getPerformanceLevel(ad.roas, allRoas, 'roas')} />
                {ad.roas.toFixed(2)}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with breadcrumb and back button */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {level !== 'campaigns' && (
              <button
                onClick={() => handleNavigate(level === 'adGroups' ? 'campaigns' : 'adGroups')}
                className="flex items-center text-sm text-gray-500 hover:text-gray-900 mr-4"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            )}
            <Breadcrumb
              level={level}
              campaign={selectedCampaign}
              adGroup={selectedAdGroup}
              onNavigate={handleNavigate}
            />
          </div>
          
          {/* Keywords/Ads toggle - always on right side */}
          {(level === 'keywords' || level === 'ads') && (
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1 ml-auto">
              {!isAssetGroup && (
                <button
                  onClick={() => onDrillDownChange({ activeTab: 'keywords', currentPage: 1 })}
                  className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                    activeTab === 'keywords'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Keywords
                </button>
              )}
              <button
                onClick={() => onDrillDownChange({ activeTab: 'ads', currentPage: 1 })}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'ads' || isAssetGroup
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {isAssetGroup ? 'Asset Details' : 'Ads'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && paginatedData.length === 0 && !isAssetGroup && (
        <div className="text-center py-12">
          <p className="text-gray-500">No data available</p>
        </div>
      )}

      {/* Asset Group Details View (for PMax) - Data-focused optimization view */}
      {!isLoading && isAssetGroup && selectedAdGroup && (level === 'keywords' || level === 'ads') && (
        <div className="p-4">
          {/* Performance Summary Table */}
          <table className="min-w-full divide-y divide-gray-200 mb-6">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Asset Group</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad Strength</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Impressions</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Clicks</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CTR</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">CPA</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv. Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">POAS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      PMax
                    </span>
                    <span className="text-sm font-medium text-gray-900">{selectedAdGroup.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedAdGroup.status === 'ENABLED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {selectedAdGroup.status === 'ENABLED' ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    selectedAdGroup.adStrength === 'Excellent' ? 'bg-green-100 text-green-800' :
                    selectedAdGroup.adStrength === 'Good' ? 'bg-blue-100 text-blue-800' :
                    selectedAdGroup.adStrength === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedAdGroup.adStrength || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(selectedAdGroup.impressions)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(selectedAdGroup.clicks)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatPercentage(selectedAdGroup.ctr)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(selectedAdGroup.cost)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatNumber(selectedAdGroup.conversions)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(selectedAdGroup.cpa)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                  {formatCurrency(selectedAdGroup.conversionsValue)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {selectedAdGroup.roas.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Optimization Insights */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Optimization Insights</h4>
            <div className="space-y-2">
              {/* Ad Strength Warning */}
              {selectedAdGroup.adStrength && selectedAdGroup.adStrength !== 'Excellent' && selectedAdGroup.adStrength !== 'Good' && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-amber-500 mt-0.5">⚠</span>
                  <span className="text-gray-700">
                    <strong>Ad Strength:</strong> Currently "{selectedAdGroup.adStrength}". Add more headlines, descriptions, and images to improve ad combinations and performance.
                  </span>
                </div>
              )}
              {selectedAdGroup.adStrength === 'Good' && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-blue-500 mt-0.5">ℹ</span>
                  <span className="text-gray-700">
                    <strong>Ad Strength:</strong> Good. Consider adding more asset variations to reach "Excellent" for better performance.
                  </span>
                </div>
              )}
              {selectedAdGroup.adStrength === 'Excellent' && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>Ad Strength:</strong> Excellent. Asset variety is optimized for maximum reach.
                  </span>
                </div>
              )}
              
              {/* ROAS Analysis */}
              {selectedAdGroup.roas < 1 && selectedAdGroup.cost > 0 && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  <span className="text-gray-700">
                    <strong>POAS Warning:</strong> {selectedAdGroup.roas.toFixed(2)}x - Asset group is spending more than it returns. Review audience signals and listing groups.
                  </span>
                </div>
              )}
              {selectedAdGroup.roas >= 1 && selectedAdGroup.roas < 3 && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-yellow-500 mt-0.5">●</span>
                  <span className="text-gray-700">
                    <strong>POAS:</strong> {selectedAdGroup.roas.toFixed(2)}x - Moderate return. Consider testing new audience signals or creative assets.
                  </span>
                </div>
              )}
              {selectedAdGroup.roas >= 3 && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-gray-700">
                    <strong>POAS:</strong> {selectedAdGroup.roas.toFixed(2)}x - Strong performance. This asset group is performing well.
                  </span>
                </div>
              )}
              
              {/* CTR Analysis */}
              {selectedAdGroup.ctr < 1 && selectedAdGroup.impressions > 1000 && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-amber-500 mt-0.5">⚠</span>
                  <span className="text-gray-700">
                    <strong>CTR:</strong> {formatPercentage(selectedAdGroup.ctr)} is below average. Test different headlines and images to improve click-through rate.
                  </span>
                </div>
              )}

              {/* No conversions warning */}
              {selectedAdGroup.conversions === 0 && selectedAdGroup.cost > 50 && (
                <div className="flex items-start space-x-2 text-sm">
                  <span className="text-red-500 mt-0.5">⚠</span>
                  <span className="text-gray-700">
                    <strong>No Conversions:</strong> €{selectedAdGroup.cost.toFixed(0)} spent with no conversions. Review audience signals and consider pausing if trend continues.
                  </span>
                </div>
              )}

              {/* All good message */}
              {selectedAdGroup.adStrength === 'Excellent' && selectedAdGroup.roas >= 3 && selectedAdGroup.conversions > 0 && (
                <div className="flex items-start space-x-2 text-sm mt-2 pt-2 border-t border-gray-200">
                  <span className="text-green-500 mt-0.5">✓</span>
                  <span className="text-green-700 font-medium">
                    This asset group is performing optimally. No immediate optimization needed.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table content - Campaigns */}
      {!isLoading && level === 'campaigns' && paginatedData.length > 0 && (
        <div className="overflow-x-auto">
          {renderCampaignsTable()}
        </div>
      )}

      {/* Table content - Ad Groups */}
      {!isLoading && level === 'adGroups' && paginatedData.length > 0 && (
        <div className="overflow-x-auto">
          {renderAdGroupsTable()}
        </div>
      )}

      {/* Filter bar - clean second row for both Keywords and Ads tabs */}
      {(level === 'keywords' || level === 'ads') && !isAssetGroup && (
        <div className="px-4 py-3 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
          {/* Left: Type selector (different for Keywords vs Ads) */}
          <div className="flex items-center gap-3">
            {activeTab === 'keywords' && (
              <>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</span>
                <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                  <button
                    onClick={() => onDrillDownChange({ keywordTypeFilter: 'all', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      keywordTypeFilter === 'all'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ keywordTypeFilter: 'keywords', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      keywordTypeFilter === 'keywords'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Keywords
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ keywordTypeFilter: 'search_terms', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      keywordTypeFilter === 'search_terms'
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Search Terms
                  </button>
                </div>
              </>
            )}
            {activeTab === 'ads' && (
              <>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ad Strength</span>
                <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5 shadow-sm">
                  <button
                    onClick={() => onDrillDownChange({ adStrengthFilter: 'all', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      (!drillDownState.adStrengthFilter || drillDownState.adStrengthFilter === 'all')
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ adStrengthFilter: 'excellent', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drillDownState.adStrengthFilter === 'excellent'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Excellent
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ adStrengthFilter: 'good', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drillDownState.adStrengthFilter === 'good'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Good
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ adStrengthFilter: 'average', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drillDownState.adStrengthFilter === 'average'
                        ? 'bg-yellow-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Average
                  </button>
                  <button
                    onClick={() => onDrillDownChange({ adStrengthFilter: 'poor', currentPage: 1 })}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                      drillDownState.adStrengthFilter === 'poor'
                        ? 'bg-red-500 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Poor
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right: Active filters */}
          {metricFilters.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters</span>
              <div className="flex items-center gap-1.5">
                {metricFilters.map(filter => (
                  <span 
                    key={filter.column}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white border border-blue-200 text-blue-700 shadow-sm"
                  >
                    <span className="text-blue-500">{formatColumnName(filter.column)}</span>
                    <span className="text-blue-400">{filter.operator}</span>
                    <span className="font-semibold">{filter.value}</span>
                    <button
                      onClick={() => removeMetricFilter(filter.column)}
                      className="ml-0.5 p-0.5 rounded hover:bg-blue-100 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={clearAllMetricFilters}
                  className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Table content - Keywords/Ads (non-asset groups only) */}
      {!isLoading && (level === 'keywords' || level === 'ads') && !isAssetGroup && paginatedData.length > 0 && (
        <div className="overflow-x-auto">
          {activeTab === 'keywords' && renderKeywordsTable()}
          {activeTab === 'ads' && renderAdsTable()}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={(page) => onDrillDownChange({ currentPage: page })}
          onPageSizeChange={(size) => onDrillDownChange({ pageSize: size, currentPage: 1 })}
        />
      )}
    </div>
  );
};

export default DrillDownTable;

