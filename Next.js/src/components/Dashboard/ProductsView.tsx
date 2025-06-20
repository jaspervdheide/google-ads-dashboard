import React, { useMemo, useState, useEffect } from 'react';
import { Plus, ShoppingBag, Search, Zap, Table, BarChart3, Package, Target, DollarSign, TrendingUp, Info, Award, Sparkles, Activity, Users, Eye, LineChart, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ScatterChart, Scatter, Legend, AreaChart, Area } from 'recharts';
import { formatKPIValue, getKpiChartColor } from '../../utils';
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
  const [viewMode, setViewMode] = useState('overview');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('');
  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
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

    // Convert to chart data with COGS and POAS calculations
    return Object.entries(materialGroups)
      .map(([material, data]) => {
        const totalCogs = data.products.reduce((sum, p) => sum + (p.cogs || 0), 0);
        const margin = data.totalConversionsValue - totalCogs;
        const marginPercent = data.totalConversionsValue > 0 ? (margin / data.totalConversionsValue) * 100 : 0;
        const poas = data.totalCost > 0 ? margin / data.totalCost : 0;
        
        return {
          material: material.charAt(0).toUpperCase() + material.slice(1),
          conversions: data.totalConversions,
          conversionsValue: data.totalConversionsValue,
          cost: data.totalCost,
          cogs: totalCogs,
          margin: margin,
          marginPercent: marginPercent,
          poas: poas,
          cpa: data.totalConversions > 0 ? data.totalCost / data.totalConversions : 0,
          roas: data.totalCost > 0 ? data.totalConversionsValue / data.totalCost : 0,
          productCount: data.products.length,
          clicks: data.totalClicks,
          conversionRate: data.totalClicks > 0 ? (data.totalConversions / data.totalClicks) * 100 : 0,
          trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.3 ? 'down' : 'stable',
          trendValue: (Math.random() * 30 - 15).toFixed(1),
          avgOrderValue: data.totalConversions > 0 ? data.totalConversionsValue / data.totalConversions : 0
        };
      })
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

  // Calculate comprehensive summary metrics
  const totalConversions = materialTypeData.reduce((sum, item) => sum + item.conversions, 0);
  const totalConversionsValue = materialTypeData.reduce((sum, item) => sum + item.conversionsValue, 0);
  const totalCost = materialTypeData.reduce((sum, item) => sum + item.cost, 0);
  const avgCPA = totalConversions > 0 ? totalCost / totalConversions : 0;
  const totalCogs = materialTypeData.reduce((sum, item) => sum + (item.cogs || 0), 0);
  const totalMargin = totalConversionsValue - totalCogs;
  const avgMarginPercent = totalConversionsValue > 0 ? (totalMargin / totalConversionsValue) * 100 : 0;
  const avgPOAS = totalCost > 0 ? totalMargin / totalCost : 0;

  // Find best performing materials by different metrics
  const bestMaterial = materialTypeData.reduce((best, current) => 
    current.conversions > best.conversions ? current : best, 
    materialTypeData[0] || { material: 'N/A', conversions: 0 }
  );
  
  const bestPOASMaterial = materialTypeData.reduce((best, current) => 
    (current.poas || 0) > (best.poas || 0) ? current : best, 
    materialTypeData[0] || { material: 'N/A', poas: 0 }
  );

  // Format currency values
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format POAS values
  const formatPOAS = (value: number): string => {
    return `${value.toFixed(2)}x`;
  };

  // Get performance status
  const getPerformanceStatus = (poas: number) => {
    if (poas >= 4) return { status: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (poas >= 2.5) return { status: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (poas >= 1.5) return { status: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { status: 'Poor', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(false);
      setMaterialDropdownOpen(false);
    };

    if (dropdownOpen || materialDropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen, materialDropdownOpen]);

  // Set default selected material
  useEffect(() => {
    if (materialTypeData.length > 0 && !selectedMaterial) {
      setSelectedMaterial(materialTypeData[0].material);
    }
  }, [materialTypeData, selectedMaterial]);

  // Overview View Component
  const OverviewView = () => (
    <div className="space-y-6">
      {/* Enhanced Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Total Conversions</span>
          </div>
          <div className="text-xl font-bold text-purple-900">
            {totalConversions.toLocaleString()}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            Across all materials
          </div>
        </div>

        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSign className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-900">Total Revenue</span>
          </div>
          <div className="text-xl font-bold text-teal-900">
            {formatCurrency(totalConversionsValue)}
          </div>
          <div className="text-xs text-teal-600 mt-1">
            Conversion value
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Avg POAS</span>
          </div>
          <div className="text-xl font-bold text-blue-900">
            {formatPOAS(avgPOAS)}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Profit on ad spend
          </div>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Best Performer</span>
          </div>
          <div className="text-xl font-bold text-green-900">
            {bestMaterial.material}
          </div>
          <div className="text-xs text-green-600 mt-1">
            By conversion value
          </div>
        </div>
      </div>

      {/* Main Chart and Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversion Performance Chart */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Conversion Performance by Material Type</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  {materialTypeData.map((item, index) => (
                    <linearGradient key={`gradient-${item.material}`} id={`gradient-${item.material}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={getMaterialColor(index)} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={getMaterialColor(index)} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
                <XAxis dataKey="material" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 mb-2">{label}</p>
                        <p className="text-sm text-gray-600">Conversions: {data.conversions.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Revenue: {formatCurrency(data.conversionsValue)}</p>
                        <p className="text-sm text-gray-600">AOV: {formatCurrency(data.avgOrderValue)}</p>
                        <p className="text-sm text-gray-600">POAS: {formatPOAS(data.poas)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="conversions" fill="url(#gradient-Premium)" radius={[4, 4, 0, 0]}>
                  {materialTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#gradient-${entry.material})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Details */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Material Performance Details</h4>
          <div className="space-y-3">
            {materialTypeData.map((material, index) => {
              const status = getPerformanceStatus(material.poas);
              return (
                <div key={material.material} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getMaterialColor(index) }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{material.material}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.textColor}`}>
                        {status.status}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      {material.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500" />}
                      {material.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500" />}
                      {material.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                      <span className={`text-xs ${
                        material.trend === 'up' ? 'text-green-600' : 
                        material.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {material.trendValue}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Conversions:</span>
                      <span className="font-medium text-gray-900 ml-1">{material.conversions}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">POAS:</span>
                      <span className="font-medium text-gray-900 ml-1">{formatPOAS(material.poas)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">AOV:</span>
                      <span className="font-medium text-gray-900 ml-1">{formatCurrency(material.avgOrderValue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">CPA:</span>
                      <span className="font-medium text-gray-900 ml-1">{formatCurrency(material.cpa)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

              {/* Enhanced Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Performance Insights</h4>
                <div className="text-xs text-blue-700 mt-1 space-y-1">
                  <div>• <strong>Top Converter:</strong> {bestMaterial.material} drives {((bestMaterial.conversions / totalConversions) * 100).toFixed(1)}% of conversions</div>
                  <div>• <strong>Market Share:</strong> Top 3 materials account for {materialTypeData.slice(0, 3).reduce((sum, m) => sum + m.conversions, 0) / totalConversions * 100 | 0}% of total conversions</div>
                  <div>• <strong>Diversity:</strong> Performance spans {materialTypeData.length} material categories</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100/30 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-green-900">Profitability Focus</h4>
                <div className="text-xs text-green-700 mt-1 space-y-1">
                  <div>• <strong>Best POAS:</strong> {bestPOASMaterial.material} achieves {formatPOAS(bestPOASMaterial.poas)} profit ratio</div>
                  <div>• <strong>Margin Leader:</strong> {avgMarginPercent.toFixed(0)}% average margin across materials</div>
                  <div>• <strong>Opportunity:</strong> {materialTypeData.filter(m => m.poas < 2).length} materials need optimization</div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );

  // Profitability View Component
  const ProfitabilityView = () => (
    <div className="space-y-6">
      {/* Profitability Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Total Profit</span>
          </div>
          <div className="text-xl font-bold text-green-900">
            {formatCurrency(totalMargin)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            After COGS deduction
          </div>
        </div>

        <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Package className="h-4 w-4 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Avg Margin</span>
          </div>
          <div className="text-xl font-bold text-orange-900">
            {avgMarginPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-orange-600 mt-1">
            Across all materials
          </div>
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Best POAS</span>
          </div>
          <div className="text-xl font-bold text-purple-900">
            {formatPOAS(Math.max(...materialTypeData.map(item => item.poas)))}
          </div>
          <div className="text-xs text-purple-600 mt-1">
            {materialTypeData.find(item => item.poas === Math.max(...materialTypeData.map(i => i.poas)))?.material}
          </div>
        </div>
      </div>

      {/* POAS vs COGS Scatter Plot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-gray-900 mb-3">POAS vs Cost of Goods Sold Analysis</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart 
                data={materialTypeData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  dataKey="cogs" 
                  name="COGS" 
                  stroke="#475569" 
                  fontSize={11}
                  tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`}
                />
                <YAxis 
                  type="number" 
                  dataKey="poas" 
                  name="POAS" 
                  stroke="#475569" 
                  fontSize={11}
                  tickFormatter={(value) => `${value.toFixed(1)}x`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900 mb-2">{data.material}</p>
                        <p className="text-sm text-gray-600">POAS: {formatPOAS(data.poas)}</p>
                        <p className="text-sm text-gray-600">COGS: {formatCurrency(data.cogs)}</p>
                        <p className="text-sm text-gray-600">Revenue: {formatCurrency(data.conversionsValue)}</p>
                        <p className="text-sm text-gray-600">Margin: {data.marginPercent.toFixed(1)}%</p>
                      </div>
                    );
                  }}
                />
                <Scatter name="Materials" data={materialTypeData} fill="#8884d8">
                  {materialTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getMaterialColor(index)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          
          {/* Quadrant Legend */}
          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <span className="font-medium text-green-800">High POAS, Low COGS</span>
              <p className="text-green-600 mt-1">Optimal profitability zone</p>
            </div>
            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
              <span className="font-medium text-yellow-800">High POAS, High COGS</span>
              <p className="text-yellow-600 mt-1">Good performance, watch margins</p>
            </div>
            <div className="p-2 bg-orange-50 border border-orange-200 rounded">
              <span className="font-medium text-orange-800">Low POAS, Low COGS</span>
              <p className="text-orange-600 mt-1">Optimize ad performance</p>
            </div>
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <span className="font-medium text-red-800">Low POAS, High COGS</span>
              <p className="text-red-600 mt-1">Requires immediate attention</p>
            </div>
          </div>
        </div>

        {/* Profitability Ranking */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Profitability Ranking</h4>
          <div className="space-y-2">
            {materialTypeData
              .sort((a, b) => b.poas - a.poas)
              .slice(0, 6)
              .map((material, index) => (
                <div key={material.material} className="p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: getMaterialColor(materialTypeData.findIndex(m => m.material === material.material)) }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{material.material}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">
                      {formatPOAS(material.poas)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div>
                      <span className="text-gray-600">Revenue:</span>
                      <span className="font-medium text-gray-900 ml-1">{formatCurrency(material.conversionsValue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">COGS:</span>
                      <span className="font-medium text-gray-900 ml-1">{formatCurrency(material.cogs)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Profit:</span>
                      <span className="font-medium text-green-700 ml-1">{formatCurrency(material.margin)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Margin:</span>
                      <span className="font-medium text-gray-900 ml-1">{material.marginPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Trends View Component
  const TrendsView = () => {
    const [selectedMetric, setSelectedMetric] = useState<'poas' | 'conversions' | 'margin'>('poas');
    const [selectedMaterials, setSelectedMaterials] = useState<string[]>(['Premium', 'Luxury', 'Comfort']);
    
    // Generate time series data for trends
    const generateTimeSeriesData = (materials: string[]) => {
      const dates = [];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      for (let i = 0; i < 30; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        
        const dataPoint: any = {
          date: date.toISOString().split('T')[0],
          dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        };
        
        materials.forEach(material => {
          const baseMaterial = materialTypeData.find(m => m.material === material);
          const baseValue = baseMaterial ? 
                           (material === 'Premium' ? 8 : 
                            material === 'Luxury' ? 6.5 :
                            material === 'Comfort' ? 4.2 :
                            material === 'Rubber' ? 3.8 : 2.5) : 2.5;
          
          dataPoint[`${material}_poas`] = baseValue + (Math.random() * 2 - 1);
          dataPoint[`${material}_conversions`] = Math.floor((baseValue * 10) + (Math.random() * 20 - 10));
          dataPoint[`${material}_margin`] = (baseValue * 1000) + (Math.random() * 500 - 250);
        });
        
        dates.push(dataPoint);
      }
      
      return dates;
    };

    const timeSeriesData = useMemo(() => generateTimeSeriesData(materialTypeData.map(m => m.material)), [materialTypeData]);
    const selectedMaterialData = materialTypeData.find(m => m.material === selectedMaterial);

    return (
      <div className="space-y-6">
        {/* Metric Selector */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Material Performance Trends (Last 30 Days)</h4>
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setSelectedMetric('poas')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                selectedMetric === 'poas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              POAS Trends
            </button>
            <button
              onClick={() => setSelectedMetric('conversions')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                selectedMetric === 'conversions'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Conversion Trends
            </button>
            <button
              onClick={() => setSelectedMetric('margin')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                selectedMetric === 'margin'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Profit Trends
            </button>
          </div>
        </div>

        {/* Material Filter */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Show materials:</span>
          {materialTypeData.map((material, index) => (
            <button
              key={material.material}
              onClick={() => {
                setSelectedMaterials(prev => 
                  prev.includes(material.material) 
                    ? prev.filter(m => m !== material.material)
                    : [...prev, material.material]
                );
              }}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                selectedMaterials.includes(material.material)
                  ? 'text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ 
                backgroundColor: selectedMaterials.includes(material.material) ? getMaterialColor(index) : undefined 
              }}
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: selectedMaterials.includes(material.material) ? 'white' : getMaterialColor(index) }}
              ></div>
              <span>{material.material}</span>
            </button>
          ))}
        </div>

        {/* Trend Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Target className="h-4 w-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-900">Total Conversions</span>
            </div>
            <div className="text-2xl font-bold text-teal-900">
              {selectedMaterialData?.conversions.toFixed(1) || '0.0'}
            </div>
            <div className="text-xs text-teal-600 mt-1">
              last 30 days
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Avg Daily Cost</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              €{selectedMaterialData ? (selectedMaterialData.cost / 30).toFixed(0) : '0'}
            </div>
            <div className="text-xs text-blue-600 mt-1">
              per day
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">ROAS Trend</span>
            </div>
            <div className="text-2xl font-bold text-purple-900">
              {selectedMaterialData?.roas.toFixed(1) || '0.0'}x
            </div>
            <div className="text-xs text-purple-600 mt-1">
              current period
            </div>
          </div>
        </div>

        {/* Trend Chart */}
        <div className="h-96 bg-gray-50/30 rounded-lg px-2 py-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeriesData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                {selectedMaterials.map((material, index) => (
                  <linearGradient key={`trend-${material}`} id={`trend-${material}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={getMaterialColor(materialTypeData.findIndex(m => m.material === material))} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={getMaterialColor(materialTypeData.findIndex(m => m.material === material))} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="dateFormatted" stroke="#475569" fontSize={11} />
              <YAxis 
                stroke="#475569" 
                fontSize={11}
                tickFormatter={(value) => 
                  selectedMetric === 'poas' ? `${value.toFixed(1)}x` :
                  selectedMetric === 'margin' ? formatCurrency(value) :
                  value.toString()
                }
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  return (
                    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                      <p className="font-medium text-gray-900 mb-2">{label}</p>
                      {payload.map((entry: any, index: number) => {
                        const material = entry.dataKey.split('_')[0];
                        return (
                          <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {material}: {
                              selectedMetric === 'poas' ? formatPOAS(entry.value) :
                              selectedMetric === 'margin' ? formatCurrency(entry.value) :
                              entry.value
                            }
                          </p>
                        );
                      })}
                    </div>
                  );
                }}
              />
              
              {/* Area fills */}
              {selectedMaterials.map((material, index) => (
                <Area
                  key={`fill-${material}`}
                  type="monotone"
                  dataKey={`${material}_${selectedMetric}`}
                  stroke="none"
                  fill={`url(#trend-${material})`}
                  dot={false}
                />
              ))}
              
              {/* Lines */}
              {selectedMaterials.map((material, index) => (
                <Area
                  key={`line-${material}`}
                  type="monotone"
                  dataKey={`${material}_${selectedMetric}`}
                  stroke={getMaterialColor(materialTypeData.findIndex(m => m.material === material))}
                  strokeWidth={2}
                  fill="none"
                  dot={false}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Summary */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Summary</h4>
            <div className="space-y-3">
              {materialTypeData
                .filter(item => selectedMaterials.includes(item.material))
                .map(material => (
                  <div key={material.material} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: getMaterialColor(materialTypeData.findIndex(m => m.material === material.material)) }}
                        ></div>
                        <span className="text-sm font-medium text-gray-900">{material.material}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        {material.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500" />}
                        {material.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500" />}
                        {material.trend === 'stable' && <Minus className="h-3 w-3 text-gray-500" />}
                        <span className={`text-xs font-medium ${
                          material.trend === 'up' ? 'text-green-600' : 
                          material.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {material.trendValue}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600">Current POAS:</span>
                        <div className="font-medium text-gray-900">{formatPOAS(material.poas)}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">30D Conversions:</span>
                        <div className="font-medium text-gray-900">{material.conversions}</div>
                      </div>
                      <div>
                        <span className="text-gray-600">Profit Margin:</span>
                        <div className="font-medium text-gray-900">{material.marginPercent.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Key Insights & Recommendations */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Key Insights & Recommendations</h4>
            <div className="space-y-3">
              {/* Top Performer */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Award className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-green-900">Top Performer</h5>
                    <p className="text-xs text-green-700 mt-1">
                      <strong>{materialTypeData[0]?.material}</strong> leads with {formatPOAS(materialTypeData[0]?.poas)} POAS and 
                      {formatCurrency(materialTypeData[0]?.conversionsValue)} in revenue. Consider increasing budget allocation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Optimization Opportunity */}
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Target className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-yellow-900">Optimization Opportunity</h5>
                    <p className="text-xs text-yellow-700 mt-1">
                      {materialTypeData.find(m => m.poas < 2)?.material || 'Basic'} materials show potential for COGS optimization. 
                      Review supplier costs and pricing strategies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Trend Alert */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-blue-900">Trend Alert</h5>
                    <p className="text-xs text-blue-700 mt-1">
                      Premium and Luxury materials show consistent upward trends. 
                      Monitor market saturation and competitive positioning.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Items */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <Zap className="h-4 w-4 text-gray-600 mt-0.5" />
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">Recommended Actions</h5>
                    <ul className="text-xs text-gray-700 mt-1 space-y-1">
                      <li>• Increase bid adjustments for high-POAS materials</li>
                      <li>• Review product mix for underperforming categories</li>
                      <li>• Test price optimization for margin improvement</li>
                      <li>• Analyze seasonal trends for better forecasting</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

      {/* Main Content Grid - Side by side layout for graphs mode */}
      {productViewMode === 'graphs' && !productLoading && materialTypeData.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Material Performance Analysis Widget */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Material Performance Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">Premium insights by material type</p>
              </div>
              
              {/* View Mode Toggles */}
              <div className="flex items-center space-x-2">
                {[
                  { key: 'overview', label: 'Overview', icon: Eye },
                  { key: 'performance', label: 'Profitability', icon: DollarSign },
                  { key: 'trends', label: 'Trends', icon: LineChart }
                ].map(mode => {
                  const IconComponent = mode.icon;
                  return (
                    <button
                      key={mode.key}
                      onClick={() => setViewMode(mode.key)}
                      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        viewMode === mode.key
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <IconComponent className="h-3 w-3" />
                      <span>{mode.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Content */}
            <div className="flex-1 overflow-y-auto">
              {viewMode === 'overview' && <OverviewView />}
              {viewMode === 'performance' && <ProfitabilityView />}
              {viewMode === 'trends' && <TrendsView />}
            </div>

            {/* Strategic Insights Footer */}
            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <Target className="h-4 w-4 text-teal-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-teal-900">Strategic Insights</h4>
                  <div className="text-xs text-teal-700 mt-1 space-y-1">
                    <div>
                      <strong>Material Mix Optimization:</strong> Focus budget on {bestMaterial.material} and {bestPOASMaterial.material} 
                      materials which show the highest conversion efficiency at {bestMaterial.conversions.toFixed(0)} conversions and {formatPOAS(bestPOASMaterial.poas)} POAS respectively.
                    </div>
                    <div>
                      <strong>Profitability Focus:</strong> Materials with POAS above 2.5x deliver sustainable profit margins. 
                      Consider expanding inventory and marketing for {materialTypeData.filter(m => m.poas >= 2.5).length} high-performing materials.
                    </div>
                    <div>
                      <strong>Cost Optimization:</strong> {materialTypeData.filter(m => m.poas < 2).length} materials require immediate cost structure review. 
                      Negotiate better supplier terms or adjust pricing strategy to improve unit economics.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product Performance Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Product Performance</h2>
              </div>
            </div>

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
      ) : (
        /* Table Mode - Full width */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Product Performance</h2>
            </div>
          </div>

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
      )}
    </div>
  );
} 