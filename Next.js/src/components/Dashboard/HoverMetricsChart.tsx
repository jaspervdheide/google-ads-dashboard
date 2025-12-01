'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, Calendar, Activity } from 'lucide-react';

interface HoverMetricsChartProps {
  isVisible: boolean;
  position: { x: number; y: number };
  metricType: string;
  metricValue: string | number;
  entityName: string;
  entityId: string;
  entityType?: 'campaign' | 'adGroup' | 'keyword' | 'product';
  onChartHover?: () => void;
  onChartLeave?: () => void;
}

interface DailyData {
  date: string;
  value: number;
  formattedDate: string;
}

// Helper function to validate if an ID is a valid campaign/ad group/keyword ID
const isValidMetricsId = (id: string): boolean => {
  if (id.includes('_') && /[a-z]/.test(id) && /[A-Z0-9]/.test(id)) {
    return false;
  }
  if (/^\d+$/.test(id) || /^\d/.test(id)) {
    return true;
  }
  return false;
};

// Sparkline component
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ 
  data, 
  color, 
  height = 32 
}) => {
  if (data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const width = 120;
  const padding = 2;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;
  
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return `${x},${y}`;
  }).join(' ');
  
  // Create area path
  const areaPath = `M ${padding},${height - padding} L ${points} L ${width - padding},${height - padding} Z`;
  
  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Area fill */}
      <path
        d={areaPath}
        fill={color}
        fillOpacity={0.1}
      />
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={padding + effectiveHeight - ((data[data.length - 1] - min) / range) * effectiveHeight}
          r={3}
          fill={color}
        />
      )}
    </svg>
  );
};

