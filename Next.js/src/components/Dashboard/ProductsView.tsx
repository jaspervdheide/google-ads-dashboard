'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart,
  Pie,
  Cell,
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
  Package, 
  DollarSign, 
  Percent,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
  Filter,
  Columns,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  X,
  Check,
  Download,
  Eye,
  ShoppingCart,
  Target,
  Layers,
  Car,
  Tag,
  Grid3X3,
  Box,
  Monitor,
  Smartphone,
  Tablet
} from 'lucide-react';
import { useProductData, useGroupedProducts } from '@/hooks/useProductData';
import { GroupedProductData, ProductViewState } from '@/types/products';
import { DateRange } from '@/types';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils';
import { PerformanceIndicator, getPerformanceLevel, PerformanceLevel } from './shared/PerformanceIndicators';

interface Campaign {
  id: string;
  name: string;
  status?: string;
}

interface AdGroup {
  id: string;
  name: string;
  campaignId: string;
  campaignName?: string;
  status?: string;
  groupType?: string;
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

interface ProductsViewProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
  chartType: 'line' | 'bar';
  setChartType: (type: 'line' | 'bar') => void;
  dateGranularity: 'day' | 'week' | 'month';
  setDateGranularity: (granularity: 'day' | 'week' | 'month') => void;
  campaigns?: Campaign[];
  adGroups?: AdGroup[];
  filterState?: FilterState;
  filterActions?: FilterActions;
}

// Device options for filter
const deviceOptions: { value: string; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'all', label: 'All Devices', icon: Monitor },
  { value: 'desktop', label: 'Desktop', icon: Monitor },
  { value: 'mobile', label: 'Mobile', icon: Smartphone },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
];

// View mode options
const VIEW_MODES = [
  { id: 'revenue', label: 'Revenue', icon: DollarSign },
  { id: 'profit', label: 'Profit', icon: TrendingUp },
  { id: 'margin', label: 'Margin', icon: Percent }
] as const;

// Group by options
const GROUP_OPTIONS = [
  { id: 'sku', label: 'SKU' },
  { id: 'category', label: 'Category' },
  { id: 'make', label: 'Make' },
  { id: 'model', label: 'Model' },
  { id: 'material', label: 'Material' }
] as const;

// Chart type options
const CHART_TYPES = [
  { id: 'bar', label: 'Bar', icon: BarChart3 },
  { id: 'dual', label: 'Dual', icon: LineChartIcon },
  { id: 'pie', label: 'Pie', icon: PieChartIcon }
] as const;

// Quick filter options
const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'profitable', label: 'Profitable' },
  { id: 'unprofitable', label: 'Losers' }
] as const;

// Page size options
const PAGE_SIZES = [10, 25, 50, 100];

// Chart colors matching Dashboard palette - using blue as primary (not teal)
const CHART_COLORS = {
  primary: '#3b82f6',    // blue-500 (cleaner, more professional)
  secondary: '#10b981',  // emerald-500 (for profit)
  tertiary: '#8b5cf6',   // purple-500 (for margin)
  quaternary: '#f59e0b', // amber-500
  danger: '#ef4444',     // red-500 (for costs/losses)
  blue: '#3b82f6',       // blue-500
  teal: '#0d9488',       // teal-600 (kept as option)
};

// View-mode specific colors
const getViewModeColor = (viewMode: string): string => {
  switch (viewMode) {
    case 'revenue': return CHART_COLORS.blue;      // Blue for revenue
    case 'profit': return CHART_COLORS.secondary;  // Emerald for profit
    case 'margin': return CHART_COLORS.tertiary;   // Purple for margin
    default: return CHART_COLORS.blue;
  }
};

// Product type icons based on grouping level
const getProductTypeIcon = (groupBy: string) => {
  switch (groupBy) {
    case 'category':
      return <Layers className="h-4 w-4 text-purple-500" />;
    case 'material':
      return <Grid3X3 className="h-4 w-4 text-blue-500" />;
    case 'make':
      return <Car className="h-4 w-4 text-green-500" />;
    case 'model':
      return <Tag className="h-4 w-4 text-orange-500" />;
    case 'sku':
      return <Box className="h-4 w-4 text-gray-500" />;
    default:
      return <Package className="h-4 w-4 text-gray-500" />;
  }
};

// Pie/Distribution colors matching Dashboard palette (blue-first)
const PIE_COLORS = [
  '#3b82f6', // blue (primary)
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#0d9488', // teal
];

