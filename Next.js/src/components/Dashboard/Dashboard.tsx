'use client';

// =============================================================================
// REACT AND CORE IMPORTS
// =============================================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// =============================================================================
// UTILITY IMPORTS (from our extracted modules)
// =============================================================================

import { 
  // Formatters
  formatNumber, 
  formatCurrency, 
  formatPercentage, 
  formatLargeNumber, 
  formatKPIValue, 
  calculatePOAS,
  // Date helpers
  DateRange, 
  formatDateForAPI, 
  getApiDateRange, 
  generateDateRanges, 
  formatDateRangeDisplay, 
  isValidDateRange, 
  formatTimeAgo,
  // Table helpers
  getFilteredAndSortedCampaigns, 
  calculateTableTotals, 
  getStatusIcon, 
  getPerformanceIndicator, 
  getPerformanceColor, 
  getPerformanceIndicatorClass, 
  applyPreFilters, 
  getHighSpendThreshold
} from '../../utils';

// =============================================================================
// TYPE IMPORTS (from our extracted types)
// =============================================================================

import { 
  Account,
  CampaignData, 
  Campaign, 
  AdGroup, 
  AdGroupData, 
  Keyword, 
  KeywordData 
} from '../../types';

// =============================================================================
// CUSTOM HOOKS (from our extracted hooks)
// =============================================================================

import { 
  useCampaignData, 
  useHistoricalData, 
  useAnomalyData 
} from '../../hooks';

// =============================================================================
// COMPONENT IMPORTS
// =============================================================================

import KPICards from './KPICards';
import Charts from './Charts';
import CampaignTable from './CampaignTable';

// =============================================================================
// ICON IMPORTS
// =============================================================================

import { 
  LayoutDashboard, 
  Target, 
  Search, 
  Settings, 
  Bell, 
  User,
  TrendingUp,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  X,
  Award,
  Package,
  MousePointer,
  Eye,
  Euro,
  CreditCard,
  CheckCircle,
  BarChart3,
  Calculator,
  Trophy,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  History,
  CalendarDays,
  ArrowUpDown,
  MoreHorizontal,
  Play,
  Pause,
  Edit,
  Zap,
  PieChart as PieChartIcon,
  RefreshCw,
  Percent,
  Download, 
  Plus, 
  MoreVertical, 
  Edit3, 
  FileText
  } from 'lucide-react';

// =============================================================================
// THIRD-PARTY IMPORTS
// =============================================================================

import { clearCache, getFromCache, saveToCache } from "../../app/utils/cache.js";
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import HoverMetricsChart from '../HoverMetricsChart';

// =============================================================================
// TYPE DEFINITIONS (component-specific)
// =============================================================================

// Extended Account type with click data
type AccountWithClicks = Account & { totalClicks: number };

// Keep your local interface but rename it
interface LocalCustomDateRange {
  startDate: Date | string;
  endDate: Date | string;
}

// =============================================================================
// COMPONENT DEFINITION AND CUSTOM ICON
// =============================================================================

// Custom Kovvar Icon Component
const KovvarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g>
      {/* Large curved arrow */}
      <path d="M2 18 C2 10, 8 5, 16 8 C18 9, 19 10, 19 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      
      {/* Medium curved arrow */}
      <path d="M5 16 C5 12, 9 9, 14 10 C15.5 10.5, 16 11.5, 16 13" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
      
      {/* Arrow head pointing right */}
      <path d="M16 10 L20 12 L16 14 Z" fill="currentColor"/>
      
      {/* Small curved element */}
      <path d="M8 14 C8 12, 10 11, 12 12" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
    </g>
  </svg>
);

  // =============================================================================
  // NAVIGATION CONFIGURATION
  // =============================================================================

// Premium navigation structure
const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', name: 'Ad Groups', icon: Target },
  { id: 'keywords', name: 'Keywords', icon: Search },
  { id: 'brands', name: 'Brands', icon: Award },
  { id: 'products', name: 'Products', icon: Package },
  { id: 'poas', name: 'POAS', icon: TrendingUp },
];
  


// =============================================================================
// MAIN DASHBOARD COMPONENT
// =============================================================================

