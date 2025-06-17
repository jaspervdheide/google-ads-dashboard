'use client';

import React, { useMemo } from 'react';
import { ShoppingBag } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ShoppingProduct, ProductDataResponse } from '../../hooks/useProductData';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';
import { 
  getPerformanceLevel, 
  PerformanceIndicator,
  getCampaignTypeIndicator,
  TableTotalsRow
} from './shared';

interface ProductTableProps {
  data: ProductDataResponse | null;
  loading: boolean;
  searchTerm: string;
  pageSize: number;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  statusFilter: 'active' | 'all';
  campaignTypeFilter: 'all' | 'shopping' | 'performance_max';
  viewMode: 'table' | 'graphs';
  onSort: (column: string) => void;
  onProductClick: (product: ShoppingProduct) => void;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, productName: string, productId: string) => void;
  onMetricLeave?: (metricType?: string) => void;
  totals?: {
    clicks: number;
    impressions: number;
    cost: number;
    ctr: number;
    avgCpc: number;
    conversions: number;
    conversionsValue: number;
    cpa: number;
    roas: number;
    poas: number;
    productCount?: number;
  } | null;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

// Product Campaign Type Distribution Chart Component
const ProductCampaignTypeDistribution: React.FC<{ data: ProductDataResponse | null }> = ({ data }) => {
  // Calculate campaign type distribution from real data
  const campaignTypeDistribution = useMemo(() => {
    if (!data?.products) {
      return [
        { 
          name: 'Shopping Campaigns', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#10b981' 
        },
        { 
          name: 'Performance Max Campaigns', 
          value: 0,
          conversions: 0,
          avgCPA: 0,
          color: '#8b5cf6' 
        }
      ];
    }

    const shoppingProducts = data.products.filter(p => p.campaignType === 4);
    const performanceMaxProducts = data.products.filter(p => p.campaignType === 13);

    const shoppingConversions = shoppingProducts.reduce((sum, p) => sum + p.conversions, 0);
    const performanceMaxConversions = performanceMaxProducts.reduce((sum, p) => sum + p.conversions, 0);
    
    const shoppingCPA = shoppingProducts.length > 0 
      ? shoppingProducts.reduce((sum, p) => sum + p.cpa, 0) / shoppingProducts.length 
      : 0;
    const performanceMaxCPA = performanceMaxProducts.length > 0 
      ? performanceMaxProducts.reduce((sum, p) => sum + p.cpa, 0) / performanceMaxProducts.length 
      : 0;

    return [
      { 
        name: 'Shopping Campaigns', 
        value: shoppingProducts.length,
        conversions: shoppingConversions,
        avgCPA: shoppingCPA,
        color: '#10b981' 
      },
      { 
        name: 'Performance Max Campaigns', 
        value: performanceMaxProducts.length,
        conversions: performanceMaxConversions,
        avgCPA: performanceMaxCPA,
        color: '#8b5cf6' 
      }
    ].filter(item => item.value > 0); // Only show campaign types that exist
  }, [data]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              Count: <span className="font-medium text-gray-900">{data.value} products</span>
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

  if (campaignTypeDistribution.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Type Distribution</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live Data</span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={campaignTypeDistribution}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {campaignTypeDistribution.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with Metrics */}
      <div className="mt-4 space-y-2">
        {campaignTypeDistribution.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-700 font-medium">{item.name}</span>
              <span className="text-gray-500">({item.value} products)</span>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="font-medium text-gray-900">{item.conversions.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">conv.</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">{formatCurrency(item.avgCPA)}</span>
                  <span className="text-gray-500 ml-1 text-xs">CPA</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProductTable: React.FC<ProductTableProps> = ({
  data,
  loading,
  searchTerm,
  pageSize,
  sortColumn,
  sortDirection,
  campaignTypeFilter,
  viewMode,
  onSort,
  onProductClick,
  onMetricHover,
  onMetricLeave,
  totals,
  currentPage = 1,
  onPageChange
}) => {
  // Filter and sort products
  const { filteredAndSortedProducts, totalPages } = useMemo(() => {
    if (!data?.products) return { filteredAndSortedProducts: [], totalPages: 0 };
    
    let filtered = data.products;
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.itemId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productTypeLevel2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productTypeLevel3?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productTypeLevel4?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productTypeLevel5?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply campaign type filter - fix: use numeric values
    if (campaignTypeFilter !== 'all') {
      const filterType = campaignTypeFilter === 'shopping' ? 4 : 13; // 4 = Shopping, 13 = Performance Max
      filtered = filtered.filter(product => product.campaignType === filterType);
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      const aValue = a[sortColumn as keyof ShoppingProduct];
      const bValue = b[sortColumn as keyof ShoppingProduct];
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      // Handle string comparison
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    const totalPages = Math.ceil(sorted.length / pageSize);
    
    return { filteredAndSortedProducts: sorted, totalPages };
  }, [data?.products, searchTerm, campaignTypeFilter, sortColumn, sortDirection, pageSize]);

  // Get paginated products
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredAndSortedProducts.slice(startIndex, endIndex);
  }, [filteredAndSortedProducts, currentPage, pageSize]);

  // Calculate performance arrays for indicators
  const allClicks = data?.products?.map(p => p.clicks) || [];
  const allImpressions = data?.products?.map(p => p.impressions) || [];
  const allCtr = data?.products?.map(p => p.ctr) || [];
  const allAvgCpc = data?.products?.map(p => p.avgCpc) || [];
  const allCost = data?.products?.map(p => p.cost) || [];
  const allConversions = data?.products?.map(p => p.conversions) || [];
  const allCpa = data?.products?.map(p => p.cpa) || [];
  const allPoas = data?.products?.map(p => p.poas) || [];
  const allConversionsValue = data?.products?.map(p => p.conversionsValue) || [];

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data?.products || data.products.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check back later.
          </p>
        </div>
      </div>
    );
  }

  if (viewMode === 'graphs') {
    return <ProductCampaignTypeDistribution data={data} />;
  }

  // Prepare totals for shared TableTotalsRow component
  const displayTotals = totals ? {
    clicks: totals.clicks,
    impressions: totals.impressions,
    cost: totals.cost,
    ctr: totals.ctr,
    avgCpc: totals.avgCpc,
    conversions: totals.conversions,
    conversionsValue: totals.conversionsValue,
    cpa: totals.cpa,
    roas: totals.roas,
    poas: totals.poas,
    productCount: totals.productCount
  } : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Pagination Header */}
      {totalPages > 1 && onPageChange && (
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, filteredAndSortedProducts.length)} of {filteredAndSortedProducts.length} products
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <button
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ‹
              </button>
              <button
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      )}

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('itemId')}
            >
              Item ID
              {sortColumn === 'itemId' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('productTypeLevel3')}
            >
              Make
              {sortColumn === 'productTypeLevel3' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('productTypeLevel4')}
            >
              Model
              {sortColumn === 'productTypeLevel4' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('productTypeLevel5')}
            >
              Type
              {sortColumn === 'productTypeLevel5' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('productTypeLevel2')}
            >
              Material
              {sortColumn === 'productTypeLevel2' && (
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
              onClick={() => onSort('avgCpc')}
            >
              CPC
              {sortColumn === 'avgCpc' && (
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
                  {sortDirection === 'asc' ? '↓' : '↑'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('cpa')}
            >
              CPA
              {sortColumn === 'cpa' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('poas')}
            >
              POAS
              {sortColumn === 'poas' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('conversionsValue')}
            >
              Conversion Value
              {sortColumn === 'conversionsValue' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Campaign Type
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {paginatedProducts.map((product) => {
            return (
              <tr 
                key={product.id} 
                className="hover:bg-gray-50"
              >
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 cursor-pointer"
                  onClick={() => onProductClick(product)}
                >
                  {product.itemId}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.productTypeLevel3}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.productTypeLevel4}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.productTypeLevel5}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {product.productTypeLevel2}
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'clicks', product.clicks, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('clicks')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.clicks, allClicks, 'clicks')} />
                    {formatNumber(product.clicks)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'impressions', product.impressions, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('impressions')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.impressions, allImpressions, 'impressions')} />
                    {formatNumber(product.impressions)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'ctr', product.ctr, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('ctr')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.ctr, allCtr, 'ctr')} />
                    {formatPercentage(product.ctr)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'avgCpc', product.avgCpc, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('avgCpc')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.avgCpc, allAvgCpc, 'avgCpc')} />
                    {formatCurrency(product.avgCpc)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cost', product.cost, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('cost')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.cost, allCost, 'cost')} />
                    {formatCurrency(product.cost)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversions', product.conversions, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('conversions')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.conversions, allConversions, 'conversions')} />
                    {formatNumber(product.conversions)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'cpa', product.cpa, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('cpa')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.cpa, allCpa, 'cpa')} />
                    {formatCurrency(product.cpa)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'poas', product.poas, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('poas')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.poas, allPoas, 'poas')} />
                    {product.poas.toFixed(2)}
                  </div>
                </td>
                <td 
                  className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors rounded px-2 py-1"
                  onMouseEnter={onMetricHover ? (e) => onMetricHover(e, 'conversionsValue', product.conversionsValue, product.itemId, product.id) : undefined}
                  onMouseLeave={() => onMetricLeave?.('conversionsValue')}
                >
                  <div className="flex items-center">
                    <PerformanceIndicator level={getPerformanceLevel(product.conversionsValue, allConversionsValue, 'conversionsValue')} />
                    {formatCurrency(product.conversionsValue)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    {getCampaignTypeIndicator(product.campaignType === 13 ? 'performance_max' : 'shopping')}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.campaignType === 13 
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-green-100 text-green-800 border border-green-200'
                    }`}>
                      {product.campaignTypeDisplay}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        {displayTotals && (
          <TableTotalsRow
            totals={displayTotals}
            itemCount={displayTotals.productCount || paginatedProducts.length}
            itemType="products"
            showExtraColumns={true}
          />
        )}
      </table>
    </div>
  );
};

export default ProductTable; 