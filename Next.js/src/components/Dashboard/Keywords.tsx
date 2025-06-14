'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Target, 
  MoreHorizontal,
  Package,
  Zap
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { getFromCache, saveToCache } from "../../app/utils/cache.js";
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage,
  DateRange, 
  getApiDateRange
} from '../../utils';
import TopKeywordsPerformance from './TopKeywordsPerformance';
import KeywordPerformanceMatrix from './KeywordPerformanceMatrix';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface KeywordData {
  id: string;
  keyword_text: string;
  match_type: 'EXACT' | 'PHRASE' | 'BROAD' | 'SEARCH_TERM';
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
  ad_group_name: string;
  campaign_name: string;
  triggering_keyword?: string;
  status: string;
}

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

// Performance indicator types
type PerformanceLevel = 'high' | 'medium' | 'low';

// Helper function to calculate performance percentiles
const getPerformanceLevel = (
  value: number, 
  allValues: number[], 
  metricType: string
): PerformanceLevel => {
  if (allValues.length < 3) return 'medium';
  
  // Filter out zero values for better percentile calculation
  const nonZeroValues = allValues.filter(v => v > 0);
  if (nonZeroValues.length === 0) return 'medium';
  
  // Sort values based on whether higher or lower is better
  const isHigherBetter = ['clicks', 'impressions', 'ctr', 'conversions', 'conversions_value', 'roas', 'quality_score'].includes(metricType);
  const sortedValues = [...nonZeroValues].sort((a, b) => isHigherBetter ? b - a : a - b);
  
  // If the current value is 0 and we're looking at a "higher is better" metric, it's low performance
  if (value === 0 && isHigherBetter) return 'low';
  
  // Calculate percentile thresholds
  const topThreshold = sortedValues[Math.floor(sortedValues.length * 0.33)];
  const bottomThreshold = sortedValues[Math.floor(sortedValues.length * 0.67)];
  
  if (isHigherBetter) {
    if (value >= topThreshold) return 'high';
    if (value >= bottomThreshold) return 'medium';
    return 'low';
  } else {
    // For metrics where lower is better (cost, cpc, cpa)
    if (value <= topThreshold) return 'high';
    if (value <= bottomThreshold) return 'medium';
    return 'low';
  }
};

// Helper function to get performance indicator color and glow
const getPerformanceStyles = (level: PerformanceLevel): string => {
  const baseStyles = 'inline-block w-1.5 h-1.5 rounded-full mr-2 shadow-sm ring-1 ring-white/20';
  
  switch (level) {
    case 'high': return `${baseStyles} bg-emerald-400 shadow-emerald-200/50`;
    case 'medium': return `${baseStyles} bg-amber-400 shadow-amber-200/50`;
    case 'low': return `${baseStyles} bg-rose-400 shadow-rose-200/50`;
    default: return `${baseStyles} bg-gray-400 shadow-gray-200/50`;
  }
};

// Performance indicator component
const PerformanceIndicator: React.FC<{ level: PerformanceLevel }> = ({ level }) => (
  <div 
    className={getPerformanceStyles(level)}
    title={`Performance: ${level}`}
  />
);

// Campaign type detection based on naming conventions
const detectCampaignType = (campaignName: string): 'search' | 'shopping' | 'performance_max' | 'other' => {
  const nameLower = campaignName.toLowerCase();
  if (nameLower.includes('performance max') || nameLower.includes('pmax')) {
    return 'performance_max';
  }
  if (nameLower.includes('shopping')) {
    return 'shopping';
  }
  if (nameLower.includes('search')) {
    return 'search';
  }
  return 'other';
};

// Get campaign type indicator
const getCampaignTypeIndicator = (campaignType: 'search' | 'shopping' | 'performance_max' | 'other') => {
  const indicators = {
    'search': { icon: Search, color: 'text-blue-600', bg: 'bg-blue-100' },
    'shopping': { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
    'performance_max': { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100' },
    'other': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-100' }
  };
  return indicators[campaignType];
};

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

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-80">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Keyword Distribution</h3>
          <p className="text-sm text-gray-600 mt-1">Keywords vs Search Terms breakdown</p>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={keywordTypeDistribution}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
            >
              {keywordTypeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
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
  // Core state
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchKeywordsData = useCallback(async () => {
    if (!selectedAccount || !selectedDateRange) return;

    try {
      setKeywordsLoading(true);

      const apiDateRange = getApiDateRange(selectedDateRange);
      
      // Build proper cache key
      const cacheKey = `keywords_${selectedAccount}_${apiDateRange.days}days_both`;
      
      console.log(`🔍 Keywords: Checking cache for key: ${cacheKey}`);
      
      // Check cache first (30 min TTL)
      const cachedData = getFromCache(cacheKey, 30);
      
      if (cachedData) {
        console.log(`✅ Keywords: Using cached data (${cachedData.keywords?.length || 0} items)`);
        setKeywordData(cachedData.keywords || []);
        setKeywordsLoading(false);
        return;
      }
      
      console.log(`🌐 Keywords: No cache found, fetching from API...`);
      
      // Fetch both keywords and search terms
      const response = await fetch(`/api/keywords?customerId=${selectedAccount}&dateRange=${apiDateRange.days}&dataType=both`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch keywords: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Save to cache after successful API response
      const cacheData = {
        keywords: result.data || [],
        summary: result.summary || null
      };
      console.log(`💾 Keywords: Saving to cache (${result.data?.length || 0} items)`);
      saveToCache(cacheKey, cacheData);
      
      setKeywordData(result.data || []);

    } catch (err) {
      console.error('Error fetching keywords:', err);
    } finally {
      setKeywordsLoading(false);
    }
  }, [selectedAccount, selectedDateRange]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchKeywordsData();
  }, [fetchKeywordsData]);

  // =============================================================================
  // DATA PROCESSING - MEMOIZED FOR PERFORMANCE
  // =============================================================================

  // Filter and sort keywords - matching Ad Groups structure
  const filteredKeywords = useMemo(() => {
    if (!keywordData) return [];
    
    return keywordData
      .filter(keyword => {
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
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="bg-white rounded-lg px-3 py-2 shadow-sm border border-gray-200">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Keywords</span>
                <div className="text-lg font-bold text-gray-900">
                  {keywordData?.length || 0}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="flex flex-col h-full">
            <TopKeywordsPerformance keywordData={{ data: keywordData }} />
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col justify-between h-full">
            <KeywordTypeDistribution data={keywordData} />
            <KeywordPerformanceMatrix keywordData={{ data: keywordData }} />
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
            const campaignIndicator = getCampaignTypeIndicator(campaignType);
            const CampaignIcon = campaignIndicator.icon;
            
            return (
              <tr key={`${keyword.id || 'no-id'}-${keyword.keyword_text}-${keyword.type}-${index}`} className="hover:bg-gray-50 transition-colors duration-150">
                {/* Keyword Name */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`p-2 rounded-lg ${campaignIndicator.bg}`}>
                        <CampaignIcon className={`h-4 w-4 ${campaignIndicator.color}`} />
                      </div>
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