const HoverMetricsChart: React.FC<HoverMetricsChartProps> = ({
  isVisible,
  position,
  metricType,
  metricValue,
  entityName,
  entityId,
  entityType = 'campaign',
  onChartHover,
  onChartLeave
}) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);

  const shouldShowChart = isValidMetricsId(entityId);

  useEffect(() => {
    if (!isVisible || !entityId || !metricType || !shouldShowChart) return;

    setLoading(true);
    setDailyData([]);

    const fetchDailyMetrics = async () => {
      try {
        const selectedCustomerId = localStorage.getItem('selectedAccount') || '1946606314';
        
        let apiUrl = `/api/historical-data?customerId=${selectedCustomerId}&dateRange=30`;
        if (entityType === 'campaign') {
          apiUrl += `&campaignId=${entityId}`;
        } else if (entityType === 'adGroup') {
          apiUrl += `&adGroupId=${entityId}`;
        } else if (entityType === 'keyword') {
          apiUrl += `&keywordId=${entityId}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          const historicalData = Array.isArray(result.data) ? result.data : [];
          
          const chartData = historicalData.map((day: any) => {
            let value = 0;
            
            switch (metricType) {
              case 'clicks': value = day.clicks || 0; break;
              case 'impressions': value = day.impressions || 0; break;
              case 'cost': value = day.cost || 0; break;
              case 'ctr': value = day.ctr || 0; break;
              case 'avgCpc': value = day.avgCpc || day.average_cpc || 0; break;
              case 'conversions': value = day.conversions || 0; break;
              case 'conversionsValue': value = day.conversionsValue || day.conversions_value || 0; break;
              case 'roas': value = day.roas || 0; break;
              case 'cpa': value = day.cpa || 0; break;
              case 'poas': value = day.poas || 0; break;
              default: value = 0;
            }
            
            return {
              date: day.date,
              value: Math.round(value * 100) / 100,
              formattedDate: day.dateFormatted || new Date(day.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            };
          });
          
          setDailyData(chartData);
        } else {
          setDailyData([]);
        }
      } catch (error) {
        console.error(`Error fetching daily metrics for ${entityType}:`, entityId, error);
        setDailyData([]);
      }
      setLoading(false);
    };

    fetchDailyMetrics();
  }, [isVisible, entityId, metricType, metricValue, shouldShowChart, entityType]);

  // Calculate insights
  const insights = useMemo(() => {
    if (dailyData.length < 2) {
      return {
        percentChange: 0,
        dailyAvg: 0,
        trend: 'neutral' as const,
        trendLabel: 'Stable',
        firstHalfAvg: 0,
        secondHalfAvg: 0
      };
    }

    const total = dailyData.reduce((sum, d) => sum + d.value, 0);
    const dailyAvg = total / dailyData.length;

    // Compare first half vs second half for trend
    const midpoint = Math.floor(dailyData.length / 2);
    const firstHalf = dailyData.slice(0, midpoint);
    const secondHalf = dailyData.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.value, 0) / secondHalf.length;
    
    const percentChange = firstHalfAvg > 0 
      ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 
      : 0;

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    let trendLabel = 'Stable';
    
    if (percentChange > 5) {
      trend = 'up';
      trendLabel = 'Trending up';
    } else if (percentChange < -5) {
      trend = 'down';
      trendLabel = 'Trending down';
    }

    return {
      percentChange,
      dailyAvg,
      trend,
      trendLabel,
      firstHalfAvg,
      secondHalfAvg
    };
  }, [dailyData]);

  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'cost':
      case 'avgCpc':
      case 'conversionsValue':
      case 'cpa':
        return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'ctr':
      case 'conversionRate':
        return `${value.toFixed(2)}%`;
      case 'roas':
        return `${value.toFixed(2)}x`;
      case 'poas':
        return `${value.toFixed(1)}%`;
      case 'clicks':
      case 'impressions':
      case 'conversions':
        return Math.round(value).toLocaleString('de-DE');
      default:
        return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  };

  const formatMainValue = (value: string | number, metric: string): string => {
    if (typeof value === 'string') {
      const numericValue = parseFloat(value.replace(/[€$,%]/g, ''));
      if (!isNaN(numericValue)) {
        return formatMetricValue(numericValue, metric);
      }
      return value;
    }
    return formatMetricValue(value, metric);
  };

  const getMetricLabel = (metric: string): string => {
    const labels: { [key: string]: string } = {
      clicks: 'Clicks',
      impressions: 'Impressions',
      cost: 'Cost',
      ctr: 'CTR',
      avgCpc: 'Avg. CPC',
      conversions: 'Conversions',
      conversionsValue: 'Conv. Value',
      cpa: 'CPA',
      roas: 'ROAS',
      poas: 'POAS',
      conversionRate: 'Conv. Rate'
    };
    return labels[metric] || metric;
  };

  const getTrendColor = (): string => {
    if (insights.trend === 'up') return '#10b981';
    if (insights.trend === 'down') return '#ef4444';
    return '#6b7280';
  };

  const getTrendIcon = () => {
    if (insights.trend === 'up') return <TrendingUp className="h-3.5 w-3.5" />;
    if (insights.trend === 'down') return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  // Calculate position
  const getChartPosition = () => {
    const chartWidth = 280;
    const isLastTwoColumns = metricType === 'conversionsValue' || metricType === 'roas' || metricType === 'poas';
    
    if (isLastTwoColumns) {
      return { left: position.x - chartWidth - 10, top: position.y - 10 };
    } else {
      return { left: position.x + 10, top: position.y - 10 };
    }
  };

  if (!isVisible || !shouldShowChart) return null;

  const chartPosition = getChartPosition();
  const sparklineData = dailyData.map(d => d.value);

  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-xl overflow-hidden"
      style={{
        left: chartPosition.left,
        top: chartPosition.top,
        width: '280px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.1)',
      }}
      onMouseEnter={onChartHover}
      onMouseLeave={onChartLeave}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{getMetricLabel(metricType)}</p>
        <p className="text-sm text-gray-700 truncate mt-0.5">{entityName}</p>
      </div>

      {/* Main Value + Change */}
      <div className="px-4 py-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-semibold text-gray-900">
              {formatMainValue(metricValue, metricType)}
            </p>
          </div>
          
          {/* Change indicator */}
          {!loading && dailyData.length >= 2 && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium ${
              insights.trend === 'up' ? 'bg-green-50 text-green-700' :
              insights.trend === 'down' ? 'bg-red-50 text-red-700' :
              'bg-gray-50 text-gray-600'
            }`}>
              {getTrendIcon()}
              <span>{insights.percentChange >= 0 ? '+' : ''}{insights.percentChange.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        <div className="mt-4 flex items-center justify-between">
          {loading ? (
            <div className="flex items-center justify-center w-full py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600"></div>
            </div>
          ) : dailyData.length === 0 ? (
            <div className="text-xs text-gray-400 w-full text-center py-2">
              No data available
            </div>
          ) : (
            <>
              <Sparkline data={sparklineData} color={getTrendColor()} height={36} />
              <div className="ml-3 text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">vs first half</p>
                <p className={`text-xs font-medium ${
                  insights.trend === 'up' ? 'text-green-600' :
                  insights.trend === 'down' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {insights.trendLabel}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer stats */}
      {!loading && dailyData.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5 text-gray-500">
              <Activity className="h-3 w-3" />
              <span>{formatMetricValue(insights.dailyAvg, metricType)}/day avg</span>
            </div>
            <div className="flex items-center space-x-1.5 text-gray-400">
              <Calendar className="h-3 w-3" />
              <span>Last 30 days</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HoverMetricsChart;