export default function Dashboard() {

  // =============================================================================
  // STATE MANAGEMENT
  // =============================================================================
  
  // Account and data state
    const [, setAllAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountWithClicks[]>([]);
    const [selectedAccount, setSelectedAccount] = useState<string>('');
    
  // Date range state - must be declared before hooks that use it
    const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
    const [customDateRange, setCustomDateRange] = useState<LocalCustomDateRange>({
      startDate: '',
      endDate: ''
  });
    
  // Data fetching triggers
    const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [historicalRefreshTrigger, setHistoricalRefreshTrigger] = useState(false);
  const [anomalyRefreshTrigger, setAnomalyRefreshTrigger] = useState(false);
  
    // UI state management
  const [todayMetrics, setTodayMetrics] = useState<{clicks: number, spend: number}>({ clicks: 0, spend: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Dropdown states
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
    const [anomalyDropdownOpen, setAnomalyDropdownOpen] = useState(false);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);
  
  // Navigation and page state
    const [currentPage, setCurrentPage] = useState<string>('dashboard');
  
  // Chart configuration state
    const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(['clicks']);
  const [selectedKPIs, setSelectedKPIs] = useState<string[]>(['impressions', 'clicks']);
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [dateGranularity, setDateGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [manualGranularityOverride, setManualGranularityOverride] = useState<boolean>(false);
  
  // Campaign table state
  const [campaignSearch, setCampaignSearch] = useState<string>('');
  const [campaignSort, setCampaignSort] = useState<{field: string, direction: 'asc' | 'desc' | null}>({field: 'name', direction: 'asc'});
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [performanceFilter, setPerformanceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState<boolean>(false);
  
  // Campaign pre-filters and view state
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [adGroupData, setAdGroupData] = useState<{[campaignId: string]: AdGroupData}>({});
  const [campaignViewMode, setCampaignViewMode] = useState<'table' | 'charts'>('table');

  // Hover metrics chart state
  const [hoverChart, setHoverChart] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: '',
    campaignName: '',
    campaignId: ''
  });

    // Table state (missing state variables added)
    const [tablePageSize, setTablePageSize] = useState<number>(25);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [tableSortColumn, setTableSortColumn] = useState<string>('name');
    const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc');
 
  // =============================================================================
    // CUSTOM HOOKS (using our extracted hooks)
  // =============================================================================
 
    const { 
      data: campaignData, 
      loading: campaignLoading, 
      error: campaignError, 
      kpiPercentageChanges 
    } = useCampaignData(selectedAccount, selectedDateRange, refreshTrigger);
  
    const { 
      data: historicalData, 
      loading: historicalLoading, 
      error: historicalError 
    } = useHistoricalData(selectedAccount, selectedDateRange, historicalRefreshTrigger);
  
    const { 
      data: anomalyData, 
      loading: anomalyLoading, 
      error: anomalyError 
    } = useAnomalyData(anomalyRefreshTrigger); 

// =============================================================================
  // UTILITY FUNCTIONS (component-specific)
// =============================================================================

// Initialize date ranges (memoized to prevent infinite re-renders)
const dateRanges = useMemo(() => generateDateRanges(), []);

// Clean country code display - remove parentheses content
const cleanCountryCode = (countryCode: string) => {
  // "FR (Tapis)" → "FR", "NL" → "NL"
  return countryCode.split(' ')[0];
};

// Clean account name display - remove country prefix if it already exists
const getDisplayName = (account: Account) => {
  // Check if Account type has countryCode property - if not, just return name
  if (!('countryCode' in account) || !account.countryCode) {
    return (account as any).name || 'Unknown Account';
  }
  
  const cleanCode = cleanCountryCode((account as any).countryCode);
  // If name already starts with country code, use as is
  // Otherwise, prepend the country code
  if ((account as any).name?.startsWith(cleanCode + ' - ')) {
    return (account as any).name;
  }
  return `${cleanCode} - ${(account as any).name}`;
};

// Format date range display (using imported helper)
const formatDateRangeDisplayLocal = (range: DateRange): string => {
  return formatDateRangeDisplay(range);
};

// Custom date picker handlers
const handleCustomDateApply = () => {
  const customRange: DateRange = {
    id: 'custom',
    name: 'Custom',
    icon: Calendar,
    startDate: typeof customDateRange.startDate === 'string' 
      ? new Date(customDateRange.startDate) 
      : customDateRange.startDate,
    endDate: typeof customDateRange.endDate === 'string' 
      ? new Date(customDateRange.endDate) 
      : customDateRange.endDate
  };
  setSelectedDateRange(customRange);
  setCustomDateModalOpen(false);
  setDateDropdownOpen(false);
};

// Fixed custom date handler
const handleCustomDateApplyFixed = () => {
  const customRange: DateRange = {
    id: 'custom',
    name: 'Custom',
    icon: Calendar,
    startDate: new Date(customDateRange.startDate),
    endDate: new Date(customDateRange.endDate)
  };
  setSelectedDateRange(customRange);
  setCustomDateModalOpen(false);
  setDateDropdownOpen(false);
};

// Performance distribution for pie chart
const getPerformanceDistribution = (campaignData: CampaignData | null) => {
  if (!campaignData?.campaigns) return [];
  
  const campaigns = campaignData.campaigns;
  const high = campaigns.filter(c => c.ctr > 0.05).length;
  const medium = campaigns.filter(c => c.ctr > 0.02 && c.ctr <= 0.05).length;
  const low = campaigns.filter(c => c.ctr <= 0.02).length;
  
  return [
    { name: 'High Performance', value: high, color: '#10B981' },
    { name: 'Medium Performance', value: medium, color: '#F59E0B' },
    { name: 'Low Performance', value: low, color: '#EF4444' }
  ];
};

// =============================================================================
// DATA FETCHING FUNCTIONS
// =============================================================================

// Fetch today's campaign data for an account
const fetchTodayClicks = async (accountId: string): Promise<{clicks: number, spend: number}> => {
  console.log("🔄 FETCHING TODAY CLICKS DATA");
  try {
    const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=1`);
    const result = await response.json();
    if (result.success && result.data?.totals) {
      return { 
        clicks: result.data.totals.clicks || 0,
        spend: result.data.totals.cost || 0
      };
    }
    return { clicks: 0, spend: 0 };
  } catch (err) {
    console.error(`Error fetching today's data for account ${accountId}:`, err);
    return { clicks: 0, spend: 0 };
  }
};

// Fetch campaign data for an account to get click count (30-day for filtering)
const fetchAccountClicks = async (accountId: string): Promise<number> => {
  console.log("🔄 FETCHING ACCOUNT CLICKS DATA");
  try {
    const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=30`);
    const result = await response.json();
    if (result.success && result.data?.totals) {
      return result.data.totals.clicks || 0;
    }
    return 0;
  } catch (err) {
    console.error(`Error fetching clicks for account ${accountId}:`, err);
    return 0;
  }
};

// Filter accounts with clicks > 0
const filterActiveAccounts = async (accounts: Account[]): Promise<AccountWithClicks[]> => {
  const accountsWithClicks = await Promise.all(
    accounts.map(async (account): Promise<AccountWithClicks> => {
      const clicks = await fetchAccountClicks(account.id);
      return { ...account, totalClicks: clicks };
    })
  );

  // Filter accounts with clicks > 0
  const activeAccounts = accountsWithClicks.filter(account => account.totalClicks > 0);
  return activeAccounts;
};

// Calculate today's performance - actual today's clicks
const calculateTodayMetrics = async (): Promise<{clicks: number, spend: number}> => {
  if (selectedAccount) {
    // Fetch actual today's data for selected account
    const todayData = await fetchTodayClicks(selectedAccount);
    return todayData;
  } else if (filteredAccounts.length > 0) {
    // Fetch today's data for all active accounts and sum them
    const todayPromises = filteredAccounts.map(account => fetchTodayClicks(account.id));
    const todayResults = await Promise.all(todayPromises);
    
    const totalTodayClicks = todayResults.reduce((sum, result) => sum + result.clicks, 0);
    const totalTodaySpend = todayResults.reduce((sum, result) => sum + result.spend, 0);
    
    return { clicks: totalTodayClicks, spend: totalTodaySpend };
  }
  return { clicks: 0, spend: 0 };
};

// Fetch accounts on component mount
const fetchAccounts = async () => {
  console.log("🔄 FETCHING ACCOUNTS DATA");
  try {
    setLoading(true);
    const response = await fetch('/api/accounts');
    const result = await response.json();
    
    if (result.success && result.data) {
      setAllAccounts(result.data);
      
      // Filter accounts with clicks > 0
      const activeAccounts = await filterActiveAccounts(result.data);
      setFilteredAccounts(activeAccounts);
      
      // Auto-select first active account
      if (activeAccounts.length > 0) {
        setSelectedAccount(activeAccounts[0].id);
      }
    } else {
      setError(result.message || 'Failed to fetch accounts');
    }
  } catch (err) {
    setError('Error fetching accounts');
    console.error('Error fetching accounts:', err);
  } finally {
    setLoading(false);
  }
};

// =============================================================================
// MEMOIZED CALCULATIONS
// =============================================================================

// Table data processing (using extracted table helpers)
const { displayedCampaigns, tableTotals } = useMemo(() => {
  if (!campaignData?.campaigns) return { displayedCampaigns: [], tableTotals: null };

  const filteredCampaigns = getFilteredAndSortedCampaigns(
    campaignData,
    statusFilter,
    activeFilters,
    campaignSearch,
    campaignSort
  );

  const totals = calculateTableTotals(campaignData, statusFilter, activeFilters, campaignSearch, campaignSort);

  return {
    displayedCampaigns: filteredCampaigns,
    tableTotals: totals
  };
}, [campaignData, statusFilter, activeFilters, campaignSearch, campaignSort]);

// =============================================================================
// EVENT HANDLERS
// =============================================================================

// Date range handlers
const handleDateRangeChange = useCallback((range: DateRange) => {
  setSelectedDateRange(range);
  if (!manualGranularityOverride) {
    if (range.id === 'today' || range.id === 'yesterday' || range.id === 'last-7-days') {
      setDateGranularity('daily');
    } else if (range.id === 'last-30-days' || range.id === 'last-month') {
      setDateGranularity('weekly');
    } else {
      setDateGranularity('monthly');
    }
  }
}, [manualGranularityOverride]);

const handleCustomDateRangeChange = useCallback((range: LocalCustomDateRange) => {
  setCustomDateRange(range);
  // Create a proper custom DateRange object
  const customRange: DateRange = {
    id: 'custom',
    name: 'Custom',
    icon: Calendar,
    startDate: typeof range.startDate === 'string' 
      ? new Date(range.startDate) 
      : range.startDate,
    endDate: typeof range.endDate === 'string' 
      ? new Date(range.endDate) 
      : range.endDate
  };
  setSelectedDateRange(customRange);
}, []);

// Table handlers
const handleSort = useCallback((key: keyof Campaign) => {
  setCampaignSort(prevConfig => ({
    field: key as string,
    direction: prevConfig.field === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
  }));
}, []);

// Table handlers (missing handlers added)
const handleTableSort = useCallback((column: string) => {
  if (tableSortColumn === column) {
    setTableSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setTableSortColumn(column);
    setTableSortDirection('asc');
  }
}, [tableSortColumn]);

// Export handler
const handleExport = useCallback(() => {
  if (!campaignData?.campaigns) return;
  
  const csvContent = [
    ['Campaign Name', 'Status', 'Clicks', 'Impressions', 'CTR', 'CPC', 'Cost'].join(','),
    ...displayedCampaigns.map(campaign => [
      `"${campaign.name}"`,
      campaign.status,
      campaign.clicks,
      campaign.impressions,
      (campaign.ctr * 100).toFixed(2) + '%',
      formatCurrency(campaign.avgCpc),
      formatCurrency(campaign.cost)
    ].join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `campaigns-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}, [displayedCampaigns]);

// Campaign click handler
const handleCampaignClick = useCallback((campaign: Campaign) => {
  console.log('Campaign clicked:', campaign);
  // Add your campaign detail navigation logic here
}, []);

// KPI selection handler
const handleKPISelection = useCallback((kpi: string) => {
  console.log('🎯 handleKPISelection called:', { kpi, currentSelectedKPIs: selectedKPIs, currentSelectedChartMetrics: selectedChartMetrics });
  
  setSelectedKPIs(prev => {
    const newKPIs = prev.includes(kpi) ? prev.filter(k => k !== kpi) : [...prev, kpi];
    console.log('📊 setSelectedKPIs:', { prev, kpi, newKPIs });
    return newKPIs;
  });
  
  setSelectedChartMetrics(prev => {
    const newMetrics = prev.includes(kpi) ? prev.filter(k => k !== kpi) : [...prev, kpi];
    console.log('📊 setSelectedChartMetrics:', { prev, kpi, newMetrics });
    return newMetrics;
  });
}, [selectedKPIs, selectedChartMetrics]);

// Refresh handler
const handleRefresh = useCallback(() => {
  console.log("🔥 REFRESH BUTTON CLICKED - CACHE CLEARING!");
  setLoading(true);
  
  try {
    clearCache();
    setRefreshTrigger(prev => !prev);
    setHistoricalRefreshTrigger(prev => !prev);
    setAnomalyRefreshTrigger(prev => !prev);
  } catch (error) {
    console.error("Error refreshing data:", error);
    setError("Failed to refresh data");
  } finally {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }
}, []);

// Hover metrics handlers
const handleMetricHover = (event: React.MouseEvent, metricType: string, metricValue: string | number, campaignName: string, campaignId: string) => {
  const rect = event.currentTarget.getBoundingClientRect();
  setHoverChart({
    isVisible: true,
    position: { x: rect.right + 10, y: rect.top },
    metricType,
    metricValue: metricValue.toString(),
    campaignName,
    campaignId
  });
};

const handleMetricLeave = () => {
  setHoverChart(prev => ({ ...prev, isVisible: false }));
};

// Campaign filter handlers
const toggleFilter = (filterType: string) => {
  setActiveFilters(prev => {
    const newFilters = new Set(prev);
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType);
    } else {
      newFilters.add(filterType);
    }
    return newFilters;
  });
};

// Campaign selection handlers
const selectAllCampaigns = () => {
  setSelectedCampaigns(displayedCampaigns.map((c: Campaign) => c.id));
};

const clearAllCampaigns = () => setSelectedCampaigns([]);

const toggleCampaignSelection = (campaignId: string) => {
  setSelectedCampaigns(prev => 
    prev.includes(campaignId) 
      ? prev.filter(id => id !== campaignId)
      : [...prev, campaignId]
  );
};

// =============================================================================
// EFFECTS
// =============================================================================

// Monitor selectedChartMetrics changes
useEffect(() => {
  console.log('🔄 selectedChartMetrics changed:', selectedChartMetrics);
}, [selectedChartMetrics]);

// Set default date range on component mount
useEffect(() => {
  if (!selectedDateRange) {
    const defaultRange = dateRanges.find(range => range.id === 'last-30-days');
    if (defaultRange) {
      setSelectedDateRange(defaultRange);
    }
  }
}, [selectedDateRange]); // Removed dateRanges from deps since it's memoized

// Fetch accounts on component mount
useEffect(() => {
  fetchAccounts();
}, []);

// Update today's metrics when account or filtered accounts change
useEffect(() => {
  const updateTodayMetrics = async () => {
    const metrics = await calculateTodayMetrics();
    setTodayMetrics(metrics);
  };
  
  if (selectedAccount || filteredAccounts.length > 0) {
    updateTodayMetrics();
  }
}, [selectedAccount, filteredAccounts]);

// =============================================================================
// RENDER HELPERS
// =============================================================================

// Render anomaly notification
const renderAnomalyNotification = () => {
   if (!anomalyData || !anomalyData.anomalies || anomalyData.anomalies.length === 0) return null;

   const latestAnomaly = anomalyData.anomalies[0];
   const timeAgo = formatTimeAgo(latestAnomaly.detectedAt);

   return (
     <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
       <div className="flex items-start">
         <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 mr-3 flex-shrink-0" />
         <div className="flex-1">
           <h3 className="text-sm font-medium text-amber-800">
             Performance Anomaly Detected
           </h3>
           <p className="mt-1 text-sm text-amber-700">
             {latestAnomaly.metric} showed unusual activity ({latestAnomaly.severity} severity) {timeAgo}
           </p>
           <div className="mt-2">
             <button className="text-sm text-amber-800 hover:text-amber-900 underline">
               View Details
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 };

// Render loading state
const renderLoadingState = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p className="mt-4 text-gray-600">Loading dashboard...</p>
    </div>
  </div>
);

// Render error state
const renderErrorState = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Reload Page
      </button>
    </div>
  </div>
);

