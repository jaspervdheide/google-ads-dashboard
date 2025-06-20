'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Globe, Search, Filter, BarChart3, Download, Users, Loader2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useMccOverviewData } from '@/hooks';
import MemoizedAccountTable from './MemoizedAccountTable';
import ErrorBoundary from './ErrorBoundary';
import { KpiCardSkeleton, ChartSkeleton } from './SkeletonLoader';
import MccHoverMetricsChart from './MccHoverMetricsChart';
import { AccountMetrics } from '@/types/mcc';
import { DateRange } from '@/types/common';

interface MccOverviewViewProps {
  // Props to match other view components - receive date range from parent
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
  // Local state for table controls
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [pageSize] = useState(50); // Show more accounts by default
  
  // Advanced features state
  const [activeView, setActiveView] = useState<'overview' | 'charts' | 'comparison'>('overview');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // MCC Hover Metrics state
  const [mccHoverChart, setMccHoverChart] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: 0 as string | number
  });

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch MCC data with dynamic date range
  const { data, loading, error, refetch } = useMccOverviewData(selectedDateRange);

  // Utility function for date range display
  const formatDateRangeDisplay = (range: DateRange | null): string => {
    if (!range) return 'Last 30 days';
    if (range.id === 'custom') {
      return `${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`;
    }
    return range.name;
  };

  // Handle sorting - memoized for performance
  const handleSort = useCallback((column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }, [sortColumn, sortDirection]);

  // Handle account click - memoized for performance
  const handleAccountClick = useCallback((account: AccountMetrics) => {
    if (onAccountClick) {
      onAccountClick(account);
    } else {
      console.log('Account selected:', account.name, account.id);
      // Could implement navigation to single account view here
    }
  }, [onAccountClick]);

  // Handle account selection for comparison
  const handleAccountSelect = useCallback((accountId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedAccounts(prev => [...prev, accountId]);
    } else {
      setSelectedAccounts(prev => prev.filter(id => id !== accountId));
    }
  }, []);

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

  const handleMccChartHover = useCallback(() => {
    // Keep chart visible when hovering over it
  }, []);

  const handleMccChartLeave = useCallback(() => {
    setMccHoverChart(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Export functionality - memoized for performance
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

  // Account comparison data
  const comparisonData = useMemo(() => {
    if (!data?.accounts || selectedAccounts.length === 0) return null;
    
    return data.accounts
      .filter(account => selectedAccounts.includes(account.id))
      .map(account => ({
        name: account.name.length > 15 ? account.name.substring(0, 15) + '...' : account.name,
        clicks: account.metrics.clicks,
        cost: account.metrics.cost,
        conversions: account.metrics.conversions,
        roas: account.metrics.roas,
        ctr: account.metrics.ctr
      }));
  }, [data?.accounts, selectedAccounts]);

  // Chart data for visualizations
  const chartData = useMemo(() => {
    if (!data?.accounts) return { performance: [], distribution: [], trends: [] };

    // Top 10 accounts by cost for performance chart
    const performanceData = data.accounts
      .sort((a, b) => b.metrics.cost - a.metrics.cost)
      .slice(0, 10)
      .map(account => ({
        name: account.name.length > 12 ? account.name.substring(0, 12) + '...' : account.name,
        cost: account.metrics.cost,
        conversions: account.metrics.conversions,
        roas: account.metrics.roas
      }));

    // Country distribution for pie chart
    const countryGroups = data.accounts.reduce((acc, account) => {
      acc[account.countryCode] = (acc[account.countryCode] || 0) + account.metrics.cost;
      return acc;
    }, {} as Record<string, number>);

    const distributionData = Object.entries(countryGroups).map(([country, cost]) => ({
      name: country,
      value: cost,
      accounts: data.accounts.filter(a => a.countryCode === country).length
    }));

    return { performance: performanceData, distribution: distributionData, trends: [] };
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {kpis.map((kpi, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow duration-200"
            onMouseEnter={(e) => handleMccMetricHover(e, kpi.metricType, kpi.metricValue)}
            onMouseLeave={handleMccMetricLeave}
          >
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{kpi.value}</p>
                <p className="text-sm text-gray-500 mt-1">{kpi.subtext}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Charts section with loading states
  const renderCharts = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      );
    }

    const COLORS = ['#0891b2', '#0d9488', '#059669', '#10b981', '#34d399', '#6ee7b7'];
    
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Accounts by Cost</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.performance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="name" 
                  stroke="#6b7280" 
                  fontSize={11}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'cost' ? `€${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                    name === 'cost' ? 'Cost' : name === 'conversions' ? 'Conversions' : 'ROAS'
                  ]}
                  labelStyle={{ color: '#374151' }}
                />
                <Bar dataKey="cost" fill="#0891b2" name="cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Country Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Cost Distribution by Country</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.distribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {chartData.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Cost']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    );
  };

  // Account comparison section
  const renderComparison = () => {
    if (!comparisonData || comparisonData.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <div className="text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Compare Accounts</h3>
            <p className="text-gray-500 mb-4">Select accounts from the table below to compare their performance</p>
            <div className="text-sm text-gray-400">
              Tip: Use Ctrl/Cmd + Click to select multiple accounts in the table
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Account Comparison</h3>
          <button
            onClick={() => setSelectedAccounts([])}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear Selection
          </button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Comparison Chart */}
          <div className="h-80">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Cost vs Conversions</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#6b7280" fontSize={11} />
                <YAxis stroke="#6b7280" fontSize={11} />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'cost' ? `€${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
                    name === 'cost' ? 'Cost' : 'Conversions'
                  ]}
                />
                <Bar dataKey="cost" fill="#0891b2" name="cost" />
                <Bar dataKey="conversions" fill="#059669" name="conversions" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Comparison Table */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 font-medium text-gray-900">Account</th>
                    <th className="text-right py-2 font-medium text-gray-900">CTR</th>
                    <th className="text-right py-2 font-medium text-gray-900">ROAS</th>
                    <th className="text-right py-2 font-medium text-gray-900">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((account, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-2 text-gray-900">{account.name}</td>
                      <td className="py-2 text-right text-gray-600">{account.ctr.toFixed(2)}%</td>
                      <td className="py-2 text-right text-gray-600">{account.roas.toFixed(2)}</td>
                      <td className="py-2 text-right text-gray-600">€{account.cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced controls section
  const renderControls = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      {/* View Tabs */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
              activeView === 'overview'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveView('charts')}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
              activeView === 'charts'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Charts</span>
          </button>
          <button
            onClick={() => setActiveView('comparison')}
            className={`flex items-center space-x-2 px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
              activeView === 'comparison'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Compare</span>
          </button>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={!data?.accounts || loading}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-gray-200"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-200"
            />
            {searchTerm !== debouncedSearchTerm && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'active' | 'all')}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Accounts</option>
              <option value="active">Active Only</option>
            </select>
          </div>

          <button
            onClick={refetch}
            disabled={loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
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

  return (
    <ErrorBoundary>
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-teal-600" />
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">MCC Overview</h1>
            </div>
            <p className="text-sm sm:text-base text-gray-600">
              Cross-account performance overview for {formatDateRangeDisplay(selectedDateRange)}
              {data?.dateRange && (
                <span className="ml-2 text-xs sm:text-sm block sm:inline">
                  ({new Date(data.dateRange.startDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toLocaleDateString()} - {new Date(data.dateRange.endDate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')).toLocaleDateString()})
                </span>
              )}
            </p>
          </div>

          {/* KPI Cards - Always show */}
          {renderKpiCards()}

          {/* Controls */}
          {renderControls()}

          {/* Conditional Content Based on Active View */}
          {activeView === 'overview' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Account Performance</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {data?.accounts?.length || 0} accounts with detailed metrics
                </p>
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
                  selectedAccounts={selectedAccounts}
                  onAccountSelect={handleAccountSelect}
                />
              </div>
            </div>
          )}

          {activeView === 'charts' && renderCharts()}

          {activeView === 'comparison' && renderComparison()}
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