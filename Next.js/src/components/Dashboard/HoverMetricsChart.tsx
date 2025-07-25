'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

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
  // Product IDs typically contain underscores and mixed alphanumeric characters
  // Campaign IDs are typically numeric strings
  // Ad group IDs are typically numeric strings  
  // Keyword IDs are typically numeric strings
  
  // If ID contains underscore and mixed case, it's likely a product ID
  if (id.includes('_') && /[a-z]/.test(id) && /[A-Z0-9]/.test(id)) {
    return false;
  }
  
  // If ID is purely numeric or starts with a number, it's likely a valid campaign/ad group/keyword ID
  if (/^\d+$/.test(id) || /^\d/.test(id)) {
    return true;
  }
  
  // For safety, reject anything that looks like a product item ID pattern
  return false;
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

  // Don't show chart for invalid IDs (like product IDs)
  const shouldShowChart = isValidMetricsId(entityId);

  useEffect(() => {
    if (!isVisible || !entityId || !metricType || !shouldShowChart) return;

    setLoading(true);
    setDailyData([]);

    const fetchDailyMetrics = async () => {
      try {
        // Get the selected customer ID from localStorage
        const selectedCustomerId = localStorage.getItem('selectedAccount') || '1946606314';
        
        // Use the extended historical-data API with entity-specific filtering
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
          // Handle the historical data array format
          const historicalData = Array.isArray(result.data) ? result.data : [];
          
          // Transform API data to chart format
          const chartData = historicalData.map((day: any) => {
            let value = 0;
            
            // Map metric types to API response fields
            switch (metricType) {
              case 'clicks':
                value = day.clicks || 0;
                break;
              case 'impressions':
                value = day.impressions || 0;
                break;
              case 'cost':
                value = day.cost || 0;
                break;
              case 'ctr':
                value = day.ctr || 0;
                break;
              case 'avgCpc':
                value = day.avgCpc || day.average_cpc || 0;
                break;
              case 'conversions':
                value = day.conversions || 0;
                break;
              case 'conversionsValue':
                value = day.conversionsValue || day.conversions_value || 0;
                break;
              case 'roas':
                value = day.roas || 0;
                break;
              case 'cpa':
                value = day.cpa || 0;
                break;
              case 'poas':
                value = day.poas || 0;
                break;
              default:
                value = 0;
            }
            
            return {
              date: day.date,
              value: Math.round(value * 100) / 100, // Round to 2 decimals
              formattedDate: day.dateFormatted || new Date(day.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            };
          });
          
          setDailyData(chartData);
        } else {
          // No data available - set empty array
          setDailyData([]);
        }
      } catch (error) {
        console.error(`Error fetching daily metrics for ${entityType}:`, entityId, error);
        // No data available - set empty array
        setDailyData([]);
      }
      setLoading(false);
    };

    fetchDailyMetrics();
  }, [isVisible, entityId, metricType, metricValue, shouldShowChart, entityType]);

  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'cost':
      case 'avgCpc':
      case 'conversionsValue':
      case 'cpa':
        return `€${value.toFixed(2)}`;
      case 'ctr':
      case 'conversionRate':
        // CTR is already formatted as percentage, don't multiply by 100 again
        return `${value.toFixed(2)}%`;
      case 'roas':
        return `${value.toFixed(2)}x`;
      case 'poas':
        return `${value.toFixed(1)}%`;
      case 'clicks':
      case 'impressions':
      case 'conversions':
        return Math.round(value).toLocaleString();
      default:
        return value.toFixed(2);
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
    if (dailyData.length < 2) return '#6b7280';
    
    const recent = dailyData.slice(-7).reduce((sum, day) => sum + day.value, 0) / 7;
    const previous = dailyData.slice(-14, -7).reduce((sum, day) => sum + day.value, 0) / 7;
    
    return recent > previous ? '#10b981' : recent < previous ? '#ef4444' : '#6b7280';
  };

  const getTrendIcon = () => {
    if (dailyData.length < 2) return null;
    
    const recent = dailyData.slice(-7).reduce((sum, day) => sum + day.value, 0) / 7;
    const previous = dailyData.slice(-14, -7).reduce((sum, day) => sum + day.value, 0) / 7;
    
    if (recent > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (recent < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return null;
  };

  // Calculate position - show on left for last two columns to prevent off-screen
  const getChartPosition = () => {
    const chartWidth = 320;
    const isLastTwoColumns = metricType === 'conversionsValue' || metricType === 'roas' || metricType === 'poas';
    
    if (isLastTwoColumns) {
      // Position to the left of the cursor
      return {
        left: position.x - chartWidth - 10,
        top: position.y - 10
      };
    } else {
      // Default position to the right
      return {
        left: position.x + 10,
        top: position.y - 10
      };
    }
  };

  if (!isVisible || !shouldShowChart) return null;

  const chartPosition = getChartPosition();

  return (
    <div
      className="fixed z-50 bg-white/95 border border-gray-100 rounded-xl"
      style={{
        left: chartPosition.left,
        top: chartPosition.top,
        width: '320px',
        height: '240px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        backdropFilter: 'blur(10px)',
        borderColor: '#f1f5f9'
      }}
      onMouseEnter={() => {
        onChartHover?.();
      }}
      onMouseLeave={() => {
        onChartLeave?.();
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <h4 className="text-xs font-medium text-slate-500">{getMetricLabel(metricType)}</h4>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col" style={{ height: 'calc(100% - 45px)' }}>
        {/* Campaign name and current value */}
        <div className="mb-2">
                      <p className="text-xs text-gray-500 truncate">{entityName}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">
            {formatMainValue(metricValue, metricType)}
          </p>
        </div>

        {/* Chart - centered and taking available space */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div className="h-28 -mx-1">
            {loading ? (
              <div className="flex items-center justify-center h-full mx-1">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : dailyData.length === 0 ? (
              <div className="flex items-center justify-center h-full mx-1 text-xs text-gray-400">
                No historical data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={dailyData}
                  margin={{ top: 5, right: 0, left: 0, bottom: -10 }}
                  barCategoryGap="0%"
                  maxBarSize={8}
                >
                  <defs>
                    <linearGradient
                      id={`bar-${metricType}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor={getTrendColor()} stopOpacity={0.9} />
                      <stop offset="100%" stopColor={getTrendColor()} stopOpacity={0.60} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                    padding={{ left: 0, right: 0 }}
                  />
                  <YAxis 
                    tick={false}
                    axisLine={false}
                    tickLine={false}
                    domain={[0, 'dataMax']}
                    width={0}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatMetricValue(value, metricType), getMetricLabel(metricType)]}
                    labelFormatter={(label) => `${label}`}
                    contentStyle={{
                      backgroundColor: 'white/95',
                      border: '1px solid #f1f5f9',
                      borderRadius: '8px',
                      fontSize: '11px',
                      backdropFilter: 'blur(10px)'
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill={`url(#bar-${metricType})`}
                    radius={[0.5, 0.5, 0, 0]}
                    stroke="none"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Date range and trend label */}
        <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
          <span>{dailyData.length > 0 ? dailyData[0]?.formattedDate : 'Start'}</span>
          <span className="text-center">30-day trend</span>
          <span>{dailyData.length > 0 ? dailyData[dailyData.length - 1]?.formattedDate : 'End'}</span>
        </div>
      </div>
    </div>
  );
};

export default HoverMetricsChart; 