// All available columns
const ALL_COLUMNS = [
  { id: 'impressions', label: 'Impr.', default: true },
  { id: 'clicks', label: 'Clicks', default: true },
  { id: 'cost', label: 'Ad Spend', default: true },
  { id: 'conversions', label: 'Conv.', default: true },
  { id: 'conversionsValue', label: 'Revenue', default: true },
  { id: 'cogsTotal', label: 'COGS', default: false },
  { id: 'grossProfit', label: 'Gross Profit', default: false },
  { id: 'netProfit', label: 'Net Profit', default: true },
  { id: 'grossMargin', label: 'Margin', default: false },
  { id: 'roas', label: 'ROAS', default: false },
  { id: 'poas', label: 'POAS', default: true },
  { id: 'ctr', label: 'CTR', default: false },
  { id: 'avgCpc', label: 'Avg CPC', default: false }
];

// Drill-down hierarchy
const DRILL_DOWN_HIERARCHY: Array<ProductViewState['groupBy']> = ['category', 'material', 'make', 'model', 'sku'];

const getNextDrillLevel = (current: ProductViewState['groupBy']): ProductViewState['groupBy'] | null => {
  const idx = DRILL_DOWN_HIERARCHY.indexOf(current);
  return idx < DRILL_DOWN_HIERARCHY.length - 1 ? DRILL_DOWN_HIERARCHY[idx + 1] : null;
};

const getDrillLevelLabel = (level: ProductViewState['groupBy']): string => {
  const labels: Record<ProductViewState['groupBy'], string> = {
    category: 'Category', material: 'Material', make: 'Make', model: 'Model', sku: 'SKU'
  };
  return labels[level];
};

