'use client';

import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Package, 
  DollarSign, 
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown
} from 'lucide-react';
import { useProductData, useGroupedProducts } from '@/hooks/useProductData';
import { GroupedProductData, ProductViewState } from '@/types/products';
import { DateRange } from '@/types';
import { formatCurrency, formatNumber, formatPercentage } from '@/utils';

interface ProductsViewProps {
  selectedAccount: string | null;
  selectedDateRange: DateRange | null;
  chartType: 'line' | 'bar';
  setChartType: (type: 'line' | 'bar') => void;
  dateGranularity: 'day' | 'week' | 'month';
  setDateGranularity: (granularity: 'day' | 'week' | 'month') => void;
}

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

// KPI Card component
const KpiCard: React.FC<{
  label: string;
  value: string;
  trend?: number;
  icon: React.ReactNode;
  color: string;
}> = ({ label, value, trend, icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-500">{label}</span>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        {icon}
      </div>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {trend !== undefined && (
      <div className={`flex items-center mt-1 text-sm ${trend >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </div>
    )}
  </div>
);

// Product Table component
const ProductTable: React.FC<{
  data: GroupedProductData[];
  groupBy: ProductViewState['groupBy'];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  loading: boolean;
}> = ({ data, groupBy, sortColumn, sortDirection, onSort, loading }) => {
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn as keyof GroupedProductData] as number;
      const bVal = b[sortColumn as keyof GroupedProductData] as number;
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [data, sortColumn, sortDirection]);

  const SortHeader: React.FC<{ column: string; label: string }> = ({ column, label }) => (
    <th 
      className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right cursor-pointer hover:bg-gray-100"
      onClick={() => onSort(column)}
    >
      <div className="flex items-center justify-end gap-1">
        {label}
        {sortColumn === column && (
          <span className="text-teal-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No product data available</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[200px]">
              {groupBy === 'sku' ? 'Product SKU' : groupBy.charAt(0).toUpperCase() + groupBy.slice(1)}
            </th>
            {groupBy !== 'sku' && (
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Items
              </th>
            )}
            <SortHeader column="impressions" label="Impr." />
            <SortHeader column="clicks" label="Clicks" />
            <SortHeader column="cost" label="Ad Spend" />
            <SortHeader column="conversions" label="Conv." />
            <SortHeader column="conversionsValue" label="Revenue" />
            <SortHeader column="cogsTotal" label="COGS" />
            <SortHeader column="grossProfit" label="Gross Profit" />
            <SortHeader column="netProfit" label="Net Profit" />
            <SortHeader column="grossMargin" label="Margin" />
            <SortHeader column="roas" label="ROAS" />
            <SortHeader column="poas" label="POAS" />
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedData.slice(0, 50).map((item, idx) => (
            <tr key={idx} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate max-w-[200px]" title={item.groupName}>
                {item.groupName}
              </td>
              {groupBy !== 'sku' && (
                <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">
                  {item.itemCount}
                </td>
              )}
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                {formatNumber(item.impressions)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                {formatNumber(item.clicks)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                {formatCurrency(item.cost)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums">
                {formatNumber(item.conversions)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-900 text-right tabular-nums font-medium">
                {formatCurrency(item.conversionsValue)}
              </td>
              <td className="px-4 py-3 text-sm text-gray-500 text-right tabular-nums">
                {formatCurrency(item.cogsTotal)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium ${item.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(item.grossProfit)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums font-medium ${item.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(item.netProfit)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums ${item.grossMargin >= 30 ? 'text-emerald-600' : item.grossMargin >= 15 ? 'text-amber-600' : 'text-rose-600'}`}>
                {formatPercentage(item.grossMargin)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums ${item.roas >= 3 ? 'text-emerald-600' : item.roas >= 1.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                {item.roas.toFixed(2)}
              </td>
              <td className={`px-4 py-3 text-sm text-right tabular-nums ${item.poas >= 1 ? 'text-emerald-600' : item.poas >= 0.5 ? 'text-amber-600' : 'text-rose-600'}`}>
                {item.poas.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default function ProductsView({
  selectedAccount,
  selectedDateRange,
  chartType,
  setChartType,
  dateGranularity,
  setDateGranularity
}: ProductsViewProps) {
  // Local state
  const [viewMode, setViewMode] = useState<ProductViewState['viewMode']>('revenue');
  const [groupBy, setGroupBy] = useState<ProductViewState['groupBy']>('material');
  const [sortColumn, setSortColumn] = useState('conversionsValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  // Fetch product data
  const { products, totals, loading, error } = useProductData({
    selectedAccount,
    selectedDateRange
  });

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.sku.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.make?.toLowerCase().includes(term) ||
      p.model?.toLowerCase().includes(term) ||
      p.materialName?.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Group products
  const groupedProducts = useGroupedProducts(filteredProducts, groupBy);

  // Handle sort
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Prepare chart data (top items by selected view mode)
  const chartData = useMemo(() => {
    const metricKey = viewMode === 'revenue' ? 'conversionsValue' : viewMode === 'profit' ? 'grossProfit' : 'grossMargin';
    return groupedProducts
      .slice(0, 10)
      .map(item => ({
        name: item.groupName.length > 15 ? item.groupName.slice(0, 15) + '...' : item.groupName,
        value: item[metricKey],
        fullName: item.groupName
      }));
  }, [groupedProducts, viewMode]);

  // Chart color based on view mode
  const chartColor = viewMode === 'revenue' ? '#0d9488' : viewMode === 'profit' ? '#10b981' : '#8b5cf6';

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
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Performance</h1>
          <p className="text-gray-500 mt-1">Analyze SKU profitability and performance metrics</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KpiCard
          label="Revenue"
          value={formatCurrency(totals.conversionsValue)}
          icon={<DollarSign className="w-4 h-4 text-teal-600" />}
          color="bg-teal-50"
        />
        <KpiCard
          label="Gross Profit"
          value={formatCurrency(totals.grossProfit)}
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
          color="bg-emerald-50"
        />
        <KpiCard
          label="Net Profit"
          value={formatCurrency(totals.netProfit)}
          icon={totals.netProfit >= 0 ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-rose-600" />}
          color={totals.netProfit >= 0 ? "bg-green-50" : "bg-rose-50"}
        />
        <KpiCard
          label="Margin"
          value={formatPercentage(totals.grossMargin)}
          icon={<Percent className="w-4 h-4 text-purple-600" />}
          color="bg-purple-50"
        />
        <KpiCard
          label="POAS"
          value={totals.poas.toFixed(2)}
          icon={<BarChart3 className="w-4 h-4 text-blue-600" />}
          color="bg-blue-50"
        />
      </div>

      {/* Controls Row */}
      <div className="flex flex-wrap items-center gap-4">
        {/* View Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {VIEW_MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => setViewMode(mode.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === mode.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <mode.icon className="w-4 h-4" />
              {mode.label}
            </button>
          ))}
        </div>

        {/* Group By Dropdown */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
          >
            <span className="text-gray-500">Group by:</span>
            <span className="font-medium">{GROUP_OPTIONS.find(o => o.id === groupBy)?.label}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          {groupDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
              {GROUP_OPTIONS.map(option => (
                <button
                  key={option.id}
                  onClick={() => {
                    setGroupBy(option.id);
                    setGroupDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                    groupBy === option.id ? 'text-teal-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart Type Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'line' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-colors ${
              chartType === 'bar' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          Top 10 by {viewMode === 'revenue' ? 'Revenue' : viewMode === 'profit' ? 'Profit' : 'Margin'}
        </h3>
        <div className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No data available
            </div>
          ) : chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  type="number" 
                  tickFormatter={(val) => viewMode === 'margin' ? `${val.toFixed(0)}%` : formatCurrency(val)}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 11, fill: '#374151' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-medium text-gray-900 mb-1">{data.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {viewMode === 'margin' ? `${data.value.toFixed(1)}%` : formatCurrency(data.value)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" fill="url(#barGradient)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={chartColor} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                />
                <YAxis 
                  tickFormatter={(val) => viewMode === 'margin' ? `${val.toFixed(0)}%` : formatCurrency(val)}
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="font-medium text-gray-900 mb-1">{data.fullName}</p>
                        <p className="text-sm text-gray-600">
                          {viewMode === 'margin' ? `${data.value.toFixed(1)}%` : formatCurrency(data.value)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chartColor} 
                  strokeWidth={2}
                  fill="url(#areaGradient)" 
                />
              </AreaChart>
            </ResponsiveContainer>
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
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">
              Product Performance
              {groupedProducts.length > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({groupedProducts.length} {groupBy === 'sku' ? 'products' : 'groups'})
                </span>
              )}
            </h3>
          </div>
        </div>
        <ProductTable
          data={groupedProducts}
          groupBy={groupBy}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          loading={loading}
        />
      </div>
    </div>
  );
}

