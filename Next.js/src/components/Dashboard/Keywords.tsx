'use client';

import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import { useKeywordData, KeywordItem } from '../../hooks/useKeywordData';
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage
} from '../../utils';
import { DateRange } from '../../types/common';
import { 
  getPerformanceLevel, 
  PerformanceIndicator,
  detectCampaignType,
  getCampaignTypeIndicator
} from './shared';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

// Use the KeywordItem type from the hook
type KeywordData = KeywordItem;

interface KeywordsProps {
  selectedAccount: string;
  selectedDateRange: DateRange | null;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  statusFilter: 'active' | 'all';
  dataTypeFilter: 'all' | 'keywords' | 'search_terms';
  viewMode: 'table' | 'graphs';
  onSort: (column: string) => void;
}

// Get keyword type badge styles
const getKeywordTypeBadge = (type: 'keyword' | 'search_term') => {
  return type === 'search_term' 
    ? 'bg-green-100 text-green-800 border border-green-200'
    : 'bg-blue-100 text-blue-800 border border-blue-200';
};

// Get match type badge styles
const getMatchTypeBadge = (matchType: string) => {
  switch (matchType) {
    case 'EXACT': return 'bg-purple-100 text-purple-800 border border-purple-200';
    case 'PHRASE': return 'bg-orange-100 text-orange-800 border border-orange-200';
    case 'BROAD': return 'bg-teal-100 text-teal-800 border border-teal-200';
    case 'SEARCH_TERM': return 'bg-gray-100 text-gray-800 border border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border border-gray-200';
  }
};

// =============================================================================
// MAIN KEYWORDS COMPONENT
// =============================================================================