// =============================================================================
// MAIN COMPONENT RENDER
// =============================================================================

// Show loading state during initial load
if (loading && !campaignData) {
  return renderLoadingState();
}

// Show error state if there's an error and no data
if (error && !campaignData) {
  return renderErrorState();
}

return (
  <div className="min-h-screen bg-gray-50 font-sans">
    {/* Minimal Header */}
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 shadow-sm z-50">
      <div className="flex items-center justify-between h-full px-6">
        {/* Left Section - Branding */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 bg-teal-600 rounded-lg">
            <KovvarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Kovvar</h1>
          </div>
        </div>

        {/* Right Section - Controls */}
        <div className="flex items-center space-x-3">
          {/* Account Switcher */}
          {filteredAccounts.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                className="account-button flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-0"
              >
                <div className="text-left">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedAccount 
                      ? cleanCountryCode(filteredAccounts.find(acc => acc.id === selectedAccount)?.countryCode || '')
                      : 'All Accounts'
                    }
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-32">
                    {selectedAccount 
                      ? filteredAccounts.find(acc => acc.id === selectedAccount)?.name || 'Select Account'
                      : `${filteredAccounts.length} accounts`
                    }
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>
              
              {/* Account Dropdown */}
              {accountDropdownOpen && (
                <div className="account-dropdown absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="p-2 max-h-64 overflow-y-auto">
                    {filteredAccounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setSelectedAccount(account.id);
                          setAccountDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 transition-colors ${
                          account.id === selectedAccount ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        <div className="font-medium">{getDisplayName(account)}</div>
                        <div className="text-sm text-gray-500">
                          {account.currency} • {account.totalClicks ? formatNumber(account.totalClicks) : '0'} clicks
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Date Range Selector */}
          <div className="relative">
            <button
              onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
              className="date-button flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-0"
            >
              <div className="text-left">
                <div className="text-sm font-medium text-gray-900">
                  {selectedDateRange ? selectedDateRange.name : 'Last 30 days'}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-40">
                  {selectedDateRange ? formatDateRangeDisplayLocal(selectedDateRange) : 'May 5 - Jun 4, 2025'}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>
            
            {/* Date Range Dropdown */}
            {dateDropdownOpen && (
              <div className="date-dropdown absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <div className="p-2 max-h-80 overflow-y-auto">
                  {dateRanges.map((range) => {
                    const IconComponent = range.icon;
                    const isSelected = selectedDateRange?.id === range.id;
                    return (
                      <button
                        key={range.id}
                        onClick={() => {
                          handleDateRangeChange(range);
                          setDateDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-3 ${
                          isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                        }`}
                      >
                        <IconComponent className={`h-4 w-4 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {range.name}
                          </div>
                          <div className={`text-xs ${isSelected ? 'text-blue-600' : 'text-gray-500'}`}>
                            {formatDateRangeDisplayLocal(range)}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                  
                  {/* Custom Date Range Option */}
                  <button
                    onClick={() => {
                      setCustomDateModalOpen(true);
                      setDateDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors flex items-center space-x-3 text-gray-900 border-t border-gray-100 mt-2 pt-3"
                  >
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-900">Custom</div>
                      <div className="text-xs text-gray-500">Choose your own date range</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button 
              onClick={() => setAnomalyDropdownOpen(!anomalyDropdownOpen)}
              className="anomaly-button p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors relative"
            >
              <Bell className="h-5 w-5" />
              {anomalyData && anomalyData.summary.total > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {anomalyData.summary.total > 9 ? '9+' : anomalyData.summary.total}
                </span>
              )}
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-2 rounded-lg transition-colors ${
              loading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700'
            }`}
            title="Refresh all data"
          >
            <div className={`${loading ? 'animate-spin' : ''}`}>
              <RefreshCw className="h-4 w-4" />
            </div>
          </button>

          {/* Settings */}
          <button className="p-2 bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-700 rounded-lg transition-colors">
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>

    {/* Premium Sidebar */}
    <aside className="fixed left-0 top-16 bottom-0 w-[240px] bg-white border-r border-gray-200 shadow-sm z-30">
      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = currentPage === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setCurrentPage(item.id)}
                  className={`group w-full flex items-center space-x-3 px-4 py-3 text-left transition-all duration-200 rounded-lg font-medium ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 border-r-2 border-teal-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <IconComponent 
                    className={`h-5 w-5 transition-all duration-200 ${
                      isActive 
                        ? 'text-teal-600' 
                        : 'text-gray-400 group-hover:text-gray-600'
                    }`} 
                  />
                  <span className={`transition-all duration-200 ${
                    isActive ? 'font-semibold' : ''
                  }`}>
                    {item.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom User Section */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">Jasper van der Heide</p>
              <p className="text-xs text-gray-500">
                {filteredAccounts.length > 0 ? `${filteredAccounts.length} accounts` : '3 accounts'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    {/* Main Content */}
    <main className="ml-[240px] pt-16">
      <div className="p-8">
        {/* Anomaly Notification */}
        {renderAnomalyNotification()}

        {/* Dashboard View */}
        {currentPage === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <KPICards
              campaignData={campaignData}
              campaignLoading={campaignLoading}
              kpiPercentageChanges={kpiPercentageChanges}
              selectedChartMetrics={selectedChartMetrics}
              onKpiSelection={handleKPISelection}
            />

            {/* Charts Section - Using the working Charts component */}
            <Charts
              campaignData={campaignData}
              historicalData={historicalData}
              historicalLoading={historicalLoading}
              selectedChartMetrics={selectedChartMetrics}
              chartType={chartType}
              setChartType={setChartType}
              dateGranularity={dateGranularity}
              setDateGranularity={setDateGranularity}
              setManualGranularityOverride={setManualGranularityOverride}
              selectedDateRange={selectedDateRange}
            />

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Campaign Performance</h2>
                  <div className="flex items-center space-x-3">
                    {/* Table Controls */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Show:</span>
                      <select
                        value={tablePageSize}
                        onChange={(e) => setTablePageSize(Number(e.target.value))}
                        className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <span className="text-sm text-gray-600">entries</span>
                    </div>

                    {/* Search */}
                    <div className="relative">
                      <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search campaigns..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Export Button */}
                    <button
                      onClick={handleExport}
                      className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg transition-colors text-sm"
                    >
                      <Download className="h-4 w-4" />
                      <span>Export</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              <CampaignTable
                data={campaignData}
                loading={campaignLoading}
                searchTerm={searchTerm}
                pageSize={tablePageSize}
                sortColumn={tableSortColumn}
                sortDirection={tableSortDirection}
                onSort={handleTableSort}
                onCampaignClick={handleCampaignClick}
              />
            </div>
          </div>
        )}

        {/* Campaigns View */}
        {currentPage === 'campaigns' && (
          <div className="space-y-6">
            {/* Campaigns Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Campaign Management</h1>
                <p className="text-gray-600 mt-1">Manage and optimize your advertising campaigns</p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  <Plus className="h-4 w-4" />
                  <span>New Campaign</span>
                </button>
              </div>
            </div>

            {/* Campaign Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center space-x-4">
                {/* Status Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Status:</label>
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'active' | 'all')}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                  </select>
                </div>

                {/* Performance Filter */}
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Performance:</label>
                  <select 
                    value={performanceFilter}
                    onChange={(e) => setPerformanceFilter(e.target.value as 'all' | 'high' | 'medium' | 'low')}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All</option>
                    <option value="high">High Performing</option>
                    <option value="medium">Medium Performing</option>
                    <option value="low">Low Performing</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <button 
                  onClick={() => {
                    setStatusFilter('all');
                    setPerformanceFilter('all');
                    setCampaignSearch('');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* Campaign Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedCampaigns?.slice(0, 9).map((campaign) => (
                <div key={campaign.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                        {campaign.name}
                      </h3>
                      <p className="text-sm text-gray-600">ID: {campaign.id}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        campaign.status === 'ENABLED' 
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {campaign.status}
                      </span>
                      <button className="p-1 text-gray-400 hover:text-gray-600">
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Campaign Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Clicks</p>
                      <p className="text-lg font-semibold text-gray-900">{formatNumber(campaign.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Impressions</p>
                      <p className="text-lg font-semibold text-gray-900">{formatNumber(campaign.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">CTR</p>
                      <p className="text-lg font-semibold text-gray-900">{formatPercentage(campaign.ctr)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 uppercase tracking-wide">CPC</p>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(campaign.avgCpc)}</p>
                    </div>
                  </div>

                  {/* Campaign Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Play className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                        <Pause className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      onClick={() => handleCampaignClick(campaign)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {displayedCampaigns && displayedCampaigns.length > 9 && (
              <div className="text-center">
                <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg transition-colors">
                  Load More Campaigns
                </button>
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {currentPage === 'analytics' && (
          <div className="space-y-6">
            {/* Analytics Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
                <p className="text-gray-600 mt-1">Deep insights into your campaign performance</p>
              </div>
              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>Generate Report</span>
                </button>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Distribution */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Distribution</h3>
                <div className="h-64">
                  {campaignData && campaignData.campaigns && campaignData.campaigns.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getPerformanceDistribution(campaignData)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                        >
                          {getPerformanceDistribution(campaignData).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-gray-500">No data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Top Performing Campaigns */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Campaigns</h3>
                <div className="space-y-3">
                  {displayedCampaigns?.slice(0, 5).map((campaign, index) => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 truncate max-w-48">{campaign.name}</p>
                          <p className="text-sm text-gray-600">{formatNumber(campaign.clicks)} clicks</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatPercentage(campaign.ctr)}</p>
                        <p className="text-sm text-gray-600">CTR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings View */}
        {currentPage === 'settings' && (
          <div className="space-y-6">
            {/* Settings Header */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-1">Manage your account preferences and configurations</p>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Account Settings */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Date Range
                      </label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>Last 7 days</option>
                        <option>Last 30 days</option>
                        <option>Last 90 days</option>
                        <option>This month</option>
                        <option>Last month</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Chart Type
                      </label>
                      <select 
                        value={chartType}
                        onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="line">Line Chart</option>
                        <option value="bar">Bar Chart</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Currency Display
                      </label>
                      <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option>USD ($)</option>
                        <option>EUR (€)</option>
                        <option>GBP (£)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notifications */}
              <div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Email alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                      <span className="ml-2 text-sm text-gray-700">Performance alerts</span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                      <span className="ml-2 text-sm text-gray-700">Anomaly detection</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>

    {/* Custom Date Modal */}
    {customDateModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Custom Date Range</h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={typeof customDateRange.startDate === 'string' 
                    ? customDateRange.startDate
                    : customDateRange.startDate.toISOString().split('T')[0]
                  }
                  onChange={(e) => setCustomDateRange(prev => ({ 
                    ...prev, 
                    startDate: e.target.value 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={typeof customDateRange.endDate === 'string' 
                    ? customDateRange.endDate
                    : customDateRange.endDate.toISOString().split('T')[0]
                  }
                  onChange={(e) => setCustomDateRange(prev => ({ 
                    ...prev, 
                    endDate: e.target.value 
                  }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
            <button
              onClick={() => setCustomDateModalOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCustomDateApplyFixed}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Click Outside Handlers */}
    {accountDropdownOpen && (
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setAccountDropdownOpen(false)}
      />
    )}
    {dateDropdownOpen && (
      <div 
        className="fixed inset-0 z-40" 
        onClick={() => setDateDropdownOpen(false)}
      />
    )}
  </div>
);
}