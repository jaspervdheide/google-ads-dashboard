'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip,
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Cell
} from 'recharts';
import {
  Target, TrendingUp, Award, AlertTriangle, Eye, Zap, TrendingDown
} from 'lucide-react';
import useCampaignData from '../../hooks/useCampaignData';
import { calculateRoasAnalysisByType, RoasAnalysisByType } from '../../utils/campaignAnalysis';

// Matrix cell data structure
interface MatrixCellData {
  id: string;
  campaignName: string;
  conversions: number;
  achievedRoas: number;
  targetRoas: number | null;
  roasGap: number; // achieved - target
  conversionValue: number;
  cost: number;
  performance: 'exceeding' | 'meeting' | 'underperforming' | 'no-target';
  conversionBucket: 'low' | 'medium' | 'high';
  roasBucket: 'low' | 'medium' | 'high';
  x: number; // Grid position
  y: number; // Grid position
  size: number; // Bubble size based on spend
  biddingStrategyType?: string;
  potentiallyReachLimited?: boolean;
}

interface CampaignRoasPerformanceMatrixProps {
  selectedAccount: string;
  selectedDateRange: any;
  className?: string;
}

const CampaignRoasPerformanceMatrix: React.FC<CampaignRoasPerformanceMatrixProps> = ({
  selectedAccount,
  selectedDateRange,
  className = ""
}) => {
  const [viewMode, setViewMode] = useState<'radar' | 'scatter' | 'performance'>('radar');
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // Use campaign data hook with proper DateRange object and bidding strategy data
  const { data: campaignData, loading, error } = useCampaignData(
    selectedAccount, 
    selectedDateRange, 
    false,
    true // Include bidding strategy data
  );

  // Calculate ROAS analysis by campaign type
  const roasAnalysis: RoasAnalysisByType = React.useMemo(() => {
    return calculateRoasAnalysisByType(campaignData);
  }, [campaignData]);

  // Process and create matrix data
  const processedData = React.useMemo(() => {
    if (!campaignData || !campaignData.campaigns || campaignData.campaigns.length === 0) {
      return [];
    }

    // Filter campaigns with valid data
    const validCampaigns = campaignData.campaigns.filter((campaign: any) => 
      campaign.cost > 0 && 
      campaign.conversionsValue > 0 &&
      campaign.status === 'ENABLED'
    );

    if (validCampaigns.length === 0) {
      return [];
    }

    // Calculate buckets for grid positioning
    const conversions = validCampaigns.map((c: any) => c.conversions || 0);
    const roasValues = validCampaigns.map((c: any) => 
      c.cost > 0 ? (c.conversionsValue / c.cost) * 100 : 0
    );

    const maxConversions = Math.max(...conversions);
    const maxRoas = Math.max(...roasValues);

    // Create matrix cells with real bidding strategy data
    return validCampaigns.map((campaign: any, index: number) => {
      // Calculate achieved ROAS/POAS (Return/Profit on Ad Spend)
      // POAS = (Conversion Value / Cost) * 100 - matches our MetricsByType definition
      const achievedRoas = campaign.cost > 0 ? (campaign.conversionsValue / campaign.cost) * 100 : 0;
      
      // Get target ROAS from bidding strategy (enhanced logic)
      let targetRoas: number | null = null;
      let biddingStrategyType = 'Unknown';
      
      if (campaign.biddingStrategy?.type === 'TARGET_ROAS' && campaign.biddingStrategy?.targetRoas) {
        // Convert from decimal to percentage (API returns as decimal, e.g., 3.0 = 300%)
        targetRoas = campaign.biddingStrategy.targetRoas * 100;
        biddingStrategyType = 'Target ROAS';
      } else if (campaign.biddingStrategy?.targetRoasOverride) {
        // For any bidding strategy with target ROAS override (TARGET_SPEND, MAXIMIZE_CONVERSION_VALUE, etc.)
        targetRoas = campaign.biddingStrategy.targetRoasOverride * 100;
        biddingStrategyType = campaign.biddingStrategy.type === 'MAXIMIZE_CONVERSION_VALUE' ? 'Max Conv Value (tROAS)' : 'Target Spend (tROAS)';
      } else if (campaign.metrics?.averageTargetRoas) {
        // Fallback to metrics.average_target_roas if available
        targetRoas = campaign.metrics.averageTargetRoas * 100;
        biddingStrategyType = 'Target ROAS (avg)';
      } else if (campaign.biddingStrategy?.type) {
        biddingStrategyType = campaign.biddingStrategy.type.replace(/_/g, ' ').toLowerCase()
          .replace(/\b\w/g, (l: string) => l.toUpperCase());
      }
      
      const roasGap = targetRoas ? achievedRoas - targetRoas : 0;
      
      // Determine performance vs target
      let performance: 'exceeding' | 'meeting' | 'underperforming' | 'no-target' = 'no-target';
      if (targetRoas) {
        if (achievedRoas >= targetRoas * 1.1) performance = 'exceeding';
        else if (achievedRoas >= targetRoas * 0.9) performance = 'meeting';
        else performance = 'underperforming';
      }

      // Check if campaign might be reach-limited by high target ROAS
      const potentiallyReachLimited = targetRoas && targetRoas > 400 && campaign.impressions < 1000;

      // Bucket classifications for grid positioning
      const conversionBucket = campaign.conversions <= maxConversions * 0.33 ? 'low' :
                              campaign.conversions <= maxConversions * 0.66 ? 'medium' : 'high';
      
      const roasBucket = achievedRoas <= maxRoas * 0.33 ? 'low' :
                        achievedRoas <= maxRoas * 0.66 ? 'medium' : 'high';

      // Grid positions (0-2 for 3x3 grid)
      const conversionPos = conversionBucket === 'low' ? 0 : conversionBucket === 'medium' ? 1 : 2;
      const roasPos = roasBucket === 'low' ? 0 : roasBucket === 'medium' ? 1 : 2;

      return {
        id: campaign.id,
        campaignName: campaign.name.replace('Search - ', ''),
        conversions: campaign.conversions || 0,
        achievedRoas,
        targetRoas,
        roasGap,
        conversionValue: campaign.conversionsValue || 0,
        cost: campaign.cost || 0,
        performance,
        conversionBucket,
        roasBucket,
        x: conversionPos,
        y: roasPos,
        size: Math.max(10, Math.min(40, (campaign.cost / Math.max(...validCampaigns.map((c: any) => c.cost))) * 30)),
        biddingStrategyType,
        potentiallyReachLimited
      } as MatrixCellData;
    });
  }, [campaignData]);

  // Calculate enhanced insights using the new analysis
  const insights = React.useMemo(() => {
    if (processedData.length === 0) return null;

    const totalCampaigns = processedData.length;
    const campaignsWithTargets = processedData.filter((d: MatrixCellData) => d.targetRoas !== null).length;
    const exceedingTarget = processedData.filter((d: MatrixCellData) => d.performance === 'exceeding').length;
    const underperforming = processedData.filter((d: MatrixCellData) => d.performance === 'underperforming').length;
    const reachLimited = processedData.filter((d: MatrixCellData) => d.potentiallyReachLimited).length;
    
    const avgAchievedRoas = processedData.reduce((sum: number, d: MatrixCellData) => sum + d.achievedRoas, 0) / totalCampaigns;
    const avgTargetRoas = processedData
      .filter((d: MatrixCellData) => d.targetRoas !== null)
      .reduce((sum: number, d: MatrixCellData) => sum + (d.targetRoas || 0), 0) / Math.max(campaignsWithTargets, 1);

    const totalSpend = processedData.reduce((sum: number, d: MatrixCellData) => sum + d.cost, 0);
    const totalValue = processedData.reduce((sum: number, d: MatrixCellData) => sum + d.conversionValue, 0);
    const portfolioRoas = totalSpend > 0 ? (totalValue / totalSpend) * 100 : 0;

    // Get aggregated analysis from campaign types
    const totalAnalysis = Object.values(roasAnalysis).reduce((acc, analysis) => ({
      campaignsWithTargets: acc.campaignsWithTargets + analysis.campaignsWithTargets,
      campaignsExceedingTarget: acc.campaignsExceedingTarget + analysis.campaignsExceedingTarget,
      campaignsUnderperforming: acc.campaignsUnderperforming + analysis.campaignsUnderperforming,
      reachLimitedCampaigns: acc.reachLimitedCampaigns + analysis.reachLimitedCampaigns,
      portfolioRoas: analysis.portfolioRoas > 0 ? analysis.portfolioRoas : acc.portfolioRoas
    }), {
      campaignsWithTargets: 0,
      campaignsExceedingTarget: 0,
      campaignsUnderperforming: 0,
      reachLimitedCampaigns: 0,
      portfolioRoas: 0
    });

    return {
      totalCampaigns,
      campaignsWithTargets,
      exceedingTarget,
      underperforming,
      reachLimited: totalAnalysis.reachLimitedCampaigns,
      avgAchievedRoas,
      avgTargetRoas,
      portfolioRoas,
      targetGap: avgAchievedRoas - avgTargetRoas,
      // Strategic insights
      targetOptimizationOpportunity: underperforming > exceedingTarget,
      reachExpansionOpportunity: totalAnalysis.reachLimitedCampaigns > 0
    };
  }, [processedData, roasAnalysis]);

  // Create business-focused radar chart data
  const radarData = React.useMemo(() => {
    if (processedData.length === 0) return [];

    const totalSpend = processedData.reduce((sum, c) => sum + c.cost, 0);
    const totalValue = processedData.reduce((sum, c) => sum + c.conversionValue, 0);

    // Create strategic performance segments
    const segments = [
      { name: 'High Performers', color: '#10b981', campaigns: [] as MatrixCellData[] },
      { name: 'On Track', color: '#3b82f6', campaigns: [] as MatrixCellData[] },
      { name: 'Need Optimization', color: '#ef4444', campaigns: [] as MatrixCellData[] },
      { name: 'Missing Targets', color: '#6b7280', campaigns: [] as MatrixCellData[] },
      { name: 'Reach Limited', color: '#f59e0b', campaigns: [] as MatrixCellData[] }
    ];

    // Categorize campaigns based on business impact
    processedData.forEach(campaign => {
      if (campaign.potentiallyReachLimited) {
        segments[4].campaigns.push(campaign); // Reach limited (high priority)
      } else if (campaign.performance === 'exceeding') {
        segments[0].campaigns.push(campaign); // High performers (scale these)
      } else if (campaign.performance === 'meeting') {
        segments[1].campaigns.push(campaign); // On track (maintain)
      } else if (campaign.performance === 'underperforming') {
        segments[2].campaigns.push(campaign); // Need optimization (fix these)
      } else {
        segments[3].campaigns.push(campaign); // Missing targets (set targets)
      }
    });

    // Create radar data with business metrics
    return segments.map(segment => {
      const campaignCount = segment.campaigns.length;
      const segmentSpend = segment.campaigns.reduce((sum, c) => sum + c.cost, 0);
      const segmentValue = segment.campaigns.reduce((sum, c) => sum + c.conversionValue, 0);
      const spendShare = totalSpend > 0 ? (segmentSpend / totalSpend) * 100 : 0;
      const avgRoas = segmentSpend > 0 ? (segmentValue / segmentSpend) * 100 : 0;
      
      // Calculate business impact score (0-100)
      let businessImpact = 0;
      if (segment.name === 'Reach Limited') {
        businessImpact = Math.min(spendShare * 3, 100); // High impact - limits growth
      } else if (segment.name === 'High Performers') {
        businessImpact = Math.min(spendShare * 2, 100); // High impact - scale opportunity
      } else if (segment.name === 'Need Optimization') {
        businessImpact = Math.min(spendShare * 1.5, 100); // Medium-high impact - efficiency gains
      } else {
        businessImpact = spendShare; // Normal impact
      }

      return {
        segment: segment.name,
        campaigns: campaignCount,
        spendShare: Math.round(spendShare),
        avgRoas: Math.round(avgRoas),
        businessImpact: Math.round(businessImpact),
        spend: segmentSpend,
        totalConversions: segment.campaigns.reduce((sum, c) => sum + c.conversions, 0),
        totalValue: segmentValue
      };
    }).filter(segment => segment.campaigns > 0); // Only show segments with campaigns
  }, [processedData]);

  // Create a simple scatter plot data for campaigns with targets
  const scatterData = React.useMemo(() => {
    return processedData
      .filter(campaign => campaign.targetRoas !== null)
      .map(campaign => ({
        name: campaign.campaignName,
        targetRoas: campaign.targetRoas,
        achievedRoas: campaign.achievedRoas,
        conversions: campaign.conversions,
        cost: campaign.cost,
        performance: campaign.performance,
        biddingStrategy: campaign.biddingStrategyType,
        reachLimited: campaign.potentiallyReachLimited
      }));
  }, [processedData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as MatrixCellData;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-72">
          <div className="flex items-center space-x-2 mb-3">
            <Target className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">
              {data.campaignName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              data.performance === 'exceeding' ? 'bg-green-100 text-green-800' :
              data.performance === 'meeting' ? 'bg-blue-100 text-blue-800' :
              data.performance === 'underperforming' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {data.performance === 'no-target' ? 'No Target' : 
               data.performance === 'exceeding' ? 'Exceeding' :
               data.performance === 'meeting' ? 'Meeting' : 'Under Target'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Achieved ROAS</p>
              <p className="font-semibold text-gray-900 text-lg">{data.achievedRoas.toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Target ROAS</p>
              <p className="font-semibold text-gray-900 text-lg">
                {data.targetRoas ? `${data.targetRoas.toFixed(0)}%` : 'None'}
              </p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Conversions</p>
              <p className="font-semibold text-gray-900">{data.conversions.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Conv. Value</p>
              <p className="font-semibold text-gray-900">€{data.conversionValue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Cost</p>
              <p className="font-semibold text-gray-900">€{data.cost.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">ROAS Gap</p>
              <p className={`font-semibold ${data.roasGap >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.targetRoas ? `${data.roasGap > 0 ? '+' : ''}${data.roasGap.toFixed(0)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && !campaignData) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ROAS Performance Matrix</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign ROAS vs target analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading campaign data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ROAS Performance Matrix</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign ROAS vs target analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500">Error loading campaign data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">ROAS Target Achievement Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Campaign ROAS vs target analysis</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500">No campaign data available</p>
            <p className="text-sm text-gray-400 mt-1">Check your date range and account selection</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">ROAS Target Achievement Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">
            Campaign ROAS performance vs targets - {selectedDateRange?.name || 'Last 30 days'}
          </p>
        </div>
        
        {/* View Mode Toggles */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">View:</span>
          <div className="flex items-center space-x-1">
            {[
              { key: 'radar', label: 'Radar', icon: Target },
              { key: 'scatter', label: 'Target vs Achieved', icon: Eye },
              { key: 'performance', label: 'Performance', icon: Award }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setViewMode(key as any)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  viewMode === key
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Portfolio ROAS</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {insights?.portfolioRoas.toFixed(0)}%
          </div>
          <div className="text-xs text-blue-600 mt-1">
            Overall performance
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Target Gap</span>
          </div>
          <div className={`text-2xl font-bold ${
            (insights?.targetGap || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {insights?.targetGap ? `${insights.targetGap > 0 ? '+' : ''}${insights.targetGap.toFixed(0)}%` : 'N/A'}
          </div>
          <div className="text-xs text-amber-600 mt-1">
            vs avg target
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Meeting Targets</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            {insights?.exceedingTarget || 0}
          </div>
          <div className="text-xs text-green-600 mt-1">
            of {insights?.campaignsWithTargets || 0} with targets
          </div>
        </div>

        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-900">Reach Limited</span>
          </div>
          <div className="text-2xl font-bold text-red-900">
            {insights?.reachLimited || 0}
          </div>
          <div className="text-xs text-red-600 mt-1">
            high targets limiting reach
          </div>
        </div>
      </div>

      {/* ROAS Target Achievement Visualization */}
      {viewMode === 'radar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Radar Chart */}
          <div className="space-y-4">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} margin={{ top: 40, right: 80, bottom: 40, left: 80 }}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis 
                    dataKey="segment" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    className="text-xs"
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 'dataMax']} 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickCount={4}
                  />
                  <Radar
                    name="Spend Share %"
                    dataKey="spendShare"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Radar
                    name="Business Impact"
                    dataKey="businessImpact"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                  <Tooltip 
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                            <div className="text-sm font-semibold text-gray-900 mb-2">
                              {label}
                            </div>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Campaigns:</span>
                                <span className="font-medium">{data.campaigns}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Spend Share:</span>
                                <span className="font-medium">{data.spendShare}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Avg ROAS:</span>
                                <span className="font-medium">{data.avgRoas}%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Business Impact:</span>
                                <span className="font-medium">{data.businessImpact}/100</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Total Spend:</span>
                                <span className="font-medium">€{data.spend.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Conversions:</span>
                                <span className="font-medium">{data.totalConversions.toFixed(1)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            

          </div>

          {/* Right: Target ROAS Summary and Insights */}
          <div className="space-y-4">
            {/* Target ROAS Summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-900 mb-3">Target ROAS Summary:</div>
              <div className="text-xs text-gray-600 space-y-1">
                {insights && (
                  <>
                    <div>• <strong>{insights.campaignsWithTargets}</strong> campaigns have Target ROAS set</div>
                    <div>• <strong>{insights.totalCampaigns - insights.campaignsWithTargets}</strong> campaigns use other bidding strategies</div>
                    {insights.campaignsWithTargets > 0 && (
                      <div>• Average target: <strong>{insights.avgTargetRoas.toFixed(0)}%</strong>, Average achieved: <strong>{insights.avgAchievedRoas.toFixed(0)}%</strong></div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Target Achievement Insights */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Target Achievement Insights</h4>
              <div className="text-xs text-gray-600 space-y-1">
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Blue area = spend distribution across performance segments</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Orange line = business impact (reach limitations amplified)</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Focus on "Reach Limited" and "High Performers" segments</span>
                </div>
                {insights && insights.reachLimited > 0 && (
                  <div className="flex items-center space-x-1 font-medium text-orange-700 mt-2">
                    <AlertTriangle className="h-3 w-3" />
                    <span>{insights.reachLimited} campaigns potentially reach limited</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'scatter' ? (
        /* Target vs Achieved ROAS Scatter Plot */
        <div className="space-y-4">
          {scatterData.length > 0 ? (
            <>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart data={scatterData} margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      type="number" 
                      dataKey="targetRoas" 
                      name="Target ROAS"
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{ value: 'Target ROAS (%)', position: 'insideBottom', offset: -40, style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748b' } }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="achievedRoas" 
                      name="Achieved ROAS"
                      domain={['dataMin - 50', 'dataMax + 50']}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      label={{ value: 'Achieved ROAS (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: '12px', fill: '#64748b' } }}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
                              <div className="text-sm font-semibold text-gray-900 mb-2">
                                {data.name}
                              </div>
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Target ROAS:</span>
                                  <span className="font-medium">{data.targetRoas}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Achieved ROAS:</span>
                                  <span className="font-medium">{data.achievedRoas.toFixed(0)}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Gap:</span>
                                  <span className={`font-medium ${(data.achievedRoas - data.targetRoas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {data.achievedRoas - data.targetRoas > 0 ? '+' : ''}{(data.achievedRoas - data.targetRoas).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Conversions:</span>
                                  <span className="font-medium">{data.conversions.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Strategy:</span>
                                  <span className="font-medium">{data.biddingStrategy}</span>
                                </div>
                                {data.reachLimited && (
                                  <div className="flex items-center space-x-1 text-orange-600 mt-2">
                                    <Zap className="h-3 w-3" />
                                    <span className="text-xs font-medium">Potentially Reach Limited</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter name="Campaigns" dataKey="achievedRoas" fill="#3b82f6">
                      {scatterData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.performance === 'exceeding' ? '#10b981' :
                            entry.performance === 'meeting' ? '#3b82f6' :
                            entry.performance === 'underperforming' ? '#ef4444' :
                            '#6b7280'
                          }
                        />
                      ))}
                    </Scatter>
                    {/* Diagonal line showing perfect target achievement */}
                    <Scatter 
                      name="Perfect Line" 
                      data={[
                        { targetRoas: Math.min(...scatterData.map(d => d.targetRoas || 0)), achievedRoas: Math.min(...scatterData.map(d => d.targetRoas || 0)) },
                        { targetRoas: Math.max(...scatterData.map(d => d.targetRoas || 0)), achievedRoas: Math.max(...scatterData.map(d => d.targetRoas || 0)) }
                      ]}
                      fill="none"
                      stroke="#94a3b8"
                      strokeDasharray="5 5"
                      strokeWidth={1}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-500">No campaigns with Target ROAS found</p>
                <p className="text-sm text-gray-400 mt-1">This view shows only campaigns with Target ROAS bidding strategy</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Performance List View */
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {processedData
            .sort((a, b) => b.achievedRoas - a.achievedRoas)
            .map((campaign) => (
              <div
                key={campaign.id}
                className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {campaign.campaignName}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      campaign.performance === 'exceeding' ? 'bg-green-100 text-green-800' :
                      campaign.performance === 'meeting' ? 'bg-blue-100 text-blue-800' :
                      campaign.performance === 'underperforming' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.performance === 'no-target' ? 'No Target' : 
                       campaign.performance === 'exceeding' ? 'Exceeding' :
                       campaign.performance === 'meeting' ? 'Meeting' : 'Under Target'}
                    </span>
                    {campaign.potentiallyReachLimited && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800 flex items-center space-x-1">
                        <Zap className="h-3 w-3" />
                        <span>Reach Limited</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 text-xs">
                    <div>
                      <span className="text-gray-600">ROAS: </span>
                      <span className="font-medium">{campaign.achievedRoas.toFixed(0)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Target: </span>
                      <span className="font-medium">
                        {campaign.targetRoas ? `${campaign.targetRoas.toFixed(0)}%` : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Conv: </span>
                      <span className="font-medium">{campaign.conversions.toFixed(1)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Strategy: </span>
                      <span className="font-medium">{campaign.biddingStrategyType}</span>
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        campaign.performance === 'exceeding' ? 'bg-green-500' :
                        campaign.performance === 'meeting' ? 'bg-blue-500' :
                        campaign.performance === 'underperforming' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`}
                      style={{ 
                        width: campaign.targetRoas ? 
                          `${Math.min((campaign.achievedRoas / campaign.targetRoas) * 100, 100)}%` :
                          `${Math.min(campaign.achievedRoas / 300 * 100, 100)}%`
                      }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    campaign.roasGap >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {campaign.targetRoas ? 
                      `${campaign.roasGap > 0 ? '+' : ''}${campaign.roasGap.toFixed(0)}%` : 
                      'No target'
                    }
                  </span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Legend and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Legend */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
              <span className="text-gray-600">Exceeding Target (≥110% of target ROAS)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
              <span className="text-gray-600">Meeting Target (90-110% of target ROAS)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
              <span className="text-gray-600">Under Target (&lt;90% of target ROAS)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white"></div>
              <span className="text-gray-600">No Target Set</span>
            </div>
          </div>
        </div>
        
        {/* Key Insights */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Key Insights</h4>
          <div className="text-xs text-gray-600 space-y-1">
            {insights && insights.campaignsWithTargets > 0 ? (
              <>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span><strong>{Math.round((insights.exceedingTarget / insights.campaignsWithTargets) * 100)}%</strong> of campaigns with targets are meeting or exceeding goals</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Portfolio ROAS is <strong>{insights.portfolioRoas.toFixed(0)}%</strong> vs avg target of <strong>{insights.avgTargetRoas.toFixed(0)}%</strong></span>
                </div>
                {insights.reachLimited > 0 ? (
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span><strong>{insights.reachLimited} campaigns</strong> may be reach-limited by high targets</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <span>•</span>
                    <span>No campaigns appear to be reach-limited by targets</span>
                  </div>
                )}
                {insights.targetGap > 0 ? (
                  <div className="flex items-center space-x-1 font-medium text-green-700 mt-2">
                    <TrendingUp className="h-3 w-3" />
                    <span>Portfolio outperforming targets by {insights.targetGap.toFixed(0)}%</span>
                  </div>
                ) : insights.targetGap < -10 ? (
                  <div className="flex items-center space-x-1 font-medium text-red-700 mt-2">
                    <TrendingDown className="h-3 w-3" />
                    <span>Portfolio underperforming targets by {Math.abs(insights.targetGap).toFixed(0)}%</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1 font-medium text-blue-700 mt-2">
                    <Target className="h-3 w-3" />
                    <span>Portfolio performance aligned with targets</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Most campaigns lack ROAS targets</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Consider implementing Target ROAS bidding strategies</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>•</span>
                  <span>Portfolio ROAS: <strong>{insights?.portfolioRoas.toFixed(0) || 0}%</strong></span>
                </div>
                <div className="flex items-center space-x-1 font-medium text-amber-700 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Set targets to optimize performance</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="mt-6 space-y-4">
        {/* Target Achievement Analysis */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <Target className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Target ROAS Achievement Analysis</h4>
              <div className="text-xs text-blue-700 mt-1 space-y-1">
                {insights && insights.campaignsWithTargets > 0 ? (
                  <>
                    <div>• <strong>{Math.round((insights.exceedingTarget / insights.campaignsWithTargets) * 100)}%</strong> of campaigns with targets are meeting or exceeding their ROAS goals</div>
                    <div>• <strong>{Math.round((insights.underperforming / insights.campaignsWithTargets) * 100)}%</strong> are underperforming and need optimization</div>
                    {insights.targetGap > 0 ? (
                      <div className="text-green-700">• Portfolio is <strong>+{insights.targetGap.toFixed(0)}%</strong> above average target - strong performance</div>
                    ) : (
                      <div className="text-red-700">• Portfolio is <strong>{insights.targetGap.toFixed(0)}%</strong> below average target - needs improvement</div>
                    )}
                  </>
                ) : (
                  <div>• Most campaigns lack ROAS targets - consider implementing Target ROAS bidding strategies</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reach Limitation Analysis */}
        {insights && insights.reachLimited > 0 && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Zap className="h-4 w-4 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Reach Limitation Alert</h4>
                <div className="text-xs text-red-700 mt-1 space-y-1">
                  <div>• <strong>{insights.reachLimited} campaigns</strong> may have reach limited by high ROAS targets (&gt;400%)</div>
                  <div>• High targets can restrict ad serving and limit impression volume</div>
                  <div>• Consider lowering targets slightly to increase reach while maintaining profitability</div>
                  <div>• Monitor impression share metrics to confirm reach limitations</div>
                </div>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default CampaignRoasPerformanceMatrix; 