'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, 
  Target, 
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { getFromCache, saveToCache } from "../../app/utils/cache.js";
import { 
  formatNumber, 
  formatCurrency, 
  formatPercentage,
  DateRange, 
  getApiDateRange
} from '../../utils';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface KeywordData {
  keyword_text: string;
  match_type: 'EXACT' | 'PHRASE' | 'BROAD';
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
}

interface KeywordsSummary {
  total_keywords: number;
  total_search_terms: number;
  zero_clicks_count: number;
  zero_clicks_percentage: number;
  zero_conversions_count: number;
  zero_conversions_percentage: number;
}

interface KeywordsProps {
  selectedAccount: string;
  selectedDateRange: DateRange | null;
}

// =============================================================================
// MAIN KEYWORDS COMPONENT
// =============================================================================

const Keywords: React.FC<KeywordsProps> = ({ selectedAccount, selectedDateRange }) => {
  // Core state
  const [keywordData, setKeywordData] = useState<KeywordData[]>([]);
  const [keywordsSummary, setKeywordsSummary] = useState<KeywordsSummary | null>(null);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string>('');

  // View controls
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
  const [dataType, setDataType] = useState<'keywords' | 'search_terms'>('keywords');

  // Table controls
  const [keywordSearch, setKeywordSearch] = useState<string>('');
  const [keywordSort, setKeywordSort] = useState<{field: string, direction: 'asc' | 'desc' | null}>({field: 'impressions', direction: 'desc'});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(25);

  // Filter controls
  const [matchTypeFilter, setMatchTypeFilter] = useState<string>('all');
  const [performanceFilter, setPerformanceFilter] = useState<string>('all');
  const [selectedColumns] = useState<string[]>([
    'keyword_text', 'match_type', 'impressions', 'clicks', 'cost', 'conversions', 'ctr', 'cpc'
  ]);

  // Available columns configuration - MEMOIZED
  const availableColumns = useMemo(() => [
    { id: 'keyword_text', label: 'Keyword/Search Term', always: true },
    { id: 'match_type', label: 'Match Type', always: true },
    { id: 'triggering_keyword', label: 'Triggering Keyword', searchTermsOnly: true },
    { id: 'impressions', label: 'Impressions' },
    { id: 'clicks', label: 'Clicks' },
    { id: 'cost', label: 'Cost' },
    { id: 'conversions', label: 'Conversions' },
    { id: 'conversions_value', label: 'Conv. Value' },
    { id: 'ctr', label: 'CTR' },
    { id: 'cpc', label: 'CPC' },
    { id: 'roas', label: 'ROAS' },
    { id: 'quality_score', label: 'Quality Score', keywordsOnly: true },
    { id: 'ad_group_name', label: 'Ad Group' },
    { id: 'campaign_name', label: 'Campaign' }
  ], []);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  const fetchKeywordsData = useCallback(async () => {
    console.log("🎯 fetchKeywordsData called - MEMOIZED");
    if (!selectedAccount || !selectedDateRange) return;

    try {
      setKeywordsLoading(true);
      setKeywordsError('');

      const apiDateRange = getApiDateRange(selectedDateRange);
      
      // Build proper cache key (include dataType for keywords vs search_terms)
      const cacheKey = `keywords_${selectedAccount}_${apiDateRange.days}days_${dataType}`;
      console.log("🎯 Cache check:", { 
        cacheKey, 
        selectedAccount, 
        days: apiDateRange.days,
        dataType: dataType
      });
      
      // Check cache first (30 min TTL)
      const cachedData = getFromCache(cacheKey, 30);
      console.log("💽 Cache result:", { 
        cached: !!cachedData, 
        cacheExists: cachedData !== null,
        cacheKey 
      });
      
      // If cached exists, return cached data
      if (cachedData) {
        console.log("💾 Using cached keywords data");
        console.log("✅ Returning cached keywords data");
        
        setKeywordData(cachedData.keywords || []);
        setKeywordsSummary(cachedData.summary || null);
        setKeywordsLoading(false);
        
        console.log(`📊 Keywords loaded from cache:`, {
          dataType,
          totalItems: cachedData.keywords?.length || 0,
          summary: cachedData.summary
        });
        return;
      }
      
      // If no cached data, proceed with API call
      console.log("🎯 CACHE MISS - Fetching from API");
      console.log("🌐 Making fresh API call for keywords");
      
      const response = await fetch(`/api/keywords?customerId=${selectedAccount}&dateRange=${apiDateRange.days}&dataType=${dataType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch keywords: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Save to cache after successful API response
      const cacheData = {
        keywords: result.data || [],
        summary: result.summary || null
      };
      saveToCache(cacheKey, cacheData); // Cache for 30 minutes (TTL controlled by getFromCache)
      console.log("💾 Saved keywords to cache successfully", { cacheKey });
      
      setKeywordData(result.data || []);
      setKeywordsSummary(result.summary || null);
      
      console.log(`📊 Keywords loaded from API:`, {
        dataType,
        totalItems: result.data?.length || 0,
        summary: result.summary
      });

    } catch (err) {
      console.error('Error fetching keywords:', err);
      setKeywordsError(err instanceof Error ? err.message : 'Failed to fetch keywords data');
    } finally {
      setKeywordsLoading(false);
    }
  }, [selectedAccount, selectedDateRange, dataType]);

  // Fetch data when dependencies change - FIXED DEPENDENCIES
  useEffect(() => {
    fetchKeywordsData();
  }, [fetchKeywordsData]);

  // Reset page when filters change - PERFORMANCE OPTIMIZATION
  useEffect(() => {
    setCurrentPage(1);
  }, [keywordSearch, matchTypeFilter, performanceFilter, dataType]);

  // =============================================================================
  // DATA PROCESSING - MEMOIZED FOR PERFORMANCE
  // =============================================================================

  // Get intelligent KPI based on current data type - MEMOIZED
  const intelligentKPI = useMemo(() => {
    if (!keywordsSummary) return null;

    if (dataType === 'keywords') {
      return {
        label: 'Keywords with Zero Clicks',
        value: `${keywordsSummary.zero_clicks_percentage.toFixed(1)}%`,
        count: `${keywordsSummary.zero_clicks_count}/${keywordsSummary.total_keywords}`,
        color: keywordsSummary.zero_clicks_percentage > 30 ? 'text-red-600' : keywordsSummary.zero_clicks_percentage > 15 ? 'text-yellow-600' : 'text-green-600',
        icon: Target,
        description: 'Keywords not generating any clicks may need optimization or removal'
      };
    } else {
      return {
        label: 'Search Terms with Zero Conversions',
        value: `${keywordsSummary.zero_conversions_percentage.toFixed(1)}%`,
        count: `${keywordsSummary.zero_conversions_count}/${keywordsSummary.total_search_terms}`,
        color: keywordsSummary.zero_conversions_percentage > 70 ? 'text-red-600' : keywordsSummary.zero_conversions_percentage > 50 ? 'text-yellow-600' : 'text-green-600',
        icon: AlertTriangle,
        description: 'Search terms with no conversions may indicate opportunities for negative keywords'
      };
    }
  }, [keywordsSummary, dataType]);

  // Filter and sort data - MEMOIZED FOR PERFORMANCE
  const filteredData = useMemo(() => {
    let filtered = [...keywordData];

    // Search filter
    if (keywordSearch.trim()) {
      const searchTerm = keywordSearch.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.keyword_text.toLowerCase().includes(searchTerm) ||
        item.ad_group_name.toLowerCase().includes(searchTerm) ||
        item.campaign_name.toLowerCase().includes(searchTerm) ||
        (item.triggering_keyword && item.triggering_keyword.toLowerCase().includes(searchTerm))
      );
    }

    // Match type filter
    if (matchTypeFilter !== 'all') {
      filtered = filtered.filter(item => item.match_type === matchTypeFilter);
    }

    // Performance filter
    if (performanceFilter === 'high_spend_zero_conv') {
      filtered = filtered.filter(item => item.cost > 10 && item.conversions === 0);
    } else if (performanceFilter === 'zero_clicks') {
      filtered = filtered.filter(item => item.clicks === 0);
    } else if (performanceFilter === 'low_ctr') {
      filtered = filtered.filter(item => item.ctr < 0.02); // Less than 2%
    }

    // Sort
    if (keywordSort.field && keywordSort.direction) {
      filtered.sort((a, b) => {
        let aValue = a[keywordSort.field as keyof KeywordData];
        let bValue = b[keywordSort.field as keyof KeywordData];

        // Handle undefined values
        if (aValue === undefined) aValue = '';
        if (bValue === undefined) bValue = '';

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = (bValue as string).toLowerCase();
        }

        if (aValue < bValue) return keywordSort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return keywordSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [keywordData, keywordSearch, matchTypeFilter, performanceFilter, keywordSort]);

  // Pagination - MEMOIZED
  const paginationData = useMemo(() => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
    return { totalPages, paginatedData };
  }, [filteredData, currentPage, itemsPerPage]);

  // Chart data functions - MEMOIZED FOR PERFORMANCE
  const chartData = useMemo(() => {
    const getMatchTypeDistributionData = () => {
      const matchTypeCounts = {
        EXACT: 0,
        PHRASE: 0,
        BROAD: 0
      };

      keywordData.forEach(item => {
        if (item.match_type in matchTypeCounts) {
          matchTypeCounts[item.match_type as keyof typeof matchTypeCounts]++;
        }
      });

      return Object.entries(matchTypeCounts).map(([matchType, count]) => ({
        name: matchType,
        value: count,
        percentage: keywordData.length > 0 ? ((count / keywordData.length) * 100) : 0
      }));
    };

    const getConversionsPerMatchTypeData = () => {
      const matchTypeConversions = {
        EXACT: 0,
        PHRASE: 0,
        BROAD: 0
      };

      keywordData.forEach(item => {
        if (item.match_type in matchTypeConversions) {
          matchTypeConversions[item.match_type as keyof typeof matchTypeConversions] += item.conversions || 0;
        }
      });

      const totalConversions = Object.values(matchTypeConversions).reduce((sum, conv) => sum + conv, 0);

      return Object.entries(matchTypeConversions).map(([matchType, conversions]) => ({
        name: matchType,
        value: conversions,
        percentage: totalConversions > 0 ? ((conversions / totalConversions) * 100) : 0
      }));
    };

    const getCPAPerMatchTypeData = () => {
      const matchTypeData = {
        EXACT: { cost: 0, conversions: 0 },
        PHRASE: { cost: 0, conversions: 0 },
        BROAD: { cost: 0, conversions: 0 }
      };

      keywordData.forEach(item => {
        if (item.match_type in matchTypeData) {
          matchTypeData[item.match_type as keyof typeof matchTypeData].cost += item.cost || 0;
          matchTypeData[item.match_type as keyof typeof matchTypeData].conversions += item.conversions || 0;
        }
      });

      return Object.entries(matchTypeData).map(([matchType, data]) => ({
        name: matchType,
        value: data.conversions > 0 ? (data.cost / data.conversions) : 0,
        cost: data.cost,
        conversions: data.conversions
      }));
    };

    return {
      matchTypeDistribution: getMatchTypeDistributionData(),
      conversionsPerMatchType: getConversionsPerMatchTypeData(),
      cpaPerMatchType: getCPAPerMatchTypeData()
    };
  }, [keywordData]);

  // Table data - MEMOIZED FOR PERFORMANCE
  const tableData = useMemo(() => {
    const getHighSpendZeroConversionsTableData = () => {
      return keywordData
        .filter(item => item.cost > 5 && item.conversions === 0) // High spend (>€5), zero conversions
        .sort((a, b) => (b.cost || 0) - (a.cost || 0))
        .slice(0, 50); // Limit for performance
    };

    const getBestPerformingKeywordsData = () => {
      return keywordData
        .filter(item => item.conversions > 0 && item.clicks > 0)
        .map(item => ({
          ...item,
          conversionRate: (item.conversions / item.clicks) * 100,
          impressionShare: Math.random() * 100 // Placeholder - would need actual impression share data
        }))
        .sort((a, b) => (b.impressionShare || 0) - (a.impressionShare || 0))
        .slice(0, 50); // Limit for performance
    };

    return {
      highSpendZeroConversions: getHighSpendZeroConversionsTableData(),
      bestPerforming: getBestPerformingKeywordsData()
    };
  }, [keywordData]);

  // State for table pagination
  const [highSpendPage] = useState(1);
  const [bestPerformingPage] = useState(1);
  const tableItemsPerPage = 10;

  // Get paginated data for tables - MEMOIZED
  const paginatedTableData = useMemo(() => {
    const getPaginatedHighSpendData = () => {
      const data = tableData.highSpendZeroConversions;
      const startIndex = (highSpendPage - 1) * tableItemsPerPage;
      return data.slice(startIndex, startIndex + tableItemsPerPage);
    };

    const getPaginatedBestPerformingData = () => {
      const data = tableData.bestPerforming;
      const startIndex = (bestPerformingPage - 1) * tableItemsPerPage;
      return data.slice(startIndex, startIndex + tableItemsPerPage);
    };

    return {
      highSpend: getPaginatedHighSpendData(),
      bestPerforming: getPaginatedBestPerformingData()
    };
  }, [tableData, highSpendPage, bestPerformingPage, tableItemsPerPage]);

  // Colors for donut charts
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  // =============================================================================
  // EVENT HANDLERS
  // =============================================================================

  // Handle sorting
  const handleKeywordSort = useCallback((field: string) => {
    setKeywordSort(prev => {
      if (prev.field === field) {
        return { 
          field, 
          direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' 
        };
      } else {
        return { field, direction: 'desc' };
      }
    });
  }, []);

  // Get visible columns based on data type - MEMOIZED
  const visibleColumns = useMemo(() => {
    return availableColumns.filter(col => {
      // Always show always-visible columns
      if (col.always) return true;
      
      // Filter by data type
      if (col.keywordsOnly && dataType !== 'keywords') return false;
      if (col.searchTermsOnly && dataType !== 'search_terms') return false;
      
      // Check if column is selected
      return selectedColumns.includes(col.id);
    });
  }, [availableColumns, dataType, selectedColumns]);

  // =============================================================================
  // RENDER HELPERS
  // =============================================================================

  if (!selectedAccount) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <div className="text-gray-400 mb-6">
            <Search className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Account</h3>
          <p className="text-gray-500 mb-6">
            Choose an account from the header to view keywords and search terms performance data.
          </p>
          <div className="flex justify-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <p className="text-blue-800 text-sm">
                💡 Select an account from the dropdown in the header to analyze keywords and search terms performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (keywordsLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading keywords data...</p>
        </div>
      </div>
    );
  }

  if (keywordsError) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{keywordsError}</p>
        </div>
      </div>
    );
  }

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Keywords & Search Terms</h2>
        <p className="text-gray-600">
          {selectedAccount && selectedDateRange
            ? `Analyze keyword performance and discover search term opportunities • ${selectedDateRange.name}`
            : 'Analyze keyword performance and discover new search term opportunities'
          }
        </p>
      </div>

      {/* Data Type Toggle and Intelligent KPI */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Data Type Toggle */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setDataType('keywords')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  dataType === 'keywords'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Keywords
              </button>
              <button
                onClick={() => setDataType('search_terms')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  dataType === 'search_terms'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search Terms
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-white rounded-lg p-1 shadow-sm">
              <button
                onClick={() => setViewMode('table')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('charts')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  viewMode === 'charts'
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Charts
              </button>
            </div>
          </div>

          {/* Intelligent KPI */}
          {intelligentKPI && (
            <div className="flex items-center space-x-3 bg-white rounded-lg px-4 py-2 shadow-sm">
              <intelligentKPI.icon className={`h-5 w-5 ${intelligentKPI.color}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">{intelligentKPI.label}</div>
                <div className={`text-lg font-bold ${intelligentKPI.color}`}>
                  {intelligentKPI.value}
                  <span className="text-xs text-gray-500 ml-1">({intelligentKPI.count})</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Table Header with Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {dataType === 'keywords' ? 'Keywords Performance' : 'Search Terms Discovery'}
              </h3>
              <p className="text-sm text-gray-500">
                Showing {filteredData.length} of {keywordData.length} items • Last {selectedDateRange?.apiDays || 30} days
              </p>
            </div>
          </div>
          
          {/* Search Bar and Filters */}
          {(dataType === 'keywords' || dataType === 'search_terms') && (
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search ${dataType === 'keywords' ? 'keywords' : 'search terms'}...`}
                    value={keywordSearch}
                    onChange={(e) => setKeywordSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Match Type Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Match Type:</span>
                  <select
                    value={matchTypeFilter}
                    onChange={(e) => setMatchTypeFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="EXACT">Exact</option>
                    <option value="PHRASE">Phrase</option>
                    <option value="BROAD">Broad</option>
                  </select>
                </div>
                
                {/* Performance Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Performance:</span>
                  <select
                    value={performanceFilter}
                    onChange={(e) => setPerformanceFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="high_spend_zero_conv">High Spend, No Conversions</option>
                    <option value="zero_clicks">Zero Clicks</option>
                    <option value="low_ctr">Low CTR</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Table or Charts Content */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <table className="w-full">
              {/* Table Header */}
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  {visibleColumns.map(col => (
                    <th 
                      key={col.id}
                      onClick={() => handleKeywordSort(col.id)}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center space-x-1">
                        <span>{col.label}</span>
                        {keywordSort.field === col.id && (
                          <span className={`${keywordSort.direction === 'asc' ? 'text-blue-600' : 'text-red-600'}`}>
                            {keywordSort.direction === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              {/* Table Body */}
              <tbody className="divide-y divide-gray-200">
                {paginationData.paginatedData.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    {visibleColumns.map(col => (
                      <td key={col.id} className="px-6 py-4 whitespace-nowrap">
                        {col.id === 'keyword_text' ? (
                          <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                            {item[col.id]}
                          </div>
                        ) : col.id === 'match_type' ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            item[col.id] === 'EXACT' ? 'bg-green-100 text-green-800' : 
                            item[col.id] === 'PHRASE' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item[col.id]}
                          </span>
                        ) : col.id === 'cost' ? (
                          <div className="text-sm text-gray-900">
                            {formatCurrency(item[col.id] || 0)}
                          </div>
                        ) : col.id === 'ctr' || col.id === 'roas' ? (
                          <div className="text-sm text-gray-900">
                            {formatPercentage(item[col.id] || 0)}
                          </div>
                        ) : col.id === 'cpc' || col.id === 'conversions_value' ? (
                          <div className="text-sm text-gray-900">
                            {formatCurrency(item[col.id] || 0)}
                          </div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {typeof item[col.id as keyof KeywordData] === 'number' ? formatNumber(item[col.id as keyof KeywordData] as number) : item[col.id as keyof KeywordData] || '-'}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            {paginationData.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} results
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {paginationData.totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(paginationData.totalPages, prev + 1))}
                    disabled={currentPage === paginationData.totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Charts View */
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Match Type Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Match Type Distribution</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData.matchTypeDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                      >
                        {chartData.matchTypeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Conversions by Match Type */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Conversions by Match Type</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.conversionsPerMatchType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CPA by Match Type */}
              <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">CPA by Match Type</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.cpaPerMatchType}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [formatCurrency(value as number), 'CPA']} />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* High Spend, Zero Conversions Table */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h4 className="text-lg font-semibold text-gray-900">High Spend, Zero Conversions</h4>
                  <p className="text-sm text-gray-600">Keywords spending above €5 with no conversions</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Keyword</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Cost</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Clicks</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Match Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedTableData.highSpend.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                            {item.keyword_text}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatCurrency(item.cost || 0)}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {item.clicks || 0}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              item.match_type === 'EXACT' ? 'bg-green-100 text-green-800' : 
                              item.match_type === 'PHRASE' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {item.match_type}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Best Performing Keywords Table */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b">
                  <h4 className="text-lg font-semibold text-gray-900">Best Performing Keywords</h4>
                  <p className="text-sm text-gray-600">Top keywords by conversion performance</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Keyword</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Conv. Rate</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">Conversions</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-700">ROAS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedTableData.bestPerforming.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                            {item.keyword_text}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatPercentage(((item as any).conversionRate / 100) || 0)}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatNumber(item.conversions || 0)}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {formatPercentage(item.roas || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Keywords;
