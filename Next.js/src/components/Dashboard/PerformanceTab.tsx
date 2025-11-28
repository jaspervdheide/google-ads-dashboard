'use client';

import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CampaignData } from '../../types';
import { formatCurrency, formatNumber, formatPercentage } from '../../utils';
import { metricColors } from '@/lib/chart-design-tokens';
import { cn } from '@/lib/utils';

interface DateRange {
  id: string;
  label: string;
  startDate?: Date;
  endDate?: Date;
}

interface HistoricalDataPoint {
  date: string;
  clicks?: number;
  impressions?: number;
  conversions?: number;
  cost?: number;
  ctr?: number;
  avgCpc?: number;
  cpa?: number;
  roas?: number;
}

interface HistoricalData {
  data: HistoricalDataPoint[];
}

interface PerformanceTabProps {
  campaignData: CampaignData | null;
  historicalData: HistoricalData | null;
  dateRange: DateRange | null;
  loading: boolean;
}

// Goal targets for KPI cards
const GOALS = {
  revenue: 100000,
  targetRoas: 3.5,
  targetCpa: 15.0,
};

// Available metrics for selection
const AVAILABLE_METRICS = [
  { id: 'clicks', label: 'Clicks' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'ctr', label: 'CTR' },
  { id: 'avgCpc', label: 'CPC' },
  { id: 'cost', label: 'Cost' },
  { id: 'conversions', label: 'Conversions' },
  { id: 'roas', label: 'ROAS' },
  { id: 'cpa', label: 'CPA' },
];

// Get metric color from design tokens
const getMetricColor = (metric: string): string => {
  const colorMap: Record<string, string> = {
    clicks: metricColors.clicks,
    impressions: metricColors.impressions,
    ctr: metricColors.ctr,
    avgCpc: metricColors.cpc,
    cpc: metricColors.cpc,
    cost: metricColors.cost,
    conversions: metricColors.conversions,
    conversionsValue: metricColors.conversionsValue,
    conversionRate: metricColors.conversionRate,
    cpa: metricColors.cpa,
    roas: metricColors.roas,
  };
  return colorMap[metric] || metricColors.clicks;
};

