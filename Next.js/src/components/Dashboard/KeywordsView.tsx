'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp,
  BarChart3, 
  Search as SearchIcon,
  Target,
  Eye,
  DollarSign,
  Percent,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Download,
  Columns,
  Zap,
  AlertTriangle,
  CheckCircle,
  Filter,
  Monitor,
  Smartphone,
  Tablet,
  Layers,
  Check
} from 'lucide-react';
import { useKeywordsViewData } from '@/hooks/useKeywordData';
import { KeywordData } from '@/types/keywords';
import { DateRange } from '@/types';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils';
import { PerformanceIndicator, getPerformanceLevel } from './shared';

interface Campaign {
  id: string;
  name: string;
}

interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
}

interface FilterState {
  selectedCampaigns: string[];
  selectedAdGroups: string[];
  deviceFilter: string;
  campaignDropdownOpen: boolean;
  adGroupDropdownOpen: boolean;
  deviceDropdownOpen: boolean;
}

interface FilterActions {
  onToggleCampaign: (id: string) => void;
  onClearCampaigns: () => void;
  onSetCampaignDropdownOpen: (open: boolean) => void;
  onToggleAdGroup: (id: string) => void;
  onClearAdGroups: () => void;
  onSetAdGroupDropdownOpen: (open: boolean) => void;
  onDeviceFilterChange: (device: string) => void;
  onSetDeviceDropdownOpen: (open: boolean) => void;
}

interface KeywordsViewProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
  campaigns?: Campaign[];
  adGroups?: AdGroup[];
  filterState?: FilterState;
  filterActions?: FilterActions;
}

// Chart colors matching Dashboard
// Chart colors - blue-based palette (matching ProductsView)
const CHART_COLORS = {
  primary: '#3b82f6',    // blue-500 (cleaner, more professional)
  secondary: '#10b981',  // emerald-500
  tertiary: '#8b5cf6',   // purple-500
  quaternary: '#f59e0b', // amber-500
  danger: '#ef4444',     // red-500
  blue: '#3b82f6',       // blue-500
};

// Pie/Distribution colors - blue-first palette
const PIE_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#84cc16', '#0d9488'];

// Quick filter options - simplified labels
const QUICK_FILTERS = [
  { id: 'all', label: 'All', icon: SearchIcon },
  { id: 'high', label: 'High', icon: Zap },        // High opportunity: low share + high conversion rate
  { id: 'low', label: 'Low', icon: AlertTriangle }, // Low performers: high cost, low conversions
  { id: 'top', label: 'Top', icon: TrendingUp }     // Top performers: high conversions + good ROAS
] as const;

// Chart type options
const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'dual', label: 'Volume vs Impressions', icon: Target },
  { id: 'pie', label: 'Distribution', icon: Eye }
] as const;

// Page size options
const PAGE_SIZES = [10, 25, 50, 100];

// All available columns - logical order: performance first, then market share
const ALL_COLUMNS = [
  { id: 'clicks', label: 'Clicks', default: true, showForSearchTerms: true },
  { id: 'impressions', label: 'Impr.', default: true, showForSearchTerms: true },
  { id: 'ctr', label: 'CTR', default: false, showForSearchTerms: true },
  { id: 'cost', label: 'Cost', default: true, showForSearchTerms: true },
  { id: 'conversions', label: 'Conv.', default: true, showForSearchTerms: true },
  { id: 'conversionRate', label: 'Conv %', default: true, showForSearchTerms: true },
  { id: 'conversionsValue', label: 'Value', default: false, showForSearchTerms: true },
  { id: 'roas', label: 'ROAS', default: true, showForSearchTerms: true },
  { id: 'share', label: 'Share', default: true, showForSearchTerms: false },           // Keywords only
  { id: 'estVolume', label: 'Est. Vol.', default: true, showForSearchTerms: false },   // Keywords only
  { id: 'missed', label: 'Missed', default: true, showForSearchTerms: false },         // Keywords only
  { id: 'score', label: 'Score', default: true, showForSearchTerms: false }            // Keywords only
];

// Device options for filter
const deviceOptions = [
  { value: 'all', label: 'All Devices', icon: Monitor },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
];

// Helper to determine if change is positive (for cost, lower is better)
const isPositiveChange = (metricId: string, change: number): boolean => {
  const lowerIsBetter = ['cost', 'avgCpc', 'cpa'];
  if (lowerIsBetter.includes(metricId)) {
    return change <= 0;
  }
  return change >= 0;
};

// Get performance label based on percentage change
const getPerformanceLabel = (percentageChange: number, isPositive: boolean): string => {
  const absChange = Math.abs(percentageChange);
  if (absChange >= 20) return isPositive ? 'Excellent' : 'Needs Attention';
  if (absChange >= 10) return isPositive ? 'Good' : 'Declining';
  if (absChange >= 5) return 'Stable';
  return 'Minimal Change';
};

