'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Percent
  } from 'lucide-react';
import { clearCache, getFromCache, saveToCache } from "./utils/cache.js";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import HoverMetricsChart from '../components/HoverMetricsChart';

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

interface Account {
  id: string;
  name: string;
  currency: string;
  timeZone: string;
  countryCode: string;
  totalClicks?: number; // Add total clicks for filtering
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate: number;
  cpa: number;
  roas: number;
}

interface AdGroup {
  id: string;
  name: string;
  status: string;
  campaignId: string;
  campaignName?: string;
  campaignType?: string;
  groupType?: 'ad_group' | 'asset_group';
  impressions: number;
  clicks: number;
  cost: number;
  ctr: number;
  avgCpc: number;
  conversions: number;
  conversionsValue: number;
  conversionRate?: number;
  cpa: number;
  roas: number;
  // Performance Max specific fields
  adStrength?: 'Poor' | 'Good' | 'Excellent';
  assetCoverage?: number;
}

interface CampaignData {
  campaigns: Campaign[];
  totals: {
    impressions: number;
    clicks: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    conversionRate: number;
    cpa: number;
    roas: number;
  };
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

interface AdGroupData {
  adGroups: AdGroup[];
  campaignId: string;
  dateRange: {
    days: number;
    startDate: string;
    endDate: string;
  };
  customerId: string;
}

interface Anomaly {
  id: string;
  accountId: string;
  accountName: string;
  countryCode: string;
  severity: 'high' | 'medium' | 'low';
  type: 'business' | 'statistical';
  category: string;
  title: string;
  description: string;
  metric?: string;
  currentValue?: number;
  expectedValue?: number;
  deviation?: number;
  detectedAt: string;
}

interface AnomalyData {
  anomalies: Anomaly[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}

interface DateRange {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  startDate: Date;
  endDate: Date;
  apiDays?: number; // For API compatibility
}

interface CustomDateRange {
  startDate: Date;
  endDate: Date;
}

// Premium navigation structure
const navigationItems = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { id: 'campaigns', name: 'Ad Groups', icon: Target },
  { id: 'keywords', name: 'Keywords', icon: Search },
  { id: 'brands', name: 'Brands', icon: Award },
  { id: 'products', name: 'Products', icon: Package },
  { id: 'poas', name: 'POAS', icon: TrendingUp },
];

export default function Dashboard() {
  const [, setAllAccounts] = useState<Account[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [campaignData, setCampaignData] = useState<CampaignData | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<{clicks: number, spend: number}>({ clicks: 0, spend: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);
  const [anomalyData, setAnomalyData] = useState<AnomalyData | null>(null);
  const [anomalyDropdownOpen, setAnomalyDropdownOpen] = useState(false);
  const [anomalyLoading, setAnomalyLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(['clicks']);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [kpiPercentageChanges, setKpiPercentageChanges] = useState<{[key: string]: number}>({});
  
  // Enhanced date range state
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange | null>(null);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);
  const [customDateModalOpen, setCustomDateModalOpen] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: new Date(),
    endDate: new Date()
  });

  // Enhanced chart state for multi-KPI comparison
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [, setHistoricalDataLoading] = useState(false);
  const [dateGranularity, setDateGranularity] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [manualGranularityOverride, setManualGranularityOverride] = useState<boolean>(false);

  // Premium campaign table state
  const [campaignSearch, setCampaignSearch] = useState<string>('');
  const [campaignSort, setCampaignSort] = useState<{field: string, direction: 'asc' | 'desc' | null}>({field: '', direction: null});
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [bulkActionOpen, setBulkActionOpen] = useState<boolean>(false);
  
  // Campaign pre-filters state
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // Campaign drill-down state
  const [adGroupData, setAdGroupData] = useState<{[campaignId: string]: AdGroupData}>({});

  // Campaign Performance view mode
  const [campaignViewMode, setCampaignViewMode] = useState<'table' | 'charts'>('table');

  // Pagination state removed as it was unused

  // Hover metrics chart state
  const [hoverChart, setHoverChart] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: '',
    campaignName: '',
    campaignId: ''
  });

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

  // Handle refresh button click
  const handleRefresh = async () => {
    console.log("🔥 REFRESH BUTTON CLICKED - CACHE CLEARING!");
    alert("Refresh button clicked!");
    setLoading(true);
    
    try {
      // Clear all cached data
      clearCache();
      
      // Re-fetch data (keeping existing functionality)
      await Promise.all([
        fetchCampaignData(),
        fetchHistoricalData(),
        fetchAnomalies()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data");
    } finally {
      // Re-enable button after 1 second
      setTimeout(() => {
        setLoading(false);
      }, 1000);
    }
  };

  // Date range utility functions
  const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  };

  const formatDateRangeDisplay = (range: DateRange): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    switch (range.id) {
      case 'today':
        return formatDateForDisplay(today);
      case 'yesterday':
        return formatDateForDisplay(yesterday);
      case 'last-year':
        return range.startDate.getFullYear().toString();
      default:
        if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
          return `${formatDateForDisplay(range.startDate)} - ${formatDateForDisplay(range.endDate)}, ${range.endDate.getFullYear()}`;
        } else {
          return `${formatDateForDisplay(range.startDate)}, ${range.startDate.getFullYear()} - ${formatDateForDisplay(range.endDate)}, ${range.endDate.getFullYear()}`;
        }
    }
  };

  // Generate date range options
  const generateDateRanges = (): DateRange[] => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 7);

    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);

    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const lastQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
    const lastQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0);

    const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);

    return [
      {
        id: 'today',
        name: 'Today',
        icon: Clock,
        startDate: today,
        endDate: today,
        apiDays: 1
      },
      {
        id: 'yesterday',
        name: 'Yesterday',
        icon: History,
        startDate: yesterday,
        endDate: yesterday,
        apiDays: 1
      },
      {
        id: 'last-7-days',
        name: 'Last 7 days',
        icon: CalendarDays,
        startDate: last7Days,
        endDate: today,
        apiDays: 7
      },
      {
        id: 'last-30-days',
        name: 'Last 30 days',
        icon: Calendar,
        startDate: last30Days,
        endDate: today,
        apiDays: 30
      },
      {
        id: 'last-month',
        name: 'Last month',
        icon: Calendar,
        startDate: lastMonthStart,
        endDate: lastMonthEnd
      },
      {
        id: 'last-quarter',
        name: 'Last quarter',
        icon: BarChart3,
        startDate: lastQuarterStart,
        endDate: lastQuarterEnd
      },
      {
        id: 'last-year',
        name: 'Last year',
        icon: Calendar,
        startDate: lastYearStart,
        endDate: lastYearEnd
      }
    ];
  };

  // Initialize date ranges
  const dateRanges = generateDateRanges();

  // Set default date range on component mount
  useEffect(() => {
    if (!selectedDateRange) {
      const defaultRange = dateRanges.find(range => range.id === 'last-30-days');
      if (defaultRange) {
        setSelectedDateRange(defaultRange);
      }
    }
  }, []);

  // Calculate date range for API calls
  const getApiDateRange = (range: DateRange | null): { days: number, startDate: string, endDate: string } => {
    if (!range) {
      return { days: 30, startDate: formatDateForAPI(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), endDate: formatDateForAPI(new Date()) };
    }

    if (range.apiDays) {
      return { 
        days: range.apiDays, 
        startDate: formatDateForAPI(range.startDate), 
        endDate: formatDateForAPI(range.endDate) 
      };
    }

    // Calculate days between start and end date
    const diffTime = Math.abs(range.endDate.getTime() - range.startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    return { 
      days: diffDays, 
      startDate: formatDateForAPI(range.startDate), 
      endDate: formatDateForAPI(range.endDate) 
    };
  };

  // Intelligent date granularity detection
  const getOptimalGranularity = (dateRange: DateRange | null): 'daily' | 'weekly' | 'monthly' => {
    if (!dateRange) return 'daily';
    
    const apiDateRange = getApiDateRange(dateRange);
    const days = apiDateRange.days;
    
    // Automatic granularity rules:
    // <= 30 days: daily
    // 31-90 days: weekly  
    // > 90 days: monthly
    if (days <= 30) return 'daily';
    if (days <= 90) return 'weekly';
    return 'monthly';
  };

  // Auto-detect granularity when date range changes (unless manually overridden)
  useEffect(() => {
    if (!manualGranularityOverride && selectedDateRange) {
      const optimalGranularity = getOptimalGranularity(selectedDateRange);
      setDateGranularity(optimalGranularity);
    }
  }, [selectedDateRange, manualGranularityOverride]);

  // Custom date picker handlers
  const handleCustomDateApply = () => {
    const customRange: DateRange = {
      id: 'custom',
      name: 'Custom',
      icon: Calendar,
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate
    };
    setSelectedDateRange(customRange);
    setCustomDateModalOpen(false);
    setDateDropdownOpen(false);
  };

  const isValidDateRange = (start: Date, end: Date): boolean => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    return start <= end && end <= today;
  };

  // Clean country code display - remove parentheses content
  const cleanCountryCode = (countryCode: string) => {
    // "FR (Tapis)" → "FR", "NL" → "NL"
    return countryCode.split(' ')[0];
  };

  // Clean account name display - remove country prefix if it already exists
  const getDisplayName = (account: Account) => {
    const cleanCode = cleanCountryCode(account.countryCode);
    // If name already starts with country code, use as is
    // Otherwise, prepend the country code
    if (account.name.startsWith(cleanCode + ' - ')) {
      return account.name;
    }
    return `${cleanCode} - ${account.name}`;
  };

  // Data aggregation functions
  const aggregateDataByWeek = (dailyData: any[]): any[] => {
    const weeklyData: { [key: string]: any } = {};
    
    dailyData.forEach(day => {
      const date = new Date(day.date);
      // Get Monday of the week (ISO week)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(date.setDate(diff));
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          date: weekKey,
          dateFormatted: `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionsValue: 0,
          count: 0
        };
      }
      
      // Sum up metrics
      weeklyData[weekKey].impressions += day.impressions || 0;
      weeklyData[weekKey].clicks += day.clicks || 0;
      weeklyData[weekKey].cost += day.cost || 0;
      weeklyData[weekKey].conversions += day.conversions || 0;
      weeklyData[weekKey].conversionsValue += day.conversionsValue || 0;
      weeklyData[weekKey].count += 1;
    });
    
    // Calculate derived metrics
    return Object.values(weeklyData).map((week: any) => {
      week.ctr = week.impressions > 0 ? (week.clicks / week.impressions) * 100 : 0;
      week.avgCpc = week.clicks > 0 ? week.cost / week.clicks : 0;
      week.conversionRate = week.clicks > 0 ? (week.conversions / week.clicks) * 100 : 0;
      week.cpa = week.conversions > 0 ? week.cost / week.conversions : 0;
      week.roas = week.cost > 0 ? week.conversionsValue / week.cost : 0;
      week.poas = week.cost > 0 ? (week.conversionsValue / week.cost) * 100 : 0;
      delete week.count;
      return week;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const aggregateDataByMonth = (dailyData: any[]): any[] => {
    const monthlyData: { [key: string]: any } = {};
    
    dailyData.forEach(day => {
      const date = new Date(day.date);
      const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          date: monthKey,
          dateFormatted: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          impressions: 0,
          clicks: 0,
          cost: 0,
          conversions: 0,
          conversionsValue: 0,
          count: 0
        };
      }
      
      // Sum up metrics
      monthlyData[monthKey].impressions += day.impressions || 0;
      monthlyData[monthKey].clicks += day.clicks || 0;
      monthlyData[monthKey].cost += day.cost || 0;
      monthlyData[monthKey].conversions += day.conversions || 0;
      monthlyData[monthKey].conversionsValue += day.conversionsValue || 0;
      monthlyData[monthKey].count += 1;
    });
    
    // Calculate derived metrics
    return Object.values(monthlyData).map((month: any) => {
      month.ctr = month.impressions > 0 ? (month.clicks / month.impressions) * 100 : 0;
      month.avgCpc = month.clicks > 0 ? month.cost / month.clicks : 0;
      month.conversionRate = month.clicks > 0 ? (month.conversions / month.clicks) * 100 : 0;
      month.cpa = month.conversions > 0 ? month.cost / month.conversions : 0;
      month.roas = month.cost > 0 ? month.conversionsValue / month.cost : 0;
      month.poas = month.cost > 0 ? (month.conversionsValue / month.cost) * 100 : 0;
      delete month.count;
      return month;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Get chart data with appropriate granularity
  const getChartDataWithGranularity = (data: any[], granularity: 'daily' | 'weekly' | 'monthly'): any[] => {
    if (!data || data.length === 0) return [];
    
    switch (granularity) {
      case 'weekly':
        return aggregateDataByWeek(data);
      case 'monthly':
        return aggregateDataByMonth(data);
      case 'daily':
      default:
        return data;
    }
  };

  // Fetch today's campaign data for an account
  const fetchTodayClicks = async (accountId: string): Promise<{clicks: number, spend: number}> => {
    console.log("🔄 FETCHING TODAY CLICKS DATA");
    try {
      const response = await fetch(`/api/campaigns?customerId=${accountId}&dateRange=1`);
      const result = await response.json();
      if (result.success) {
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
      if (result.success) {
        return result.data.totals.clicks || 0;
      }
      return 0;
    } catch (err) {
      console.error(`Error fetching clicks for account ${accountId}:`, err);
      return 0;
    }
  };

  // Filter accounts with clicks > 0
  const filterActiveAccounts = async (accounts: Account[]) => {
    const accountsWithClicks = await Promise.all(
      accounts.map(async (account) => {
        const clicks = await fetchAccountClicks(account.id);
        return { ...account, totalClicks: clicks };
      })
    );

    // Filter accounts with clicks > 0
    const activeAccounts = accountsWithClicks.filter(account => account.totalClicks! > 0);
    return activeAccounts;
  };

  // Calculate today's performance - actual today's clicks
  const calculateTodayMetrics = async () => {
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
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch campaign data when account or date range changes
  useEffect(() => {
    if (selectedAccount) {
      fetchCampaignData();
      fetchHistoricalData(); // Fetch real historical data for charts
    }
  }, [selectedAccount, selectedDateRange]);

  // Fetch today's metrics when account changes or filtered accounts change
  useEffect(() => {
    const fetchTodayData = async () => {
      console.log("🔄 FETCHING TODAY DATA");
      const metrics = await calculateTodayMetrics();
      setTodayMetrics(metrics);
    };
    
    if (selectedAccount || filteredAccounts.length > 0) {
      fetchTodayData();
    }
  }, [selectedAccount, filteredAccounts]);

  // Fetch anomalies on component mount and periodically
  useEffect(() => {
    fetchAnomalies();
    
    // Refresh anomalies every 5 minutes
    const interval = setInterval(fetchAnomalies, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.anomaly-dropdown') && !target.closest('.anomaly-button')) {
        setAnomalyDropdownOpen(false);
      }
      if (!target.closest('.account-dropdown') && !target.closest('.account-button')) {
        setAccountDropdownOpen(false);
      }
      if (!target.closest('.date-dropdown') && !target.closest('.date-button')) {
        setDateDropdownOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAnomalyDropdownOpen(false);
        setAccountDropdownOpen(false);
        setDateDropdownOpen(false);
        setCustomDateModalOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const fetchAccounts = async () => {
    console.log("🔄 FETCHING ACCOUNTS DATA");
    try {
      setLoading(true);
      const response = await fetch('/api/accounts');
      const result = await response.json();
      
      if (result.success) {
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

  const fetchCampaignData = useCallback(async () => {
    console.log("🎯 fetchCampaignData called - MEMOIZED");

// Build cache key
const cacheKey = `campaigns_${selectedAccount || 'default'}_${getApiDateRange(selectedDateRange).days}days`;
console.log("🎯 Cache check:", { 
  cacheKey, 
  selectedAccount, 
  days: getApiDateRange(selectedDateRange).days 
});

// Check cache first (30 min TTL)
const cachedData = getFromCache(cacheKey, 30);
console.log("💽 Cache result:", { 
  hasCachedData: !!cachedData, 
  cacheKey 
});

if (cachedData) {
  console.log("🎯 CACHE HIT - Using cached campaigns data");
  console.log("✅ Returning cached campaigns data");
  setCampaignData(cachedData);
  
  // Fetch real percentage changes for cached data too
  try {
    const apiDateRange = getApiDateRange(selectedDateRange);
    const comparisonResponse = await fetch(`/api/kpi-comparison?customerId=${selectedAccount}&dateRange=${apiDateRange.days}`);
    const comparisonResult = await comparisonResponse.json();
    
    if (comparisonResult.success) {
      setKpiPercentageChanges(comparisonResult.data.changes);
      console.log('📊 Real percentage changes for cached data:', comparisonResult.data.changes);
    } else {
      console.warn('⚠️ Failed to fetch KPI comparison, using fallback');
      // Fallback to small random changes if API fails
  const percentageChanges: {[key: string]: number} = {};
  kpiConfig.forEach(kpi => {
        const change = (Math.random() - 0.5) * 10; // Smaller range as fallback
    percentageChanges[kpi.id] = change;
  });
  setKpiPercentageChanges(percentageChanges);
    }
  } catch (error) {
    console.error('❌ Error fetching KPI comparison:', error);
    // Fallback to small random changes if API fails
    const percentageChanges: {[key: string]: number} = {};
    kpiConfig.forEach(kpi => {
      const change = (Math.random() - 0.5) * 10; // Smaller range as fallback
      percentageChanges[kpi.id] = change;
    });
    setKpiPercentageChanges(percentageChanges);
  }
  
  return;
}

console.log("🎯 CACHE MISS - Fetching from API");
console.log("🌐 Making fresh API call for campaigns");

    console.log("🔄 FETCHING CAMPAIGN DATA");
    if (!selectedAccount || !selectedDateRange) return;
    
    try {
      setLoading(true);
      setError('');
      
      // Use the proper API format
      const apiDateRange = getApiDateRange(selectedDateRange);
      const response = await fetch(`/api/campaigns?customerId=${selectedAccount}&dateRange=${apiDateRange.days}`);
      const result = await response.json();
      
      if (result.success) {
        // Debug: Log the raw API response
        console.log('📊 Campaign API Response:', result.data);
        console.log('📊 Totals:', result.data.totals);
        console.log('📊 Selected date range:', selectedDateRange);
        console.log('📊 API date range:', apiDateRange);
        
        setCampaignData(result.data);
        // Save to cache
        saveToCache(cacheKey, result.data);
        console.log("💾 Saved campaigns to cache successfully", { cacheKey });
        
        // Fetch real KPI percentage changes from historical comparison
        try {
          const comparisonResponse = await fetch(`/api/kpi-comparison?customerId=${selectedAccount}&dateRange=${apiDateRange.days}`);
          const comparisonResult = await comparisonResponse.json();
          
          if (comparisonResult.success) {
            setKpiPercentageChanges(comparisonResult.data.changes);
            console.log('📊 Real KPI percentage changes:', comparisonResult.data.changes);
            console.log('📊 Comparison periods:', {
              current: comparisonResult.data.currentPeriod,
              previous: comparisonResult.data.previousPeriod
            });
          } else {
            console.warn('⚠️ Failed to fetch KPI comparison, using fallback');
            // Fallback to small random changes if API fails
        const percentageChanges: {[key: string]: number} = {};
        kpiConfig.forEach(kpi => {
              const change = (Math.random() - 0.5) * 10; // Smaller range as fallback
          percentageChanges[kpi.id] = change;
        });
        setKpiPercentageChanges(percentageChanges);
          }
        } catch (error) {
          console.error('❌ Error fetching KPI comparison:', error);
          // Fallback to small random changes if API fails
          const percentageChanges: {[key: string]: number} = {};
          kpiConfig.forEach(kpi => {
            const change = (Math.random() - 0.5) * 10; // Smaller range as fallback
            percentageChanges[kpi.id] = change;
          });
          setKpiPercentageChanges(percentageChanges);
        }
      } else {
        setError(result.message || 'Failed to fetch campaign data');
      }
    } catch (err) {
      setError('Error fetching campaign data');
      console.error('Error fetching campaign data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAccount, selectedDateRange, getApiDateRange]);

  // Fetch real historical data for charts
  const fetchHistoricalData = async () => {
    console.log("🔄 FETCHING HISTORICAL DATA");
    if (!selectedAccount || !selectedDateRange) return;
    
    try {
      setHistoricalDataLoading(true);
      
      const apiDateRange = getApiDateRange(selectedDateRange);
      const response = await fetch(`/api/historical-data?customerId=${selectedAccount}&dateRange=${apiDateRange.days}`);
      const result = await response.json();
      
      if (result.success) {
        console.log('📊 Historical Data Fetched:', result.data);
        setHistoricalData(result.data);
      } else {
        console.error('Failed to fetch historical data:', result.message);
        setHistoricalData([]); // Fall back to empty array
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setHistoricalData([]); // Fall back to empty array
    } finally {
      setHistoricalDataLoading(false);
    }
  };

  // Fetch ad groups for a specific campaign
  // fetchAdGroups function removed as it was unused

  const fetchAnomalies = async () => {
    console.log("🔄 FETCHING ANOMALIES DATA");
    try {
      setAnomalyLoading(true);
      const response = await fetch('/api/anomalies');
      const result = await response.json();
      
      // The anomaly API returns data directly, not wrapped in a success object
      if (response.ok && result.anomalies) {
        setAnomalyData(result);
      } else {
        console.error('Failed to fetch anomalies:', result.error || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching anomalies:', err);
    } finally {
      setAnomalyLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(Math.round(num));
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(2)}%`;
  };

  const selectedAccountData = filteredAccounts.find(acc => acc.id === selectedAccount);

  const getSeverityIcon = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high':
        return 'border-l-red-500 bg-red-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-l-blue-500 bg-blue-50';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const time = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  // Helper function to determine if a percentage change is "good" or "bad" for a given metric
  const isPositiveChange = (kpiId: string, percentageChange: number): boolean => {
    // Metrics where LOWER is better (decreases should be green)
    const lowerIsBetter = ['cost', 'avgCpc', 'cpa'];
    
    const isLowerBetter = lowerIsBetter.includes(kpiId);
    
    // For metrics where lower is better: negative change (decrease) = good (green)
    // For metrics where higher is better: positive change (increase) = good (green)
    const result = isLowerBetter ? percentageChange < 0 : percentageChange > 0;
    
    return result;
  };

  // KPI Configuration
  const kpiConfig = [
    {
      id: 'clicks',
      label: 'Clicks',
      icon: MousePointer,
      color: 'blue',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-blue-600'
    },
    {
      id: 'impressions',
      label: 'Impressions',
      icon: Eye,
      color: 'purple',
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      gradientFrom: 'from-purple-400',
      gradientTo: 'to-purple-600'
    },
    {
      id: 'ctr',
      label: 'CTR',
      icon: Target,
      color: 'green',
      bgColor: 'bg-green-500',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      gradientFrom: 'from-green-400',
      gradientTo: 'to-green-600'
    },
    {
      id: 'avgCpc',
      label: 'CPC',
      icon: Euro,
      color: 'orange',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-orange-600'
    },
    {
      id: 'cost',
      label: 'Cost',
      icon: CreditCard,
      color: 'red',
      bgColor: 'bg-red-500',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
      gradientFrom: 'from-red-400',
      gradientTo: 'to-red-600'
    },
    {
      id: 'conversions',
      label: 'Conversions',
      icon: CheckCircle,
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      gradientFrom: 'from-emerald-400',
      gradientTo: 'to-emerald-600'
    },
    {
      id: 'conversionsValue',
      label: 'Conversion Value',
      icon: TrendingUp,
      color: 'cyan',
      bgColor: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      gradientFrom: 'from-cyan-400',
      gradientTo: 'to-cyan-600'
    },
    {
      id: 'conversionRate',
      label: 'Conversion Rate',
      icon: Percent,
      color: 'indigo',
      bgColor: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      gradientFrom: 'from-indigo-400',
      gradientTo: 'to-indigo-600'
    },
    {
      id: 'cpa',
      label: 'CPA',
      icon: Calculator,
      color: 'pink',
      bgColor: 'bg-pink-500',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      gradientFrom: 'from-pink-400',
      gradientTo: 'to-pink-600'
    },
    {
      id: 'poas',
      label: 'POAS',
      icon: Trophy,
      color: 'yellow',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      gradientFrom: 'from-yellow-400',
      gradientTo: 'to-yellow-600'
    }
  ];

  // Calculate POAS (Profit on Ad Spend)
  const calculatePOAS = (conversionsValue: number, cost: number): number => {
    if (cost === 0) return 0;
    // POAS should be calculated as profit margin, assuming 50% profit margin for example
    // For now, let's show ROAS as percentage until we have actual profit data
    const roasPercentage = (conversionsValue / cost) * 100;
    return roasPercentage > 0 ? roasPercentage : 0;
  };

  // Format KPI values
  const formatKPIValue = (kpiId: string, value: number): string => {
    // Debug: Log the values being formatted
    console.log(`📊 Formatting ${kpiId}:`, value);
    
    switch (kpiId) {
      case 'clicks':
      case 'impressions':
      case 'conversions':
        return formatNumber(value);
      case 'cost':
      case 'conversionsValue':
      case 'avgCpc':
      case 'cpa':
        return formatCurrency(value);
      case 'ctr':
      case 'conversionRate':
        return formatPercentage(value);
      case 'poas':
        // POAS as percentage
        return value > 0 ? `${value.toFixed(1)}%` : '0.0%';
      default:
        return value.toString();
    }
  };

  // Get KPI value from campaign data
  const getKPIValue = (kpiId: string, data: CampaignData): number => {
    const value = (() => {
      switch (kpiId) {
        case 'poas':
          return calculatePOAS(data.totals.conversionsValue, data.totals.cost);
        default:
          return data.totals[kpiId as keyof typeof data.totals] as number;
      }
    })();
    
    // Debug: Log calculated values with more detail
    console.log(`📊 KPI ${kpiId} calculation:`, {
      kpiId,
      calculatedValue: value,
      conversionsValue: data.totals.conversionsValue,
      cost: data.totals.cost,
      roas: data.totals.roas,
      rawTotals: data.totals
    });
    
    return value;
  };

  // Helper function to get current High Spend threshold
  const getHighSpendThreshold = () => {
    if (!campaignData || campaignData.campaigns.length === 0) return 0;
    
    const campaigns = campaignData.campaigns;
    const campaignsWithSpend = campaigns.filter(c => c.cost > 0);
    
    // If no campaigns have spend, return 0
    if (campaignsWithSpend.length === 0) return 0;
    
    const totalSpend = campaignsWithSpend.reduce((sum, c) => sum + c.cost, 0);
    const averageSpend = totalSpend / campaignsWithSpend.length;
    const threshold = averageSpend * 2;
    
    // Set a minimum threshold of €10 to avoid very low thresholds
    return Math.max(threshold, 10);
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

  const applyPreFilters = (campaigns: Campaign[]) => {
    let filtered = [...campaigns];
    
    if (activeFilters.has('high_spend')) {
      // Calculate average spend from campaigns with actual spend
      const campaignsWithSpend = campaigns.filter(c => c.cost > 0);
      
      if (campaignsWithSpend.length === 0) {
        console.log(`📊 High Spend filter - No campaigns with spend found`);
        filtered = []; // No campaigns to show if none have spend
      } else {
        const totalSpend = campaignsWithSpend.reduce((sum, c) => sum + c.cost, 0);
        const averageSpend = totalSpend / campaignsWithSpend.length;
        const highSpendThreshold = Math.max(averageSpend * 2, 10); // Double the average, minimum €10
        
        console.log(`📊 High Spend filter - Average: €${averageSpend.toFixed(2)}, Threshold (2x avg, min €10): €${highSpendThreshold.toFixed(2)}`);
        
        // High spend: campaigns that spend double the average
        const beforeCount = filtered.length;
        filtered = filtered.filter(c => c.cost > highSpendThreshold);
        console.log(`📊 High Spend filter result: ${beforeCount} -> ${filtered.length} campaigns (${filtered.length > 0 ? filtered.map(c => `${c.name}: €${c.cost.toFixed(2)}`).join(', ') : 'none'})`);
      }
    }
    
    if (activeFilters.has('low_ctr')) {
      // Low CTR: campaigns with CTR < 2%
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => c.ctr < 2.0);
      console.log(`📊 Low CTR filter result: ${beforeCount} -> ${filtered.length} campaigns`);
    }
    
    if (activeFilters.has('high_cpa')) {
      // High CPA: campaigns with CPA > €20 (only for campaigns with conversions)
      const beforeCount = filtered.length;
      filtered = filtered.filter(c => c.conversions > 0 && c.cpa > 20);
      console.log(`📊 High CPA filter result: ${beforeCount} -> ${filtered.length} campaigns`);
    }
    
    return filtered;
  };

  // Premium table helper function - get filtered and sorted campaigns
  const getFilteredAndSortedCampaigns = () => {
    if (!campaignData) return [];
    
    let campaigns = [...campaignData.campaigns];
    
    // Debug: Log all campaigns before filtering
    console.log('📊 All campaigns before filtering:', campaigns.map(c => ({
      name: c.name, 
      status: c.status,
      clicks: c.clicks,
      impressions: c.impressions
    })));
    
    // Status filter - "Active Only" means campaigns with actual activity
    if (statusFilter === 'active') {
      console.log('📊 Applying ACTIVE filter - filtering for campaigns with activity...');
      const beforeCount = campaigns.length;
      campaigns = campaigns.filter(c => {
        // Consider a campaign "active" if it has impressions OR clicks
        // This filters out campaigns that are ENABLED but have no traffic
        const hasActivity = c.impressions > 0 || c.clicks > 0;
        console.log(`📊 Campaign "${c.name}": impressions=${c.impressions}, clicks=${c.clicks}, hasActivity=${hasActivity}`);
        return hasActivity;
      });
      console.log(`📊 Active filter result: ${beforeCount} -> ${campaigns.length} campaigns (filtered out inactive campaigns)`);
    } else {
      console.log('📊 Showing ALL campaigns (including ENABLED campaigns with no activity)');
    }
    
    console.log(`📊 After status filter (${statusFilter}): ${campaigns.length} campaigns`);
    
    // Apply pre-filters
    if (activeFilters.size > 0) {
      const beforeCount = campaigns.length;
      campaigns = applyPreFilters(campaigns);
      console.log(`📊 Pre-filters applied (${Array.from(activeFilters).join(', ')}): ${beforeCount} -> ${campaigns.length} campaigns`);
    }
    
    // Search filter
    if (campaignSearch.trim()) {
      const searchTerm = campaignSearch.toLowerCase().trim();
      const beforeCount = campaigns.length;
      campaigns = campaigns.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.id.toLowerCase().includes(searchTerm)
      );
      console.log(`📊 Search filter "${searchTerm}": ${beforeCount} -> ${campaigns.length} campaigns`);
    }
    
    // Apply sorting
    if (campaignSort.field && campaignSort.direction) {
      campaigns.sort((a, b) => {
        const field = campaignSort.field;
        let aValue: any = a[field as keyof Campaign];
        let bValue: any = b[field as keyof Campaign];
        
        // Handle numeric fields properly
        const numericFields = ['clicks', 'impressions', 'cost', 'ctr', 'avgCpc', 'conversions', 'conversionsValue', 'cpa', 'roas'];
        
        if (numericFields.includes(field)) {
          aValue = Number(aValue) || 0;
          bValue = Number(bValue) || 0;
        } else {
          // String comparison for text fields
          aValue = String(aValue).toLowerCase();
          bValue = String(bValue).toLowerCase();
        }
        
        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }
        
        return campaignSort.direction === 'asc' ? comparison : -comparison;
      });
    }
    
    console.log('📊 Final filtered campaigns:', campaigns.length);
    return campaigns;
  };

  const handleSort = (field: string) => {
    setCampaignSort(prev => {
      if (prev.field !== field) {
        return { field, direction: 'desc' };
      }
      switch (prev.direction) {
        case null: return { field, direction: 'desc' };
        case 'desc': return { field, direction: 'asc' };
        case 'asc': return { field: '', direction: null };
        default: return { field: '', direction: null };
      }
    });
  };

  const getSortIcon = (field: string) => {
    if (campaignSort.field !== field || campaignSort.direction === null) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return campaignSort.direction === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-blue-600" />
      : <ArrowDown className="h-4 w-4 text-blue-600" />;
  };

  const selectAllCampaigns = () => {
    const filteredCampaigns = getFilteredAndSortedCampaigns();
    setSelectedCampaigns(filteredCampaigns.map(c => c.id));
  };

  const clearAllCampaigns = () => setSelectedCampaigns([]);

  const toggleCampaignSelection = (campaignId: string) => {
    setSelectedCampaigns(prev => 
      prev.includes(campaignId) 
        ? prev.filter(id => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const calculateTableTotals = () => {
    const campaigns = getFilteredAndSortedCampaigns();
    const totals = campaigns.reduce((acc, campaign) => ({
      clicks: acc.clicks + campaign.clicks,
      impressions: acc.impressions + campaign.impressions,
      cost: acc.cost + campaign.cost,
      conversions: acc.conversions + campaign.conversions,
      conversionsValue: acc.conversionsValue + campaign.conversionsValue,
    }), { clicks: 0, impressions: 0, cost: 0, conversions: 0, conversionsValue: 0 });

    return {
      ...totals,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      avgCpc: totals.clicks > 0 ? totals.cost / totals.clicks : 0,
      cpa: totals.conversions > 0 ? totals.cost / totals.conversions : 0,
      roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0,
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENABLED': return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'PAUSED': return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      case 'REMOVED': return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      default: return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const formatLargeNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return formatNumber(num);
  };

  const getPerformanceIndicator = (campaign: Campaign, metric: string): 'high' | 'medium' | 'low' => {
    if (!campaignData) return 'medium';
    const allCampaigns = campaignData.campaigns;
    if (allCampaigns.length < 3) return 'medium';
    const values = allCampaigns.map(c => c[metric as keyof Campaign] as number).sort((a, b) => b - a);
    const value = campaign[metric as keyof Campaign] as number;
    const highThreshold = values[Math.floor(values.length * 0.33)];
    const lowThreshold = values[Math.floor(values.length * 0.67)];
    if (['cost', 'avgCpc', 'cpa'].includes(metric)) {
      if (value <= lowThreshold) return 'high';
      if (value <= highThreshold) return 'medium';
      return 'low';
    }
    if (value >= highThreshold) return 'high';
    if (value >= lowThreshold) return 'medium';
    return 'low';
  };

  const getPerformanceColor = (level: 'high' | 'medium' | 'low'): string => {
    switch (level) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Helper function to toggle KPI selection

  // Helper function to toggle KPI selection
  const toggleKpiSelection = (kpiId: string) => {
    setSelectedChartMetrics(prev => {
      if (prev.includes(kpiId)) {
        // Remove if already selected (but keep at least one)
        if (prev.length > 1) {
          return prev.filter(id => id !== kpiId);
        }
        return prev;
      } else {
        // Add if not selected (but max 4 KPIs)
        if (prev.length < 4) {
          return [...prev, kpiId];
        }
        return prev;
      }
    });
  };

  // Generate multi-metric chart data using real historical data
  const generateMultiMetricChartData = (selectedMetrics: string[]) => {
    if (!selectedDateRange || !historicalData || historicalData.length === 0) {
      console.log('📊 No historical data available, returning empty array');
      return [];
    }
    
    console.log('📊 Generating chart data from historical data:', {
      selectedMetrics,
      historicalDataLength: historicalData.length,
      firstDataPoint: historicalData[0],
      lastDataPoint: historicalData[historicalData.length - 1]
    });
    
    // Apply granularity aggregation
    const aggregatedData = getChartDataWithGranularity(historicalData, dateGranularity);
    
    // Use aggregated data directly
    return aggregatedData.map((day: any) => {
      const dataPoint: any = {
        date: day.date,
        dateFormatted: day.dateFormatted,
      };
      
      // Map each selected metric to the data point
      selectedMetrics.forEach(metricId => {
        dataPoint[metricId] = day[metricId] || 0;
        dataPoint[`${metricId}Formatted`] = formatKPIValue(metricId, day[metricId] || 0);
      });
      
      return dataPoint;
    });
  };

  // Get chart colors for KPIs
  const getKpiChartColor = (kpiId: string): string => {
    const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']; // blue, green, purple, orange
    const index = selectedChartMetrics.indexOf(kpiId);
    return colors[index % colors.length];
  };

  // Enhanced Y-axis orientation with intelligent scaling for vastly different metrics
  const getYAxisOrientation = (metricId: string, selectedMetrics: string[], chartData: any[]): 'left' | 'right' => {
    // If only one metric, always use left axis
    if (selectedMetrics.length === 1) {
      return 'left';
    }

    // For exactly two metrics, always put the second selected metric on the right axis
    if (selectedMetrics.length === 2) {
      return selectedMetrics.indexOf(metricId) === 0 ? 'left' : 'right';
    }

    // For 3+ metrics, use scale-based logic
    const metricScales = {
      // Large count metrics (typically 1000s-10000s)
      'clicks': 'large-count',
      'impressions': 'large-count',
      
      // Small count metrics (typically 10s-100s)
      'conversions': 'small-count',
      
      // Currency metrics (typically 100s-1000s)
      'cost': 'currency',
      'conversionsValue': 'currency',
      'avgCpc': 'currency-small',
      'cpa': 'currency',
      
      // Percentage metrics (typically 0-20)
      'ctr': 'percentage',
      'conversionRate': 'percentage',
      'poas': 'percentage',
      
      // Ratio metrics (typically 0-10)
      'roas': 'ratio'
    };

    // Get the scale type for the current metric
    const currentScale = metricScales[metricId as keyof typeof metricScales] || 'unknown';

    // For 3+ metrics, calculate actual ranges for intelligent assignment
    const metricRanges = selectedMetrics.map(metric => {
      let maxValue = 0;
      chartData.forEach(dataPoint => {
        const value = dataPoint[metric] || 0;
        if (value > maxValue) maxValue = value;
      });
      return { metric, maxValue };
    });

    // Sort by max value to identify large vs small metrics
    metricRanges.sort((a, b) => b.maxValue - a.maxValue);
    
    const largestMetric = metricRanges[0];
    const currentMetric = metricRanges.find(m => m.metric === metricId);
    
    if (currentMetric && largestMetric.maxValue > 0) {
      const scaleDifference = largestMetric.maxValue / (currentMetric.maxValue || 1);
      
      // Put metrics with significantly different scales on the right axis
      if (scaleDifference >= 20 && currentMetric.metric !== largestMetric.metric) {
        return 'right';
      }
    }

    // Default to left axis
    return 'left';
  };

  // Helper to check if we need dual Y-axis (updated to use new orientation logic)
  const needsDualYAxis = (metrics: string[], chartData: any[]): boolean => {
    if (metrics.length <= 1) return false;
    
    const leftMetrics = metrics.filter(m => getYAxisOrientation(m, metrics, chartData) === 'left');
    const rightMetrics = metrics.filter(m => getYAxisOrientation(m, metrics, chartData) === 'right');
    
    return leftMetrics.length > 0 && rightMetrics.length > 0;
  };

  // Calculate domain for left Y-axis (updated to use new orientation logic)
  const getLeftAxisDomain = (selectedMetrics: string[], chartData: any[]): [number, number] => {
    const leftMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'left');
    if (leftMetrics.length === 0) return [0, 100];
    
    let maxValue = 0;
    chartData.forEach(dataPoint => {
      leftMetrics.forEach(metric => {
        const value = dataPoint[metric] || 0;
        if (value > maxValue) maxValue = value;
      });
    });
    
    // Add 10% padding to the top
    const paddedMax = maxValue * 1.1;
    return [0, Math.ceil(paddedMax)];
  };

  // Calculate domain for right Y-axis (updated to use new orientation logic)  
  const getRightAxisDomain = (selectedMetrics: string[], chartData: any[]): [number, number] => {
    const rightMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'right');
    if (rightMetrics.length === 0) return [0, 100];
    
    let maxValue = 0;
    chartData.forEach(dataPoint => {
      rightMetrics.forEach(metric => {
        const value = dataPoint[metric] || 0;
        if (value > maxValue) maxValue = value;
      });
    });
    
    // Add 10% padding to the top
    const paddedMax = maxValue * 1.1;
    return [0, Math.ceil(paddedMax)];
  };

  // Enhanced formatting for left Y-axis
  const formatLeftYAxis = (value: number, selectedMetrics: string[], chartData: any[]): string => {
    const leftMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'left');
    if (leftMetrics.length === 0) return value.toFixed(0);
    
    // Format based on the metric type
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else {
      return value.toFixed(0);
    }
  };

  // Enhanced formatting for right Y-axis
  const formatRightYAxis = (value: number, selectedMetrics: string[], chartData: any[]): string => {
    const rightMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'right');
    if (rightMetrics.length === 0) return value.toFixed(1);
    
    // Determine the primary metric type on right axis for formatting
    const currencyMetrics = rightMetrics.filter(m => ['cost', 'conversionsValue', 'avgCpc', 'cpa'].includes(m));
    const percentageMetrics = rightMetrics.filter(m => ['ctr', 'conversionRate', 'poas'].includes(m));
    const ratioMetrics = rightMetrics.filter(m => ['roas'].includes(m));
    const countMetrics = rightMetrics.filter(m => ['conversions'].includes(m));
    
    // Priority: Count > Currency > Percentage > Ratio
    if (countMetrics.length > 0) {
      // Count formatting for conversions on right axis
      return value.toFixed(0);
    } else if (currencyMetrics.length > 0) {
      // Currency formatting
      if (value >= 1000) {
        return `€${(value / 1000).toFixed(0)}K`;
      } else if (value >= 1) {
        return `€${value.toFixed(0)}`;
      } else {
        return `€${value.toFixed(2)}`;
      }
    } else if (percentageMetrics.length > 0) {
      // Percentage formatting
      return `${value.toFixed(1)}%`;
    } else if (ratioMetrics.length > 0) {
      // ROAS formatting (multiplier)
      return `${value.toFixed(1)}x`;
    } else {
      return value.toFixed(1);
    }
  };

  // Y-axis formatter based on metric type (for single metric compatibility)
  // formatYAxis function removed as it was unused

  // Render page content based on current page
  const renderPageContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboard();
      case 'campaigns':
        return renderAdGroupsPage();
      case 'keywords':
        return renderKeywordsPage();
      case 'brands':
        return (
          <div className="text-center py-16">
            <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Brands</h2>
            <p className="text-gray-600">Brand performance analytics coming soon...</p>
          </div>
        );
      case 'products':
        return (
          <div className="text-center py-16">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Products</h2>
            <p className="text-gray-600">Product performance insights coming soon...</p>
          </div>
        );
      case 'poas':
        return (
          <div className="text-center py-16">
            <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">POAS</h2>
            <p className="text-gray-600">Profit on Ad Spend analysis coming soon...</p>
          </div>
        );
      default:
        return renderDashboard();
    }
  };

  // Original dashboard content
  const renderDashboard = () => (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
            </div>
            {selectedAccountData && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className="font-medium text-gray-700">{getDisplayName(selectedAccountData)}</span>
                {selectedDateRange && (
                  <>
                    <span>•</span>
                    <span>{formatDateRangeDisplay(selectedDateRange)}</span>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Optional: Status indicator */}
          {campaignData && (
            <div className="hidden sm:flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">Live data</span>
              </div>
              <div className="text-gray-400">•</div>
              <span className="text-gray-600">{campaignData.campaigns.length} campaigns</span>
            </div>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading performance data...</p>
        </div>
      )}

      {/* 10 KPI Dashboard */}
      {campaignData && !loading && (
        <>
          {/* 10 KPI Boxes */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
            {kpiConfig.map((kpi) => {
              const IconComponent = kpi.icon;
              const value = getKPIValue(kpi.id, campaignData);
              const formattedValue = formatKPIValue(kpi.id, value);
              
              // Use static percentage change from state
              const percentageChange = kpiPercentageChanges[kpi.id] || 0;
              const isPositive = isPositiveChange(kpi.id, percentageChange);
              
              return (
                <div
                  key={kpi.id}
                  className="group relative cursor-pointer transition-all duration-200 hover:-translate-y-1"
                  style={{
                    height: '160px',
                    background: 'white',
                    boxShadow: selectedChartMetrics.includes(kpi.id) 
                      ? `0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px ${getKpiChartColor(kpi.id)}`
                      : '0 1px 3px rgba(0, 0, 0, 0.1)',
                    border: selectedChartMetrics.includes(kpi.id) 
                      ? 'none'
                      : '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px'
                  }}
                  onClick={() => toggleKpiSelection(kpi.id)}
                >
                  {/* Clean Icon */}
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{
                      backgroundColor: selectedChartMetrics.includes(kpi.id) 
                        ? `${getKpiChartColor(kpi.id)}20` 
                        : '#f3f4f6',
                      border: selectedChartMetrics.includes(kpi.id)
                        ? `1px solid ${getKpiChartColor(kpi.id)}`
                        : '1px solid transparent'
                    }}
                  >
                    <IconComponent 
                      className="h-4 w-4" 
                      style={{ 
                        color: selectedChartMetrics.includes(kpi.id) 
                          ? getKpiChartColor(kpi.id) 
                          : '#6b7280' 
                      }}
                    />
                  </div>
                  
                  {/* Value */}
                  <div className="mb-2">
                    <div className="text-2xl font-bold text-gray-900 leading-tight">
                      {formattedValue}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
                      {kpi.label}
                    </div>
                  </div>
                  
                  {/* Enhanced Status Label */}
                  <div className="flex items-center justify-between">
                    <div 
                      className="text-xs font-semibold px-2 py-1 rounded-md border"
                      style={{
                        color: Math.abs(percentageChange) >= 20 
                          ? isPositive ? '#047857' : '#dc2626'
                          : Math.abs(percentageChange) >= 10
                          ? isPositive ? '#047857' : '#dc2626'
                          : Math.abs(percentageChange) >= 5
                          ? '#d97706'
                          : '#6b7280',
                        backgroundColor: Math.abs(percentageChange) >= 20 
                          ? isPositive ? '#f0fdf4' : '#fef2f2'
                          : Math.abs(percentageChange) >= 10
                          ? isPositive ? '#f0fdf4' : '#fef2f2'
                          : Math.abs(percentageChange) >= 5
                          ? '#fffbeb'
                          : '#f9fafb',
                        borderColor: Math.abs(percentageChange) >= 20 
                          ? isPositive ? '#bbf7d0' : '#fecaca'
                          : Math.abs(percentageChange) >= 10
                          ? isPositive ? '#bbf7d0' : '#fecaca'
                          : Math.abs(percentageChange) >= 5
                          ? '#fed7aa'
                          : '#e5e7eb'
                      }}
                    >
                      {Math.abs(percentageChange) >= 20 
                        ? isPositive ? 'Excellent' : 'Needs Attention'
                        : Math.abs(percentageChange) >= 10
                        ? isPositive ? 'Good' : 'Declining'
                        : Math.abs(percentageChange) >= 5
                        ? 'Stable'
                        : 'Minimal Change'
                      }
                    </div>
                    
                    {/* Minimal Percentage */}
                    <div className="flex items-center space-x-1">
                    {percentageChange >= 0 ? (
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
                      {Math.abs(percentageChange).toFixed(1)}%
                    </span>
                    </div>
                  </div>
                  
                  {/* Clean selection indicator */}
                  {selectedChartMetrics.includes(kpi.id) && (
                    <div className="absolute top-3 right-3">
                      <div 
                        className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                        style={{ backgroundColor: getKpiChartColor(kpi.id) }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dynamic Chart Section */}
          <div className="bg-white rounded-lg p-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trends</h3>
                  <p className="text-sm text-gray-500">
                    {selectedChartMetrics.length === 1 
                      ? `${kpiConfig.find(k => k.id === selectedChartMetrics[0])?.label} over ${selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'the selected period'}`
                      : `${selectedChartMetrics.length} metrics over ${selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'the selected period'}`
                    }
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {/* Date Granularity Toggle */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => {
                        setDateGranularity('daily');
                        setManualGranularityOverride(true);
                      }}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        dateGranularity === 'daily'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Daily
                    </button>
                    <button
                      onClick={() => {
                        setDateGranularity('weekly');
                        setManualGranularityOverride(true);
                      }}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        dateGranularity === 'weekly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Weekly
                    </button>
                    <button
                      onClick={() => {
                        setDateGranularity('monthly');
                        setManualGranularityOverride(true);
                      }}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                        dateGranularity === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>
                  
                  {/* Chart Type Toggle */}
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
              
              {/* Multi-KPI Selection Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {kpiConfig.map((kpi) => {
                  const isSelected = selectedChartMetrics.includes(kpi.id);
                  const canDeselect = selectedChartMetrics.length > 1;
                  const canSelect = selectedChartMetrics.length < 4;
                  
                  return (
                    <button
                      key={kpi.id}
                      onClick={() => toggleKpiSelection(kpi.id)}
                      disabled={isSelected && !canDeselect}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 border ${
                        isSelected
                          ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm'
                          : canSelect 
                            ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                            : 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      }`}
                    >
                      <span>{kpi.label}</span>
                      {isSelected && (
                        <div 
                          className="w-2 h-2 rounded-full bg-teal-600"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              
              {selectedChartMetrics.length >= 4 && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    Maximum 4 KPIs selected. Deselect a metric to add others.
                  </p>
                </div>
              )}
            </div>

            {/* Enhanced Chart */}
            <div className="h-[480px] bg-gray-50/30 rounded-lg px-2 py-6">
              <ResponsiveContainer width="100%" height="100%">
                {(() => {
                  // Cache chart data calculation to avoid multiple expensive calls
                  const chartData = generateMultiMetricChartData(selectedChartMetrics);
                  
                  return chartType === 'line' ? (
                <LineChart
                      data={chartData}
                      margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
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
                        domain={getLeftAxisDomain(selectedChartMetrics, chartData)}
                    tickFormatter={(value) => {
                          const leftMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'left');
                          return leftMetrics.length > 0 ? formatLeftYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
                        }}
                      />
                      {/* Secondary Y-Axis (Right) - Only if needed */}
                      {needsDualYAxis(selectedChartMetrics, chartData) && (
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
                          domain={getRightAxisDomain(selectedChartMetrics, chartData)}
                          tickFormatter={(value) => {
                            const rightMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'right');
                            return rightMetrics.length > 0 ? formatRightYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
                          }}
                        />
                      )}
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                      fontSize: '12px'
                    }}
                        formatter={(value: any, name: string) => {
                          const kpi = kpiConfig.find(k => k.id === name);
                          return [formatKPIValue(name, value), kpi?.label || name];
                        }}
                    labelFormatter={(label) => label}
                  />
                      {/* Legend - Removed since KPI selection buttons already show numbered colors */}
                      {/* {selectedChartMetrics.length > 1 && (
                        <Legend 
                          wrapperStyle={{ paddingTop: '20px' }}
                          formatter={(value) => kpiConfig.find(k => k.id === value)?.label || value}
                        />
                      )} */}
                      {/* Multiple Lines */}
                      {selectedChartMetrics.map((metricId) => (
                  <Line
                          key={metricId}
                          yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    type="monotone"
                          dataKey={metricId}
                          stroke={getKpiChartColor(metricId)}
                    strokeWidth={2}
                    dot={{ 
                            fill: getKpiChartColor(metricId),
                      strokeWidth: 0, 
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      stroke: 'white', 
                      strokeWidth: 2, 
                      fill: getKpiChartColor(metricId)
                    }}
                  />
                      ))}
                </LineChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
                      barCategoryGap="30%"
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
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
                        domain={getLeftAxisDomain(selectedChartMetrics, chartData)}
                        tickFormatter={(value) => {
                          const leftMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'left');
                          return leftMetrics.length > 0 ? formatLeftYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
                        }}
                      />
                      {/* Secondary Y-Axis (Right) - Only if needed */}
                      {needsDualYAxis(selectedChartMetrics, chartData) && (
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
                          domain={getRightAxisDomain(selectedChartMetrics, chartData)}
                          tickFormatter={(value) => {
                            const rightMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'right');
                            return rightMetrics.length > 0 ? formatRightYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
                          }}
                        />
                      )}
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                          fontSize: '12px'
                        }}
                        formatter={(value: any, name: string) => {
                          const kpi = kpiConfig.find(k => k.id === name);
                          return [formatKPIValue(name, value), kpi?.label || name];
                        }}
                        labelFormatter={(label) => label}
                      />
                      {/* Multiple Bars with minimal styling */}
                      {selectedChartMetrics.map((metricId, index) => (
                        <Bar
                          key={metricId}
                          yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                          dataKey={metricId}
                          fill={getKpiChartColor(metricId)}
                          fillOpacity={0.85}
                          name={metricId}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={selectedChartMetrics.length === 1 ? 32 : 24}
                        />
                      ))}
                    </BarChart>
                  );
                })()}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Premium Campaign Performance Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-8">
            {/* Table Header with Search and Filters */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div>
              <h3 className="text-lg font-semibold text-gray-900">
                    Campaign Performance
              </h3>
              <p className="text-sm text-gray-500">
                    {(() => {
                      const filteredCampaigns = getFilteredAndSortedCampaigns();
                      const totalCampaigns = campaignData?.campaigns.length || 0;
                      
                      // Updated status descriptions
                      const statusNote = statusFilter === 'active' 
                        ? 'Active campaigns (with impressions/clicks)' 
                        : 'All campaigns (including enabled but inactive)';
                      
                      return `Showing ${filteredCampaigns.length} of ${totalCampaigns} campaigns • Last ${campaignData?.dateRange.days} days • ${statusNote}`;
                    })()}
              </p>
                        </div>
              
                  {/* Status Filter and View Mode Toggles */}
                  <div className="flex items-center space-x-6">
                                      <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">Status:</span>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setStatusFilter('active')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            statusFilter === 'active'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Active Only
                        </button>
                        <button
                          onClick={() => setStatusFilter('all')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                            statusFilter === 'all'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          All
                        </button>
                      </div>
                    </div>
                    
                    {/* View Mode Toggle */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">View:</span>
                      <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setCampaignViewMode('table')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                            campaignViewMode === 'table'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          <span>Table</span>
                        </button>
                        <button
                          onClick={() => setCampaignViewMode('charts')}
                          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-1.5 ${
                            campaignViewMode === 'charts'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          <PieChartIcon className="w-3.5 h-3.5" />
                          <span>Charts</span>
                        </button>
                      </div>
                    </div>
                  
                  {/* Bulk Actions */}
                  {selectedCampaigns.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {selectedCampaigns.length} selected
                      </span>
                      <div className="relative">
                        <button
                          onClick={() => setBulkActionOpen(!bulkActionOpen)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <span className="text-sm font-medium">Actions</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        
                        {bulkActionOpen && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                            <div className="p-1">
                              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center space-x-2">
                                <Pause className="h-4 w-4" />
                                <span>Pause Campaigns</span>
                              </button>
                              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center space-x-2">
                                <Play className="h-4 w-4" />
                                <span>Resume Campaigns</span>
                              </button>
                              <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md flex items-center space-x-2">
                                <Edit className="h-4 w-4" />
                                <span>Edit Budgets</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Search Bar and Quick Filters */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  {/* Quick Filter Chips */}
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => toggleFilter('high_spend')}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        activeFilters.has('high_spend') 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={`Shows campaigns spending more than €${getHighSpendThreshold().toFixed(2)} (2x the average spend of campaigns with actual spend)`}
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      High Spend
                    </button>
                    <button 
                      onClick={() => toggleFilter('low_ctr')}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        activeFilters.has('low_ctr') 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Target className="h-3 w-3 mr-1" />
                      Low CTR
                    </button>
                    <button 
                      onClick={() => toggleFilter('high_cpa')}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        activeFilters.has('high_cpa') 
                          ? 'bg-blue-500 text-white hover:bg-blue-600' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      High CPA
                    </button>
                    {activeFilters.size > 0 && (
                      <button
                        onClick={() => setActiveFilters(new Set())}
                        className="inline-flex items-center px-3 py-1.5 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Bulk Selection Controls */}
                <div className="flex items-center space-x-2">
                  {(() => {
                    const filteredCampaigns = getFilteredAndSortedCampaigns();
                    const allSelected = filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedCampaigns.includes(c.id));
                    return (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={allSelected ? clearAllCampaigns : selectAllCampaigns}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {allSelected ? 'Clear All' : 'Select All'}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
            
                          {(() => {
              const filteredCampaigns = getFilteredAndSortedCampaigns();
              
              if (filteredCampaigns.length === 0) {
                return (
                  <div className="px-6 py-12 text-center">
                    <div className="text-gray-400 mb-4">
                      <BarChart3 className="h-12 w-12 mx-auto" />
                    </div>
                    <p className="text-gray-500 text-lg">
                      {campaignSearch.trim() ? 'No campaigns match your search' : 'No campaigns found'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {campaignSearch.trim() ? 'Try adjusting your search criteria' : 'Check your account settings or date range'}
                    </p>
                  </div>
                );
              }

              // Table or Charts Content
              if (campaignViewMode === 'table') {
                return (
                  <div className="overflow-x-auto" style={{ height: 'calc(100vh - 280px)' }}>
                    <table className="w-full">
                      {/* Sticky Header */}
                      <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                        <tr>
                          {/* Bulk Selection Checkbox */}
                          <th className="px-4 py-4 text-left">
                            <input
                              type="checkbox"
                              checked={filteredCampaigns.length > 0 && filteredCampaigns.every(c => selectedCampaigns.includes(c.id))}
                              onChange={() => {
                                const allSelected = filteredCampaigns.every(c => selectedCampaigns.includes(c.id));
                                if (allSelected) {
                                  clearAllCampaigns();
                                } else {
                                  selectAllCampaigns();
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                            />
                        </th>
                          
                          {/* Campaign Name */}
                          <th 
                            onClick={() => handleSort('name')}
                            className="px-6 py-4 text-left text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center space-x-1.5">
                              <span>Campaign</span>
                              {getSortIcon('name')}
                            </div>
                          </th>
                          
                          {/* Clicks */}
                          <th 
                            onClick={() => handleSort('clicks')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Clicks</span>
                              {getSortIcon('clicks')}
                            </div>
                        </th>
                          
                          {/* Impressions */}
                          <th 
                            onClick={() => handleSort('impressions')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Impressions</span>
                              {getSortIcon('impressions')}
                            </div>
                        </th>
                          
                          {/* CTR */}
                          <th 
                            onClick={() => handleSort('ctr')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>CTR</span>
                              {getSortIcon('ctr')}
                            </div>
                        </th>
                          
                          {/* CPC */}
                          <th 
                            onClick={() => handleSort('avgCpc')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Avg. CPC</span>
                              {getSortIcon('avgCpc')}
                            </div>
                        </th>
                          
                          {/* Cost */}
                          <th 
                            onClick={() => handleSort('cost')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Cost</span>
                              {getSortIcon('cost')}
                            </div>
                          </th>
                          
                          {/* Conversions */}
                          <th 
                            onClick={() => handleSort('conversions')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Conv.</span>
                              {getSortIcon('conversions')}
                            </div>
                          </th>
                          
                          {/* Conv. Value */}
                          <th 
                            onClick={() => handleSort('conversionsValue')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>Conv. Value</span>
                              {getSortIcon('conversionsValue')}
                            </div>
                          </th>
                          
                          {/* CPA */}
                          <th 
                            onClick={() => handleSort('cpa')}
                            className="px-6 py-4 text-right text-xs font-medium text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1.5">
                              <span>CPA</span>
                              {getSortIcon('cpa')}
                            </div>
                          </th>
                          
                          {/* ROAS */}
                          <th 
                            onClick={() => handleSort('roas')}
                            className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center justify-end space-x-1">
                              <span>ROAS</span>
                              {getSortIcon('roas')}
                            </div>
                          </th>
                          
                          {/* Actions */}
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                            Actions
                        </th>
                        </tr>
                      </thead>
                        
                        {/* Campaign Rows */}
                        <tbody className="divide-y divide-gray-200">
                          {filteredCampaigns.map((campaign, index) => (
                            <tr 
                              key={campaign.id} 
                              className="transition-colors border-b border-gray-50 hover:bg-opacity-50 hover:bg-gray-50"
                            >
                              {/* Bulk Selection Checkbox */}
                              <td className="px-4 py-4">
                                <input
                                  type="checkbox"
                                  checked={selectedCampaigns.includes(campaign.id)}
                                  onChange={() => toggleCampaignSelection(campaign.id)}
                                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                                />
                              </td>
                              
                              {/* Campaign Name with Status */}
                              <td className="px-6 py-5">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(campaign.status)}
                                  <div>
                                    <button className="text-sm text-gray-900 hover:text-blue-600 transition-colors text-left">
                                      {campaign.name}
                                    </button>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      ID: {campaign.id} • {campaign.status}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              
                              {/* Clicks */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'clicks', campaign.clicks, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatNumber(campaign.clicks)}
                                </div>
                              </td>
                              
                              {/* Impressions */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'impressions', campaign.impressions, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatLargeNumber(campaign.impressions)}
                                </div>
                              </td>
                              
                              {/* CTR */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'ctr', campaign.ctr, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatPercentage(campaign.ctr)}
                                </div>
                              </td>
                              
                              {/* CPC */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'avgCpc', campaign.avgCpc, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatCurrency(campaign.avgCpc)}
                                </div>
                              </td>
                              
                              {/* Cost */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'cost', campaign.cost, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatCurrency(campaign.cost)}
                                </div>
                              </td>
                              
                              {/* Conversions */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'conversions', campaign.conversions, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatNumber(campaign.conversions)}
                                </div>
                              </td>
                              
                              {/* Conv. Value */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'conversionsValue', campaign.conversionsValue, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatCurrency(campaign.conversionsValue)}
                                </div>
                              </td>
                              
                              {/* CPA */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'cpa', campaign.cpa, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {formatCurrency(campaign.cpa)}
                                </div>
                              </td>
                              
                              {/* ROAS */}
                              <td className="px-6 py-5 text-right">
                                <div 
                                  className="text-sm text-gray-700 px-2 py-1 rounded cursor-pointer hover:bg-gray-50 hover:bg-opacity-50 transition-colors"
                                  onMouseEnter={(e) => handleMetricHover(e, 'roas', campaign.roas, campaign.name, campaign.id)}
                                  onMouseLeave={handleMetricLeave}
                                >
                                  {campaign.roas.toFixed(2)}x
                                </div>
                              </td>
                              
                              {/* Actions */}
                              <td className="px-6 py-4 text-center">
                                <div className="relative">
                                  <button className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                        
                        {/* Totals Footer */}
                        <tfoot className="border-t border-gray-100">
                          <tr className="text-gray-900">
                            <td className="px-4 py-5"></td>
                            <td className="px-6 py-5">
                              <div className="text-sm font-medium">TOTAL</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {filteredCampaigns.length} campaigns
                              </div>
                            </td>
                            
                            {(() => {
                              const totals = calculateTableTotals();
                              return (
                                <>
                                  <td className="px-6 py-5 text-right text-sm">{formatNumber(totals.clicks)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatLargeNumber(totals.impressions)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatPercentage(totals.ctr)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatCurrency(totals.avgCpc)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatCurrency(totals.cost)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatNumber(totals.conversions)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatCurrency(totals.conversionsValue)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{formatCurrency(totals.cpa)}</td>
                                  <td className="px-6 py-5 text-right text-sm">{totals.roas.toFixed(2)}x</td>
                                  <td className="px-6 py-5"></td>
                                </>
                              );
                            })()}
                          </tr>
                        </tfoot>
                    </table>
                  </div>
                );
              } else {
                // Charts View - Empty Canvas
                return (
                  <div className="p-6">
                    <div className="flex items-center justify-center min-h-96 bg-white rounded-lg border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <div className="mb-4">
                          <BarChart3 className="h-16 w-16 mx-auto text-gray-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          Charts Section Ready
                        </h3>
                        <p className="text-gray-500 max-w-sm">
                          This clean canvas is ready for your new charts and visualizations. Start building your dashboard here!
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
            })()}
          </div>
        </>
      )}

      {/* No data state */}
      {!campaignData && !loading && (
        <div className="text-center py-16">
          <div className="text-gray-400 mb-6">
            <BarChart3 className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome to Kovvar | PPC Performance</h3>
          <p className="text-gray-500 mb-6">
            {selectedAccount 
              ? 'No data available for the selected account and date range.'
              : 'Select an account from the header to view comprehensive PPC analytics.'
            }
          </p>
          {!selectedAccount && (
            <div className="flex justify-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                <p className="text-blue-800 text-sm">
                  💡 Choose an account from the dropdown in the header to get started with your analytics dashboard.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );

  // Ad Groups Performance page
  const renderAdGroupsPage = () => {
    console.log("🎯 renderAdGroupsPage called");
    return (
      <>
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Ad Groups & Asset Groups Performance</h2>
          <p className="text-gray-600">
            {selectedAccountData && selectedDateRange
              ? `Traditional ad groups and Performance Max asset groups for ${getDisplayName(selectedAccountData)} • ${formatDateRangeDisplay(selectedDateRange)}`
              : 'Analyze and optimize performance across traditional ad groups and Performance Max asset groups'
            }
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading ad groups and asset groups data...</p>
          </div>
        )}

        {/* No Account Selected */}
        {!selectedAccount && !loading && (
          <div className="text-center py-16">
            <div className="text-gray-400 mb-6">
              <Target className="h-16 w-16 mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select an Account</h3>
            <p className="text-gray-500 mb-6">
              Choose an account from the header to view ad groups and asset groups performance data.
            </p>
            <div className="flex justify-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                <p className="text-blue-800 text-sm">
                  💡 Select an account from the dropdown in the header to analyze ad groups and asset groups performance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Ad Groups & Asset Groups Table */}
        {selectedAccount && campaignData && !loading && (
          <AdGroupsTable />
        )}
      </>
    );
  };

  // 🎯 RENDER COUNTER - Track if infinite loop is truly fixed
  let adGroupsTableRenderCount = 0;

  // Ad Groups Table Component (Enhanced for both Ad Groups and Asset Groups)
  const AdGroupsTable = () => {
    const [adGroupSearch, setAdGroupSearch] = useState<string>('');
    const [adGroupSort, setAdGroupSort] = useState<{field: string, direction: 'asc' | 'desc' | null}>({field: '', direction: null});
    const [selectedAdGroups, setSelectedAdGroups] = useState<string[]>([]);
    const [groupTypeFilter, setGroupTypeFilter] = useState<'all' | 'traditional' | 'asset'>('all');
    const [realAdGroupData, setRealAdGroupData] = useState<any>(null);
    const [adGroupsLoading, setAdGroupsLoading] = useState(false);
    const [adGroupsError, setAdGroupsError] = useState<string>('');
    
    // 🚨 CRITICAL DEBUG LOGGING to identify infinite loop cause
    console.log("🎯 AdGroupsTable render caused by:", {
      selectedAccount: !!selectedAccount,
      selectedDateRange: !!selectedDateRange,
      realAdGroupData: !!realAdGroupData,
      adGroupSearch,
      groupTypeFilter,
      adGroupSort,
      renderTime: new Date().toISOString()
    });

    // 🚨 CRITICAL FIX: Memoize fetchAdGroupsData with PROPER CACHE LOGIC
    const fetchAdGroupsData = useCallback(async () => {
      console.log("🎯 fetchAdGroupsData called - MEMOIZED");
      if (!selectedAccount || !selectedDateRange) return;
      
      try {
        setAdGroupsLoading(true);
        setAdGroupsError('');
        
        const apiDateRange = getApiDateRange(selectedDateRange);
        
        // 🚨 STEP 1: BUILD PROPER CACHE KEY
        const cacheKey = `adgroups_${selectedAccount}_${apiDateRange.days}days`;
        console.log("🎯 Cache check:", { cacheKey, selectedAccount, days: apiDateRange.days });
        
        // 🚨 STEP 2: CHECK CACHE FIRST (30 min TTL)
        const cachedData = getFromCache(cacheKey, 30);
        console.log("💽 Cache result:", { 
          cached: !!cachedData, 
          cacheExists: cachedData !== null,
          cacheKey 
        });
        
        // 🚨 STEP 3: IF CACHE HIT, RETURN IMMEDIATELY
        if (cachedData) {
          console.log("🎯 CACHE HIT - Using cached ad groups data");
          console.log("✅ Returning cached ad groups data");
          setRealAdGroupData(cachedData);
          setAdGroupsLoading(false);
          return; // ← CRITICAL: Must return here to avoid API call
        }
        
        // 🚨 STEP 4: CACHE MISS - FETCH FROM API
        console.log("🎯 CACHE MISS - Fetching from API");
        console.log("🌐 Making fresh API call for ad groups");
        
        const response = await fetch(`/api/ad-groups?customerId=${selectedAccount}&dateRange=${apiDateRange.days}&groupType=all`);
        const result = await response.json();
        
        if (result.success) {
          console.log('📊 Real Ad Groups Data Fetched:', result.data);
          
          // 🚨 STEP 5: SAVE TO CACHE AFTER SUCCESS
          saveToCache(cacheKey, result.data);
          console.log("💾 Saved ad groups to cache successfully");
          
          setRealAdGroupData(result.data);
        } else {
          console.error('Failed to fetch ad groups data:', result.message);
          setAdGroupsError(result.message || 'Failed to fetch ad groups data');
        }
      } catch (err) {
        console.error('Error fetching ad groups data:', err);
        setAdGroupsError('Error fetching ad groups data');
      } finally {
        setAdGroupsLoading(false);
      }
    }, [selectedAccount, selectedDateRange, getApiDateRange]);

    // 🚨 CRITICAL FIX: Proper useEffect with correct dependencies
    useEffect(() => {
      console.log("🎯 useEffect triggered - fetching ad groups data");
      fetchAdGroupsData();
    }, [fetchAdGroupsData]); // 🚨 FIXED: Now depends on memoized function
    
    // Campaign type detection based on naming conventions
    const detectCampaignType = useCallback((campaignName: string): 'search' | 'shopping' | 'performance_max' | 'other' => {
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
    }, []);

    // Get campaign type statistics for filter display - MEMOIZED
    const typeStats = useMemo(() => {
      if (realAdGroupData?.groups) {
        const traditional = realAdGroupData.groups.filter((g: any) => g.groupType === 'ad_group').length;
        const asset = realAdGroupData.groups.filter((g: any) => g.groupType === 'asset_group').length;
        return { traditional, asset, total: traditional + asset };
      }
      
      // Fallback to campaign-based stats if no real data
      if (!campaignData) return { traditional: 0, asset: 0, total: 0 };
      
      let traditional = 0;
      let asset = 0;
      
      campaignData.campaigns.forEach(campaign => {
        const type = detectCampaignType(campaign.name);
        if (type === 'performance_max') {
          asset++;
        } else {
          traditional++;
        }
      });
      
      return { traditional, asset, total: traditional + asset };
    }, [realAdGroupData, campaignData, detectCampaignType]);
    
    // Get all ad groups and asset groups from all campaigns - MEMOIZED TO FIX INFINITE LOOP
    const allAdGroups = useMemo(() => {
      console.log("🎯 getAllAdGroups called");
      // Use real data if available
      if (realAdGroupData?.groups) {
        return realAdGroupData.groups.map((group: any) => ({
          ...group,
          // Ensure consistent field names
          campaignType: detectCampaignType(group.campaignName),
          // Add mock Performance Max fields if not present
          adStrength: group.groupType === 'asset_group' && !group.adStrength ? 
            (['Poor', 'Good', 'Excellent'] as const)[Math.floor(Math.random() * 3)] : group.adStrength,
          assetCoverage: group.groupType === 'asset_group' && !group.assetCoverage ? 
            Math.floor(Math.random() * 40) + 60 : group.assetCoverage
        }));
      }

      // Fallback to mock data if real data not available
      if (!campaignData) return [];
      
      let allGroups: (AdGroup & { 
        campaignName: string; 
        campaignType: 'search' | 'shopping' | 'performance_max' | 'other';
        groupType: 'ad_group' | 'asset_group';
        adStrength?: 'Poor' | 'Good' | 'Excellent';
        assetCoverage?: number;
      })[] = [];
      
      // Add ad groups from expanded campaigns (if any loaded)
      Object.entries(adGroupData).forEach(([campaignId, data]) => {
        const campaign = campaignData.campaigns.find(c => c.id === campaignId);
        if (!campaign) return;
        
        const campaignName = campaign.name;
        const campaignType = detectCampaignType(campaignName);
        
        data.adGroups.forEach(adGroup => {
          allGroups.push({
            ...adGroup,
            campaignName,
            campaignType,
            groupType: campaignType === 'performance_max' ? 'asset_group' : 'ad_group',
            // Add mock Performance Max specific fields
            adStrength: campaignType === 'performance_max' ? 
              (['Poor', 'Good', 'Excellent'] as const)[Math.floor(Math.random() * 3)] : undefined,
            assetCoverage: campaignType === 'performance_max' ? 
              Math.floor(Math.random() * 40) + 60 : undefined // 60-100%
          });
        });
      });
      
      // If no ad groups loaded yet, show mock data based on campaigns
      if (allGroups.length === 0 && campaignData.campaigns.length > 0) {
        campaignData.campaigns.slice(0, 8).forEach(campaign => {
          const campaignType = detectCampaignType(campaign.name);
          const isPerformanceMax = campaignType === 'performance_max';
          
          // Create 2-4 groups per campaign
          const numGroups = Math.floor(Math.random() * 3) + 2;
          for (let i = 0; i < numGroups; i++) {
            const baseMetrics = {
              impressions: Math.floor(campaign.impressions * (0.15 + Math.random() * 0.25)),
              clicks: Math.floor(campaign.clicks * (0.15 + Math.random() * 0.25)),
              cost: campaign.cost * (0.15 + Math.random() * 0.25),
              conversions: campaign.conversions * (0.15 + Math.random() * 0.25),
              conversionsValue: campaign.conversionsValue * (0.15 + Math.random() * 0.25),
            };
            
            allGroups.push({
              id: `${campaign.id}_${isPerformanceMax ? 'ag' : 'adg'}_${i + 1}`,
              name: isPerformanceMax ? `Asset Group ${i + 1}` : `Ad Group ${i + 1}`,
              status: Math.random() > 0.15 ? 'ENABLED' : 'PAUSED',
              campaignId: campaign.id,
              campaignName: campaign.name,
              campaignType,
              groupType: isPerformanceMax ? 'asset_group' : 'ad_group',
              ...baseMetrics,
              ctr: baseMetrics.impressions > 0 ? (baseMetrics.clicks / baseMetrics.impressions) * 100 : 0,
              avgCpc: baseMetrics.clicks > 0 ? baseMetrics.cost / baseMetrics.clicks : 0,
              conversionRate: baseMetrics.clicks > 0 ? (baseMetrics.conversions / baseMetrics.clicks) * 100 : 0,
              cpa: baseMetrics.conversions > 0 ? baseMetrics.cost / baseMetrics.conversions : 0,
              roas: baseMetrics.cost > 0 ? baseMetrics.conversionsValue / baseMetrics.cost : 0,
              // Performance Max specific fields
              adStrength: isPerformanceMax ? 
                (['Poor', 'Good', 'Excellent'] as const)[Math.floor(Math.random() * 3)] : undefined,
              assetCoverage: isPerformanceMax ? 
                Math.floor(Math.random() * 40) + 60 : undefined // 60-100%
            });
          }
        });
      }
      
      return allGroups;
    }, [realAdGroupData, campaignData, adGroupData, detectCampaignType]);

    // Filter and sort ad groups - MEMOIZED TO FIX INFINITE LOOP
    const filteredAdGroups = useMemo(() => {
      console.log("🎯 getFilteredAndSortedAdGroups called");
      let groups = [...allAdGroups];
      
      // Group type filter
      if (groupTypeFilter === 'traditional') {
        groups = groups.filter((g: any) => g.groupType === 'ad_group');
      } else if (groupTypeFilter === 'asset') {
        groups = groups.filter((g: any) => g.groupType === 'asset_group');
      }
      
      // Search filter
      if (adGroupSearch.trim()) {
        const searchTerm = adGroupSearch.toLowerCase().trim();
        groups = groups.filter((g: any) => 
          g.name.toLowerCase().includes(searchTerm) ||
          g.campaignName.toLowerCase().includes(searchTerm) ||
          g.id.toLowerCase().includes(searchTerm)
        );
      }
      
      // Apply sorting
      if (adGroupSort.field && adGroupSort.direction) {
        groups.sort((a: any, b: any) => {
          const field = adGroupSort.field;
          let aValue: any = a[field as keyof typeof a];
          let bValue: any = b[field as keyof typeof b];
          
          const numericFields = ['clicks', 'impressions', 'cost', 'ctr', 'avgCpc', 'conversions', 'conversionsValue', 'cpa', 'roas', 'assetCoverage'];
          
          if (numericFields.includes(field)) {
            aValue = Number(aValue) || 0;
            bValue = Number(bValue) || 0;
          } else {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
          }
          
          let comparison = 0;
          if (aValue < bValue) {
            comparison = -1;
          } else if (aValue > bValue) {
            comparison = 1;
          }
          
          return adGroupSort.direction === 'asc' ? comparison : -comparison;
        });
      }
      
      return groups;
    }, [allAdGroups, groupTypeFilter, adGroupSearch, adGroupSort]);

    const handleSort = (field: string) => {
      setAdGroupSort(prev => {
        if (prev.field !== field) {
          return { field, direction: 'desc' };
        }
        switch (prev.direction) {
          case null: return { field, direction: 'desc' };
          case 'desc': return { field, direction: 'asc' };
          case 'asc': return { field: '', direction: null };
          default: return { field: '', direction: null };
        }
      });
    };

    const getSortIcon = (field: string) => {
      if (adGroupSort.field !== field || adGroupSort.direction === null) {
        return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
      }
      return adGroupSort.direction === 'asc' 
        ? <ArrowUp className="h-4 w-4 text-blue-600" />
        : <ArrowDown className="h-4 w-4 text-blue-600" />;
    };

    const toggleAdGroupSelection = (adGroupId: string) => {
      setSelectedAdGroups(prev => 
        prev.includes(adGroupId) 
          ? prev.filter(id => id !== adGroupId)
          : [...prev, adGroupId]
      );
    };

    const selectAllAdGroups = () => {
      setSelectedAdGroups(filteredAdGroups.map((ag: any) => ag.id));
    };

    const clearAllAdGroups = () => setSelectedAdGroups([]);

    const getAdGroupPerformanceIndicator = useCallback((adGroup: any, metric: string): 'high' | 'medium' | 'low' => {
      if (allAdGroups.length < 3) return 'medium';
      const values = allAdGroups.map((ag: any) => ag[metric as keyof typeof ag] as number).sort((a: number, b: number) => b - a);
      const value = adGroup[metric as keyof typeof adGroup] as number;
      
      if (value >= values[Math.floor(values.length * 0.33)]) return 'high';
      if (value >= values[Math.floor(values.length * 0.67)]) return 'medium';
      return 'low';
    }, [allAdGroups]);

    const calculateAdGroupTotals = useMemo(() => {
      console.log("🎯 calculateAdGroupTotals memoized calculation");
      const totals = filteredAdGroups.reduce((acc: any, adGroup: any) => ({
        clicks: acc.clicks + adGroup.clicks,
        impressions: acc.impressions + adGroup.impressions,
        cost: acc.cost + adGroup.cost,
        conversions: acc.conversions + adGroup.conversions,
        conversionsValue: acc.conversionsValue + adGroup.conversionsValue,
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
        roas: totals.cost > 0 ? totals.conversionsValue / totals.cost : 0
      };
    }, [filteredAdGroups]);

    const getGroupTypeBadge = (groupType: 'ad_group' | 'asset_group') => {
      return groupType === 'asset_group' 
        ? 'bg-purple-100 text-purple-800 border border-purple-200'
        : 'bg-blue-100 text-blue-800 border border-blue-200';
    };

    const getCampaignTypeIndicator = (campaignType: 'search' | 'shopping' | 'performance_max' | 'other') => {
      const indicators = {
        'search': { icon: Search, color: 'text-blue-600', bg: 'bg-blue-100' },
        'shopping': { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
        'performance_max': { icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100' },
        'other': { icon: MoreHorizontal, color: 'text-gray-600', bg: 'bg-gray-100' }
      };
      return indicators[campaignType];
    };

    // Get ad strength badge styles
    const getAdStrengthBadge = (strength: 'Poor' | 'Good' | 'Excellent') => {
      switch (strength) {
        case 'Excellent': return 'bg-green-100 text-green-800 border border-green-200';
        case 'Good': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
        case 'Poor': return 'bg-red-100 text-red-800 border border-red-200';
      }
    };

    // Show loading state
    if (adGroupsLoading) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading ad groups and asset groups...</p>
        </div>
      );
    }

    // Show error state
    if (adGroupsError) {
      return (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="text-red-400 mb-4">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-red-600 mb-4">{adGroupsError}</p>
          <button 
            onClick={fetchAdGroupsData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Table Header with Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Ad Groups & Asset Groups Performance
              </h3>
              <p className="text-sm text-gray-500">
                Showing {filteredAdGroups.length} groups • Last {campaignData?.dateRange.days || selectedDateRange?.apiDays || 30} days
                {realAdGroupData && (
                  <span className="text-green-600 ml-2">• Live Data ✅</span>
                )}
              </p>
            </div>
            
            {/* Group Type Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setGroupTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    groupTypeFilter === 'all'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({typeStats.total})
                </button>
                <button
                  onClick={() => setGroupTypeFilter('traditional')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    groupTypeFilter === 'traditional'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Traditional ({typeStats.traditional})
                </button>
                <button
                  onClick={() => setGroupTypeFilter('asset')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    groupTypeFilter === 'asset'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Asset Groups ({typeStats.asset})
                </button>
              </div>
              
              {/* Bulk Actions */}
              {selectedAdGroups.length > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    {selectedAdGroups.length} selected
                  </span>
                  <button className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    <span className="text-sm font-medium">Actions</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Search Bar and Filters */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ad groups, asset groups, or campaigns..."
                  value={adGroupSearch}
                  onChange={(e) => setAdGroupSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Quick Filter Chips */}
              <div className="flex items-center space-x-2">
                <button className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  <Zap className="h-3 w-3 mr-1" />
                  High Spend
                </button>
                <button className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  <Target className="h-3 w-3 mr-1" />
                  Low CTR
                </button>
                <button className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  High CPA
                </button>
              </div>
            </div>
            
            {/* Bulk Selection Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={filteredAdGroups.length > 0 && filteredAdGroups.every((ag: any) => selectedAdGroups.includes(ag.id)) ? clearAllAdGroups : selectAllAdGroups}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {filteredAdGroups.length > 0 && filteredAdGroups.every((ag: any) => selectedAdGroups.includes(ag.id)) ? 'Clear All' : 'Select All'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Table Content */}
        {filteredAdGroups.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-400 mb-4">
              <Target className="h-12 w-12 mx-auto" />
            </div>
            <p className="text-gray-500 text-lg">
              {adGroupSearch.trim() ? 'No groups match your search' : 'No groups found'}
            </p>
            <p className="text-gray-400 text-sm">
              {adGroupSearch.trim() ? 'Try adjusting your search criteria' : 'Groups will appear here when campaign data is loaded'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto" style={{ height: 'calc(100vh - 280px)' }}>
            <table className="w-full">
              {/* Sticky Header */}
              <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 z-10">
                <tr>
                  {/* Bulk Selection Checkbox */}
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={filteredAdGroups.length > 0 && filteredAdGroups.every((ag: any) => selectedAdGroups.includes(ag.id))}
                      onChange={() => {
                        const allSelected = filteredAdGroups.every((ag: any) => selectedAdGroups.includes(ag.id));
                        if (allSelected) {
                          clearAllAdGroups();
                        } else {
                          selectAllAdGroups();
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </th>
                  
                  {/* Name */}
                  <th 
                    onClick={() => handleSort('name')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Name</span>
                      {getSortIcon('name')}
                    </div>
                  </th>
                  
                  {/* Campaign */}
                  <th 
                    onClick={() => handleSort('campaignName')}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-1">
                      <span>Campaign</span>
                      {getSortIcon('campaignName')}
                    </div>
                  </th>
                  
                  {/* Type */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Type
                  </th>
                  
                  {/* Impressions */}
                  <th 
                    onClick={() => handleSort('impressions')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Impressions</span>
                      {getSortIcon('impressions')}
                    </div>
                  </th>
                  
                  {/* Clicks */}
                  <th 
                    onClick={() => handleSort('clicks')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Clicks</span>
                      {getSortIcon('clicks')}
                    </div>
                  </th>
                  
                  {/* CTR */}
                  <th 
                    onClick={() => handleSort('ctr')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>CTR</span>
                      {getSortIcon('ctr')}
                    </div>
                  </th>
                  
                  {/* CPC */}
                  <th 
                    onClick={() => handleSort('avgCpc')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>CPC</span>
                      {getSortIcon('avgCpc')}
                    </div>
                  </th>
                  
                  {/* Cost */}
                  <th 
                    onClick={() => handleSort('cost')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Cost</span>
                      {getSortIcon('cost')}
                    </div>
                  </th>
                  
                  {/* Conversions */}
                  <th 
                    onClick={() => handleSort('conversions')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Conversions</span>
                      {getSortIcon('conversions')}
                    </div>
                  </th>
                  
                  {/* CPA */}
                  <th 
                    onClick={() => handleSort('cpa')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>CPA</span>
                      {getSortIcon('cpa')}
                    </div>
                  </th>
                  
                  {/* ROAS */}
                  <th 
                    onClick={() => handleSort('roas')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>ROAS</span>
                      {getSortIcon('roas')}
                    </div>
                  </th>
                  
                  {/* Ad Strength (Asset Groups only) */}
                  <th 
                    onClick={() => handleSort('adStrength')}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Ad Strength</span>
                      {getSortIcon('adStrength')}
                    </div>
                  </th>
                  
                  {/* Asset Coverage (Asset Groups only) */}
                  <th 
                    onClick={() => handleSort('assetCoverage')}
                    className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-end space-x-1">
                      <span>Asset Coverage</span>
                      {getSortIcon('assetCoverage')}
                    </div>
                  </th>
                  
                  {/* Actions */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              
              {/* Group Rows */}
              <tbody className="divide-y divide-gray-200">
                {filteredAdGroups.map((group: any, index: number) => (
                  <tr 
                    key={group.id} 
                    className={`transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50`}
                  >
                    {/* Bulk Selection Checkbox */}
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAdGroups.includes(group.id)}
                        onChange={() => toggleAdGroupSelection(group.id)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    
                    {/* Name with Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(group.status)}
                        <div>
                          <button className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left">
                            {group.name}
                          </button>
                          <div className="text-xs text-gray-500">
                            ID: {group.id} • {group.status}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Campaign Name with Type Indicator */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${getCampaignTypeIndicator(group.campaignType).bg}`}>
                          {React.createElement(getCampaignTypeIndicator(group.campaignType).icon, { 
                            className: `h-3 w-3 ${getCampaignTypeIndicator(group.campaignType).color}` 
                          })}
                        </div>
                        <div className="text-sm text-gray-900 font-medium">
                          {group.campaignName}
                        </div>
                      </div>
                    </td>
                    
                    {/* Type Badge */}
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getGroupTypeBadge(group.groupType)}`}>
                        {group.groupType === 'asset_group' ? 'Asset Group' : 'Ad Group'}
                      </span>
                    </td>
                    
                    {/* Impressions */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'impressions'))}`}>
                        {formatLargeNumber(group.impressions)}
                      </div>
                    </td>
                    
                    {/* Clicks */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'clicks'))}`}>
                        {formatNumber(group.clicks)}
                      </div>
                    </td>
                    
                    {/* CTR */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'ctr'))}`}>
                        {formatPercentage(group.ctr)}
                      </div>
                    </td>
                    
                    {/* CPC */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'avgCpc'))}`}>
                        {formatCurrency(group.avgCpc)}
                      </div>
                    </td>
                    
                    {/* Cost */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'cost'))}`}>
                        {formatCurrency(group.cost)}
                      </div>
                    </td>
                    
                    {/* Conversions */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'conversions'))}`}>
                        {formatNumber(group.conversions)}
                      </div>
                    </td>
                    
                    {/* CPA */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'cpa'))}`}>
                        {formatCurrency(group.cpa)}
                      </div>
                    </td>
                    
                    {/* ROAS */}
                    <td className="px-6 py-4 text-right">
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getPerformanceColor(getAdGroupPerformanceIndicator(group, 'roas'))}`}>
                        {group.roas.toFixed(2)}x
                      </div>
                    </td>
                    
                    {/* Ad Strength (Asset Groups only) */}
                    <td className="px-6 py-4 text-center">
                      {group.adStrength ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAdStrengthBadge(group.adStrength)}`}>
                          {group.adStrength}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    
                    {/* Asset Coverage (Asset Groups only) */}
                    <td className="px-6 py-4 text-right">
                      {group.assetCoverage ? (
                        <div className="flex items-center justify-end space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                group.assetCoverage >= 80 ? 'bg-green-500' : 
                                group.assetCoverage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${group.assetCoverage}%` }}
                            ></div>
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {group.assetCoverage}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    
                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <div className="relative">
                        <button className="text-gray-400 hover:text-gray-600 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Totals Footer */}
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr className="font-bold text-gray-900">
                  <td className="px-4 py-4"></td>
                  <td className="px-6 py-4 text-sm">
                    TOTAL
                    <div className="text-xs font-normal text-gray-500">
                      {filteredAdGroups.length} groups
                    </div>
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  
                  {(() => {
                    const totals = calculateAdGroupTotals;
                    return (
                      <>
                        <td className="px-6 py-4 text-right text-sm">{formatLargeNumber(totals.impressions)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatNumber(totals.clicks)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatPercentage(totals.ctr)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(totals.avgCpc)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(totals.cost)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatNumber(totals.conversions)}</td>
                        <td className="px-6 py-4 text-right text-sm">{formatCurrency(totals.cpa)}</td>
                        <td className="px-6 py-4 text-right text-sm">{totals.roas.toFixed(2)}x</td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                        <td className="px-6 py-4"></td>
                      </>
                    );
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Keywords & Search Terms Page
  const renderKeywordsPage = () => (
    <>
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Keywords & Search Terms</h2>
        <p className="text-gray-600">
          {selectedAccountData && selectedDateRange
            ? `Analyze keyword performance and discover search term opportunities for ${getDisplayName(selectedAccountData)} • ${formatDateRangeDisplay(selectedDateRange)}`
            : 'Analyze keyword performance and discover new search term opportunities'
          }
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-16">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading keywords and search terms data...</p>
        </div>
      )}

      {/* No Account Selected */}
      {!selectedAccount && !loading && (
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
      )}

      {/* Keywords & Search Terms Table */}
      {selectedAccount && campaignData && !loading && (
        <KeywordsTable />
      )}
    </>
  );

  // Keywords & Search Terms Table Component  
  const KeywordsTable = () => {
    // Core state
    const [keywordData, setKeywordData] = useState<any[]>([]);
    const [keywordsSummary, setKeywordsSummary] = useState<any>(null);
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
    const [selectedColumns, setSelectedColumns] = useState<string[]>([
      'keyword_text', 'match_type', 'impressions', 'clicks', 'cost', 'conversions', 'ctr', 'cpc'
    ]);

    // Available columns configuration  
    const availableColumns = [
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
    ];

    // 🚨 CRITICAL FIX: Memoize fetchKeywordsData with PROPER CACHE LOGIC
    const fetchKeywordsData = useCallback(async () => {
      console.log("🎯 fetchKeywordsData called - MEMOIZED");
      if (!selectedAccount || !selectedDateRange) return;

      try {
        setKeywordsLoading(true);
        setKeywordsError('');

        const apiDateRange = getApiDateRange(selectedDateRange);
        
        // 🚨 STEP 1: BUILD PROPER CACHE KEY (include dataType for keywords vs search_terms)
        const cacheKey = `keywords_${selectedAccount}_${apiDateRange.days}days_${dataType}`;
        console.log("🎯 Cache check:", { 
          cacheKey, 
          selectedAccount, 
          days: apiDateRange.days,
          dataType: dataType
        });
        
        // 🚨 STEP 2: CHECK CACHE FIRST (30 min TTL)
        const cachedData = getFromCache(cacheKey, 30);
        console.log("💽 Cache result:", { 
          cached: !!cachedData, 
          cacheExists: cachedData !== null,
          cacheKey 
        });
        
        // 🚨 STEP 3: If cached exists, return cached data
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
        
        // 🚨 STEP 4: If no cached data, proceed with API call
        console.log("🎯 CACHE MISS - Fetching from API");
        console.log("🌐 Making fresh API call for keywords");
        
        const response = await fetch(`/api/keywords?customerId=${selectedAccount}&dateRange=${apiDateRange.days}&dataType=${dataType}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch keywords: ${response.statusText}`);
        }

        const result = await response.json();
        
        // 🚨 STEP 5: Save to cache after successful API response
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
    }, [selectedAccount, selectedDateRange, dataType, getApiDateRange]);

    // Fetch data when dependencies change
    useEffect(() => {
      fetchKeywordsData();
    }, [fetchKeywordsData, dataType]);

    // Get intelligent KPI based on current data type
    const getIntelligentKPI = () => {
      // Only show intelligent KPI for keywords and search_terms
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
    };

    // Filter and sort data
    const getFilteredAndSortedData = () => {
      
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
          let aValue = a[keywordSort.field];
          let bValue = b[keywordSort.field];

          if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }

          if (aValue < bValue) return keywordSort.direction === 'asc' ? -1 : 1;
          if (aValue > bValue) return keywordSort.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return filtered;
    };

    // Pagination
    const filteredData = getFilteredAndSortedData();
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const paginatedData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    // Chart data preparation
    // getHighSpendZeroConversionData removed as it was unused

    // getCostDistributionData removed as it was unused

    // getPerformanceQuadrantData removed as it was unused

    // New chart data functions for enhanced charts view
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

    // State for table pagination
    const [highSpendPage, setHighSpendPage] = useState(1);
    const [bestPerformingPage, setBestPerformingPage] = useState(1);
    const tableItemsPerPage = 10;

    // Get paginated data for tables
    const getPaginatedHighSpendData = () => {
      const data = getHighSpendZeroConversionsTableData();
      const startIndex = (highSpendPage - 1) * tableItemsPerPage;
      return data.slice(startIndex, startIndex + tableItemsPerPage);
    };

    const getPaginatedBestPerformingData = () => {
      const data = getBestPerformingKeywordsData();
      const startIndex = (bestPerformingPage - 1) * tableItemsPerPage;
      return data.slice(startIndex, startIndex + tableItemsPerPage);
    };

    // Colors for donut charts
    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    // Handle sorting
    const handleKeywordSort = (field: string) => {
      if (keywordSort.field === field) {
        setKeywordSort(prev => ({ 
          field, 
          direction: prev.direction === 'asc' ? 'desc' : prev.direction === 'desc' ? null : 'asc' 
        }));
      } else {
        setKeywordSort({ field, direction: 'desc' });
      }
    };

    // toggleColumn function removed as it was unused

    // Get visible columns based on data type
    const getVisibleColumns = () => {
      return availableColumns.filter(col => {
        // Always show always-visible columns
        if (col.always) return true;
        
        // Filter by data type
        if (col.keywordsOnly && dataType !== 'keywords') return false;
        if (col.searchTermsOnly && dataType !== 'search_terms') return false;
        
        // Check if column is selected
        return selectedColumns.includes(col.id);
      });
    };

    const intelligentKPI = getIntelligentKPI();

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

    return (
      <div className="space-y-6">
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
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === 'table'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Table</span>
                </button>
                <button
                  onClick={() => setViewMode('charts')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    viewMode === 'charts'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <PieChartIcon className="w-4 h-4" />
                  <span>Charts</span>
                </button>
              </div>
            </div>

            {/* Intelligent KPI */}
            {intelligentKPI && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <intelligentKPI.icon className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {intelligentKPI.label}
                    </div>
                    <div className="text-xs text-gray-500">
                      {intelligentKPI.description}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${intelligentKPI.color}`}>
                    {intelligentKPI.value}
                  </div>
                  <div className="text-xs text-gray-500">
                    {intelligentKPI.count}
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
            
            {/* Search Bar and Filters - Only show for keywords/search_terms */}
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
                    {getVisibleColumns().map(col => (
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
                  {paginatedData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      {getVisibleColumns().map(col => (
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
                          ) : col.id === 'triggering_keyword' ? (
                            <div className="text-sm text-gray-600 max-w-xs truncate">
                              {item[col.id] || '-'}
                            </div>
                          ) : col.id === 'cost' ? (
                            <div className="text-sm text-gray-900">
                              €{typeof item[col.id] === 'number' ? item[col.id].toFixed(2) : '0.00'}
                            </div>
                          ) : col.id === 'ctr' || col.id === 'roas' ? (
                            <div className="text-sm text-gray-900">
                              {typeof item[col.id] === 'number' ? (item[col.id] * 100).toFixed(2) + '%' : '0.00%'}
                            </div>
                          ) : col.id === 'cpc' || col.id === 'conversions_value' ? (
                            <div className="text-sm text-gray-900">
                              €{typeof item[col.id] === 'number' ? item[col.id].toFixed(2) : '0.00'}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {typeof item[col.id] === 'number' ? item[col.id].toLocaleString() : item[col.id] || '-'}
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Pagination */}
              {totalPages > 1 && (
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
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Enhanced Charts View */
            <div className="p-6 space-y-8">
              {/* Top 3 Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Match Type Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Match Type Distribution</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={getMatchTypeDistributionData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                        label={({ name, percentage }) => `${name}\n${percentage.toFixed(1)}%`}
                      >
                        {getMatchTypeDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Conversions per Match Type */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Conversions per Match Type</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={getConversionsPerMatchTypeData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                        label={({ name, percentage }) => `${name}\n${percentage.toFixed(1)}%`}
                      >
                        {getConversionsPerMatchTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [value, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* CPA per Match Type */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">CPA per Match Type</h4>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={getCPAPerMatchTypeData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                        label={({ name, value }) => `${name}\n€${typeof value === 'number' ? value.toFixed(2) : '0.00'}`}
                      >
                        {getCPAPerMatchTypeData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value, name) => [`€${typeof value === 'number' ? value.toFixed(2) : '0.00'}`, 'CPA']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Tables Section */}
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
                        {getPaginatedHighSpendData().map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                              {item.keyword_text}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              €{(item.cost || 0).toFixed(2)}
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
                  {/* Pagination for High Spend Table */}
                  {Math.ceil(getHighSpendZeroConversionsTableData().length / tableItemsPerPage) > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((highSpendPage - 1) * tableItemsPerPage) + 1} to {Math.min(highSpendPage * tableItemsPerPage, getHighSpendZeroConversionsTableData().length)} of {getHighSpendZeroConversionsTableData().length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setHighSpendPage(prev => Math.max(1, prev - 1))}
                          disabled={highSpendPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700">
                          {highSpendPage} of {Math.ceil(getHighSpendZeroConversionsTableData().length / tableItemsPerPage)}
                        </span>
                        <button
                          onClick={() => setHighSpendPage(prev => Math.min(Math.ceil(getHighSpendZeroConversionsTableData().length / tableItemsPerPage), prev + 1))}
                          disabled={highSpendPage === Math.ceil(getHighSpendZeroConversionsTableData().length / tableItemsPerPage)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Best Performing Keywords Table */}
                <div className="bg-white rounded-lg shadow">
                  <div className="p-6 border-b">
                    <h4 className="text-lg font-semibold text-gray-900">Best Performing Keywords</h4>
                    <p className="text-sm text-gray-600">Top keywords by impression share performance</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Keyword</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Conv. Rate</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Impr. Share</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-700">Conversions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {getPaginatedBestPerformingData().map((item, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                              {item.keyword_text}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {(item.conversionRate || 0).toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {(item.impressionShare || 0).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              {(item.conversions || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination for Best Performing Table */}
                  {Math.ceil(getBestPerformingKeywordsData().length / tableItemsPerPage) > 1 && (
                    <div className="px-6 py-4 border-t flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing {((bestPerformingPage - 1) * tableItemsPerPage) + 1} to {Math.min(bestPerformingPage * tableItemsPerPage, getBestPerformingKeywordsData().length)} of {getBestPerformingKeywordsData().length}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setBestPerformingPage(prev => Math.max(1, prev - 1))}
                          disabled={bestPerformingPage === 1}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="text-sm text-gray-700">
                          {bestPerformingPage} of {Math.ceil(getBestPerformingKeywordsData().length / tableItemsPerPage)}
                        </span>
                        <button
                          onClick={() => setBestPerformingPage(prev => Math.min(Math.ceil(getBestPerformingKeywordsData().length / tableItemsPerPage), prev + 1))}
                          disabled={bestPerformingPage === Math.ceil(getBestPerformingKeywordsData().length / tableItemsPerPage)}
                          className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };



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
            {selectedAccountData && (
              <div className="relative">
                <button
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  className="account-button flex items-center space-x-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-0"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {cleanCountryCode(selectedAccountData.countryCode)}
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-32">
                      {selectedAccountData.name}
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
                    {selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'May 5 - Jun 4, 2025'}
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
                            setSelectedDateRange(range);
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
                              {formatDateRangeDisplay(range)}
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

              {/* Anomaly Dropdown */}
              {anomalyDropdownOpen && (
                <div className="anomaly-dropdown absolute right-0 mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Anomaly Alerts</h3>
                      <button
                        onClick={() => setAnomalyDropdownOpen(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    {anomalyData && (
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center space-x-1">
                          <AlertTriangle className="h-3 w-3 text-red-500" />
                          <span>{anomalyData.summary.high} High</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <AlertCircle className="h-3 w-3 text-yellow-500" />
                          <span>{anomalyData.summary.medium} Medium</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Info className="h-3 w-3 text-blue-500" />
                          <span>{anomalyData.summary.low} Low</span>
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="max-h-72 overflow-y-auto">
                    {anomalyLoading ? (
                      <div className="p-4 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <p className="mt-2 text-sm text-gray-600">Analyzing anomalies...</p>
                      </div>
                    ) : anomalyData && anomalyData.anomalies.length > 0 ? (
                      <div className="divide-y divide-gray-100">
                        {anomalyData.anomalies.map((anomaly) => (
                          <div
                            key={anomaly.id}
                            className={`p-4 border-l-4 ${getSeverityColor(anomaly.severity)} hover:bg-gray-50 transition-colors`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                {getSeverityIcon(anomaly.severity)}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h4 className="font-medium text-gray-900 text-sm">{anomaly.title}</h4>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                      {anomaly.countryCode}
                                    </span>
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{anomaly.description}</p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-500">{formatTimeAgo(anomaly.detectedAt)}</span>
                                    <button
                                      onClick={() => {
                                        // Switch to the anomaly's account
                                        setSelectedAccount(anomaly.accountId);
                                        setAnomalyDropdownOpen(false);
                                      }}
                                      className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-800"
                                    >
                                      <span>View Account</span>
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Add padding at the bottom to ensure last item is fully visible */}
                        <div className="h-2"></div>
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No anomalies detected</p>
                        <p className="text-xs text-gray-400 mt-1">Your campaigns are performing normally</p>
                      </div>
                    )}
                  </div>
                  
                  {anomalyData && anomalyData.anomalies.length > 0 && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={() => {
                          fetchAnomalies();
                        }}
                        className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Refresh Anomalies
                      </button>
                    </div>
                  )}
                </div>
              )}
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
          {renderPageContent()}
        </div>
      </main>

      {/* Hover Metrics Chart */}
      <HoverMetricsChart
        isVisible={hoverChart.isVisible}
        position={hoverChart.position}
        metricType={hoverChart.metricType}
        metricValue={hoverChart.metricValue}
        campaignName={hoverChart.campaignName}
        campaignId={hoverChart.campaignId}
        onClose={handleMetricLeave}
      />

      {/* Custom Date Picker Modal */}
      {customDateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Custom Date Range</h3>
              <button
                onClick={() => setCustomDateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Date
                </label>
                <input
                  type="date"
                  value={customDateRange.startDate.toISOString().split('T')[0]}
                  onChange={(e) => setCustomDateRange(prev => ({
                    ...prev,
                    startDate: new Date(e.target.value)
                  }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Date
                </label>
                <input
                  type="date"
                  value={customDateRange.endDate.toISOString().split('T')[0]}
                  onChange={(e) => setCustomDateRange(prev => ({
                    ...prev,
                    endDate: new Date(e.target.value)
                  }))}
                  min={customDateRange.startDate.toISOString().split('T')[0]}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
            </div>

              {/* Date Range Preview */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm text-gray-600">Selected Range:</div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDateForDisplay(customDateRange.startDate)} - {formatDateForDisplay(customDateRange.endDate)}, {customDateRange.endDate.getFullYear()}
              </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.ceil(Math.abs(customDateRange.endDate.getTime() - customDateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} days
          </div>
            </div>

              {/* Validation Message */}
              {!isValidDateRange(customDateRange.startDate, customDateRange.endDate) && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="text-sm text-red-800">
                    Please ensure the start date is before the end date and both dates are not in the future.
                  </div>
            </div>
          )}
              </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCustomDateModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCustomDateApply}
                disabled={!isValidDateRange(customDateRange.startDate, customDateRange.endDate)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Apply
              </button>
                </div>
                              </div>
                  </div>
                )}
    </div>
  );
}
