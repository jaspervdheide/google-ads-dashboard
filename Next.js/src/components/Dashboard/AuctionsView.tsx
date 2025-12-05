'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart,
  Area,
  BarChart, 
  Bar, 
  ComposedChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp,
  TrendingDown,
  BarChart3, 
  Search as SearchIcon,
  Target,
  Eye,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronLeft,
  Download,
  Columns,
  Zap,
  AlertTriangle,
  Monitor,
  Smartphone,
  Tablet,
  Check,
  Users,
  Activity
} from 'lucide-react';
import { DateRange } from '@/types';
import { 
  AuctionApiResponse, 
  CompetitorData, 
  CampaignAuctionData,
  AuctionHistoricalData,
  AuctionMetric,
  AuctionViewLevel
} from '@/types/auctions';

interface Campaign {
  id: string;
  name: string;
  status?: string;
}

interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  status?: string;
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

interface AuctionsViewProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
  campaigns?: Campaign[];
  adGroups?: AdGroup[];
  filterState?: FilterState;
  filterActions?: FilterActions;
}

// Chart colors matching Dashboard
const CHART_COLORS = {
  primary: '#3b82f6',    // blue-500
  secondary: '#10b981',  // emerald-500
  tertiary: '#8b5cf6',   // purple-500
  quaternary: '#f59e0b', // amber-500
  danger: '#ef4444',     // red-500
  orange: '#f97316',     // orange-500
};

// Device options
const deviceOptions = [
  { value: 'all', label: 'All Devices', icon: Monitor },
  { value: 'DESKTOP', label: 'Desktop', icon: Monitor },
  { value: 'MOBILE', label: 'Mobile', icon: Smartphone },
  { value: 'TABLET', label: 'Tablet', icon: Tablet },
];

// KPI Card component matching Dashboard
interface KpiCardProps {
  id: string;
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  trend?: number;
  isSelected?: boolean;
  onClick?: () => void;
  subtitle?: string;
}