// Get performance styles based on percentage change
const getPerformanceStyles = (percentageChange: number, isPositive: boolean) => {
  const absChange = Math.abs(percentageChange);
  if (absChange >= 20) {
    return {
      color: isPositive ? '#047857' : '#dc2626',
      backgroundColor: isPositive ? '#f0fdf4' : '#fef2f2',
      borderColor: isPositive ? '#bbf7d0' : '#fecaca'
    };
  }
  if (absChange >= 10) {
    return {
      color: isPositive ? '#047857' : '#dc2626',
      backgroundColor: isPositive ? '#f0fdf4' : '#fef2f2',
      borderColor: isPositive ? '#bbf7d0' : '#fecaca'
    };
  }
  if (absChange >= 5) {
    return {
      color: '#d97706',
      backgroundColor: '#fffbeb',
      borderColor: '#fed7aa'
    };
  }
  return {
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb'
  };
};

// Dashboard-style KPI Card component - matching main Dashboard height (160px)
// KPI Card component - exactly matching ProductsView design
const KpiCard: React.FC<{
  id: string;
  label: string;
  value: string;
  trend?: number;
  icon: React.ElementType;
  color: string;
  isSelected?: boolean;
  onClick?: () => void;
}> = ({ id, label, value, trend, icon: Icon, color, isSelected, onClick }) => {
  const isPositive = trend !== undefined ? isPositiveChange(id, trend) : true;
  const performanceStyles = trend !== undefined ? getPerformanceStyles(trend, isPositive) : null;
  const performanceLabel = trend !== undefined ? getPerformanceLabel(trend, isPositive) : null;
  
  return (
    <div
      className="group relative cursor-pointer transition-all duration-200 hover:-translate-y-1 overflow-hidden"
      style={{
        height: '160px',
        background: 'white',
        boxShadow: isSelected 
          ? `0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px ${color}`
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: isSelected ? 'none' : '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '24px'
      }}
      onClick={onClick}
    >
      {/* Icon - matching main Dashboard */}
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ 
          backgroundColor: isSelected ? `${color}20` : '#f3f4f6',
          border: isSelected ? `1px solid ${color}` : '1px solid transparent'
        }}
      >
        <Icon className="h-4 w-4" style={{ color: isSelected ? color : '#6b7280' }} />
      </div>

      {/* Value - matching main Dashboard */}
      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</div>
        <div className="text-sm text-gray-600 font-medium truncate">{label}</div>
      </div>

      {/* Performance label and percentage - matching main Dashboard */}
      {trend !== undefined && performanceStyles && (
        <div className="flex items-center justify-between">
          <div 
            className="text-xs font-semibold px-2 py-1 rounded-md border"
            style={performanceStyles}
          >
            {performanceLabel}
          </div>
          
          <div className="flex items-center space-x-1">
            {trend >= 0 ? (
              <ArrowUp className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            ) : (
              <ArrowDown className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
            )}
            <span 
              className="text-xs font-medium px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isPositive ? '#dcfce7' : '#fef2f2',
                color: isPositive ? '#166534' : '#dc2626'
              }}
            >
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-3 right-3">
          <div 
            className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ backgroundColor: color }}
          />
        </div>
      )}
    </div>
  );
};

