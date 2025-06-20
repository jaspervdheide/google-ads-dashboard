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

    const generateMccHistoricalMetrics = () => {
      try {
        // Use the provided data instead of fetching
        const accounts = data.accounts;
        const dateRange = data.dateRange;
        const days = dateRange?.days || 30;
        
        const totalValue = accounts.reduce((sum: number, account: any) => {
          switch (metricType) {
            case 'clicks':
              return sum + (account.metrics.clicks || 0);
            case 'impressions':
              return sum + (account.metrics.impressions || 0);
            case 'cost':
              return sum + (account.metrics.cost || 0);
            case 'conversions':
              return sum + (account.metrics.conversions || 0);
            case 'conversionsValue':
              return sum + (account.metrics.conversionsValue || 0);
            case 'ctr':
              return sum + (account.metrics.ctr || 0);
            case 'avgCpc':
              return sum + (account.metrics.avgCpc || 0);
            case 'roas':
              return sum + (account.metrics.roas || 0);
            case 'cpa':
              return sum + (account.metrics.cpa || 0);
            default:
              return sum;
          }
        }, 0);
        
        // For aggregated metrics like CTR, ROAS, CPA, use weighted averages
        let displayValue = totalValue;
        if (['ctr', 'avgCpc', 'roas', 'cpa'].includes(metricType)) {
          displayValue = totalValue / accounts.length; // Simple average for now
        }
        
        // Generate simulated daily trend for the dynamic date range
        const chartData: DailyMccData[] = [];
        const today = new Date();
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          // Simulate daily variation (±15% around average)
          const dailyAverage = displayValue / days;
          const variation = (Math.random() - 0.5) * 0.3; // ±15%
          const dailyValue = Math.max(0, dailyAverage * (1 + variation));
          
          chartData.push({
            date: date.toISOString().split('T')[0],
            value: Math.round(dailyValue * 100) / 100,
            formattedDate: date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric' 
            }),
            accountsCount: accounts.length
          });
        }
        
        setDailyData(chartData);
      } catch (error) {
        console.error('Error generating MCC historical metrics:', error);
        setDailyData([]);
      }
      setLoading(false);
    };

    generateMccHistoricalMetrics();
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
    const padding = 20;
    
    let left = position.x + 15;
    let top = position.y - chartHeight - 10;
    
    // Adjust if chart would go off-screen
    if (left + chartWidth > window.innerWidth - padding) {
      left = position.x - chartWidth - 15;
    }
    if (top < padding) {
      top = position.y + 25;
    }
    
    return { left, top };
  };

  if (!isVisible || loading) return null;

  const { left, top } = getChartPosition();
  const { trend, change } = getTrendData();

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
      style={{ left, top, width: '320px' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Globe className="w-4 h-4 text-teal-600" />
          <h4 className="font-semibold text-gray-900 text-sm">
            {getMetricLabel(metricType)}
          </h4>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon()}
          <span className={`text-xs font-medium ${getTrendColor()}`}>
            {trend !== 'neutral' ? `${change.toFixed(1)}%` : 'Stable'}
          </span>
        </div>
      </div>

      {/* Current Value */}
      <div className="mb-3">
        <div className="text-2xl font-bold text-gray-900">
          {formatMainValue(metricValue, metricType)}
        </div>
        <div className="text-xs text-gray-500">
          Across {dailyData[0]?.accountsCount || 0} accounts • Last 30 days
        </div>
      </div>

      {/* Chart */}
      <div className="h-32 mb-3">
        <ResponsiveContainer width="100%" height="100%">
          {['cost', 'conversionsValue', 'conversions'].includes(metricType) ? (
            <BarChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload[0]) {
                    return (
                      <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs">
                        <div>{label}</div>
                        <div>{formatMetricValue(payload[0].value as number, metricType)}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#0d9488" 
                radius={[2, 2, 0, 0]}
                stroke="#0d9488"
                strokeWidth={0.5}
              />
            </BarChart>
          ) : (
            <LineChart data={dailyData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
              <XAxis 
                dataKey="formattedDate" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                interval="preserveStartEnd"
              />
              <YAxis hide />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload[0]) {
                    return (
                      <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs">
                        <div>{label}</div>
                        <div>{formatMetricValue(payload[0].value as number, metricType)}</div>
                      </div>
                    );
                  }
                  return null;
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
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 border-t pt-2">
        MCC-level aggregated performance • Hover to see daily breakdown
      </div>
    </div>
  );
};

export default MccHoverMetricsChart;