// Format metric value for display
const formatMetricValue = (metric: string, value: number): string => {
  if (metric === 'cost' || metric === 'avgCpc' || metric === 'cpc' || metric === 'cpa') {
    return formatCurrency(value);
  }
  if (metric === 'ctr' || metric === 'conversionRate') {
    return formatPercentage(value);
  }
  if (metric === 'roas') {
    return `${value.toFixed(2)}x`;
  }
  return formatNumber(value);
};

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  campaignData,
  historicalData,
  dateRange,
  loading,
}) => {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['conversions', 'cost']);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');

  // Toggle metric selection (max 3)
  const toggleMetric = (metric: string) => {
    if (selectedMetrics.includes(metric)) {
      setSelectedMetrics((prev) => prev.filter((m) => m !== metric));
    } else if (selectedMetrics.length < 3) {
      setSelectedMetrics((prev) => [...prev, metric]);
    }
  };

  // Transform historical data for chart
  const chartData = useMemo(() => {
    if (!historicalData?.data || historicalData.data.length === 0) {
      return [];
    }

    return historicalData.data.map((point) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      clicks: point.clicks || 0,
      impressions: point.impressions || 0,
      conversions: point.conversions || 0,
      cost: point.cost || 0,
      ctr: point.ctr || 0,
      avgCpc: point.avgCpc || 0,
      cpa: point.cpa || 0,
      roas: point.roas || 0,
    }));
  }, [historicalData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-24 bg-muted rounded-lg" />
            </div>
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="animate-pulse">
          <div className="h-[500px] bg-muted rounded-lg" />
        </div>
      </div>
    );
  }

  if (!campaignData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No campaign data available</p>
      </div>
    );
  }

  const { totals } = campaignData;

  // Calculate KPI metrics and trends
  const revenueProgress = (totals.conversionsValue / GOALS.revenue) * 100;
  const roasProgress = (totals.roas / GOALS.targetRoas) * 100;
  const cpaProgress = totals.cpa > 0 ? (GOALS.targetCpa / totals.cpa) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards - Compact */}
      <div className="grid grid-cols-3 gap-4">
        {/* Monthly Revenue */}
        <Card className="p-4 border-border">
          <div className="text-xs text-muted-foreground mb-1">Monthly Revenue</div>
          <div className="text-2xl font-mono font-bold">{formatCurrency(totals.conversionsValue)}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {revenueProgress >= 100 ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+{(revenueProgress - 100).toFixed(0)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">{(100 - revenueProgress).toFixed(0)}% below</span>
              </>
            )}
          </div>
        </Card>

        {/* Target ROAS */}
        <Card className="p-4 border-border">
          <div className="text-xs text-muted-foreground mb-1">Target ROAS</div>
          <div className="text-2xl font-mono font-bold">{totals.roas.toFixed(2)}x</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {totals.roas >= GOALS.targetRoas ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">+{roasProgress.toFixed(0)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">-{(100 - roasProgress).toFixed(0)}%</span>
              </>
            )}
          </div>
        </Card>

        {/* Target CPA */}
        <Card className="p-4 border-border">
          <div className="text-xs text-muted-foreground mb-1">Target CPA</div>
          <div className="text-2xl font-mono font-bold">{formatCurrency(totals.cpa)}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {totals.cpa <= GOALS.targetCpa ? (
              <>
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-green-600">{cpaProgress.toFixed(0)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="h-3 w-3 text-red-600" />
                <span className="text-red-600">+{((totals.cpa / GOALS.targetCpa - 1) * 100).toFixed(0)}%</span>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Primary Chart Section */}
      <Card className="p-6 border-border">
        {/* Metric Selector Pills */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {AVAILABLE_METRICS.map((metric) => (
            <button
              key={metric.id}
              onClick={() => toggleMetric(metric.id)}
              disabled={!selectedMetrics.includes(metric.id) && selectedMetrics.length >= 3}
              className={cn(
                'h-8 px-3 text-xs rounded-full transition-all font-medium',
                selectedMetrics.includes(metric.id)
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-input text-muted-foreground hover:border-muted-foreground hover:text-foreground',
                !selectedMetrics.includes(metric.id) && selectedMetrics.length >= 3 && 'opacity-40 cursor-not-allowed'
              )}
            >
              {metric.label}
            </button>
          ))}
        </div>

        {/* Chart */}
        {chartData.length > 0 ? (
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => [formatMetricValue(name, value), name.toUpperCase()]}
                  />
                  {selectedMetrics.map((metric) => (
                    <Line
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      stroke={getMetricColor(metric)}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => [formatMetricValue(name, value), name.toUpperCase()]}
                  />
                  {selectedMetrics.map((metric) => (
                    <Area
                      key={metric}
                      type="monotone"
                      dataKey={metric}
                      stroke={getMetricColor(metric)}
                      fill={getMetricColor(metric)}
                      fillOpacity={0.15}
                      strokeWidth={1.5}
                    />
                  ))}
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    width={60}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: string) => [formatMetricValue(name, value), name.toUpperCase()]}
                  />
                  {selectedMetrics.map((metric) => (
                    <Bar
                      key={metric}
                      dataKey={metric}
                      fill={getMetricColor(metric)}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={40}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">No historical data available</p>
          </div>
        )}

        {/* Chart Type Toggle */}
        <div className="flex gap-1 mt-4 justify-center">
          {(['line', 'area', 'bar'] as const).map((type) => (
            <Button
              key={type}
              variant="ghost"
              size="sm"
              onClick={() => setChartType(type)}
              className={cn(chartType === type && 'bg-muted')}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default PerformanceTab;
