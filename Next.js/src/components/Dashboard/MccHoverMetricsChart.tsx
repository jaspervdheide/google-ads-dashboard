'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Globe } from 'lucide-react';
import { MccOverviewData } from '@/types/mcc';

interface MccHoverMetricsChartProps {
  isVisible: boolean;
  position: { x: number; y: number };
  metricType: string;
  metricValue: string | number;
  data: MccOverviewData | null;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

interface DailyMccData {
  date: string;
  value: number;
  formattedDate: string;
  accountsCount: number;
}

const MccHoverMetricsChart: React.FC<MccHoverMetricsChartProps> = ({
  isVisible,
  position,
  metricType,
  metricValue,
  data,
  onMouseEnter,
  onMouseLeave
}) => {
  const [dailyData, setDailyData] = useState<DailyMccData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isVisible || !metricType || !data?.accounts) return;

    setLoading(true);
    setDailyData([]);

    const fetchMccHistoricalMetrics = async () => {
      try {
        const accounts = data.accounts;
        // Use the same approach as HoverMetricsChart - hardcode 30 days for now
        const days = 30;
        
        console.log('MccHoverMetricsChart: Starting historical data fetch', { 
          metricType, 
          accountCount: accounts.length, 
          days,
          'data.dateRange': data.dateRange,
          isVisible,
          'data?.accounts': !!data?.accounts
        });
        
        // For now, use the selected customer ID to get historical data
        // This is a simplified approach since the API doesn't support cross-account queries
        const selectedCustomerId = localStorage.getItem('selectedAccount') || '1946606314';
        
        const url = `/api/historical-data?customerId=${selectedCustomerId}&dateRange=${days}`;
        console.log(`Fetching MCC historical data for customer ${selectedCustomerId}:`, url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
          console.warn(`Failed to fetch MCC historical data:`, response.status, response.statusText);
          setDailyData([]);
          return;
        }
        
        const result = await response.json();
        console.log(`MCC historical data result:`, result.success, result.data?.length || 0, 'days');
        
        if (!result.success || !result.data) {
          console.warn(`No MCC historical data returned:`, result.message);
          setDailyData([]);
          return;
        }
        
        const historicalData = Array.isArray(result.data) ? result.data : [];
        console.log('Raw historical data received:', historicalData.length, 'days');
        console.log('Sample raw data:', historicalData.slice(0, 2));
        
        // Transform the account-level historical data directly to chart format
        // The API already returns aggregated data for the selected account
        const chartData: DailyMccData[] = historicalData
          .map((day: any) => {
            // Calculate derived metrics from the raw data
            const ctr = day.ctr || (day.impressions > 0 ? (day.clicks / day.impressions) * 100 : 0);
            const avgCpc = day.avgCpc || day.average_cpc || (day.clicks > 0 ? day.cost / day.clicks : 0);
            const roas = day.roas || (day.cost > 0 ? day.conversionsValue / day.cost : 0);
            const cpa = day.cpa || (day.conversions > 0 ? day.cost / day.conversions : 0);
            
            // Get the value for the specific metric type
            let value = 0;
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
              case 'conversions':
                value = day.conversions || 0;
                break;
              case 'conversionsValue':
                value = day.conversionsValue || day.conversions_value || 0;
                break;
              case 'ctr':
                value = ctr;
                break;
              case 'avgCpc':
                value = avgCpc;
                break;
              case 'roas':
                value = roas;
                break;
              case 'cpa':
                value = cpa;
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
              }),
              accountsCount: accounts.length
            };
          })
          .filter((item: DailyMccData) => item.date) // Filter out any items without dates
          .sort((a: DailyMccData, b: DailyMccData) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date
        
        console.log('Chart data prepared:', chartData.length, 'days for metric:', metricType);
        console.log('Sample chart data:', chartData.slice(0, 3));
        console.log('Setting dailyData with length:', chartData.length);
        setDailyData(chartData);
      } catch (error) {
        console.error('Error fetching MCC historical metrics:', error);
        setDailyData([]);
      }
      setLoading(false);
    };

    fetchMccHistoricalMetrics();
  }, [isVisible, metricType, metricValue, data]);

  const formatMetricValue = (value: number, metric: string): string => {
    switch (metric) {
      case 'cost':
      case 'avgCpc':
      case 'conversionsValue':
      case 'cpa':
        return `€${value.toFixed(2)}`;
      case 'ctr':
      case 'conversionRate':
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
      clicks: 'Total Clicks',
      impressions: 'Total Impressions',
      cost: 'Total Cost',
      ctr: 'Average CTR',
      avgCpc: 'Average CPC',
      conversions: 'Total Conversions',
      conversionsValue: 'Total Conv. Value',
      cpa: 'Average CPA',
      roas: 'Average ROAS',
      conversionRate: 'Average Conv. Rate'
    };
    return labels[metric] || `MCC ${metric}`;
  };

  const getTrendData = () => {
    if (dailyData.length < 2) return { trend: 'neutral', change: 0 };
    
    const recent = dailyData.slice(-7).reduce((sum, d) => sum + d.value, 0) / 7;
    const previous = dailyData.slice(-14, -7).reduce((sum, d) => sum + d.value, 0) / 7;
    
    if (previous === 0) return { trend: 'neutral', change: 0 };
    
    const change = ((recent - previous) / previous) * 100;
    return {
      trend: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral',
      change: Math.abs(change)
    };
  };

  const getTrendColor = (): string => {
    const { trend } = getTrendData();
    // For most metrics, up is good. For cost and CPA, down is good
    const isUpGood = !['cost', 'cpa', 'avgCpc'].includes(metricType);
    
    if (trend === 'up') return isUpGood ? 'text-green-600' : 'text-red-600';
    if (trend === 'down') return isUpGood ? 'text-red-600' : 'text-green-600';
    return 'text-gray-600';
  };

  const getTrendIcon = () => {
    const { trend } = getTrendData();
    const className = `w-4 h-4 ${getTrendColor()}`;
    
    if (trend === 'up') return <TrendingUp className={className} />;
    if (trend === 'down') return <TrendingDown className={className} />;
    return null;
  };

  const getChartPosition = () => {
    const chartWidth = 320;
    const chartHeight = 280;
    const buffer = 20;
    
    let x = position.x + 15;
    let y = position.y - chartHeight - 10;
    
    // Adjust if chart would go off screen
    if (x + chartWidth > window.innerWidth) {
      x = position.x - chartWidth - 15;
    }
    if (y < buffer) {
      y = position.y + 25;
    }
    if (y + chartHeight > window.innerHeight) {
      y = window.innerHeight - chartHeight - buffer;
    }
    
    return { x: Math.max(buffer, x), y: Math.max(buffer, y) };
  };

  if (!isVisible) return null;

  const chartPosition = getChartPosition();
  const { trend, change } = getTrendData();

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 pointer-events-auto"
      style={{
        left: `${chartPosition.x}px`,
        top: `${chartPosition.y}px`,
        width: '320px',
        height: '280px'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center space-x-2 mb-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <span className="text-sm font-medium text-gray-700">MCC Overview</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {formatMainValue(metricValue, metricType)}
            </div>
            <div className="text-xs text-gray-500">
              {getMetricLabel(metricType)}
            </div>
          </div>
          {trend !== 'neutral' && (
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        <div className="h-[180px]">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600"></div>
            </div>
          ) : dailyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-sm mb-2">No historical data available</div>
              <div className="w-full h-16 bg-gray-100 rounded flex items-center justify-center">
                <div className="text-xs text-gray-500">
                  30-day trend
                </div>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <XAxis 
                  dataKey="formattedDate" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                  interval="preserveStartEnd"
                />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    return (
                      <div className="bg-gray-900 text-white px-3 py-2 rounded shadow-lg text-xs">
                        <div className="font-medium">{label}</div>
                        <div className="text-gray-300">
                          {formatMetricValue(payload[0].value as number, metricType)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0d9488"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: '#0d9488' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
          <span>Start</span>
          <span>30-day trend</span>
          <span>End</span>
        </div>
      </div>
    </div>
  );
};

export default MccHoverMetricsChart;
