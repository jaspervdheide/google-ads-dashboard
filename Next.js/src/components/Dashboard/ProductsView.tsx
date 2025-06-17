import React, { useMemo, useState, useEffect } from 'react';
import { Plus, ShoppingBag, Search, Zap, Table, BarChart3, Package, Target, DollarSign, TrendingUp, Info } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import ProductTable from './ProductTable';
import { ProductDataResponse } from '../../hooks/useProductData';

interface ProductsViewProps {
  realProductData: ProductDataResponse | null;
  productLoading: boolean;
  campaignTypeFilter: 'all' | 'shopping' | 'performance_max';
  productViewMode: 'table' | 'graphs';
  productSort: { field: string; direction: 'asc' | 'desc' };
  currentPage: number;
  onCampaignTypeFilterChange: (filter: 'all' | 'shopping' | 'performance_max') => void;
  onProductViewModeChange: (mode: 'table' | 'graphs') => void;
  onProductSort: (column: string) => void;
  onPageChange: (page: number) => void;
  onProductClick: (product: any) => void;
  onMetricHover: (data: any) => void;
  onMetricLeave: () => void;
}

export default function ProductsView({
  realProductData,
  productLoading,
  campaignTypeFilter,
  productViewMode,
  productSort,
  currentPage,
  onCampaignTypeFilterChange,
  onProductViewModeChange,
  onProductSort,
  onPageChange,
  onProductClick,
  onMetricHover,
  onMetricLeave
}: ProductsViewProps) {
  const [selectedMetric, setSelectedMetric] = useState('conversions');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Process material type data for charts
  const materialTypeData = useMemo(() => {
    if (!realProductData?.products) return [];

    // Filter products based on campaign type
    let filteredProducts = realProductData.products;
    if (campaignTypeFilter === 'shopping') {
      filteredProducts = filteredProducts.filter(p => p.campaignType === 4);
    } else if (campaignTypeFilter === 'performance_max') {
      filteredProducts = filteredProducts.filter(p => p.campaignType === 13);
    }

    // Group by material type (productTypeLevel2)
    const materialGroups: { [key: string]: {
      products: any[];
      totalConversions: number;
      totalConversionsValue: number;
      totalCost: number;
      totalClicks: number;
    } } = {};

    filteredProducts.forEach(product => {
      const material = product.productTypeLevel2 || 'Unknown';
      if (!materialGroups[material]) {
        materialGroups[material] = {
          products: [],
          totalConversions: 0,
          totalConversionsValue: 0,
          totalCost: 0,
          totalClicks: 0
        };
      }
      
      materialGroups[material].products.push(product);
      materialGroups[material].totalConversions += product.conversions || 0;
      materialGroups[material].totalConversionsValue += product.conversionsValue || 0;
      materialGroups[material].totalCost += product.cost || 0;
      materialGroups[material].totalClicks += product.clicks || 0;
    });

    // Convert to chart data - DON'T filter out zero conversions to match totals
    return Object.entries(materialGroups)
      .map(([material, data]) => ({
        material: material.charAt(0).toUpperCase() + material.slice(1),
        conversions: data.totalConversions,
        conversionsValue: data.totalConversionsValue,
        cost: data.totalCost,
        cpa: data.totalConversions > 0 ? data.totalCost / data.totalConversions : 0,
        roas: data.totalCost > 0 ? data.totalConversionsValue / data.totalCost : 0,
        productCount: data.products.length,
        clicks: data.totalClicks,
        conversionRate: data.totalClicks > 0 ? (data.totalConversions / data.totalClicks) * 100 : 0
      }))
      .sort((a, b) => b.conversions - a.conversions);
  }, [realProductData, campaignTypeFilter]);

  // Calculate totals for the table
  const totals = useMemo(() => {
    if (!realProductData?.products?.length) return null;

    // Filter products based on campaign type
    const filteredProducts = realProductData.products.filter(product => {
      if (campaignTypeFilter === 'shopping') return product.campaignType === 4;
      if (campaignTypeFilter === 'performance_max') return product.campaignType === 13;
      return true; // 'all'
    });

    if (filteredProducts.length === 0) return null;

    const totalClicks = filteredProducts.reduce((sum, product) => sum + product.clicks, 0);
    const totalImpressions = filteredProducts.reduce((sum, product) => sum + product.impressions, 0);
    const totalCost = filteredProducts.reduce((sum, product) => sum + product.cost, 0);
    const totalConversions = filteredProducts.reduce((sum, product) => sum + product.conversions, 0);
    const totalConversionsValue = filteredProducts.reduce((sum, product) => sum + product.conversionsValue, 0);

    return {
      clicks: totalClicks,
      impressions: totalImpressions,
      cost: totalCost,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalCost / totalClicks : 0,
      conversions: totalConversions,
      conversionsValue: totalConversionsValue,
      cpa: totalConversions > 0 ? totalCost / totalConversions : 0,
      roas: totalCost > 0 ? totalConversionsValue / totalCost : 0,
      poas: totalCost > 0 ? (totalConversionsValue / totalCost) * 100 : 0,
      productCount: filteredProducts.length
    };
  }, [realProductData, campaignTypeFilter]);

  // Material type colors - following design system
  const getMaterialColor = (index: number) => {
    const colors = [
      '#0f766e', // teal-600
      '#3b82f6', // blue-500
      '#10b981', // emerald-500
      '#f59e0b', // amber-500
      '#8b5cf6', // violet-500
      '#ef4444', // red-500
      '#06b6d4', // cyan-500
      '#84cc16', // lime-500
    ];
    return colors[index % colors.length];
  };

  // Custom tooltip for material charts
  const MaterialTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-64">
          <div className="flex items-center space-x-2 mb-3">
            <Package className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">{data.material}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Conversions</p>
              <p className="font-semibold text-gray-900 text-lg">{data.conversions.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Conv. Value</p>
              <p className="font-semibold text-gray-900 text-lg">€{data.conversionsValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">CPA</p>
              <p className="font-semibold text-gray-900">€{data.cpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">ROAS</p>
              <p className="font-semibold text-gray-900">{data.roas.toFixed(2)}x</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Products</p>
              <p className="font-semibold text-gray-900">{data.productCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Total Cost</p>
              <p className="font-semibold text-gray-900">€{data.cost.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Conv. Rate: {data.conversionRate.toFixed(1)}% | 
              Current View: <span className="font-medium text-gray-900">
                {selectedMetric === 'conversions' ? 'Conversions' :
                 selectedMetric === 'cpa' ? 'CPA' :
                 selectedMetric === 'conversionsValue' ? 'Conversion Value' :
                 'ROAS'}
              </span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  // Calculate summary metrics
  const totalConversions = materialTypeData.reduce((sum, item) => sum + item.conversions, 0);
  const totalConversionsValue = materialTypeData.reduce((sum, item) => sum + item.conversionsValue, 0);
  const totalCost = materialTypeData.reduce((sum, item) => sum + item.cost, 0);
  const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;

  // Find best performing material
  const bestMaterial = materialTypeData.reduce((best, current) => 
    current.conversions > best.conversions ? current : best, 
    materialTypeData[0] || { material: 'N/A', conversions: 0 }
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  return (
    <div className="space-y-6">
      {/* Products Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shopping Products</h1>
          <p className="text-gray-600 mt-1">Analyze performance of your Shopping and Performance Max products</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Campaign Type Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onCampaignTypeFilterChange('all')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                campaignTypeFilter === 'all'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>All Products</span>
            </button>
            <button
              onClick={() => onCampaignTypeFilterChange('shopping')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                campaignTypeFilter === 'shopping'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Shopping</span>
            </button>
            <button
              onClick={() => onCampaignTypeFilterChange('performance_max')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                campaignTypeFilter === 'performance_max'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>Performance Max</span>
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onProductViewModeChange('table')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                productViewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Table</span>
            </button>
            <button
              onClick={() => onProductViewModeChange('graphs')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                productViewMode === 'graphs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Graphs</span>
            </button>
          </div>
        </div>
      </div>

      {/* Material Type Distribution Widget */}
      {productViewMode === 'graphs' && !productLoading && materialTypeData.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Material Performance Analysis</h3>
              <p className="text-sm text-gray-600 mt-1">Performance metrics by material type</p>
            </div>
            
            {/* Metric Selector Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDropdownOpen(!dropdownOpen);
                }}
                className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-200 cursor-pointer min-w-[140px]"
              >
                <span className="truncate">
                  {selectedMetric === 'conversions' ? 'Conversions' :
                   selectedMetric === 'cpa' ? 'CPA' :
                   selectedMetric === 'conversionsValue' ? 'Conv. Value' :
                   'ROAS'}
                </span>
                <svg className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {[
                    { key: 'conversions', label: 'Conversions', icon: Target },
                    { key: 'cpa', label: 'CPA', icon: DollarSign },
                    { key: 'conversionsValue', label: 'Conversion Value', icon: TrendingUp },
                    { key: 'roas', label: 'ROAS', icon: Package }
                  ].map(metric => {
                    const IconComponent = metric.icon;
                    return (
                      <button
                        key={metric.key}
                        onClick={() => {
                          setSelectedMetric(metric.key);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg flex items-center space-x-2 ${
                          selectedMetric === metric.key ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-900'
                        }`}
                      >
                        <IconComponent className="h-4 w-4" />
                        <span>{metric.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="h-4 w-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-900">Total Conversions</span>
              </div>
              <div className="text-2xl font-bold text-teal-900">
                {totalConversions.toFixed(1)}
              </div>
              <div className="text-xs text-teal-600 mt-1">
                Across {materialTypeData.length} materials
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Best Material</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">
                {bestMaterial.material}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {bestMaterial.conversions.toFixed(1)} conversions
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={materialTypeData} 
                margin={{ top: 20, right: 30, bottom: 60, left: 20 }}
                barCategoryGap="20%"
              >
                <defs>
                  <linearGradient id="materialGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={
                      selectedMetric === 'conversions' ? '#0f766e' :
                      selectedMetric === 'cpa' ? '#3b82f6' :
                      selectedMetric === 'conversionsValue' ? '#10b981' :
                      '#8b5cf6'
                    } stopOpacity={0.9} />
                    <stop offset="100%" stopColor={
                      selectedMetric === 'conversions' ? '#0f766e' :
                      selectedMetric === 'cpa' ? '#3b82f6' :
                      selectedMetric === 'conversionsValue' ? '#10b981' :
                      '#8b5cf6'
                    } stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
                <XAxis 
                  dataKey="material" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={true}
                  tickFormatter={(value) => {
                    if (selectedMetric === 'cpa') return `€${value.toFixed(0)}`;
                    if (selectedMetric === 'conversionsValue') return `€${value.toLocaleString()}`;
                    if (selectedMetric === 'roas') return `${value.toFixed(1)}x`;
                    return value.toFixed(0);
                  }}
                />
                <Tooltip content={<MaterialTooltip />} />
                <Bar 
                  dataKey={selectedMetric === 'roas' ? 'roas' : selectedMetric}
                  fill="url(#materialGradient)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={40}
                  stroke={
                    selectedMetric === 'conversions' ? '#0f766e' :
                    selectedMetric === 'cpa' ? '#3b82f6' :
                    selectedMetric === 'conversionsValue' ? '#10b981' :
                    '#8b5cf6'
                  }
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Material Performance Details */}
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Material Performance Details</h4>
            <div className="space-y-2">
              {materialTypeData.slice(0, 4).map((material, index) => (
                <div key={material.material} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getMaterialColor(index) }}
                    ></div>
                    <span className="text-sm font-medium text-gray-900">{material.material}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900">
                      {selectedMetric === 'conversions' ? material.conversions.toFixed(1) :
                       selectedMetric === 'cpa' ? `€${material.cpa.toFixed(2)}` :
                       selectedMetric === 'conversionsValue' ? `€${material.conversionsValue.toLocaleString()}` :
                       `${material.roas.toFixed(1)}x`}
                    </div>
                    <div className="text-xs text-gray-500">
                      {material.productCount} products
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategic Recommendations */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Strategic Recommendations</h4>
                <div className="text-xs text-blue-700 mt-1 space-y-1">
                  <div>• <strong>Top Performer:</strong> {bestMaterial.material} material shows the highest conversion volume</div>
                  <div>• <strong>Efficiency Focus:</strong> Monitor CPA across materials to identify optimization opportunities</div>
                  <div>• <strong>Budget Allocation:</strong> Consider shifting budget towards high-performing material types</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Product Performance</h2>
          </div>
        </div>

        {/* Table or Charts View */}
        <ProductTable
          data={realProductData}
          loading={productLoading}
          searchTerm=""
          pageSize={25}
          sortColumn={productSort.field}
          sortDirection={productSort.direction}
          statusFilter="all"
          campaignTypeFilter={campaignTypeFilter}
          viewMode={productViewMode}
          onSort={onProductSort}
          onProductClick={onProductClick}
          onMetricHover={onMetricHover}
          onMetricLeave={onMetricLeave}
          totals={totals}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      </div>
    </div>
  );
} 