const Keywords: React.FC<KeywordsProps> = ({
  selectedAccount,
  selectedDateRange,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  statusFilter,
  dataTypeFilter,
  viewMode,
  onSort
}) => {
  // Use the standardized hook for data fetching with proper caching
  const { data: keywordDataResponse, loading: keywordsLoading, error } = useKeywordData(
    selectedAccount, 
    selectedDateRange, 
    false, // forceRefresh
    'both' // Always fetch both keywords and search terms
  );

  // Extract the keywords array from the response
  const keywordData: KeywordItem[] = keywordDataResponse?.keywords || [];

  // =============================================================================
  // DATA PROCESSING - MEMOIZED FOR PERFORMANCE
  // =============================================================================

  // Filter and sort keywords - matching Ad Groups structure
  const filteredKeywords = useMemo(() => {
    if (!keywordData || !Array.isArray(keywordData)) {
      console.warn('Keywords: keywordData is not an array:', keywordData);
      return [];
    }
    
    return keywordData
      .filter((keyword: KeywordItem) => {
        // Apply status filter
        const statusMatch = statusFilter === 'all' || 
          (statusFilter === 'active' && (keyword.impressions > 0 || keyword.clicks > 0));
        
        // Apply data type filter
        let dataTypeMatch = true;
        if (dataTypeFilter === 'keywords') {
          dataTypeMatch = keyword.type === 'keyword';
        } else if (dataTypeFilter === 'search_terms') {
          dataTypeMatch = keyword.type === 'search_term';
        }
        
        // Apply search filter
        const searchMatch = keyword.keyword_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (keyword.campaign_name && keyword.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (keyword.ad_group_name && keyword.ad_group_name.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return statusMatch && dataTypeMatch && searchMatch;
      })
      .sort((a, b) => {
        let aValue = a[sortColumn as keyof KeywordData];
        let bValue = b[sortColumn as keyof KeywordData];
        
        // Handle undefined and null values
        if ((aValue === undefined || aValue === null) && (bValue === undefined || bValue === null)) return 0;
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }
        
        if (sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      })
      .slice(0, pageSize);
  }, [keywordData, statusFilter, dataTypeFilter, searchTerm, sortColumn, sortDirection, pageSize]);

  // Calculate performance levels for all metrics
  const allClicks = filteredKeywords.map(k => k.clicks);
  const allImpressions = filteredKeywords.map(k => k.impressions);
  const allCtr = filteredKeywords.map(k => k.ctr);
  const allCpc = filteredKeywords.map(k => k.cpc);
  const allCost = filteredKeywords.map(k => k.cost);
  const allConversions = filteredKeywords.map(k => k.conversions);
  const allRoas = filteredKeywords.map(k => k.roas);
  const allQualityScores = filteredKeywords.map(k => k.quality_score || 0).filter(score => score > 0);

  // Calculate table totals
  const calculatedTotals = useMemo(() => {
    const totals = filteredKeywords.reduce((acc, keyword) => ({
      clicks: acc.clicks + keyword.clicks,
      impressions: acc.impressions + keyword.impressions,
      cost: acc.cost + keyword.cost,
      conversions: acc.conversions + keyword.conversions,
      conversionsValue: acc.conversionsValue + keyword.conversions_value,
    }), {
      clicks: 0,
      impressions: 0,
      cost: 0,
      conversions: 0,
      conversionsValue: 0,
    });

    // Calculate derived metrics
    return {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
      roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
      keywordCount: filteredKeywords.length
    };
  }, [filteredKeywords]);

  if (keywordsLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600">Loading keywords...</p>
      </div>
    );
  }

  if (!keywordData || keywordData.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-400 mb-4">
          <Target className="h-12 w-12 mx-auto" />
        </div>
        <p className="text-gray-600">No keywords found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors duration-200"
              onClick={() => onSort('keyword_text')}
            >
              <div className="flex items-center space-x-1">
                <span>Keyword / Search Term</span>
                {sortColumn === 'keyword_text' && (
                  <span className="text-teal-600">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('campaign_name')}
            >
              Campaign
              {sortColumn === 'campaign_name' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('impressions')}
            >
              Impressions
              {sortColumn === 'impressions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('clicks')}
            >
              Clicks
              {sortColumn === 'clicks' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('ctr')}
            >
              CTR
              {sortColumn === 'ctr' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('cpc')}
            >
              CPC
              {sortColumn === 'cpc' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('cost')}
            >
              Cost
              {sortColumn === 'cost' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('conversions')}
            >
              Conversions
              {sortColumn === 'conversions' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('roas')}
            >
              ROAS
              {sortColumn === 'roas' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            {dataTypeFilter !== 'search_terms' && (
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => onSort('quality_score')}
              >
                Quality Score
                {sortColumn === 'quality_score' && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </th>
            )}
          </tr>
        </thead>
        
        {/* Table Body */}
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredKeywords.map((keyword, index) => {
            const campaignType = detectCampaignType(keyword.campaign_name);
            
            return (
              <tr key={`${keyword.id || 'no-id'}-${keyword.keyword_text}-${keyword.type}-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                {/* Keyword Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getCampaignTypeIndicator(campaignType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {keyword.keyword_text}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getKeywordTypeBadge(keyword.type)}`}>
                          {keyword.type === 'search_term' ? 'Search Term' : 'Keyword'}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getMatchTypeBadge(keyword.match_type)}`}>
                          {keyword.match_type}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {keyword.ad_group_name}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Campaign */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 max-w-xs truncate">
                    {keyword.campaign_name}
                  </div>
                </td>

                {/* Type */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getKeywordTypeBadge(keyword.type)}`}>
                    {keyword.type === 'search_term' ? 'Search Term' : 'Keyword'}
                  </span>
                </td>

                {/* Impressions */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.impressions, allImpressions, 'impressions')} />
                    <span className="text-sm text-gray-900">
                      {formatNumber(keyword.impressions)}
                    </span>
                  </div>
                </td>

                {/* Clicks */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.clicks, allClicks, 'clicks')} />
                    <span className="text-sm text-gray-900">
                      {formatNumber(keyword.clicks)}
                    </span>
                  </div>
                </td>

                {/* CTR */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.ctr, allCtr, 'ctr')} />
                    <span className="text-sm text-gray-900">
                      {formatPercentage(keyword.ctr)}
                    </span>
                  </div>
                </td>

                {/* CPC */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.cpc, allCpc, 'cpc')} />
                    <span className="text-sm text-gray-900">
                      {formatCurrency(keyword.cpc)}
                    </span>
                  </div>
                </td>

                {/* Cost */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.cost, allCost, 'cost')} />
                    <span className="text-sm text-gray-900">
                      {formatCurrency(keyword.cost)}
                    </span>
                  </div>
                </td>

                {/* Conversions */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.conversions, allConversions, 'conversions')} />
                    <span className="text-sm text-gray-900">
                      {formatNumber(keyword.conversions)}
                    </span>
                  </div>
                </td>

                {/* ROAS */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(keyword.roas, allRoas, 'roas')} />
                    <span className="text-sm text-gray-900">
                      {formatPercentage(keyword.roas)}
                    </span>
                  </div>
                </td>

                {/* Quality Score - only show for keywords */}
                {dataTypeFilter !== 'search_terms' && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    {keyword.type === 'keyword' && keyword.quality_score ? (
                      <div className="flex items-center">
                        <PerformanceIndicator level={getPerformanceLevel(keyword.quality_score, allQualityScores, 'quality_score')} />
                        <span className="text-sm text-gray-900">
                          {keyword.quality_score}/10
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>

        {/* Table Footer with Totals */}
        <tfoot className="bg-gray-50 border-t border-gray-200">
          <tr>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              Total ({calculatedTotals.keywordCount} items)
            </td>
            <td className="px-6 py-3"></td>
            <td className="px-6 py-3"></td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatNumber(calculatedTotals.impressions)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatNumber(calculatedTotals.clicks)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatPercentage(calculatedTotals.ctr)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatCurrency(calculatedTotals.avgCpc)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatCurrency(calculatedTotals.cost)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatNumber(calculatedTotals.conversions)}
            </td>
            <td className="px-6 py-3 text-sm font-medium text-gray-900">
              {formatPercentage(calculatedTotals.roas)}
            </td>
            {dataTypeFilter !== 'search_terms' && (
              <td className="px-6 py-3"></td>
            )}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default Keywords;