export default function KeywordsView({
  selectedAccount,
  selectedDateRange,
  campaigns = [],
  adGroups = [],
  filterState,
  filterActions
}: KeywordsViewProps) {
  // Local state
  const [sortColumn, setSortColumn] = useState('impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'high' | 'low' | 'top'>('all');
  const [chartMode, setChartMode] = useState<'bar' | 'dual' | 'pie'>('bar');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id))
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  
  // Drill-down state: when a keyword is selected, show its search terms
  const [selectedKeyword, setSelectedKeyword] = useState<any | null>(null);

  // Status filter state for dropdowns (default to 'active' to show only enabled items)
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused'>('active');
  const [adGroupStatusFilter, setAdGroupStatusFilter] = useState<'all' | 'active' | 'paused'>('active');

  // Refs for click outside handling
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const adGroupDropdownRef = useRef<HTMLDivElement>(null);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close campaign dropdown
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetCampaignDropdownOpen(false);
      }
      // Close ad group dropdown
      if (adGroupDropdownRef.current && !adGroupDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetAdGroupDropdownOpen(false);
      }
      // Close device dropdown
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetDeviceDropdownOpen(false);
      }
      // Close column picker
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setColumnPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterActions]);

  // Filter campaigns and ad groups by status
  const filteredCampaigns = useMemo(() => {
    if (campaignStatusFilter === 'all') return campaigns;
    return campaigns.filter((c: any) => {
      if (campaignStatusFilter === 'active') return c.status === 'ENABLED';
      if (campaignStatusFilter === 'paused') return c.status === 'PAUSED';
      return true;
    });
  }, [campaigns, campaignStatusFilter]);

  const filteredAdGroups = useMemo(() => {
    if (adGroupStatusFilter === 'all') return adGroups;
    return adGroups.filter((ag: any) => {
      if (adGroupStatusFilter === 'active') return ag.status === 'ENABLED';
      if (adGroupStatusFilter === 'paused') return ag.status === 'PAUSED';
      return true;
    });
  }, [adGroups, adGroupStatusFilter]);

  // Fetch keyword data
  const { keywords, totals, trends, marketShare, loading, error } = useKeywordsViewData({
    selectedAccount,
    selectedDateRange
  });

  // Use marketShare keywords (which have impression share data) and add calculated fields
  const keywordsWithShare = useMemo(() => {
    const keywords = marketShare?.keywords || [];
    return keywords.map(k => ({
      ...k,
      ctr: k.impressions > 0 ? (k.clicks / k.impressions) * 100 : 0,
      conversionRate: k.clicks > 0 ? (k.conversions / k.clicks) * 100 : 0,
      roas: k.cost > 0 ? k.conversionsValue / k.cost : 0
    }));
  }, [marketShare]);

  // Calculate average opportunity score for account potential
  const avgOpportunityScore = useMemo(() => {
    if (keywordsWithShare.length === 0) return 0;
    const totalScore = keywordsWithShare.reduce((sum, k) => sum + (k.opportunityScore || 0), 0);
    return Math.round(totalScore / keywordsWithShare.length);
  }, [keywordsWithShare]);

  // Filter search terms that were triggered by the selected keyword
  const relatedSearchTerms = useMemo(() => {
    if (!selectedKeyword || !keywords.length) return [];
    
    const keywordText = selectedKeyword.keyword.toLowerCase().trim();
    
    // Find search terms that were TRIGGERED by this keyword
    // The API now includes triggeringKeyword field which tells us which keyword activated each search term
    return keywords.filter(st => {
      const stAny = st as any;
      const triggeringKw = (stAny.triggeringKeyword || '').toLowerCase().trim();
      
      // Primary: Match by triggeringKeyword field (exact match)
      if (triggeringKw && triggeringKw === keywordText) {
        return true;
      }
      
      // Fallback: If no triggeringKeyword, use text matching
      // This handles Shopping/PMax campaigns that don't have explicit keywords
      if (!triggeringKw) {
        const searchTermText = st.keyword.toLowerCase();
        // Check if the keyword appears in the search term
        return keywordText.split(' ').filter(w => w.length > 2).every(word => 
          searchTermText.includes(word)
        );
      }
      
      return false;
    }).map(st => ({
      ...st,
      ctr: st.impressions > 0 ? (st.clicks / st.impressions) * 100 : 0,
      conversionRate: st.clicks > 0 ? (st.conversions / st.clicks) * 100 : 0,
      roas: st.cost > 0 ? st.conversionsValue / st.cost : 0
    }));
  }, [selectedKeyword, keywords]);

  // Aggregate metrics for performance indicators (Dashboard style)
  const aggregateMetrics = useMemo(() => {
    const data = selectedKeyword ? relatedSearchTerms : keywordsWithShare;
    return {
      allClicks: data.map(k => k.clicks),
      allImpressions: data.map(k => k.impressions),
      allCost: data.map(k => k.cost),
      allConversions: data.map(k => k.conversions),
      allConversionsValue: data.map(k => k.conversionsValue),
      allRoas: data.map(k => k.roas),
      allCtr: data.map(k => k.ctr),
    };
  }, [selectedKeyword, keywordsWithShare, relatedSearchTerms]);

  // Apply filters to keywords with market share data
  const filteredKeywords = useMemo(() => {
    let filtered = keywordsWithShare;
    
    // Apply quick filter
    switch (quickFilter) {
      case 'high':
        // High opportunity: LOW share + has conversions (intent proven, room to grow)
        filtered = filtered.filter(k => 
          k.searchImpressionShare < 0.5 && 
          k.conversions > 0
        );
        break;
      case 'low':
        // Low performers: spending money but no/low conversions
        filtered = filtered.filter(k => k.cost > 10 && k.conversions < 1);
        break;
      case 'top':
        // Top performers: good conversions + high share (dominating)
        filtered = filtered.filter(k => k.conversions >= 1 && k.searchImpressionShare >= 0.5);
        break;
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(k => 
        k.keyword.toLowerCase().includes(term) ||
        k.campaignName.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [keywordsWithShare, quickFilter, searchTerm]);

  // Sort keywords - map column names to actual properties
  const sortedKeywords = useMemo(() => {
    const columnMap: Record<string, string> = {
      'impressions': 'impressions',
      'share': 'searchImpressionShare',
      'estVolume': 'estimatedSearchVolume',
      'missed': 'missedImpressions',
      'clicks': 'clicks',
      'ctr': 'ctr',
      'cost': 'cost',
      'conversions': 'conversions',
      'conversionRate': 'conversionRate',
      'conversionsValue': 'conversionsValue',
      'roas': 'roas',
      'score': 'opportunityScore'
    };
    
    const actualColumn = columnMap[sortColumn] || sortColumn;
    
    return [...filteredKeywords].sort((a, b) => {
      const aVal = (a as any)[actualColumn] as number || 0;
      const bVal = (b as any)[actualColumn] as number || 0;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [filteredKeywords, sortColumn, sortDirection]);

  // Pagination - handles both keywords and search terms
  const currentData = selectedKeyword ? relatedSearchTerms : sortedKeywords;
  const totalPages = Math.ceil(currentData.length / pageSize);
  const paginatedKeywords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedKeywords.slice(start, start + pageSize);
  }, [sortedKeywords, currentPage, pageSize]);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  // Chart data - top search terms by impressions or conversions
  const chartData = useMemo(() => {
    const sorted = [...filteredKeywords].sort((a, b) => (b as any).impressions - (a as any).impressions);
    return sorted.slice(0, 10).map((k: any) => ({
      name: k.keyword.length > 18 ? k.keyword.slice(0, 18) + '...' : k.keyword,
      fullName: k.keyword,
      impressions: k.impressions,
      estVolume: k.estimatedSearchVolume,
      missed: k.missedImpressions,
      share: (k.searchImpressionShare * 100),
      clicks: k.clicks,
      conversions: k.conversions,
      cost: k.cost,
      roas: k.roas || 0,
      ctr: k.ctr || 0,
      score: k.opportunityScore
    }));
  }, [filteredKeywords]);

  // Pie data
  const pieData = useMemo(() => {
    return chartData.map((item, idx) => ({
      ...item,
      value: item.impressions,
      fill: PIE_COLORS[idx % PIE_COLORS.length]
    }));
  }, [chartData]);

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    resetPage();
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) newSet.delete(columnId);
      else newSet.add(columnId);
      return newSet;
    });
  };

  const handleExport = () => {
    const headers = ['Keyword', 'Match Type', ...ALL_COLUMNS.filter(c => visibleColumns.has(c.id)).map(c => c.label)];
    const rows = sortedKeywords.map(k => {
      const row: (string | number)[] = [k.keyword, k.matchType];
      ALL_COLUMNS.forEach(col => {
        if (visibleColumns.has(col.id)) {
          const val = k[col.id as keyof KeywordData];
          row.push(typeof val === 'number' ? val : String(val));
        }
      });
      return row;
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `keywords-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Format opportunity score color
  const getOpportunityColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600 bg-emerald-50';
    if (score >= 40) return 'text-amber-600 bg-amber-50';
    return 'text-gray-500 bg-gray-50';
  };

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center text-gray-500">
          <SearchIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Select an account to view keyword insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Keyword Insights</h1>
          <p className="text-gray-500 mt-1">Market share, search volume & opportunity analysis</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters - Campaign / Ad Group / Device - exact Dashboard pattern */}
      {filterState && filterActions && (
        <div className="flex items-center space-x-3">
          {/* Campaign Filter - exact Dashboard style */}
          <div className="relative" ref={campaignDropdownRef}>
            <button
              onClick={() => filterActions.onSetCampaignDropdownOpen(!filterState.campaignDropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.selectedCampaigns.length > 0
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Target className="h-4 w-4" />
              <span className="max-w-40 truncate">
                {filterState.selectedCampaigns.length > 0 
                  ? `${filterState.selectedCampaigns.length} Campaign${filterState.selectedCampaigns.length > 1 ? 's' : ''}`
                  : 'All Campaigns'}
              </span>
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
                        {(['all', 'active', 'paused'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={(e) => { e.stopPropagation(); setCampaignStatusFilter(status); }}
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
                          onClick={(e) => { e.stopPropagation(); filterActions.onClearCampaigns(); }}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredCampaigns.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">No campaigns found</div>
                  ) : (
                    filteredCampaigns.map((campaign: any) => (
                      <label
                        key={campaign.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={filterState.selectedCampaigns.includes(campaign.id)}
                          onChange={() => filterActions.onToggleCampaign(campaign.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 truncate flex-1">{campaign.name}</span>
                        {campaign.status === 'PAUSED' && (
                          <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">Paused</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ad Group Filter - exact Dashboard style */}
          <div className="relative" ref={adGroupDropdownRef}>
            <button
              onClick={() => filterActions.onSetAdGroupDropdownOpen(!filterState.adGroupDropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.selectedAdGroups.length > 0
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span className="max-w-40 truncate">
                {filterState.selectedAdGroups.length > 0 
                  ? `${filterState.selectedAdGroups.length} Ad Group${filterState.selectedAdGroups.length > 1 ? 's' : ''}`
                  : 'All Ad Groups'}
              </span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {filterState.adGroupDropdownOpen && (
              <div className="absolute left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                <div className="p-3 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900">Filter by Ad Group</span>
                    <div className="flex items-center space-x-2">
                      {/* Status Filter Buttons */}
                      <div className="flex rounded-md border border-gray-200 overflow-hidden">
                        {(['all', 'active', 'paused'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={(e) => { e.stopPropagation(); setAdGroupStatusFilter(status); }}
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
                          onClick={(e) => { e.stopPropagation(); filterActions.onClearAdGroups(); }}
                          className="text-xs text-teal-600 hover:text-teal-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto p-2">
                  {filteredAdGroups.length === 0 ? (
                    <div className="text-center py-4 text-sm text-gray-500">No ad groups found</div>
                  ) : (
                    filteredAdGroups.map((ag: any) => (
                      <label
                        key={ag.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer rounded"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={filterState.selectedAdGroups.includes(ag.id)}
                          onChange={() => filterActions.onToggleAdGroup(ag.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 truncate flex-1">{ag.name}</span>
                        {ag.status === 'PAUSED' && (
                          <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-100 rounded">Paused</span>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Device Filter - exact Dashboard style */}
          <div className="relative" ref={deviceDropdownRef}>
            <button
              onClick={() => filterActions.onSetDeviceDropdownOpen(!filterState.deviceDropdownOpen)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                filterState.deviceFilter !== 'all'
                  ? 'bg-teal-50 border-teal-200 text-teal-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {(() => {
                const IconComponent = deviceOptions.find(d => d.value === filterState.deviceFilter)?.icon || Monitor;
                return <IconComponent className="h-4 w-4" />;
              })()}
              <span>{deviceOptions.find(d => d.value === filterState.deviceFilter)?.label || 'All Devices'}</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {filterState.deviceDropdownOpen && (
              <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-30">
                {deviceOptions.map(device => {
                  const IconComponent = device.icon;
                  return (
                    <button
                      key={device.value}
                      onClick={() => {
                        filterActions.onDeviceFilterChange(device.value);
                        filterActions.onSetDeviceDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                        filterState.deviceFilter === device.value ? 'text-teal-600 font-medium bg-teal-50' : 'text-gray-700'
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                      {device.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clear All Filters */}
          {(filterState.selectedCampaigns.length > 0 || filterState.selectedAdGroups.length > 0 || filterState.deviceFilter !== 'all') && (
            <button
              onClick={() => {
                filterActions.onClearCampaigns();
                filterActions.onClearAdGroups();
                filterActions.onDeviceFilterChange('all');
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-4 h-4" />
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* KPI Cards - exactly matching ProductsView design */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
        <KpiCard
          id="impressions"
          label="Your Impressions"
          value={formatNumber(totals.impressions)}
          trend={trends.impressions}
          icon={Eye}
          color="#8b5cf6"
        />
        <KpiCard
          id="estVolume"
          label="Est. Market Volume"
          value={formatNumber(marketShare?.totals.estimatedSearchVolume || totals.impressions)}
          trend={trends.impressions}
          icon={Target}
          color="#6366f1"
        />
        <KpiCard
          id="marketShare"
          label="Market Share"
          value={marketShare ? `${marketShare.totals.marketSharePercentage.toFixed(1)}%` : '-'}
          trend={trends.impressions}
          icon={Percent}
          color="#0d9488"
        />
        <KpiCard
          id="avgScore"
          label="Avg. Score"
          value={avgOpportunityScore.toString()}
          trend={trends.conversions}
          icon={Zap}
          color="#f59e0b"
        />
        <KpiCard
          id="cost"
          label="Ad Spend"
          value={formatCurrency(totals.cost)}
          trend={trends.cost}
          icon={DollarSign}
          color="#ef4444"
        />
        <KpiCard
          id="conversions"
          label="Conversions"
          value={formatNumber(totals.conversions)}
          trend={trends.conversions}
          icon={CheckCircle}
          color="#10b981"
        />
        <KpiCard
          id="revenue"
          label="Revenue"
          value={formatCurrency(totals.conversionsValue)}
          trend={trends.conversionsValue}
          icon={DollarSign}
          color="#3b82f6"
        />
      </div>

      {/* Controls Row - Reordered: Quick Filter (left), Search / Graph / Columns (right) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left side: Quick Filter */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {QUICK_FILTERS.map(filter => (
            <button
              key={filter.id}
              onClick={() => { setQuickFilter(filter.id); resetPage(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                quickFilter === filter.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <filter.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Right side: Search / Graph toggles / Columns */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="w-64">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search keywords..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(''); resetPage(); }} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>

          {/* Chart Type */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {CHART_TYPES.map(type => (
              <button
                key={type.id}
                onClick={() => setChartMode(type.id)}
                className={`p-1.5 rounded-md transition-colors ${
                  chartMode === type.id ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                title={type.label}
              >
                <type.icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Column Picker */}
          <div className="relative" ref={columnPickerRef}>
            <button
              onClick={() => setColumnPickerOpen(!columnPickerOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <Columns className="w-4 h-4 text-gray-500" />
              <span>Columns</span>
            </button>
            {columnPickerOpen && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-48 max-h-64 overflow-y-auto">
                <div className="p-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">Toggle Columns</span>
                </div>
                {ALL_COLUMNS.map(col => (
                  <label key={col.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(col.id)}
                      onChange={() => toggleColumn(col.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart - Dashboard style with larger height */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            Top {Math.min(10, chartData.length)} Keywords by {chartMode === 'bar' ? 'Impressions' : chartMode === 'dual' ? 'Impressions vs Clicks' : 'Impression Distribution'}
          </h3>
          <div className="flex items-center gap-3">
            {quickFilter !== 'all' && (
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                quickFilter === 'high-opportunity' ? 'bg-purple-100 text-purple-700' :
                quickFilter === 'low-share' ? 'bg-amber-100 text-amber-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {QUICK_FILTERS.find(f => f.id === quickFilter)?.label}
              </span>
            )}
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
              {chartMode === 'bar' ? 'Horizontal Bar' : chartMode === 'dual' ? 'Comparison' : 'Distribution'}
            </span>
          </div>
        </div>
        <div className="h-[480px] bg-gray-50/30 px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No data available</div>
          ) : chartMode === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 40, top: 10, bottom: 10 }} barCategoryGap="20%">
                <defs>
                  {/* Dashboard-style gradient */}
                  <linearGradient id="impressionsGradientBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.95} />
                  </linearGradient>
                  <linearGradient id="clicksGradientBar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e5e7eb" />
                <XAxis type="number" tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(13, 148, 136, 0.08)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
                        <div className="space-y-1 text-sm">
                          <p><span className="text-gray-500">Impressions:</span> <span className="font-medium">{formatNumber(data.impressions)}</span></p>
                          <p><span className="text-gray-500">Clicks:</span> <span className="font-medium">{formatNumber(data.clicks)}</span></p>
                          <p><span className="text-gray-500">CTR:</span> <span className="font-medium">{data.ctr.toFixed(2)}%</span></p>
                          <p><span className="text-gray-500">Conversions:</span> <span className={`font-medium ${data.conversions > 0 ? 'text-emerald-600' : ''}`}>{formatNumber(data.conversions)}</span></p>
                          <p><span className="text-gray-500">ROAS:</span> <span className={`font-medium ${data.roas >= 2 ? 'text-emerald-600' : data.roas >= 1 ? 'text-amber-600' : 'text-rose-600'}`}>{data.roas.toFixed(2)}</span></p>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="impressions" fill="url(#impressionsGradientBar)" radius={[0, 6, 6, 0]} stroke={CHART_COLORS.primary} strokeWidth={0.5} strokeOpacity={0.3} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          ) : chartMode === 'dual' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 10, right: 10, top: 20, bottom: 10 }}>
                <defs>
                  <linearGradient id="impressionsDualGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0.6} />
                  </linearGradient>
                  <linearGradient id="clicksAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} tickLine={false} />
                <YAxis yAxisId="left" tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => formatNumber(val)} tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const data = payload[0]?.payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                        <p className="font-semibold text-gray-900 mb-3">{data?.fullName}</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.primary }} />
                            <span className="text-sm text-gray-500">Impressions:</span>
                            <span className="text-sm font-medium text-gray-900">{formatNumber(data?.impressions)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary }} />
                            <span className="text-sm text-gray-500">Clicks:</span>
                            <span className="text-sm font-medium text-gray-900">{formatNumber(data?.clicks)}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">CTR: {data?.ctr?.toFixed(2)}%</div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '10px' }} formatter={(value) => <span className="text-sm text-gray-600">{value}</span>} />
                <Bar yAxisId="left" dataKey="impressions" name="Impressions" fill="url(#impressionsDualGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                <Area yAxisId="right" type="monotone" dataKey="clicks" name="Clicks" fill="url(#clicksAreaGradient)" stroke={CHART_COLORS.secondary} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full">
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {PIE_COLORS.map((color, idx) => (
                        <linearGradient key={`pieGradient-${idx}`} id={`keywordPieGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2} dataKey="value" stroke="#fff" strokeWidth={2}>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#keywordPieGradient-${index % PIE_COLORS.length})`} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        const total = pieData.reduce((sum, p) => sum + p.value, 0);
                        const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                            <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
                            <p className="text-sm text-gray-600">{formatNumber(data.value)} impressions</p>
                            <p className="text-xs text-gray-400 mt-1">{percent}% of top 10</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total Impr.</p>
                    <p className="text-lg font-bold text-gray-900">{formatNumber(pieData.reduce((sum, p) => sum + p.value, 0))}</p>
                  </div>
                </div>
              </div>
              <div className="w-48 pl-4 flex flex-col justify-center overflow-y-auto">
                <div className="space-y-2">
                  {pieData.slice(0, 8).map((item, idx) => {
                    const total = pieData.reduce((sum, p) => sum + p.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-gray-600 truncate flex-1" title={item.fullName}>{item.name}</span>
                        <span className="text-gray-900 font-medium tabular-nums">{percent}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700">
          <p className="font-medium">Error loading keyword data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Breadcrumb for drill-down */}
      {selectedKeyword && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setSelectedKeyword(null)}
            className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            ← All Keywords
          </button>
          <span className="text-gray-400">/</span>
          <span className="text-gray-700 font-medium truncate max-w-[300px]" title={selectedKeyword.keyword}>
            "{selectedKeyword.keyword}"
          </span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-500">{relatedSearchTerms.length} search terms</span>
        </div>
      )}

      {/* Table - Dashboard style with breadcrumb navigation */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header with breadcrumb */}
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Back button */}
              {selectedKeyword && (
                <button
                  onClick={() => { setSelectedKeyword(null); resetPage(); }}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-900 mr-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back</span>
                </button>
              )}
              {/* Breadcrumb - Dashboard style */}
              <div className="flex items-center text-sm">
                <button
                  onClick={() => { setSelectedKeyword(null); resetPage(); }}
                  className={`${!selectedKeyword ? 'text-gray-900 font-medium' : 'text-blue-600 hover:text-blue-800'}`}
                >
                  All Keywords
                </button>
                {selectedKeyword && (
                  <>
                    <ChevronRight className="h-4 w-4 text-gray-400 mx-2 flex-shrink-0" />
                    <span className="text-gray-900 font-medium truncate" style={{ maxWidth: '250px' }}>
                      {selectedKeyword.keyword}
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {selectedKeyword ? relatedSearchTerms.length : sortedKeywords.length} {selectedKeyword ? 'search terms' : 'keywords'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : paginatedKeywords.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No keywords found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10 min-w-[220px]">
                    {selectedKeyword ? 'Search Term' : 'Keyword'}
                  </th>
                  {/* Divider after keyword column */}
                  <th className="px-1 py-4 w-px border-r border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100" />
                  {ALL_COLUMNS
                    .filter(col => visibleColumns.has(col.id))
                    .filter(col => selectedKeyword ? col.showForSearchTerms : true)
                    .map(col => (
                    <th
                      key={col.id}
                      className="px-4 py-4 text-xs font-semibold text-gray-700 uppercase tracking-wider text-right cursor-pointer hover:bg-gray-100/50 transition-colors"
                      onClick={() => handleSort(col.id)}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {col.label}
                        {sortColumn === col.id && (
                          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Show Keywords (with drill-down) OR Search Terms based on selection */}
                {!selectedKeyword ? (
                  // KEYWORDS VIEW - clickable to drill down
                  paginatedKeywords.map((keyword, idx) => {
                    const kw = keyword as any;
                    const isHighOpp = kw.searchImpressionShare < 0.5 && kw.conversions > 0;
                    const isLow = kw.cost > 10 && kw.conversions < 1;
                    return (
                      <tr 
                        key={idx} 
                        className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${isHighOpp ? 'bg-purple-50/40' : isLow ? 'bg-rose-50/40' : ''}`}
                        onClick={() => { setSelectedKeyword(kw); setCurrentPage(1); }}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10" title={kw.keyword}>
                          <div className="truncate max-w-[220px] text-blue-700 hover:text-blue-900 flex items-center gap-1.5 font-medium">
                            {kw.keyword}
                            <ChevronRight className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">{kw.matchType} • {kw.campaignName}</div>
                        </td>
                        {/* Divider after keyword column */}
                        <td className="px-1 py-3 border-r border-gray-300" />
                        {visibleColumns.has('clicks') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.clicks, aggregateMetrics.allClicks, 'clicks')} />
                              <span className="tabular-nums">{formatNumber(kw.clicks)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('impressions') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.impressions, aggregateMetrics.allImpressions, 'impressions')} />
                              <span className="tabular-nums">{formatNumber(kw.impressions)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('ctr') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.ctr, aggregateMetrics.allCtr, 'ctr')} />
                              <span className="tabular-nums">{kw.ctr.toFixed(2)}%</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('cost') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.cost, aggregateMetrics.allCost, 'cost')} />
                              <span className="tabular-nums">{formatCurrency(kw.cost)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversions') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.conversions, aggregateMetrics.allConversions, 'conversions')} />
                              <span className="tabular-nums">{kw.conversions.toFixed(1)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversionRate') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.conversionRate, aggregateMetrics.allCtr, 'ctr')} />
                              <span className="tabular-nums">{kw.conversionRate.toFixed(2)}%</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversionsValue') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.conversionsValue, aggregateMetrics.allConversionsValue, 'conversionsValue')} />
                              <span className="tabular-nums">{formatCurrency(kw.conversionsValue)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('roas') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(kw.roas, aggregateMetrics.allRoas, 'roas')} />
                              <span className="tabular-nums">{kw.cost > 0 ? kw.roas.toFixed(2) : '-'}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('share') && (
                          <td className={`px-4 py-4 text-sm text-right tabular-nums font-medium ${
                            kw.searchImpressionShare >= 0.7 ? 'text-emerald-600' : 
                            kw.searchImpressionShare >= 0.4 ? 'text-amber-600' : 'text-rose-500'
                          }`}>
                            {(kw.searchImpressionShare * 100).toFixed(1)}%
                          </td>
                        )}
                        {visibleColumns.has('estVolume') && (
                          <td className="px-4 py-4 text-sm text-purple-600 font-medium text-right tabular-nums">
                            {formatNumber(kw.estimatedSearchVolume)}
                          </td>
                        )}
                        {visibleColumns.has('missed') && (
                          <td className="px-4 py-4 text-sm text-amber-600 text-right tabular-nums">
                            {formatNumber(kw.missedImpressions)}
                          </td>
                        )}
                        {visibleColumns.has('score') && (
                          <td className="px-4 py-4 text-right">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${getOpportunityColor(kw.opportunityScore)}`}>
                              {kw.opportunityScore}
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  // SEARCH TERMS VIEW - drilled down from keyword (no market share columns)
                  relatedSearchTerms.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((st: any, idx) => {
                    const isGood = st.conversions > 0;
                    const isBad = st.cost > 10 && st.conversions === 0;
                    return (
                      <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isGood ? 'bg-emerald-50/40' : isBad ? 'bg-rose-50/40' : ''}`}>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10" title={st.keyword}>
                          <div className="truncate max-w-[280px]">{st.keyword}</div>
                          <div className="text-xs text-gray-400 truncate mt-0.5">{st.adGroupName || st.campaignName}</div>
                        </td>
                        {/* Divider after search term column */}
                        <td className="px-1 py-3 border-r border-gray-300" />
                        {visibleColumns.has('clicks') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.clicks, aggregateMetrics.allClicks, 'clicks')} />
                              <span className="tabular-nums">{formatNumber(st.clicks)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('impressions') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.impressions, aggregateMetrics.allImpressions, 'impressions')} />
                              <span className="tabular-nums">{formatNumber(st.impressions)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('ctr') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.ctr, aggregateMetrics.allCtr, 'ctr')} />
                              <span className="tabular-nums">{st.ctr.toFixed(2)}%</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('cost') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.cost, aggregateMetrics.allCost, 'cost')} />
                              <span className="tabular-nums">{formatCurrency(st.cost)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversions') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.conversions, aggregateMetrics.allConversions, 'conversions')} />
                              <span className="tabular-nums">{st.conversions.toFixed(1)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversionRate') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.conversionRate, aggregateMetrics.allCtr, 'ctr')} />
                              <span className="tabular-nums">{st.conversionRate.toFixed(2)}%</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('conversionsValue') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.conversionsValue, aggregateMetrics.allConversionsValue, 'conversionsValue')} />
                              <span className="tabular-nums">{formatCurrency(st.conversionsValue)}</span>
                            </div>
                          </td>
                        )}
                        {visibleColumns.has('roas') && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm">
                            <div className="flex items-center justify-end">
                              <PerformanceIndicator level={getPerformanceLevel(st.roas, aggregateMetrics.allRoas, 'roas')} />
                              <span className="tabular-nums">{st.cost > 0 ? st.roas.toFixed(2) : '-'}</span>
                            </div>
                          </td>
                        )}
                        {/* Market share columns are hidden for search terms via column filtering */}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Dashboard style */}
        {currentData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, currentData.length)} of {currentData.length}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Per page:</span>
                {([10, 25, 50] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => { setPageSize(size); resetPage(); }}
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
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