// Helper to determine if change is positive (for cost, lower is better)
const isPositiveChange = (metricId: string, change: number): boolean => {
  const lowerIsBetter = ['cost', 'avgCpc', 'cpa', 'adSpend'];
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

// KPI Card component with trend - Dashboard style (160px height)
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

export default function ProductsView({
  selectedAccount,
  selectedDateRange,
  campaigns = [],
  adGroups = [],
  filterState,
  filterActions
}: ProductsViewProps) {
  // Local state
  const [viewMode, setViewMode] = useState<ProductViewState['viewMode']>('revenue');
  const [groupBy, setGroupBy] = useState<ProductViewState['groupBy']>('category');
  const [sortColumn, setSortColumn] = useState('conversionsValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const [drillDownPath, setDrillDownPath] = useState<Array<{ level: string; value: string }>>([]);
  
  // New state for enhanced features
  const [chartMode, setChartMode] = useState<'bar' | 'dual' | 'pie'>('bar');
  const [quickFilter, setQuickFilter] = useState<'all' | 'profitable' | 'unprofitable'>('all');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.default).map(c => c.id))
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);

  // Refs for click outside handling
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const columnPickerRef = useRef<HTMLDivElement>(null);
  const campaignDropdownRef = useRef<HTMLDivElement>(null);
  const adGroupDropdownRef = useRef<HTMLDivElement>(null);
  const deviceDropdownRef = useRef<HTMLDivElement>(null);

  // Filter status state
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<'all' | 'active' | 'paused'>('active');
  const [adGroupStatusFilter, setAdGroupStatusFilter] = useState<'all' | 'active' | 'paused'>('active');

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setGroupDropdownOpen(false);
      }
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

  // Fetch product data
  const { products, totals, trends, usesProfitMetrics, loading, error } = useProductData({
    selectedAccount,
    selectedDateRange
  });

  // Get current drill level
  const currentDrillLevel = drillDownPath.length > 0 
    ? getNextDrillLevel(drillDownPath[drillDownPath.length - 1].level as ProductViewState['groupBy']) || 'sku'
    : 'category';

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply drill-down filters
    for (const step of drillDownPath) {
      filtered = filtered.filter(p => {
        switch (step.level) {
          case 'category': return p.categoryName === step.value;
          case 'material': return p.materialName === step.value;
          case 'make': return p.make === step.value;
          case 'model': return (p.makeModel || p.model) === step.value;
          default: return true;
        }
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.sku.toLowerCase().includes(term) ||
        p.title?.toLowerCase().includes(term) ||
        p.make?.toLowerCase().includes(term) ||
        p.model?.toLowerCase().includes(term) ||
        p.materialName?.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [products, searchTerm, drillDownPath]);

  // Effective group by
  const effectiveGroupBy = drillDownPath.length > 0 ? currentDrillLevel : groupBy;

  // Group products
  const groupedProducts = useGroupedProducts(filteredProducts, effectiveGroupBy, usesProfitMetrics);

  // Apply quick filter
  const quickFilteredProducts = useMemo(() => {
    if (quickFilter === 'all') return groupedProducts;
    if (quickFilter === 'profitable') return groupedProducts.filter(p => p.netProfit > 0);
    return groupedProducts.filter(p => p.netProfit <= 0);
  }, [groupedProducts, quickFilter]);

  // Sort products
  const sortedProducts = useMemo(() => {
    return [...quickFilteredProducts].sort((a, b) => {
      const aVal = a[sortColumn as keyof GroupedProductData] as number;
      const bVal = b[sortColumn as keyof GroupedProductData] as number;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [quickFilteredProducts, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / pageSize);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, currentPage, pageSize]);

  // Calculate all values for performance indicators
  const performanceArrays = useMemo(() => ({
    impressions: sortedProducts.map(p => p.impressions),
    clicks: sortedProducts.map(p => p.clicks),
    cost: sortedProducts.map(p => p.cost),
    conversions: sortedProducts.map(p => p.conversions),
    conversionsValue: sortedProducts.map(p => p.conversionsValue),
    grossProfit: sortedProducts.map(p => p.grossProfit),
    netProfit: sortedProducts.map(p => p.netProfit),
    roas: sortedProducts.map(p => p.roas),
    poas: sortedProducts.map(p => p.poas),
    ctr: sortedProducts.map(p => p.ctr),
  }), [sortedProducts]);

  // Reset page when filters change
  const resetPage = useCallback(() => setCurrentPage(1), []);

  // Chart data - uses filtered data (respects quick filter)
  const chartData = useMemo(() => {
    const metricKey = viewMode === 'revenue' ? 'conversionsValue' : viewMode === 'profit' ? 'grossProfit' : 'grossMargin';
    // Sort by the selected metric for chart display
    const sortedForChart = [...quickFilteredProducts].sort((a, b) => {
      const aVal = a[metricKey] as number;
      const bVal = b[metricKey] as number;
      return bVal - aVal;
    });
    return sortedForChart.slice(0, 10).map(item => ({
      name: item.groupName.length > 15 ? item.groupName.slice(0, 15) + '...' : item.groupName,
      value: item[metricKey],
      profit: item.grossProfit,
      cost: item.cost,
      poas: item.poas,
      netProfit: item.netProfit,
      fullName: item.groupName
    }));
  }, [quickFilteredProducts, viewMode]);

  // Pie data
  const pieData = useMemo(() => {
    return chartData.map((item, idx) => ({
      ...item,
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

  const handleDrillDown = (item: GroupedProductData) => {
    const nextLevel = getNextDrillLevel(effectiveGroupBy);
    if (nextLevel) {
      setDrillDownPath(prev => [...prev, { level: effectiveGroupBy, value: item.groupName }]);
      resetPage();
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    setDrillDownPath(index === -1 ? [] : prev => prev.slice(0, index + 1));
    resetPage();
  };

  const handleGroupChange = (newGroup: ProductViewState['groupBy']) => {
    setGroupBy(newGroup);
    setDrillDownPath([]);
    setGroupDropdownOpen(false);
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
    const headers = ['Name', 'Items', ...ALL_COLUMNS.filter(c => visibleColumns.has(c.id)).map(c => c.label)];
    const rows = sortedProducts.map(item => {
      const row: (string | number)[] = [item.groupName, item.itemCount];
      ALL_COLUMNS.forEach(col => {
        if (visibleColumns.has(col.id)) {
          row.push(item[col.id as keyof GroupedProductData] as number);
        }
      });
      return row;
    });
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${effectiveGroupBy}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Chart colors based on view mode - using getViewModeColor for consistency
  const chartColor = getViewModeColor(viewMode);

  if (!selectedAccount) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center text-gray-500">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg">Select an account to view product performance</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Performance</h1>
          <p className="text-gray-500 mt-1">Analyze SKU profitability and performance metrics</p>
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

          {/* Ad Group Filter */}
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
                  {adGroups.filter(ag => adGroupStatusFilter === 'all' || (adGroupStatusFilter === 'active' ? ag.status !== 'PAUSED' : ag.status === 'PAUSED')).length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-gray-500">No ad groups available</div>
                  ) : (
                    adGroups
                      .filter(ag => adGroupStatusFilter === 'all' || (adGroupStatusFilter === 'active' ? ag.status !== 'PAUSED' : ag.status === 'PAUSED'))
                      .map(ag => (
                        <button
                          key={ag.id}
                          onClick={(e) => { e.stopPropagation(); filterActions.onToggleAdGroup(ag.id); }}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${
                            filterState.selectedAdGroups.includes(ag.id)
                              ? 'bg-teal-50 text-teal-700'
                              : 'hover:bg-gray-50 text-gray-700'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                            filterState.selectedAdGroups.includes(ag.id)
                              ? 'bg-teal-600 border-teal-600'
                              : 'border-gray-300'
                          }`}>
                            {filterState.selectedAdGroups.includes(ag.id) && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <span className="text-sm truncate flex-1 text-left">{ag.name}</span>
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

      {/* KPI Cards with Trends - Dashboard style (160px height) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        <KpiCard
          id="revenue"
          label={usesProfitMetrics ? "Profit" : "Revenue"}
          value={formatCurrency(totals.conversionsValue)}
          trend={trends.conversionsValue}
          icon={DollarSign}
          color="#0d9488"
        />
        <KpiCard
          id="grossProfit"
          label="Gross Profit"
          value={formatCurrency(totals.grossProfit)}
          trend={trends.grossProfit}
          icon={TrendingUp}
          color="#10b981"
        />
        <KpiCard
          id="netProfit"
          label="Net Profit"
          value={formatCurrency(totals.netProfit)}
          trend={trends.netProfit}
          icon={totals.netProfit >= 0 ? TrendingUp : TrendingDown}
          color={totals.netProfit >= 0 ? "#22c55e" : "#ef4444"}
        />
        <KpiCard
          id="poas"
          label="POAS"
          value={totals.poas.toFixed(2)}
          trend={trends.poas}
          icon={BarChart3}
          color="#8b5cf6"
        />
        <KpiCard
          id="adSpend"
          label="Ad Spend"
          value={formatCurrency(totals.cost)}
          trend={trends.cost}
          icon={DollarSign}
          color="#3b82f6"
        />
      </div>

      {/* Controls Row - Reordered: Left (View Mode / Quick Filter / Group), Right (Search / Chart / Columns) */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* Left side: View Mode / Quick Filter / Group By */}
        <div className="flex items-center gap-3">
          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {VIEW_MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  viewMode === mode.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <mode.icon className="w-4 h-4" />
                {mode.label}
              </button>
            ))}
          </div>

          {/* Quick Filter */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {QUICK_FILTERS.map(filter => (
              <button
                key={filter.id}
                onClick={() => { setQuickFilter(filter.id); resetPage(); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  quickFilter === filter.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Group By */}
          <div className="relative" ref={groupDropdownRef}>
            <button
              onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
            >
              <span className="text-gray-500">Group:</span>
              <span className="font-medium">{GROUP_OPTIONS.find(o => o.id === effectiveGroupBy)?.label}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {groupDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                {GROUP_OPTIONS.map(option => (
                  <button
                    key={option.id}
                    onClick={() => handleGroupChange(option.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      effectiveGroupBy === option.id ? 'text-teal-600 font-medium' : 'text-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Search / Chart toggles / Columns */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); resetPage(); }}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm text-gray-700">{col.label}</span>
                  </label>
                ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Chart - Dashboard style with improved colors */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-800">
            Top {Math.min(10, chartData.length)} {quickFilter !== 'all' ? (quickFilter === 'profitable' ? 'Profitable' : 'Unprofitable') : ''} by {viewMode === 'revenue' ? (usesProfitMetrics ? 'Profit' : 'Revenue') : viewMode === 'profit' ? 'Gross Profit' : 'Margin'}
          </h3>
          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
            {chartMode === 'bar' ? 'Horizontal Bar' : chartMode === 'dual' ? 'Profit vs Ad Spend' : 'Distribution'}
          </span>
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
              <BarChart 
                data={chartData} 
                layout="vertical" 
                margin={{ left: 20, right: 40, top: 10, bottom: 10 }}
                barCategoryGap={chartData.length <= 3 ? '20%' : '15%'}
              >
                <defs>
                  {/* Dashboard-style horizontal gradient */}
                  <linearGradient id="barGradientProducts" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#e5e7eb" />
                <XAxis 
                  type="number" 
                  tickFormatter={(val) => viewMode === 'margin' ? `${val.toFixed(0)}%` : formatCurrency(val)} 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120} 
                  tick={{ fontSize: 12, fill: '#374151', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                        <p className="font-semibold text-gray-900 mb-2">{data.fullName}</p>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColor }} />
                          <span className="text-sm text-gray-600">
                            {viewMode === 'margin' ? `${data.value.toFixed(1)}%` : formatCurrency(data.value)}
                          </span>
                        </div>
                      </div>
                    );
                  }} 
                />
                <Bar 
                  dataKey="value" 
                  fill="url(#barGradientProducts)" 
                  radius={[0, 6, 6, 0]}
                  stroke={chartColor}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  maxBarSize={chartData.length <= 2 ? 36 : chartData.length <= 4 ? 28 : 24}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : chartMode === 'dual' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <defs>
                  {/* Profit bar gradient - Dashboard blue style */}
                  <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.blue} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={CHART_COLORS.blue} stopOpacity={0.6} />
                  </linearGradient>
                  {/* Cost area gradient - amber/orange for costs */}
                  <linearGradient id="costLineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CHART_COLORS.quaternary} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={CHART_COLORS.quaternary} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="left" 
                  tickFormatter={(val) => formatCurrency(val)} 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  tickFormatter={(val) => formatCurrency(val)} 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                        <p className="font-semibold text-gray-900 mb-3">{payload[0]?.payload?.fullName}</p>
                        <div className="space-y-2">
                          {payload.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                              <span className="text-sm text-gray-500">{entry.name}:</span>
                              <span className="text-sm font-medium text-gray-900">{formatCurrency(entry.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }} 
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '16px' }}
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="profit" 
                  name="Profit" 
                  fill="url(#profitGradient)"
                  radius={[6, 6, 0, 0]}
                  stroke={CHART_COLORS.blue}
                  strokeWidth={1}
                  strokeOpacity={0.4}
                  maxBarSize={chartData.length <= 2 ? 50 : chartData.length <= 4 ? 40 : 32}
                />
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="cost"
                  name="Ad Spend"
                  fill="url(#costLineGradient)"
                  stroke={CHART_COLORS.quaternary}
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full gap-8">
              {/* Pie Chart - Left Side */}
              <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <defs>
                      {PIE_COLORS.map((color, idx) => (
                        <linearGradient key={`pieGradient-${idx}`} id={`pieGradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                          <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                        </linearGradient>
                      ))}
                    </defs>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={140}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`url(#pieGradient-${index % PIE_COLORS.length})`} />
                      ))}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const data = payload[0].payload;
                        const colorIndex = pieData.findIndex(p => p.name === data.name);
                        const total = pieData.reduce((sum, p) => sum + p.value, 0);
                        const percent = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[colorIndex % PIE_COLORS.length] }} />
                              <p className="font-semibold text-gray-900">{data.fullName}</p>
                            </div>
                            <p className="text-sm text-gray-600">{viewMode === 'margin' ? `${data.value.toFixed(1)}%` : formatCurrency(data.value)}</p>
                            <p className="text-xs text-gray-400 mt-1">{percent}% of total</p>
                          </div>
                        );
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
                    <p className="text-lg font-bold text-gray-900">
                      {viewMode === 'margin' 
                        ? `${(pieData.reduce((sum, p) => sum + p.value, 0) / pieData.length).toFixed(1)}%`
                        : formatCurrency(pieData.reduce((sum, p) => sum + p.value, 0))
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Legend - Right Side */}
              <div className="w-48 pl-4 flex flex-col justify-center overflow-y-auto">
                <div className="space-y-2">
                  {pieData.slice(0, 8).map((item, idx) => {
                    const total = pieData.reduce((sum, p) => sum + p.value, 0);
                    const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} 
                        />
                        <span className="text-gray-600 truncate flex-1" title={item.fullName}>
                          {item.name}
                        </span>
                        <span className="text-gray-900 font-medium tabular-nums">
                          {percent}%
                        </span>
                      </div>
                    );
                  })}
                  {pieData.length > 8 && (
                    <p className="text-xs text-gray-400 pl-5">+{pieData.length - 8} more</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700">
          <p className="font-medium">Error loading product data</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-3">
            {/* Breadcrumb */}
            {drillDownPath.length > 0 && (
              <nav className="flex items-center gap-1 text-sm">
                <button onClick={() => handleBreadcrumbClick(-1)} className="flex items-center gap-1 text-gray-500 hover:text-teal-600">
                  <Home className="w-4 h-4" /><span>All</span>
                </button>
                {drillDownPath.map((step, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className={index === drillDownPath.length - 1 ? 'text-gray-900 font-medium' : 'text-gray-500 hover:text-teal-600'}
                    >
                      {step.value}
                    </button>
                  </React.Fragment>
                ))}
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-teal-600 font-medium">{getDrillLevelLabel(effectiveGroupBy)}</span>
              </nav>
            )}
            
          </div>
        </div>
        
        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No products found</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gradient-to-r from-gray-50 to-gray-100 z-10">
                    {getDrillLevelLabel(effectiveGroupBy)}
                  </th>
                  {/* Divider after name column */}
                  <th className="px-1 py-3 w-px border-r border-gray-300 bg-gradient-to-r from-gray-50 to-gray-100" />
                  {effectiveGroupBy !== 'sku' && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                  )}
                  {ALL_COLUMNS.filter(col => visibleColumns.has(col.id)).map(col => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort(col.id)}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {col.id === 'conversionsValue' ? (usesProfitMetrics ? 'Profit' : 'Revenue') : col.label}
                        {sortColumn === col.id && (
                          <span className="text-teal-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedProducts.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-gray-50 ${effectiveGroupBy !== 'sku' ? 'cursor-pointer' : ''} ${item.netProfit < 0 ? 'bg-rose-50/30' : ''}`}
                    onClick={() => effectiveGroupBy !== 'sku' && handleDrillDown(item)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 sticky left-0 bg-white z-10" title={item.groupName}>
                      <div className="flex items-center space-x-2 min-w-0">
                        <span className="flex-shrink-0">{getProductTypeIcon(effectiveGroupBy)}</span>
                        <span className="truncate">{item.groupName}</span>
                      </div>
                    </td>
                    {/* Divider after name column */}
                    <td className="px-1 py-3 border-r border-gray-300" />
                    {effectiveGroupBy !== 'sku' && (
                      <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">{item.itemCount}</td>
                    )}
                    {visibleColumns.has('impressions') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.impressions, performanceArrays.impressions, 'impressions')} />
                          {formatNumber(item.impressions)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('clicks') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.clicks, performanceArrays.clicks, 'clicks')} />
                          {formatNumber(item.clicks)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('cost') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.cost, performanceArrays.cost, 'cost')} />
                          {formatCurrency(item.cost)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('conversions') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.conversions, performanceArrays.conversions, 'conversions')} />
                          {formatNumber(item.conversions)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('conversionsValue') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.conversionsValue, performanceArrays.conversionsValue, 'conversionsValue')} />
                          {formatCurrency(item.conversionsValue)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('cogsTotal') && (
                      <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">{formatCurrency(item.cogsTotal)}</td>
                    )}
                    {visibleColumns.has('grossProfit') && (
                      <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium whitespace-nowrap ${item.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.grossProfit, performanceArrays.grossProfit, 'conversionsValue')} />
                          {formatCurrency(item.grossProfit)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('netProfit') && (
                      <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium whitespace-nowrap ${item.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.netProfit, performanceArrays.netProfit, 'conversionsValue')} />
                          {formatCurrency(item.netProfit)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('grossMargin') && (
                      <td className={`px-4 py-3 text-sm text-right tabular-nums ${item.grossMargin >= 30 ? 'text-emerald-600' : item.grossMargin >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                        {formatPercentage(item.grossMargin)}
                      </td>
                    )}
                    {visibleColumns.has('roas') && (
                      <td className={`px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap ${item.roas >= 3 ? 'text-emerald-600' : item.roas >= 1.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.roas, performanceArrays.roas, 'roas')} />
                          {item.roas.toFixed(2)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('poas') && (
                      <td className={`px-4 py-3 text-sm text-right tabular-nums whitespace-nowrap ${item.poas >= 1 ? 'text-emerald-600' : item.poas >= 0.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.poas, performanceArrays.poas, 'poas')} />
                          {item.poas.toFixed(2)}
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('ctr') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end">
                          <PerformanceIndicator level={getPerformanceLevel(item.ctr, performanceArrays.ctr, 'ctr')} />
                          {item.ctr.toFixed(2)}%
                        </div>
                      </td>
                    )}
                    {visibleColumns.has('avgCpc') && (
                      <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">{formatCurrency(item.avgCpc)}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination - Dashboard style */}
        {sortedProducts.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedProducts.length)} of {sortedProducts.length}
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
