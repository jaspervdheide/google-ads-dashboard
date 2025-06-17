'use client';

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import { 
  Target, TrendingUp, TrendingDown, Eye, Award, Shield, 
  Search, AlertTriangle, CheckCircle, Info
} from 'lucide-react';
import { useSearchImpressionShareData } from '../../hooks/useCampaignData';

// Types for search impression share data
interface SearchImpressionData {
  campaign_name: string;
  search_impression_share: number;
  search_absolute_top_impression_share: number;
  search_top_impression_share: number;
  search_budget_lost_impression_share: number;
  search_rank_lost_impression_share: number;
  trend: 'up' | 'down' | 'stable';
  trend_value: number;
  lost_budget_share: number;
  lost_rank_share: number;
  competitive_strength: 'strong' | 'moderate' | 'weak';
}

interface SearchImpressionShareWidgetProps {
  customerId: string;
  dateRange?: string;
  selectedDateRange?: any; // Add selectedDateRange prop
  className?: string;
}

const SearchImpressionShareWidget: React.FC<SearchImpressionShareWidgetProps> = ({
  customerId,
  dateRange = '30',
  selectedDateRange,
  className = ""
}) => {
  const [viewMode, setViewMode] = useState('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const campaignsPerPage = 4;

  // Use real API data
  const { data: campaignData, loading, error } = useSearchImpressionShareData(customerId, dateRange);

  // Debug logging
  console.log('SearchImpressionShareWidget - Raw campaignData:', campaignData);
  console.log('SearchImpressionShareWidget - Loading:', loading);
  console.log('SearchImpressionShareWidget - Error:', error);

  // Transform campaign data to impression share format - filter for ENABLED campaigns with impression share > 0
  const data = campaignData
    .filter(campaign => 
      campaign.impressionShare && 
      campaign.impressionShare.search_impression_share > 0 && 
      campaign.status === 'ENABLED'
    )
    .map(campaign => ({
      campaign: campaign.name.replace('Search - ', ''),
      search_impression_share: campaign.impressionShare!.search_impression_share, // Already converted to percentage in API
      search_budget_lost_impression_share: campaign.impressionShare!.search_budget_lost_impression_share,
      search_rank_lost_impression_share: campaign.impressionShare!.search_rank_lost_impression_share,
      search_exact_match_impression_share: campaign.impressionShare!.search_impression_share,
      search_top_impression_share: campaign.impressionShare!.search_top_impression_share,
      search_absolute_top_impression_share: campaign.impressionShare!.search_absolute_top_impression_share,
      total_lost: campaign.impressionShare!.search_budget_lost_impression_share + campaign.impressionShare!.search_rank_lost_impression_share,
      trend: campaign.impressionShare!.trend,
      trend_value: campaign.impressionShare!.trend_value
    }));

  console.log('SearchImpressionShareWidget - Filtered data:', data);

  // Pagination logic
  const totalPages = Math.ceil(data.length / campaignsPerPage);
  const startIndex = (currentPage - 1) * campaignsPerPage;
  const endIndex = startIndex + campaignsPerPage;
  const paginatedData = data.slice(startIndex, endIndex);

  // Calculate summary metrics using the already converted percentages
  const avgImpressionShare = data.length > 0 ? data.reduce((sum, item) => sum + item.search_impression_share, 0) / data.length : 0;
  const avgBudgetLost = data.length > 0 ? data.reduce((sum, item) => sum + item.search_budget_lost_impression_share, 0) / data.length : 0;
  const avgRankLost = data.length > 0 ? data.reduce((sum, item) => sum + item.search_rank_lost_impression_share, 0) / data.length : 0;
  const avgTopShare = data.length > 0 ? data.reduce((sum, item) => sum + item.search_top_impression_share, 0) / data.length : 0;

  const formatTooltipValue = (value: number, name: string) => {
    const labels: { [key: string]: string } = {
      search_impression_share: 'Impression Share',
      search_budget_lost_impression_share: 'Budget Lost',
      search_rank_lost_impression_share: 'Rank Lost',
      search_top_impression_share: 'Top Share',
      search_absolute_top_impression_share: 'Abs Top Share'
    };
    return [`${value.toFixed(1)}%`, labels[name] || name];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {formatTooltipValue(entry.value, entry.dataKey)[1]}: {formatTooltipValue(entry.value, entry.dataKey)[0]}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Get performance status
  const getPerformanceStatus = (impressionShare: number) => {
    if (impressionShare >= 80) return { status: 'Excellent', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (impressionShare >= 60) return { status: 'Good', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (impressionShare >= 40) return { status: 'Moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { status: 'Needs Attention', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
  };

  // Overview visualization
  const OverviewView = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-900">Avg Impression Share</span>
          </div>
          <div className="text-2xl font-bold text-teal-900">{avgImpressionShare.toFixed(1)}%</div>
          <div className="text-xs text-teal-600 mt-1">
            {getPerformanceStatus(avgImpressionShare).status}
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Avg Budget Lost</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">{avgBudgetLost.toFixed(1)}%</div>
          <div className="text-xs text-blue-600 mt-1">
            Budget lost due to search auctions
          </div>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Avg Top Share</span>
          </div>
          <div className="text-2xl font-bold text-purple-900">{avgTopShare.toFixed(1)}%</div>
          <div className="text-xs text-purple-600 mt-1">
            Top of page rate
          </div>
        </div>
      </div>

      {/* Enhanced Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Bar Chart - Use paginated data */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Impression Share by Campaign</h4>
            {totalPages > 1 && (
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ‹
                </button>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  ›
                </button>
              </div>
            )}
          </div>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={paginatedData} 
                margin={{ top: 20, right: 30, bottom: 10, left: 20 }}
                barCategoryGap="20%"
                barGap={6}
              >
                {/* Gradient definition for impression share bars */}
                <defs>
                  <linearGradient
                    id="barGradientImpressionShare"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="#0f766e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity={0.60} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
                <XAxis 
                  dataKey="campaign" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  tick={false}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={11} 
                  tickLine={true}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name, props) => [
                    `${typeof value === 'number' ? value.toFixed(1) : value}%`, 
                    'Impression Share'
                  ]}
                  labelFormatter={(label) => `Campaign: ${label.replace('Search - ', '')}`}
                  cursor={{ fill: 'rgba(15, 118, 110, 0.1)' }}
                />
                <Bar 
                  dataKey="search_impression_share" 
                  fill="url(#barGradientImpressionShare)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={32}
                  stroke="#0f766e"
                  strokeWidth={0.5}
                  strokeOpacity={0.3}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        {/* Enhanced Metrics Panel */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Performance Details</h4>
          
          <div className="space-y-3 mb-8">
            {paginatedData
              .sort((a, b) => b.search_impression_share - a.search_impression_share)
              .map((campaign, index) => {
                const globalIndex = startIndex + index;
                const status = getPerformanceStatus(campaign.search_impression_share);
                return (
                  <div key={campaign.campaign} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500">#{globalIndex + 1}</span>
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {campaign.campaign}
                        </span>
                        {campaign.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {campaign.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {campaign.trend === 'stable' && <CheckCircle className="h-3 w-3 text-gray-500" />}
                      </div>
                      <span className="text-sm font-bold text-gray-900">
                        {campaign.search_impression_share.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${status.color}`}
                          style={{ width: `${campaign.search_impression_share}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Budget Lost: {campaign.search_budget_lost_impression_share.toFixed(1)}%</span>
                        <span>Rank Lost: {campaign.search_rank_lost_impression_share.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );

  // Detailed breakdown view
  const DetailedView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900">Campaign Performance Breakdown</h4>
        {totalPages > 1 && (
          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ‹
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ›
            </button>
          </div>
        )}
      </div>
      {paginatedData.map((campaign, index) => {
        const globalIndex = startIndex + index;
        const status = getPerformanceStatus(campaign.search_impression_share);
        
        return (
          <div 
            key={campaign.campaign}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
          >
            {/* Campaign Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{globalIndex + 1}</span>
                <span className="text-sm font-medium text-gray-900">{campaign.campaign}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${status.bgColor} ${status.textColor}`}>
                  {status.status}
                </span>
              </div>
              
              {/* Trend Indicator */}
              <div className="flex items-center space-x-1">
                {campaign.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                {campaign.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                {campaign.trend === 'stable' && <CheckCircle className="h-4 w-4 text-gray-500" />}
                <span className={`text-xs font-medium ${
                  campaign.trend === 'up' ? 'text-green-600' : 
                  campaign.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {campaign.trend === 'stable' ? '0' : (campaign.trend === 'up' ? '+' : '')}{campaign.trend_value}%
                </span>
              </div>
            </div>

            {/* Compact Metrics Layout */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-600">Performance</div>
              <div className="text-lg font-bold text-gray-900">
                {campaign.search_impression_share.toFixed(1)}%
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${status.color}`}
                style={{ width: `${campaign.search_impression_share}%` }}
              ></div>
            </div>
            
            {/* Compact Secondary Metrics */}
            <div className="text-xs text-gray-600">
              Budget Lost: <span className="font-medium text-gray-900">{campaign.search_budget_lost_impression_share.toFixed(1)}%</span> | 
              Rank Lost: <span className="font-medium text-gray-900">{campaign.search_rank_lost_impression_share.toFixed(1)}%</span> | 
              Top: <span className="font-medium text-gray-900">{campaign.search_top_impression_share.toFixed(1)}%</span> | 
              Abs Top: <span className="font-medium text-gray-900">{campaign.search_absolute_top_impression_share.toFixed(1)}%</span>
            </div>
          </div>
        );
      })}

    </div>
  );

  // Generate historical data for trend analysis based on actual date range
  const generateHistoricalData = (campaign: any) => {
    // TODO: Replace with real historical API data
    // For now, return empty array - historical trends will show when real data is available
    return [];
  };

  // Set default selected campaign (first alphabetically)
  React.useEffect(() => {
    if (data.length > 0 && !selectedCampaign) {
      const sortedCampaigns = data.slice().sort((a, b) => a.campaign.localeCompare(b.campaign));
      setSelectedCampaign(sortedCampaigns[0].campaign);
    }
  }, [data, selectedCampaign]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      setDropdownOpen(false);
    };

    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  // Trends view
  const TrendsView = () => {
    const selectedCampaignData = data.find(c => c.campaign === selectedCampaign);
    const historicalData = selectedCampaignData ? generateHistoricalData(selectedCampaignData) : [];
    
    const currentValue = selectedCampaignData?.search_impression_share || 0;
    const previousValue = currentValue; // No historical data available yet
    const weeklyChange = 0; // No historical data available yet
    const monthlyAvg = currentValue; // Use current value as fallback

    return (
      <div className="space-y-6">
        {/* Campaign Selector */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Campaign Trend Analysis</h4>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-200 cursor-pointer min-w-[200px]"
            >
              <span className="truncate">{selectedCampaign}</span>
              <svg className={`h-4 w-4 text-gray-600 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {dropdownOpen && (
              <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                {data
                  .slice()
                  .sort((a, b) => a.campaign.localeCompare(b.campaign))
                  .map(campaign => (
                    <button
                      key={campaign.campaign}
                      onClick={() => {
                        setSelectedCampaign(campaign.campaign);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors duration-200 first:rounded-t-lg last:rounded-b-lg ${
                        selectedCampaign === campaign.campaign ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{campaign.campaign}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {campaign.search_impression_share.toFixed(1)}%
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Trends Chart */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Impression Share Trends</h3>
                <p className="text-sm text-gray-500">
                  {selectedDateRange?.name || 'Last 30 days'} trend analysis for {selectedCampaign}
                </p>
              </div>

              {/* Chart */}
              <div className="h-[400px] bg-gray-50/30 rounded-lg px-2 py-6">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={historicalData}
                    margin={{ top: 20, right: 25, left: 35, bottom: 25 }}
                  >
                    {/* Gradient definitions */}
                    <defs>
                      <linearGradient id="gradient-impressionShare" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0f766e" stopOpacity={0.15} />
                        <stop offset="70%" stopColor="#0f766e" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradient-budgetLost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                        <stop offset="70%" stopColor="#f59e0b" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradient-rankLost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.15} />
                        <stop offset="70%" stopColor="#ef4444" stopOpacity={0.05} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
                    
                    <XAxis 
                      dataKey="date" 
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
                      stroke="#475569"
                      fontSize={11}
                      tickLine={true}
                      tickSize={6}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
                      dx={-10}
                      width={48}
                      tick={{ fill: '#475569' }}
                      tickMargin={8}
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        
                        // Filter out duplicate entries - only keep the ones with stroke colors (the line entries)
                        const uniquePayload = payload.filter((entry: any) => 
                          entry.stroke && entry.stroke !== 'none'
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
                              const labels = {
                                impressionShare: 'Impression Share',
                                budgetLost: 'Lost by Budget',
                                rankLost: 'Lost by Rank'
                              };
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
                                    backgroundColor: entry.stroke,
                                    marginRight: '8px',
                                    flexShrink: 0
                                  }}></div>
                                  <span style={{ color: entry.stroke, fontWeight: '500' }}>
                                    {labels[entry.dataKey as keyof typeof labels]} : {Number(entry.value).toFixed(1)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      }}
                      wrapperStyle={{ outline: 'none' }}
                      cursor={false}
                    />

                    {/* Layer 1: Gradient Fill Areas (drawn first, behind lines) */}
                    <Area
                      type="monotoneX"
                      dataKey="impressionShare"
                      stroke="none"
                      fill="url(#gradient-impressionShare)"
                      dot={false}
                    />
                    <Area
                      type="monotoneX"
                      dataKey="budgetLost"
                      stroke="none"
                      fill="url(#gradient-budgetLost)"
                      dot={false}
                    />
                    <Area
                      type="monotoneX"
                      dataKey="rankLost"
                      stroke="none"
                      fill="url(#gradient-rankLost)"
                      dot={false}
                    />
                    
                    {/* Layer 2: Lines (drawn second, on top of fills) */}
                    <Area
                      type="monotoneX"
                      dataKey="impressionShare"
                      stroke="#0f766e"
                      strokeWidth={2}
                      fill="none"
                      dot={false}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Area
                      type="monotoneX"
                      dataKey="budgetLost"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      fill="none"
                      dot={false}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Area
                      type="monotoneX"
                      dataKey="rankLost"
                      stroke="#ef4444"
                      strokeWidth={1.5}
                      fill="none"
                      dot={false}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Insights Panel */}
          <div className="space-y-4">
            {/* Current Metrics */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="text-xs font-medium text-gray-900 mb-3">Current Performance</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Impression Share</span>
                  <span className="font-semibold text-gray-900">{currentValue.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">30-Day Average</span>
                  <span className="font-semibold text-gray-900">{monthlyAvg.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">7-Day Change</span>
                  <span className={`font-semibold ${
                    weeklyChange > 0 ? 'text-green-600' : 
                    weeklyChange < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {weeklyChange > 0 ? '+' : ''}{weeklyChange.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Trend Analysis */}
            <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <h5 className="text-xs font-medium text-teal-900 mb-3">Trend Analysis</h5>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  {selectedCampaignData?.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-600" />}
                  {selectedCampaignData?.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-600" />}
                  {selectedCampaignData?.trend === 'stable' && <CheckCircle className="h-3 w-3 text-gray-600" />}
                  <span className="text-teal-700">
                    {selectedCampaignData?.trend === 'up' ? 'Improving' : 
                     selectedCampaignData?.trend === 'down' ? 'Declining' : 'Stable'}
                  </span>
                </div>
                <div className="text-teal-700">
                  {currentValue >= 80 ? 'Excellent visibility in search results' :
                   currentValue >= 60 ? 'Good market presence' :
                   currentValue >= 40 ? 'Room for improvement' :
                   'Significant opportunity for growth'}
                </div>
                {weeklyChange < -5 && (
                  <div className="text-red-600 font-medium">
                    ⚠️ Significant decline detected
                  </div>
                )}
                {weeklyChange > 5 && (
                  <div className="text-green-600 font-medium">
                    ✓ Strong improvement trend
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white border border-gray-200 rounded text-center">
                <div className="text-sm font-bold text-gray-900">{data.filter(c => c.trend === 'up').length}</div>
                <div className="text-xs text-gray-600">Improving</div>
              </div>
              <div className="p-2 bg-white border border-gray-200 rounded text-center">
                <div className="text-sm font-bold text-gray-900">{data.filter(c => c.trend === 'down').length}</div>
                <div className="text-xs text-gray-600">Declining</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const viewModes = [
    { key: 'overview', label: 'Overview', icon: Eye },
    { key: 'detailed', label: 'Detailed', icon: Search },
    { key: 'trends', label: 'Trends', icon: TrendingUp }
  ];

  // Handle loading and error states
  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading impression share data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Error loading data: {error}</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center space-x-2 mb-4">
          <Search className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <div className="text-gray-500">No impression share data available</div>
            <div className="text-sm text-gray-400 mt-2">
              Make sure campaigns are enabled and have impression share data
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
          <p className="text-sm text-gray-600 mt-1">Campaign visibility and lost opportunity analysis</p>
        </div>
        
        {/* View Mode Toggles */}
        <div className="flex items-center space-x-2">
          {viewModes.map(mode => {
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
        {viewMode === 'detailed' && <DetailedView />}
        {viewMode === 'trends' && <TrendsView />}
      </div>

      {/* Strategic Recommendations */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Strategic Recommendations</h4>
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              {avgImpressionShare < 50 && (
                <div>Consider increasing budgets for campaigns with low impression share</div>
              )}
              {avgTopShare < 30 && (
                <div>Improve ad quality and bid strategies to capture more top positions</div>
              )}
              <div>Focus on campaigns with high overlap rates but low outranking shares and monitor position above rates to identify competitive threats</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchImpressionShareWidget; 