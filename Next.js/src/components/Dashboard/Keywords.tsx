'use client';

import React, { useMemo } from 'react';
import { Target } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useKeywordData, KeywordItem } from '../../hooks/useKeywordData';
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage
} from '../../utils';
import { DateRange } from '../../types/common';
import TopKeywordsPerformance from './TopKeywordsPerformance';
import GenericPerformanceMatrix from './GenericPerformanceMatrix';
import { keywordMatrixConfig } from '../../utils/matrixConfigs';
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

// Keyword Type Distribution Chart Component
const KeywordTypeDistribution: React.FC<{ data: KeywordData[] }> = ({ data }) => {
  // Calculate keyword type distribution from real data
  const keywordTypeDistribution = useMemo(() => {
    if (!data || data.length === 0) {
      return [
        { 
          name: 'Keywords', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#3b82f6' 
        },
        { 
          name: 'Search Terms', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#10b981' 
        }
      ];
    }

    const keywords = data.filter(k => k.type === 'keyword');
    const searchTerms = data.filter(k => k.type === 'search_term');

    const keywordConversions = keywords.reduce((sum, k) => sum + k.conversions, 0);
    const searchTermConversions = searchTerms.reduce((sum, k) => sum + k.conversions, 0);
    
    const keywordCPA = keywords.length > 0 
      ? keywords.reduce((sum, k) => sum + (k.conversions > 0 ? k.cost / k.conversions : 0), 0) / keywords.length 
      : 0;
    const searchTermCPA = searchTerms.length > 0 
      ? searchTerms.reduce((sum, k) => sum + (k.conversions > 0 ? k.cost / k.conversions : 0), 0) / searchTerms.length 
      : 0;

    return [
      { 
        name: 'Keywords', 
        value: keywords.length,
        conversions: keywordConversions,
        avgCPA: keywordCPA,
        color: '#3b82f6' 
      },
      { 
        name: 'Search Terms', 
        value: searchTerms.length,
        conversions: searchTermConversions,
        avgCPA: searchTermCPA,
        color: '#10b981' 
      }
    ].filter(item => item.value > 0); // Only show types that exist
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              Count: <span className="font-medium text-gray-900">{data.value}</span>
            </p>
            <p className="text-gray-600">
              Conversions: <span className="font-medium text-gray-900">{formatNumber(data.conversions)}</span>
            </p>
            <p className="text-gray-600">
              Avg CPA: <span className="font-medium text-gray-900">{formatCurrency(data.avgCPA)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (keywordTypeDistribution.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <Target className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No keywords found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Keyword Type Distribution</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live Data</span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={keywordTypeDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {keywordTypeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with Metrics */}
      <div className="mt-4 space-y-2">
        {keywordTypeDistribution.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-700 font-medium">{item.name}</span>
              <span className="text-gray-500">({item.value} items)</span>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="font-medium text-gray-900">{item.conversions.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">conv.</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">€{item.avgCPA.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">CPA</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {keywordTypeDistribution.reduce((sum, item) => sum + item.conversions, 0).toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Total Conversions</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              €{keywordTypeDistribution.length > 0 ? (keywordTypeDistribution.reduce((sum, item) => sum + item.avgCPA, 0) / keywordTypeDistribution.length).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-gray-600">Average CPA</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {keywordTypeDistribution.length}
            </div>
            <div className="text-xs text-gray-600">Keyword Types</div>
          </div>
        </div>
      </div>
    </div>
  );
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

  // Show charts view
  if (viewMode === 'graphs') {
    // Create filtered data object that respects the dataTypeFilter
    const filteredGraphData = keywordData ? keywordData.filter((keyword: KeywordItem) => {
      // Apply the same data type filtering logic as the table
      if (dataTypeFilter === 'keywords') {
        return keyword.type === 'keyword';
      } else if (dataTypeFilter === 'search_terms') {
        return keyword.type === 'search_term';
      }
      return true; // 'all' shows everything
    }) : [];

    return (
      /* Premium Charts View */
      <div className="space-y-8">
        {/* Sophisticated Header */}
        <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Keyword Performance Analytics</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Comprehensive insights into your keyword and search term performance metrics
                {dataTypeFilter !== 'all' && (
                  <span className="text-blue-600 font-medium ml-2">
                    • Filtered: {dataTypeFilter === 'keywords' ? 'Keywords Only' : 'Search Terms Only'}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {dataTypeFilter === 'all' ? 'Total Items' : 
                   dataTypeFilter === 'keywords' ? 'Keywords' : 'Search Terms'}
                </span>
                <div className="text-lg font-bold text-gray-900">
                  {filteredGraphData?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col h-full">
            <TopKeywordsPerformance keywordData={{ data: filteredGraphData }} />
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col justify-between h-full">
            <KeywordTypeDistribution data={filteredGraphData} />
            <GenericPerformanceMatrix 
              data={{ data: filteredGraphData }} 
              config={keywordMatrixConfig} 
            />
          </div>
        </div>
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