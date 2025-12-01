'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Globe, Search, Download, BarChart3, Table2, Check, ChevronDown, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
import { useMccOverviewData } from '@/hooks';
import MemoizedAccountTable from './MemoizedAccountTable';
import ErrorBoundary from './ErrorBoundary';
import { KpiCardSkeleton } from './SkeletonLoader';
import MccHoverMetricsChart from './MccHoverMetricsChart';
import { AccountMetrics } from '@/types/mcc';
import { DateRange } from '@/types/common';
import { 
  formatKPIValue,
  getKpiChartColor,
  needsDualYAxis,
  getYAxisOrientation,
  getLeftAxisDomain,
  getRightAxisDomain,
  formatLeftYAxis,
  formatRightYAxis,
} from '@/utils';

// Available metrics for comparison - using exact same colors as Dashboard
const AVAILABLE_METRICS = [
  { id: 'clicks', label: 'Clicks', color: '#14b8a6' },
  { id: 'impressions', label: 'Impressions', color: '#8b5cf6' },
  { id: 'cost', label: 'Cost', color: '#f59e0b' },
  { id: 'conversions', label: 'Conversions', color: '#22c55e' },
  { id: 'ctr', label: 'CTR', color: '#3b82f6' },
  { id: 'avgCpc', label: 'CPC', color: '#ec4899' },
  { id: 'roas', label: 'ROAS', color: '#6366f1' },
  { id: 'conversionsValue', label: 'Conv. Value', color: '#06b6d4' },
];

interface MccOverviewViewProps {
  selectedDateRange: DateRange | null;
  onAccountClick?: (account: AccountMetrics) => void;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, accountName: string, accountId: string) => void;
  onMetricLeave?: (metricType?: string) => void;
}

