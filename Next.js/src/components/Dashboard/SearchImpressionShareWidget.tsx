'use client';

import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
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
  className?: string;
}

const SearchImpressionShareWidget: React.FC<SearchImpressionShareWidgetProps> = ({
  customerId,
  dateRange = '30',
  className = ""
}) => {
  const [viewMode, setViewMode] = useState('overview');

  // Use real API data
  const { data: campaignData, loading, error } = useSearchImpressionShareData(customerId, dateRange);

  // Transform campaign data to impression share format
  const data = campaignData
    .filter(campaign => campaign.impressionShare)
    .map(campaign => ({
      campaign: campaign.name.replace('Search - ', ''),
      search_impression_share: campaign.impressionShare!.search_impression_share,
      search_budget_lost_impression_share: campaign.impressionShare!.search_budget_lost_impression_share,
      search_rank_lost_impression_share: campaign.impressionShare!.search_rank_lost_impression_share,
      search_exact_match_impression_share: campaign.impressionShare!.search_impression_share,
      search_top_impression_share: campaign.impressionShare!.search_top_impression_share,
      search_absolute_top_impression_share: campaign.impressionShare!.search_absolute_top_impression_share,
      total_lost: campaign.impressionShare!.search_budget_lost_impression_share + campaign.impressionShare!.search_rank_lost_impression_share,
      trend: campaign.impressionShare!.trend,
      trend_value: campaign.impressionShare!.trend_value
    }));

  // Calculate summary metrics
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
    if (impressionShare >= 80) return { status: 'excellent', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' };
    if (impressionShare >= 60) return { status: 'good', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' };
    if (impressionShare >= 40) return { status: 'moderate', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50' };
    return { status: 'needs attention', color: 'bg-red-500', textColor: 'text-red-700', bgColor: 'bg-red-50' };
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
        {/* Main Bar Chart */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Impression Share by Campaign</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 20, right: 30, bottom: 10, left: 20 }}>
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
                    `${value}%`, 
                    'Impression Share'
                  ]}
                  labelFormatter={(label) => `Campaign: ${label.replace('Search - ', '')}`}
                  cursor={{ fill: 'rgba(15, 118, 110, 0.1)' }}
                />
                <Bar 
                  dataKey="search_impression_share" 
                  fill="#0f766e"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Enhanced Metrics Panel */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Performance Details</h4>
          
          <div className="space-y-3 mb-4">
            {data
              .sort((a, b) => b.search_impression_share - a.search_impression_share)
              .map((campaign, index) => {
                const status = getPerformanceStatus(campaign.search_impression_share);
                return (
                  <div key={campaign.campaign} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium text-gray-500">#{index + 1}</span>
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

          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h5 className="text-sm font-medium text-teal-900 mb-3">Performance Summary</h5>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-teal-700">Best Performer</div>
                <div className="font-semibold text-teal-900">Brand Terms</div>
              </div>
              <div>
                <div className="text-teal-700">Worst Performer</div>
                <div className="font-semibold text-teal-900">Competitor Terms</div>
              </div>
              <div>
                <div className="text-teal-700">Campaigns ≥70%</div>
                <div className="font-semibold text-teal-900">
                  {data.filter(c => c.search_impression_share >= 70).length} of {data.length}
                </div>
              </div>
              <div>
                <div className="text-teal-700">Improving Trends</div>
                <div className="font-semibold text-teal-900">
                  {data.filter(c => c.trend === 'up').length} campaigns
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Detailed breakdown view
  const DetailedView = () => (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Campaign Performance Breakdown</h4>
      {data.map((campaign, index) => {
        const status = getPerformanceStatus(campaign.search_impression_share);
        
        return (
          <div 
            key={campaign.campaign}
            className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
          >
            {/* Campaign Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
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

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {campaign.search_impression_share.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Impression Share</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {campaign.search_budget_lost_impression_share.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Budget Lost</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {campaign.search_rank_lost_impression_share.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">Rank Lost</div>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Performance</span>
                <span className="font-semibold text-gray-900">
                  {campaign.search_impression_share.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-500 ${status.color}`}
                  style={{ width: `${campaign.search_impression_share}%` }}
                ></div>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-3 gap-3 mt-3 text-xs">
              <div>
                <span className="text-gray-600">Top Share</span>
                <div className="font-semibold text-gray-900">{campaign.search_top_impression_share.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-gray-600">Abs Top Share</span>
                <div className="font-semibold text-gray-900">{campaign.search_absolute_top_impression_share.toFixed(1)}%</div>
              </div>
              <div>
                <span className="text-gray-600">Total Lost</span>
                <div className="font-semibold text-gray-900">{campaign.total_lost.toFixed(1)}%</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // Trends view
  const TrendsView = () => {
    const trendData = data.map((campaign, index) => ({
      campaign: campaign.campaign.substring(0, 20),
      current: campaign.search_impression_share,
      previous: campaign.search_impression_share - campaign.trend_value,
      change: campaign.trend_value
    }));

    return (
      <div className="space-y-6">
        <div className="h-64">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Impression Share Trends</h4>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 20, right: 30, bottom: 60, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
              <XAxis 
                dataKey="campaign" 
                stroke="#475569" 
                fontSize={10} 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis stroke="#475569" fontSize={11} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="current" 
                stroke="#0f766e" 
                strokeWidth={2}
                dot={{ fill: '#0f766e', strokeWidth: 2, r: 4 }}
                name="Current"
              />
              <Line 
                type="monotone" 
                dataKey="previous" 
                stroke="#94a3b8" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#94a3b8', strokeWidth: 2, r: 4 }}
                name="Previous"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
            <div className="text-lg font-bold text-green-900">
              {data.filter(c => c.trend === 'up').length}
            </div>
            <div className="text-xs text-green-600">Improving</div>
          </div>
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <div className="text-lg font-bold text-gray-900">
              {data.filter(c => c.trend === 'stable').length}
            </div>
            <div className="text-xs text-gray-600">Stable</div>
          </div>
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
            <div className="text-lg font-bold text-red-900">
              {data.filter(c => c.trend === 'down').length}
            </div>
            <div className="text-xs text-red-600">Declining</div>
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

  if (loading) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign visibility and lost opportunity analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading impression share data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign visibility and lost opportunity analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500">Error loading impression share data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Search Impression Share</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign visibility and lost opportunity analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500">No impression share data available</p>
            <p className="text-sm text-gray-400 mt-1">Impression share metrics will appear once campaigns have sufficient data</p>
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
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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