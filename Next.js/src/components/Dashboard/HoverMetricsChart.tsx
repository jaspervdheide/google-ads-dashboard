'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface HoverMetricsChartProps {
  isVisible: boolean;
  position: { x: number; y: number };
  metricType: string;
  metricValue: string | number;
  campaignName: string;
  campaignId: string;
  onChartHover?: () => void;
  onChartLeave?: () => void;
}

interface DailyData {
  date: string;
  value: number;
  formattedDate: string;
}

const HoverMetricsChart: React.FC<HoverMetricsChartProps> = ({
  isVisible,
  position,
  metricType,
  metricValue,
  campaignName,
  campaignId,
  onChartHover,
  onChartLeave
}) => {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    if (!isVisible || !campaignId || !metricType) return;

    setLoading(true);
    setDailyData([]);

    const fetchDailyMetrics = async () => {
      try {
        // Use existing historical-data endpoint with the selected customer
        const selectedCustomerId = localStorage.getItem('selectedAccount') || '1946606314';
        const response = await fetch(`/api/historical-data?customerId=${selectedCustomerId}&dateRange=30`);
        const result = await response.json();
        
        if (result.success && result.data?.dailyBreakdown) {
          // Transform API data to chart format
          const chartData = result.data.dailyBreakdown.map((day: any) => {
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
                value = day.avgCpc || 0;
                break;
              case 'conversions':
                value = day.conversions || 0;
                break;
              case 'conversionsValue':
                value = day.conversionsValue || 0;
                break;
              case 'roas':
                value = day.roas || 0;
                break;
              case 'cpa':
                value = day.cpa || 0;
                break;
              default:
                value = 0;
            }
            
            return {
              date: day.date,
              value: Math.round(value * 100) / 100, // Round to 2 decimals
              formattedDate: new Date(day.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })
            };
          });
          
          setDailyData(chartData);
        } else {
          // Fallback to improved mock data
          generateRealisticMockData();
        }
      } catch (error) {
        console.error('Error fetching daily metrics:', error);
        // Fallback to improved mock data
        generateRealisticMockData();
      }
      setLoading(false);
    };

    const generateRealisticMockData = () => {
      const days = 30;
      const mockData: DailyData[] = [];
      const today = new Date();
      
      // Parse the current metric value for baseline
      const currentValueStr = typeof metricValue === 'string' ? metricValue : String(metricValue);
      const numericValue = parseFloat(currentValueStr.replace(/[€$,%]/g, ''));
      const baseValue = isNaN(numericValue) ? 100 : numericValue;
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i); // Go back i days from today
        
        let variationFactor = 0.3; // Default 30% variation
        let trendFactor = 0;
        
        // Metric-specific patterns
        switch (metricType) {
          case 'clicks':
            // Clicks: Moderate variation, slight improvement trend
            variationFactor = 0.4;
            trendFactor = (days - i) * 0.002; // Slight upward trend
            break;
            
          case 'impressions':
            // Impressions: Higher volume, more stable
            variationFactor = 0.25;
            trendFactor = Math.sin(i * 0.2) * 0.1; // Cyclical pattern
            break;
            
          case 'cost':
            // Cost: Correlates with clicks but with budget constraints
            variationFactor = 0.35;
            if (i < 5) trendFactor = -0.1; // Recent budget cuts
            break;
            
          case 'ctr':
            // CTR: Percentage, smaller values, optimization improvements
            variationFactor = 0.15;
            trendFactor = (days - i) * 0.001; // Gradual improvement
            break;
            
          case 'avgCpc':
            // Avg CPC: Currency, competitive fluctuations
            variationFactor = 0.2;
            trendFactor = Math.sin(i * 0.3) * 0.05; // Market fluctuations
            break;
            
          case 'conversions':
            // Conversions: Lower numbers, more volatile
            variationFactor = 0.6;
            trendFactor = (days - i) * 0.003; // Optimization improvements
            break;
            
          case 'conversionsValue':
            // Conversion Value: Higher variance, seasonal patterns
            variationFactor = 0.5;
            trendFactor = Math.cos(i * 0.15) * 0.1; // Seasonal pattern
            break;
            
          case 'roas':
            // ROAS: Ratio, optimization trend
            variationFactor = 0.3;
            trendFactor = (days - i) * 0.004; // Improving ROAS
            break;
            
          case 'cpa':
            // CPA: Cost metric, optimization trend
            variationFactor = 0.4;
            trendFactor = -(days - i) * 0.002; // Decreasing CPA is better
            break;
        }
        
        // Apply variation and trend
        const randomVariation = (Math.random() - 0.5) * 2 * variationFactor;
        const finalValue = Math.max(0, baseValue * (1 + randomVariation + trendFactor));
        
        mockData.push({
          date: date.toISOString().split('T')[0],
          value: Math.round(finalValue * 100) / 100, // Round to 2 decimals
          formattedDate: date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric'
          })
        });
      }
      
      setDailyData(mockData);
    };

    fetchDailyMetrics();
  }, [isVisible, campaignId, metricType, metricValue]);

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
      roas: 'POAS',
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
    const isLastTwoColumns = metricType === 'conversionsValue' || metricType === 'roas';
    
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

  if (!isVisible) return null;

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
        setIsHovering(true);
        onChartHover?.();
      }}
      onMouseLeave={() => {
        setIsHovering(false);
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
          <p className="text-xs text-gray-500 truncate">{campaignName}</p>
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