const MccOverviewView: React.FC<MccOverviewViewProps> = ({
  selectedDateRange,
  onAccountClick,
  onMetricHover,
  onMetricLeave
}) => {
  // View mode: table or charts
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');
  
  // Charts state
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['clicks', 'impressions']);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);
  const [dateGranularity, setDateGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [manualGranularityOverride, setManualGranularityOverride] = useState(false);
  const [chartMode, setChartMode] = useState<'aggregate' | 'compare'>('aggregate');
  
  // Historical data for charts
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [historicalDataByAccount, setHistoricalDataByAccount] = useState<{[accountId: string]: any[]}>({});
  const [historicalLoading, setHistoricalLoading] = useState(false);

  // Local state for table controls
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [pageSize] = useState(50);

  // MCC Hover Metrics state
  const [mccHoverChart, setMccHoverChart] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: 0 as string | number
  });

  // Fetch MCC data with dynamic date range - MUST be before useEffects that use 'data'
  const { data, loading, error, refetch } = useMccOverviewData(selectedDateRange);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Calculate days from date range
  const getDateRangeDays = (range: typeof selectedDateRange) => {
    if (!range) return 30;
    if (range.apiDays) return range.apiDays;
    // Calculate from dates if apiDays not available
    const diffTime = Math.abs(range.endDate.getTime() - range.startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Auto-adjust granularity based on date range
  useEffect(() => {
    if (manualGranularityOverride) return;
    
    const days = getDateRangeDays(selectedDateRange);
    if (days <= 14) {
      setDateGranularity('daily');
    } else if (days <= 90) {
      setDateGranularity('weekly');
    } else {
      setDateGranularity('monthly');
    }
  }, [selectedDateRange, manualGranularityOverride]);

  // Fetch historical data when charts view is active and accounts change
  useEffect(() => {
    console.log('MCC Chart useEffect triggered:', { viewMode, accountsLoaded: !!data?.accounts, accountCount: data?.accounts?.length });
    
    if (viewMode !== 'charts') return;
    if (!data?.accounts || data.accounts.length === 0) {
      console.log('MCC Chart: Waiting for accounts to load...');
      return;
    }
    
    const fetchHistoricalData = async () => {
      // Get account IDs to fetch (selected or all accounts)
      const accountIdsToFetch = selectedAccountIds.length > 0 
        ? selectedAccountIds 
        : data.accounts.map(a => a.id); // Use ALL accounts, not just first 5
      
      console.log('MCC Chart: Fetching historical data for', accountIdsToFetch.length, 'accounts');
      
      if (accountIdsToFetch.length === 0) return;
      
      setHistoricalLoading(true);
      try {
        const days = getDateRangeDays(selectedDateRange);
        const url = `/api/mcc-historical?accountIds=${accountIdsToFetch.join(',')}&dateRange=${days}`;
        console.log('MCC Chart: API URL:', url);
        
        const response = await fetch(url);
        const result = await response.json();
        
        console.log('MCC Chart: API Response:', {
          success: result.success,
          aggregatedLength: result.data?.aggregated?.length || 0,
          byAccountLength: result.data?.byAccount?.length || 0,
          sampleAggregated: result.data?.aggregated?.[0],
        });
        
        if (result.success && result.data) {
          setHistoricalData(result.data.aggregated || []);
          // Store data by account for compare mode
          const byAccount: {[accountId: string]: any[]} = {};
          if (result.data.byAccount) {
            result.data.byAccount.forEach((acc: any) => {
              byAccount[acc.customerId] = acc.data;
            });
          }
          setHistoricalDataByAccount(byAccount);
        }
      } catch (error) {
        console.error('MCC Chart: Error fetching historical data:', error);
      } finally {
        setHistoricalLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [viewMode, selectedAccountIds, selectedDateRange, data?.accounts]);

  // Utility function for date range display
  const formatDateRangeDisplay = (range: DateRange | null): string => {
    if (!range) return 'Last 30 days';
    if (range.id === 'custom') {
      return `${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`;
    }
    return range.name;
  };

  // Handle sorting
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Handle account click
  const handleAccountClick = useCallback((account: AccountMetrics) => {
    if (onAccountClick) {
      onAccountClick(account);
    }
  }, [onAccountClick]);

  // MCC Hover Metrics handlers
  const handleMccMetricHover = useCallback((event: React.MouseEvent, metricType: string, metricValue: string | number) => {
    setMccHoverChart({
      isVisible: true,
      position: { x: event.clientX, y: event.clientY },
      metricType,
      metricValue
    });
  }, []);

  const handleMccMetricLeave = useCallback(() => {
    setMccHoverChart(prev => ({ ...prev, isVisible: false }));
  }, []);

  const handleMccChartHover = useCallback(() => {}, []);

  const handleMccChartLeave = useCallback(() => {
    setMccHoverChart(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Export functionality
  const handleExport = useCallback(() => {
    if (!data?.accounts) return;
    
    const csvData = data.accounts.map(account => ({
      'Account Name': account.name,
      'Country': account.countryCode,
      'Campaigns': account.campaignCount,
      'Clicks': account.metrics.clicks,
      'Impressions': account.metrics.impressions,
      'CTR': `${account.metrics.ctr.toFixed(2)}%`,
      'CPC': `€${account.metrics.avgCpc.toFixed(2)}`,
      'Cost': `€${account.metrics.cost.toFixed(2)}`,
      'Conversions': account.metrics.conversions,
      'CPA': `€${account.metrics.cpa.toFixed(2)}`,
      'Conversion Value': `€${account.metrics.conversionsValue.toFixed(2)}`,
      'ROAS': account.metrics.roas.toFixed(2)
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcc-overview-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [data?.accounts]);

  // KPI Cards showing totals with loading states
  const renderKpiCards = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {Array.from({ length: 5 }).map((_, index) => (
            <KpiCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (!data?.totals) return null;

    const kpis = [
      {
        label: 'Total Accounts',
        value: data.totals.accountCount?.toString() || '0',
        subtext: `${data.totals.campaignCount || 0} campaigns`,
        metricType: 'accounts',
        metricValue: data.totals.accountCount || 0
      },
      {
        label: 'Total Clicks',
        value: data.totals.clicks.toLocaleString(),
        subtext: `${data.totals.impressions.toLocaleString()} impressions`,
        metricType: 'clicks',
        metricValue: data.totals.clicks
      },
      {
        label: 'Total Cost',
        value: `€${data.totals.cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        subtext: `€${(data.totals.avgCpc || 0).toFixed(2)} avg CPC`,
        metricType: 'cost',
        metricValue: data.totals.cost
      },
      {
        label: 'Total Conversions',
        value: data.totals.conversions.toLocaleString(),
        subtext: `€${data.totals.conversionsValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} value`,
        metricType: 'conversions',
        metricValue: data.totals.conversions
      },
      {
        label: 'Overall CTR',
        value: `${data.totals.ctr.toFixed(2)}%`,
        subtext: `${data.totals.roas.toFixed(2)} ROAS`,
        metricType: 'ctr',
        metricValue: data.totals.ctr
      }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onMouseEnter={(e) => handleMccMetricHover(e, kpi.metricType, kpi.metricValue)}
            onMouseLeave={handleMccMetricLeave}
          >
            <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{kpi.subtext}</p>
          </div>
        ))}
      </div>
    );
  };

  // Controls section (simplified - inline with table header)
  const renderControls = () => (
    <div className="flex items-center space-x-2">
        {/* Search */}
          <div className="relative">
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
            <input
              type="text"
          placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          className="w-32 pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-transparent"
        />
        </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'all')}
        className="border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-teal-500"
            >
        <option value="all">All</option>
        <option value="active">Active</option>
            </select>

      <button
        onClick={handleExport}
        disabled={!data?.accounts || loading}
        className="flex items-center space-x-1 px-2 py-1 bg-gray-50 text-gray-600 rounded hover:bg-gray-100 disabled:opacity-50 text-xs border border-gray-200"
      >
        <Download className="w-3 h-3" />
        <span>CSV</span>
      </button>

          <button
            onClick={refetch}
            disabled={loading}
        className="px-2 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50 text-xs font-medium"
          >
        {loading ? '...' : 'Refresh'}
          </button>
    </div>
  );

  if (error) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center">
              <Globe className="h-6 w-6 text-red-600 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-red-900">Error Loading MCC Overview</h3>
                <p className="text-red-700 mt-1">Failed to load account data. Please try again.</p>
              </div>
            </div>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Toggle account selection
  const toggleAccountSelection = (accountId: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(accountId) 
        ? prev.filter(id => id !== accountId)
        : [...prev, accountId]
    );
  };

  // Toggle metric selection
  const toggleMetricSelection = (metricId: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricId) 
        ? prev.filter(id => id !== metricId)
        : [...prev, metricId]
    );
  };

  // Helper functions for date formatting
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };
  
  const getWeekKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    return `${date.getFullYear()}-W${Math.ceil((days + 1) / 7)}`;
  };
  
  const getMonthKey = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };
  
  const formatWeekLabel = (weekKey: string) => {
    const [, week] = weekKey.split('-W');
    return `W${week}`;
  };
  
  const formatMonthLabel = (monthKey: string) => {
    const [, month] = monthKey.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[parseInt(month) - 1];
  };

  // Generate chart data from historical data with date granularity
  const chartData = useMemo(() => {
    if (chartMode === 'aggregate') {
      // Aggregate mode - single line/bar for all accounts combined
      if (historicalData.length === 0) return [];
      
      if (dateGranularity === 'daily') {
        return historicalData.map(day => ({
          ...day,
          dateFormatted: formatDate(day.date)
        }));
      }
      
      // Aggregate by week or month
      const aggregated: { [key: string]: any } = {};
      
      for (const day of historicalData) {
        const key = dateGranularity === 'weekly' ? getWeekKey(day.date) : getMonthKey(day.date);
        
        if (!aggregated[key]) {
          aggregated[key] = {
            key,
            impressions: 0,
            clicks: 0,
            cost: 0,
            conversions: 0,
            conversionsValue: 0,
            days: 0
          };
        }
        
        aggregated[key].impressions += day.impressions;
        aggregated[key].clicks += day.clicks;
        aggregated[key].cost += day.cost;
        aggregated[key].conversions += day.conversions;
        aggregated[key].conversionsValue += day.conversionsValue;
        aggregated[key].days += 1;
      }
      
      return Object.values(aggregated)
        .map((period: any) => ({
          ...period,
          dateFormatted: dateGranularity === 'weekly' 
            ? formatWeekLabel(period.key) 
            : formatMonthLabel(period.key),
          ctr: period.impressions > 0 ? (period.clicks / period.impressions) * 100 : 0,
          avgCpc: period.clicks > 0 ? period.cost / period.clicks : 0,
          roas: period.cost > 0 ? period.conversionsValue / period.cost : 0,
          cpa: period.conversions > 0 ? period.cost / period.conversions : 0
        }))
        .sort((a, b) => a.key.localeCompare(b.key));
    } else {
      // Compare mode - separate lines for each account
      const accountIds = selectedAccountIds.length > 0 
        ? selectedAccountIds 
        : Object.keys(historicalDataByAccount).slice(0, 5);
      
      if (accountIds.length === 0) return [];
      
      // Get all unique dates
      const allDates = new Set<string>();
      accountIds.forEach(id => {
        (historicalDataByAccount[id] || []).forEach((d: any) => allDates.add(d.date));
      });
      
      // Create data points for each date with values for each account
      return Array.from(allDates).sort().map(date => {
        const point: any = { date, dateFormatted: formatDate(date) };
        
        accountIds.forEach(accountId => {
          const accountData = historicalDataByAccount[accountId] || [];
          const dayData = accountData.find((d: any) => d.date === date);
          const account = data?.accounts?.find(a => a.id === accountId);
          const shortName = account?.name?.split(' - ')[0] || accountId;
          
          // Add each metric for this account
          selectedMetrics.forEach(metric => {
            point[`${shortName}_${metric}`] = dayData ? dayData[metric] || 0 : 0;
          });
        });
        
        return point;
      });
    }
  }, [historicalData, historicalDataByAccount, dateGranularity, chartMode, selectedAccountIds, selectedMetrics, data?.accounts]);

  // Get account names for compare mode legend
  const compareAccountNames = useMemo(() => {
    const accountIds = selectedAccountIds.length > 0 
      ? selectedAccountIds 
      : Object.keys(historicalDataByAccount).slice(0, 5);
    
    return accountIds.map(id => {
      const account = data?.accounts?.find(a => a.id === id);
      return account?.name?.split(' - ')[0] || id;
    });
  }, [selectedAccountIds, historicalDataByAccount, data?.accounts]);


  // Format metric name (handles both aggregate and compare mode dataKeys)
  const formatMetricName = (dataKey: string) => {
    // First try direct metric match (aggregate mode)
    const directMatch = AVAILABLE_METRICS.find(m => m.id === dataKey);
    if (directMatch) return directMatch.label;
    
    // In compare mode, dataKey is like "DE_clicks" - format as "DE - Clicks"
    const parts = dataKey.split('_');
    if (parts.length >= 2) {
      const accountPart = parts.slice(0, -1).join(' '); // Account name
      const metricPart = parts[parts.length - 1]; // Metric ID
      const metricLabel = AVAILABLE_METRICS.find(m => m.id === metricPart)?.label || metricPart;
      return `${accountPart} - ${metricLabel}`;
    }
    
    return dataKey;
  };

  // Use Dashboard utilities for dual Y-axis - check if we need dual axis based on selected metrics
  const chartHasDualAxis = useMemo(() => {
    return needsDualYAxis(selectedMetrics, chartData);
  }, [selectedMetrics, chartData]);

  // Render the polished chart - EXACTLY matching Dashboard Charts component
  const renderChart = () => {
    if (historicalLoading) {
      return (
        <div className="h-[480px] bg-gray-50/30 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Loading performance data...</p>
          </div>
        </div>
      );
    }
    
    console.log('renderChart called with:', { chartDataLength: chartData.length, chartMode, selectedMetrics });
    
    if (chartData.length === 0) {
      return (
        <div className="h-[480px] bg-gray-50/30 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No data available</p>
            <p className="text-gray-400 text-sm mt-1">Select accounts to view performance trends</p>
          </div>
        </div>
      );
    }

    // Gradient definitions - EXACTLY matching Dashboard
    const gradientDefs = (
      <defs>
        {chartType === 'line' ? (
          // Line Chart Area Fill Gradients - matching Dashboard exactly
          selectedMetrics.map((metricId) => (
            <linearGradient
              key={`gradient-${metricId}`}
              id={`gradient-${metricId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={getKpiChartColor(metricId, selectedMetrics)} stopOpacity={0.15} />
              <stop offset="70%" stopColor={getKpiChartColor(metricId, selectedMetrics)} stopOpacity={0.05} />
              <stop offset="100%" stopColor={getKpiChartColor(metricId, selectedMetrics)} stopOpacity={0} />
            </linearGradient>
          ))
        ) : (
          // Bar Chart Fill Gradients - matching Dashboard exactly
          selectedMetrics.map((metricId) => (
            <linearGradient
              key={`barGradient-${metricId}`}
              id={`barGradient-${metricId}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={getKpiChartColor(metricId, selectedMetrics)} stopOpacity={0.9} />
              <stop offset="100%" stopColor={getKpiChartColor(metricId, selectedMetrics)} stopOpacity={0.60} />
            </linearGradient>
          ))
        )}
      </defs>
    );

    // Tooltip - EXACTLY matching Dashboard style
    const dashboardTooltip = (
      <Tooltip 
        content={({ active, payload, label }) => {
          if (!active || !payload || !payload.length) return null;
          
          const uniquePayload = payload.filter((entry: any, index: number, self: any[]) => 
            index === self.findIndex((e: any) => e.dataKey === entry.dataKey)
          );
          
          return (
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              fontSize: '13px',
              padding: '12px',
              minWidth: '160px'
            }}>
              <div style={{ 
                fontWeight: '600', 
                color: '#111827', 
                marginBottom: '8px',
                paddingBottom: '6px',
                borderBottom: '1px solid #f3f4f6'
              }}>
                {label}
              </div>
              {uniquePayload.map((entry: any, index: number) => {
                const color = getKpiChartColor(entry.dataKey, selectedMetrics);
                return (
                  <div key={index} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: index < uniquePayload.length - 1 ? '4px' : '0'
                  }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      marginRight: '8px',
                      flexShrink: 0
                    }}></div>
                    <span style={{ color, fontWeight: '500' }}>
                      {formatMetricName(entry.dataKey)} : {formatKPIValue(entry.dataKey, entry.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        }}
        wrapperStyle={{ outline: 'none' }}
        cursor={chartType === 'bar' ? { fill: 'rgba(0, 0, 0, 0.04)' } : false}
      />
    );

    // Common X-Axis - matching Dashboard
    const commonXAxis = (
      <XAxis 
        dataKey="dateFormatted" 
        stroke="#475569"
        fontSize={11}
        tickLine={true}
        tickSize={6}
        axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
        dy={12}
        tick={{ fill: '#475569' }}
        tickMargin={8}
      />
    );

    // Left Y-Axis - using Dashboard utilities
    const leftYAxis = (
      <YAxis 
        yAxisId="left"
        stroke="#475569"
        fontSize={11}
        tickLine={true}
        tickSize={6}
        axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
        dx={-10}
        width={48}
        tick={{ fill: '#475569' }}
        tickMargin={8}
        domain={getLeftAxisDomain(selectedMetrics, chartData)}
        tickFormatter={(value) => formatLeftYAxis(value, selectedMetrics, chartData)}
      />
    );

    // Right Y-Axis - using Dashboard utilities
    const rightYAxis = chartHasDualAxis && (
      <YAxis 
        yAxisId="right"
        orientation="right"
        stroke="#475569"
        fontSize={11}
        tickLine={true}
        tickSize={6}
        axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
        dx={10}
        width={48}
        tick={{ fill: '#475569' }}
        tickMargin={8}
        domain={getRightAxisDomain(selectedMetrics, chartData)}
        tickFormatter={(value) => formatRightYAxis(value, selectedMetrics, chartData)}
      />
    );

    return (
      <div className="h-[480px] bg-gray-50/30 rounded-lg px-2 py-6">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'line' ? (
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: chartHasDualAxis ? 50 : 25, left: 35, bottom: 25 }}
            >
              {gradientDefs}
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
              {commonXAxis}
              {leftYAxis}
              {rightYAxis}
              {dashboardTooltip}
              
              {/* Layer 1: Gradient Fill Areas (drawn first, behind lines) */}
              {selectedMetrics.map((metricId) => (
                <Area
                  key={`fill-${metricId}`}
                  yAxisId={chartHasDualAxis ? getYAxisOrientation(metricId, selectedMetrics, chartData) : 'left'}
                  type="monotoneX"
                  dataKey={metricId}
                  stroke="none"
                  fill={`url(#gradient-${metricId})`}
                  dot={false}
                />
              ))}
              
              {/* Layer 2: Lines (drawn second, on top of fills) */}
              {selectedMetrics.map((metricId) => (
                <Area
                  key={`line-${metricId}`}
                  yAxisId={chartHasDualAxis ? getYAxisOrientation(metricId, selectedMetrics, chartData) : 'left'}
                  type="monotoneX"
                  dataKey={metricId}
                  stroke={getKpiChartColor(metricId, selectedMetrics)}
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 20, right: chartHasDualAxis ? 50 : 25, left: 35, bottom: 25 }}
              barCategoryGap="20%"
              barGap={6}
            >
              {gradientDefs}
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
              {commonXAxis}
              {leftYAxis}
              {rightYAxis}
              {dashboardTooltip}
              
              {/* Bars with gradient fills */}
              {selectedMetrics.map((metricId) => (
                <Bar
                  key={metricId}
                  yAxisId={chartHasDualAxis ? getYAxisOrientation(metricId, selectedMetrics, chartData) : 'left'}
                  dataKey={metricId}
                  fill={`url(#barGradient-${metricId})`}
                  name={metricId}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={selectedMetrics.length === 1 ? 32 : 24}
                  stroke={getKpiChartColor(metricId, selectedMetrics)}
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    );
  };

  // Close dropdowns when clicking outside - use mousedown for better UX
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if click is inside a dropdown
      if (target.closest('[data-dropdown="account"]') || target.closest('[data-dropdown="metric"]')) {
        return; // Don't close if clicking inside dropdown
      }
      setAccountDropdownOpen(false);
      setMetricDropdownOpen(false);
    };
    
    if (accountDropdownOpen || metricDropdownOpen) {
      // Use mousedown so it fires before the click
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [accountDropdownOpen, metricDropdownOpen]);

  return (
    <ErrorBoundary>
      <div className="flex-1 p-4 sm:p-5 lg:p-6">
        <div className="max-w-full mx-auto">
          {/* Header - Compact */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-teal-600" />
              <h1 className="text-xl font-bold text-gray-900">MCC Overview</h1>
              <span className="text-sm text-gray-500">
                · {formatDateRangeDisplay(selectedDateRange)}
              </span>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Table2 className="w-4 h-4" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('charts')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'charts' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Charts</span>
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          {renderKpiCards()}

          {viewMode === 'table' ? (
            /* Account Table with integrated controls */
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Account Performance</h2>
                  <p className="text-xs text-gray-500">
                    {data?.accounts?.length || 0} accounts · Click row to expand comparison
                  </p>
                </div>
                {/* Controls moved into header */}
                {renderControls()}
              </div>
              
              <div className="overflow-x-auto">
                <MemoizedAccountTable
                  data={data}
                  loading={loading}
                  searchTerm={debouncedSearchTerm}
                  pageSize={pageSize}
                  sortColumn={sortColumn}
                  sortDirection={sortDirection}
                  statusFilter={statusFilter}
                  onSort={handleSort}
                  onAccountClick={handleAccountClick}
                  onMetricHover={onMetricHover}
                  onMetricLeave={onMetricLeave}
                />
              </div>
            </div>
          ) : (
            /* Charts View - Polished Dashboard Style */
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Header with controls */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Performance Trends</h2>
                    <p className="text-sm text-gray-500">
                      {selectedMetrics.length === 1 
                        ? `${formatMetricName(selectedMetrics[0])} over ${formatDateRangeDisplay(selectedDateRange)}`
                        : `${selectedMetrics.length} metrics over ${formatDateRangeDisplay(selectedDateRange)}`
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Date Granularity Toggle - Dashboard Style */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => { setDateGranularity('daily'); setManualGranularityOverride(true); }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                          dateGranularity === 'daily'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Daily
                      </button>
                      <button
                        onClick={() => { setDateGranularity('weekly'); setManualGranularityOverride(true); }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                          dateGranularity === 'weekly'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Weekly
                      </button>
                      <button
                        onClick={() => { setDateGranularity('monthly'); setManualGranularityOverride(true); }}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                          dateGranularity === 'monthly'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Monthly
                      </button>
                    </div>
                    
                    {/* Chart Type Toggle - Dashboard Style */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setChartType('line')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                          chartType === 'line'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>Line</span>
                      </button>
                      <button
                        onClick={() => setChartType('bar')}
                        className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                          chartType === 'bar'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4" />
                        <span>Bar</span>
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Selectors Row */}
                <div className="flex items-center space-x-4">
                  {/* Account Selector */}
                  <div className="relative" data-dropdown="account">
                    <button
                      onClick={() => { setAccountDropdownOpen(!accountDropdownOpen); setMetricDropdownOpen(false); }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700 font-medium">
                        {selectedAccountIds.length === 0 
                          ? 'All Accounts' 
                          : `${selectedAccountIds.length} Account${selectedAccountIds.length > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${accountDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {accountDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden flex flex-col">
                        {/* All / Clear buttons */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                          <button
                            onClick={() => setSelectedAccountIds(data?.accounts?.map(a => a.id) || [])}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setSelectedAccountIds([])}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="p-2 overflow-y-auto max-h-64">
                          {data?.accounts?.map(account => (
                            <button
                              key={account.id}
                              onClick={() => toggleAccountSelection(account.id)}
                              className="w-full flex items-center px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left transition-colors"
                            >
                              <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center transition-colors ${
                                selectedAccountIds.includes(account.id) 
                                  ? 'bg-teal-500 border-teal-500' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}>
                                {selectedAccountIds.includes(account.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm text-gray-700 truncate font-medium">{account.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metric Selector */}
                  <div className="relative" data-dropdown="metric">
                    <button
                      onClick={() => { setMetricDropdownOpen(!metricDropdownOpen); setAccountDropdownOpen(false); }}
                      className="flex items-center space-x-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                    >
                      <span className="text-gray-700 font-medium">
                        {selectedMetrics.length === 0 
                          ? 'Select Metrics' 
                          : `${selectedMetrics.length} Metric${selectedMetrics.length > 1 ? 's' : ''}`}
                      </span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${metricDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {metricDropdownOpen && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* All / Clear buttons */}
                        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
                          <button
                            onClick={() => setSelectedMetrics(AVAILABLE_METRICS.map(m => m.id))}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700"
                          >
                            All
                          </button>
                          <button
                            onClick={() => setSelectedMetrics([])}
                            className="text-xs font-medium text-gray-500 hover:text-gray-700"
                          >
                            Clear
                          </button>
                        </div>
                        <div className="p-2">
                          {AVAILABLE_METRICS.map(metric => (
                            <button
                              key={metric.id}
                              onClick={() => toggleMetricSelection(metric.id)}
                              className="w-full flex items-center px-3 py-2.5 hover:bg-gray-50 rounded-lg text-left transition-colors"
                            >
                              <div className={`w-5 h-5 rounded-md border-2 mr-3 flex items-center justify-center transition-colors ${
                                selectedMetrics.includes(metric.id) 
                                  ? 'bg-teal-500 border-teal-500' 
                                  : 'border-gray-300 hover:border-gray-400'
                              }`}>
                                {selectedMetrics.includes(metric.id) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div 
                                className="w-3 h-3 rounded-full mr-2.5" 
                                style={{ backgroundColor: metric.color }} 
                              />
                              <span className="text-sm text-gray-700 font-medium">{metric.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Aggregate / Compare Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setChartMode('aggregate')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        chartMode === 'aggregate'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Aggregate
                    </button>
                    <button
                      onClick={() => setChartMode('compare')}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        chartMode === 'compare'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Compare
                    </button>
                  </div>
                  
                  {/* Legend - show metrics with their colors using Dashboard colors */}
                  <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-200">
                    {selectedMetrics.map(metricId => (
                      <div key={metricId} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getKpiChartColor(metricId, selectedMetrics) }} 
                        />
                        <span className="text-xs font-medium text-gray-600">
                          {AVAILABLE_METRICS.find(m => m.id === metricId)?.label || metricId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Chart Area */}
              <div className="p-6">
                {renderChart()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MCC Hover Metrics Chart */}
      <MccHoverMetricsChart
        isVisible={mccHoverChart.isVisible}
        position={mccHoverChart.position}
        metricType={mccHoverChart.metricType}
        metricValue={mccHoverChart.metricValue}
        data={data}
        onMouseEnter={handleMccChartHover}
        onMouseLeave={handleMccChartLeave}
      />
    </ErrorBoundary>
  );
};

export default MccOverviewView; 