function KpiCard({ id, label, value, icon: Icon, color, trend, isSelected, onClick, subtitle }: KpiCardProps) {
  // Determine performance level based on trend
  const getPerformanceLabel = (trend: number | undefined, metricId: string) => {
    if (trend === undefined) return { label: 'No Data', color: '#6b7280', bgColor: '#f3f4f6', borderColor: '#e5e7eb' };
    
    // For "lost" metrics, lower is better (negative trend is good)
    const isLostMetric = metricId === 'lostByRank' || metricId === 'lostByBudget';
    const effectiveTrend = isLostMetric ? -trend : trend;
    
    if (effectiveTrend > 5) return { label: 'Excellent', color: '#059669', bgColor: '#d1fae5', borderColor: '#a7f3d0' };
    if (effectiveTrend > 2) return { label: 'Good', color: '#0d9488', bgColor: '#ccfbf1', borderColor: '#99f6e4' };
    if (effectiveTrend > -2) return { label: 'Stable', color: '#6b7280', bgColor: '#f3f4f6', borderColor: '#e5e7eb' };
    if (effectiveTrend > -5) return { label: 'Declining', color: '#d97706', bgColor: '#fef3c7', borderColor: '#fde68a' };
    return { label: 'Critical', color: '#dc2626', bgColor: '#fee2e2', borderColor: '#fecaca' };
  };

  const performanceStyles = trend !== undefined ? getPerformanceLabel(trend, id) : null;
  const performanceLabel = performanceStyles?.label || 'No Data';

  // For lost metrics, we want to show trend differently
  const isLostMetric = id === 'lostByRank' || id === 'lostByBudget';
  const trendColor = isLostMetric 
    ? (trend && trend < 0 ? '#059669' : trend && trend > 0 ? '#dc2626' : '#6b7280')
    : (trend && trend > 0 ? '#059669' : trend && trend < 0 ? '#dc2626' : '#6b7280');

  return (
    <div 
      onClick={onClick}
      className={`
        relative p-6 rounded-xl transition-all cursor-pointer overflow-hidden
        ${isSelected 
          ? 'bg-white shadow-lg ring-2 ring-offset-2' 
          : 'bg-white shadow-sm hover:shadow-md border border-gray-100'
        }
      `}
      style={{ 
        minHeight: '160px',
        ...(isSelected ? { ringColor: color } : {})
      }}
    >
      {/* Icon - matching main Dashboard */}
      <div 
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ backgroundColor: isSelected ? `${color}20` : '#f3f4f6' }}
      >
        <Icon className="h-4 w-4" style={{ color: isSelected ? color : '#6b7280' }} />
      </div>

      {/* Value - matching main Dashboard */}
      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900 leading-tight truncate">{value}</div>
        <div className="text-sm text-gray-600 font-medium truncate">{label}</div>
        {subtitle && <div className="text-xs text-gray-400 truncate">{subtitle}</div>}
      </div>

      {/* Performance label and percentage - matching main Dashboard */}
      {trend !== undefined && performanceStyles && (
        <div className="flex items-center justify-between">
          <div 
            className="text-xs font-semibold px-2 py-1 rounded-md border"
            style={{
              color: performanceStyles.color,
              backgroundColor: performanceStyles.bgColor,
              borderColor: performanceStyles.borderColor
            }}
          >
            {performanceLabel}
          </div>
          
          <div className="flex items-center space-x-1">
            {(isLostMetric ? trend < 0 : trend >= 0) ? (
              <ArrowUp className="h-3 w-3" style={{ color: trendColor }} />
            ) : (
              <ArrowDown className="h-3 w-3" style={{ color: trendColor }} />
            )}
            <span 
              className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{ 
                color: trendColor,
                backgroundColor: trendColor === '#059669' ? '#d1fae5' : trendColor === '#dc2626' ? '#fee2e2' : '#f3f4f6'
              }}
            >
              {Math.abs(trend).toFixed(1)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Custom hook for auction data
function useAuctionData(selectedAccount: string | null, selectedDateRange: DateRange | null) {
  const [data, setData] = useState<AuctionApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedAccount || !selectedDateRange) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Use apiDays like other hooks do
        const dateRange = selectedDateRange?.apiDays || 30;
        const params = new URLSearchParams({
          customerId: selectedAccount,
          dateRange: String(dateRange)
        });

        const response = await fetch(`/api/auctions?${params}`);
        const result = await response.json();

        if (result.success) {
          setData(result);
        } else {
          setError(result.error || 'Failed to fetch auction data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAccount, selectedDateRange]);

  return { data, loading, error };
}

export default function AuctionsView({
  selectedAccount,
  selectedDateRange,
  campaigns = [],
  adGroups = [],
  filterState,
  filterActions
}: AuctionsViewProps) {
  // State
  const [viewLevel, setViewLevel] = useState<AuctionViewLevel>('account');
  const [selectedMetric, setSelectedMetric] = useState<AuctionMetric>('impressionShare');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'composed'>('area');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  // Separate visible columns state for each view
  const [competitorVisibleColumns, setCompetitorVisibleColumns] = useState<string[]>([
    'domain', 'impressionShare', 'overlapRate', 'positionAboveRate', 'topOfPageRate', 'absoluteTopOfPageRate', 'outrankingShare'
  ]);
  const [campaignVisibleColumns, setCampaignVisibleColumns] = useState<string[]>([
    'campaignName', 'impressionShare', 'lostByRank', 'lostByBudget', 'topImpressionShare', 'absoluteTopImpressionShare'
  ]);
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignAuctionData | null>(null);

  // Filter status state
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused'>('active');
  const [adGroupStatusFilter, setAdGroupStatusFilter] = useState<'all' | 'active' | 'paused'>('active');

  // Refs for click outside handling
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const adGroupDropdownRef = useRef<HTMLDivElement>(null);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnPickerRef.current && !columnPickerRef.current.contains(event.target as Node)) {
        setColumnPickerOpen(false);
      }
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetCampaignDropdownOpen(false);
      }
      if (adGroupDropdownRef.current && !adGroupDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetAdGroupDropdownOpen(false);
      }
      if (deviceDropdownRef.current && !deviceDropdownRef.current.contains(event.target as Node)) {
        filterActions?.onSetDeviceDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterActions]);

  // Fetch data
  const { data, loading, error } = useAuctionData(selectedAccount, selectedDateRange);

  // Column definitions for competitors table
  const ALL_COLUMNS = [
    { key: 'domain', label: 'Competitor', alwaysVisible: true },
    { key: 'impressionShare', label: 'Impr. Share' },
    { key: 'overlapRate', label: 'Overlap Rate' },
    { key: 'positionAboveRate', label: 'Position Above' },
    { key: 'topOfPageRate', label: 'Top of Page' },
    { key: 'absoluteTopOfPageRate', label: 'Abs. Top' },
    { key: 'outrankingShare', label: 'Outranking' },
  ];

  // Column definitions for campaigns table
  const CAMPAIGN_COLUMNS = [
    { key: 'campaignName', label: 'Campaign', alwaysVisible: true },
    { key: 'impressionShare', label: 'Impr. Share' },
    { key: 'lostByRank', label: 'Lost (Rank)' },
    { key: 'lostByBudget', label: 'Lost (Budget)' },
    { key: 'topImpressionShare', label: 'Top Impr. Share' },
    { key: 'absoluteTopImpressionShare', label: 'Abs. Top Share' },
  ];

  // Filter competitors by search
  const filteredCompetitors = useMemo(() => {
    if (!data?.accountLevel.competitors) return [];
    if (!searchTerm) return data.accountLevel.competitors;
    return data.accountLevel.competitors.filter(c => 
      c.domain.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data?.accountLevel.competitors, searchTerm]);

  // Filter campaigns by search
  const filteredCampaigns = useMemo(() => {
    if (!data?.campaignLevel) return [];
    if (!searchTerm) return data.campaignLevel;
    return data.campaignLevel.filter(c => 
      c.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data?.campaignLevel, searchTerm]);

  // Pagination for competitors
  const paginatedCompetitors = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCompetitors.slice(start, start + pageSize);
  }, [filteredCompetitors, currentPage, pageSize]);

  // Pagination for campaigns
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  // Chart data
  const chartData = useMemo(() => {
    if (!data?.accountLevel.historical) return [];
    return data.accountLevel.historical.map(d => ({
      date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ...d
    }));
  }, [data?.accountLevel.historical]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!data) return;

    const rows = viewLevel === 'account' 
      ? data.accountLevel.competitors.map(c => ({
          Domain: c.domain,
          'Impression Share': `${c.impressionShare.toFixed(1)}%`,
          'Overlap Rate': `${c.overlapRate.toFixed(1)}%`,
          'Position Above Rate': `${c.positionAboveRate.toFixed(1)}%`,
          'Top of Page Rate': `${c.topOfPageRate.toFixed(1)}%`,
          'Outranking Share': `${c.outrankingShare.toFixed(1)}%`,
        }))
      : data.campaignLevel.map(c => ({
          Campaign: c.campaignName,
          'Impression Share': `${c.impressionShare.impressionShare.toFixed(1)}%`,
          'Lost by Rank': `${c.impressionShare.lostByRank.toFixed(1)}%`,
          'Lost by Budget': `${c.impressionShare.lostByBudget.toFixed(1)}%`,
          'Top Impression Share': `${c.impressionShare.topImpressionShare.toFixed(1)}%`,
        }));

    const headers = Object.keys(rows[0] || {});
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auction-insights-${viewLevel}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [data, viewLevel]);

  // Get metric color
  const getMetricColor = (metric: AuctionMetric) => {
    switch (metric) {
      case 'impressionShare': return CHART_COLORS.primary;
      case 'lostByRank': return CHART_COLORS.danger;
      case 'lostByBudget': return CHART_COLORS.orange;
      case 'topImpressionShare': return CHART_COLORS.secondary;
      case 'absoluteTopImpressionShare': return CHART_COLORS.tertiary;
      default: return CHART_COLORS.primary;
    }
  };

  // Get metric label
  const getMetricLabel = (metric: AuctionMetric) => {
    switch (metric) {
      case 'impressionShare': return 'Impression Share';
      case 'lostByRank': return 'Lost by Rank';
      case 'lostByBudget': return 'Lost by Budget';
      case 'topImpressionShare': return 'Top Impression Share';
      case 'absoluteTopImpressionShare': return 'Abs. Top Impression Share';
      default: return metric;
    }
  };

  // Performance indicator for competitors
  const getCompetitorPerformance = (competitor: CompetitorData, yourShare: number) => {
    if (competitor.impressionShare > yourShare + 10) return { level: 'danger', label: 'Strong Competitor' };
    if (competitor.impressionShare > yourShare) return { level: 'warning', label: 'Ahead' };
    if (competitor.impressionShare > yourShare - 10) return { level: 'neutral', label: 'Close' };
    return { level: 'success', label: 'Behind You' };
  };

  // Render loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
          <div className="h-80 bg-gray-200 rounded-xl"></div>
          <div className="h-64 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Auction Data</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  // Render no data state
  if (!data) {
    return (
      <div className="p-6">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Account</h3>
          <p className="text-gray-600">Choose an account and date range to view auction insights</p>
        </div>
      </div>
    );
  }

  const accountShare = data.accountLevel.impressionShare;
  const totalPages = Math.ceil(
    (viewLevel === 'account' ? filteredCompetitors.length : filteredCampaigns.length) / pageSize
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Auction Insights</h1>
          <p className="text-gray-500 mt-1">Analyze competitive performance and impression share</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters - exact Dashboard pattern */}
      {filterState && filterActions && (
        <div className="flex items-center space-x-3 mb-6">
          {/* Campaign Filter */}
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
                  {campaigns.filter(c => campaignStatusFilter === 'all' || (campaignStatusFilter === 'active' ? c.status !== 'PAUSED' : c.status === 'PAUSED')).length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">No campaigns available</div>
                  ) : (
                    campaigns
                      .filter(c => campaignStatusFilter === 'all' || (campaignStatusFilter === 'active' ? c.status !== 'PAUSED' : c.status === 'PAUSED'))
                      .map(campaign => (
                        <button
                          key={campaign.id}
                          onClick={(e) => { e.stopPropagation(); filterActions.onToggleCampaign(campaign.id); }}
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

          {/* Device Filter */}
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
                      <span>{device.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <KpiCard
          id="impressionShare"
          label="Impression Share"
          value={`${accountShare.impressionShare.toFixed(1)}%`}
          icon={Eye}
          color={CHART_COLORS.primary}
          trend={data.trends.impressionShare}
          isSelected={selectedMetric === 'impressionShare'}
          onClick={() => setSelectedMetric('impressionShare')}
          subtitle="Your share of total searches"
        />
        <KpiCard
          id="lostByRank"
          label="Lost by Rank"
          value={`${accountShare.lostByRank.toFixed(1)}%`}
          icon={TrendingDown}
          color={CHART_COLORS.danger}
          trend={data.trends.lostByRank}
          isSelected={selectedMetric === 'lostByRank'}
          onClick={() => setSelectedMetric('lostByRank')}
          subtitle="Improve Quality Score"
        />
        <KpiCard
          id="lostByBudget"
          label="Lost by Budget"
          value={`${accountShare.lostByBudget.toFixed(1)}%`}
          icon={AlertTriangle}
          color={CHART_COLORS.orange}
          trend={data.trends.lostByBudget}
          isSelected={selectedMetric === 'lostByBudget'}
          onClick={() => setSelectedMetric('lostByBudget')}
          subtitle="Increase daily budget"
        />
        <KpiCard
          id="topImpressionShare"
          label="Top Impression Share"
          value={`${accountShare.topImpressionShare.toFixed(1)}%`}
          icon={Zap}
          color={CHART_COLORS.secondary}
          trend={data.trends.topImpressionShare}
          isSelected={selectedMetric === 'topImpressionShare'}
          onClick={() => setSelectedMetric('topImpressionShare')}
          subtitle="Appearing at top of page"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{getMetricLabel(selectedMetric)} Over Time</h3>
              <p className="text-sm text-gray-500 mt-1">Daily trend for selected metric</p>
            </div>
            <div className="flex items-center space-x-2">
              {/* Chart type toggles */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setChartType('area')}
                  className={`p-2 rounded-md transition-colors ${chartType === 'area' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Activity className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`p-2 rounded-md transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setChartType('composed')}
                  className={`p-2 rounded-md transition-colors ${chartType === 'composed' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6" style={{ height: '480px' }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="auctionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, getMetricLabel(selectedMetric)]}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedMetric} 
                  stroke={getMetricColor(selectedMetric)} 
                  strokeWidth={2}
                  fill="url(#auctionGradient)"
                />
              </AreaChart>
            ) : chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getMetricColor(selectedMetric)} stopOpacity={1}/>
                    <stop offset="100%" stopColor={getMetricColor(selectedMetric)} stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number) => [`${value.toFixed(1)}%`, getMetricLabel(selectedMetric)]}
                />
                <Bar 
                  dataKey={selectedMetric} 
                  fill="url(#barGradient)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            ) : (
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="shareGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(1)}%`, 
                    name === 'impressionShare' ? 'Impression Share' :
                    name === 'lostByRank' ? 'Lost by Rank' :
                    name === 'lostByBudget' ? 'Lost by Budget' : name
                  ]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="impressionShare" 
                  fill="url(#shareGradient)"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2}
                  name="Impression Share"
                />
                <Line 
                  type="monotone" 
                  dataKey="lostByRank" 
                  stroke={CHART_COLORS.danger}
                  strokeWidth={2}
                  dot={false}
                  name="Lost by Rank"
                />
                <Line 
                  type="monotone" 
                  dataKey="lostByBudget" 
                  stroke={CHART_COLORS.orange}
                  strokeWidth={2}
                  dot={false}
                  name="Lost by Budget"
                />
              </ComposedChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* View Level Toggle & Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {/* View Level Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => { setViewLevel('account'); setSelectedCampaign(null); }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewLevel === 'account' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="h-4 w-4 inline mr-2" />
              Competitors
            </button>
            <button
              onClick={() => setViewLevel('campaign')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewLevel === 'campaign' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Target className="h-4 w-4 inline mr-2" />
              Campaigns
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={viewLevel === 'account' ? 'Search competitors...' : 'Search campaigns...'}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Column Picker */}
          <div className="relative" ref={columnPickerRef}>
            <button
              onClick={() => setColumnPickerOpen(!columnPickerOpen)}
              className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <Columns className="h-4 w-4" />
              <span>Columns</span>
              <ChevronDown className="h-3 w-3" />
            </button>
            {columnPickerOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                {(viewLevel === 'account' ? ALL_COLUMNS : CAMPAIGN_COLUMNS).map(col => {
                  const currentColumns = viewLevel === 'account' ? competitorVisibleColumns : campaignVisibleColumns;
                  const setColumns = viewLevel === 'account' ? setCompetitorVisibleColumns : setCampaignVisibleColumns;
                  const isChecked = currentColumns.includes(col.key) || col.alwaysVisible === true;
                  
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-50 cursor-pointer ${
                        col.alwaysVisible ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={col.alwaysVisible === true}
                        onChange={() => {
                          if (col.alwaysVisible) return;
                          setColumns(prev => 
                            prev.includes(col.key) 
                              ? prev.filter(c => c !== col.key)
                              : [...prev, col.key]
                          );
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                {viewLevel === 'account' ? (
                  <>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      Competitor
                    </th>
                    {competitorVisibleColumns.includes('impressionShare') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Impr. Share</th>
                    )}
                    {competitorVisibleColumns.includes('overlapRate') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Overlap</th>
                    )}
                    {competitorVisibleColumns.includes('positionAboveRate') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Position Above</th>
                    )}
                    {competitorVisibleColumns.includes('topOfPageRate') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Top of Page</th>
                    )}
                    {competitorVisibleColumns.includes('absoluteTopOfPageRate') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Abs. Top</th>
                    )}
                    {competitorVisibleColumns.includes('outrankingShare') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Outranking</th>
                    )}
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-r border-gray-200">
                      Campaign
                    </th>
                    {campaignVisibleColumns.includes('impressionShare') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Impr. Share</th>
                    )}
                    {campaignVisibleColumns.includes('lostByRank') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Lost (Rank)</th>
                    )}
                    {campaignVisibleColumns.includes('lostByBudget') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Lost (Budget)</th>
                    )}
                    {campaignVisibleColumns.includes('topImpressionShare') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Top Share</th>
                    )}
                    {campaignVisibleColumns.includes('absoluteTopImpressionShare') && (
                      <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Abs. Top</th>
                    )}
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {viewLevel === 'account' ? (
                paginatedCompetitors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No competitor data available
                    </td>
                  </tr>
                ) : (
                  paginatedCompetitors.map((competitor, idx) => {
                    const performance = getCompetitorPerformance(competitor, accountShare.impressionShare);
                    const isYou = competitor.domain.toLowerCase().includes('you') || idx === 0;
                    
                    return (
                      <tr 
                        key={competitor.domain}
                        className={`hover:bg-gray-50 transition-colors ${isYou ? 'bg-blue-50' : ''}`}
                      >
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              performance.level === 'success' ? 'bg-green-500' :
                              performance.level === 'warning' ? 'bg-yellow-500' :
                              performance.level === 'danger' ? 'bg-red-500' : 'bg-gray-400'
                            }`} />
                            <div>
                              <span className={`font-medium ${isYou ? 'text-blue-700' : 'text-gray-900'}`}>
                                {isYou ? '(You)' : competitor.domain}
                              </span>
                              {!isYou && (
                                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                  performance.level === 'success' ? 'bg-green-100 text-green-700' :
                                  performance.level === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                  performance.level === 'danger' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {performance.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {competitorVisibleColumns.includes('impressionShare') && (
                          <td className="px-6 py-4 text-right font-medium text-gray-900">
                            {competitor.impressionShare.toFixed(1)}%
                          </td>
                        )}
                        {competitorVisibleColumns.includes('overlapRate') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {competitor.overlapRate.toFixed(1)}%
                          </td>
                        )}
                        {competitorVisibleColumns.includes('positionAboveRate') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {competitor.positionAboveRate.toFixed(1)}%
                          </td>
                        )}
                        {competitorVisibleColumns.includes('topOfPageRate') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {competitor.topOfPageRate.toFixed(1)}%
                          </td>
                        )}
                        {competitorVisibleColumns.includes('absoluteTopOfPageRate') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {competitor.absoluteTopOfPageRate.toFixed(1)}%
                          </td>
                        )}
                        {competitorVisibleColumns.includes('outrankingShare') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {competitor.outrankingShare.toFixed(1)}%
                          </td>
                        )}
                      </tr>
                    );
                  })
                )
              ) : (
                paginatedCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No campaign data available
                    </td>
                  </tr>
                ) : (
                  paginatedCampaigns.map((campaign) => {
                    const share = campaign.impressionShare;
                    const totalLost = share.lostByRank + share.lostByBudget;
                    
                    return (
                      <tr 
                        key={campaign.campaignId}
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <td className="px-6 py-4 border-r border-gray-100">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              totalLost < 20 ? 'bg-green-500' :
                              totalLost < 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <Target className="h-4 w-4 inline mr-2 text-gray-400" />
                              <span className="font-medium text-gray-900">{campaign.campaignName}</span>
                            </div>
                          </div>
                        </td>
                        {campaignVisibleColumns.includes('impressionShare') && (
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-gray-900">{share.impressionShare.toFixed(1)}%</span>
                          </td>
                        )}
                        {campaignVisibleColumns.includes('lostByRank') && (
                          <td className="px-6 py-4 text-right">
                            <span className={`font-medium ${share.lostByRank > 20 ? 'text-red-600' : 'text-gray-600'}`}>
                              {share.lostByRank.toFixed(1)}%
                            </span>
                          </td>
                        )}
                        {campaignVisibleColumns.includes('lostByBudget') && (
                          <td className="px-6 py-4 text-right">
                            <span className={`font-medium ${share.lostByBudget > 20 ? 'text-orange-600' : 'text-gray-600'}`}>
                              {share.lostByBudget.toFixed(1)}%
                            </span>
                          </td>
                        )}
                        {campaignVisibleColumns.includes('topImpressionShare') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {share.topImpressionShare.toFixed(1)}%
                          </td>
                        )}
                        {campaignVisibleColumns.includes('absoluteTopImpressionShare') && (
                          <td className="px-6 py-4 text-right text-gray-600">
                            {share.absoluteTopImpressionShare.toFixed(1)}%
                          </td>
                        )}
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination - Dashboard style */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Show</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 25, 50].map(size => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <span className="text-sm text-gray-600">per page</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, viewLevel === 'account' ? filteredCompetitors.length : filteredCampaigns.length)} of {viewLevel === 'account' ? filteredCompetitors.length : filteredCampaigns.length}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                  if (page > totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 rounded-md text-sm ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

