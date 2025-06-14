import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Area, AreaChart } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';
import { CampaignData } from '../../types';
import { 
  generateMultiMetricChartData,
  getKpiChartColor,
  getYAxisOrientation,
  needsDualYAxis,
  getLeftAxisDomain,
  getRightAxisDomain,
  formatLeftYAxis,
  formatRightYAxis,
  formatKPIValue,
  formatDateRangeDisplay
} from '../../utils';

interface ChartsProps {
  campaignData: CampaignData | null;
  historicalData: any;
  historicalLoading: boolean;
  selectedChartMetrics: string[];
  chartType: 'line' | 'bar';
  setChartType: (type: 'line' | 'bar') => void;
  dateGranularity: 'daily' | 'weekly' | 'monthly';
  setDateGranularity: (granularity: 'daily' | 'weekly' | 'monthly') => void;
  setManualGranularityOverride: (override: boolean) => void;
  selectedDateRange: any;
}

const Charts: React.FC<ChartsProps> = ({
  campaignData,
  historicalData,
  historicalLoading,
  selectedChartMetrics,
  chartType,
  setChartType,
  dateGranularity,
  setDateGranularity,
  setManualGranularityOverride,
  selectedDateRange
}) => {
  // Function to map metric IDs to bar gradient IDs
  const getKpiGradientId = (metricId: string): string => {
    return `Gradient${metricId.charAt(0).toUpperCase()}${metricId.slice(1)}`;
  };

  // Function to format metric names for display
  const formatMetricName = (metricId: string): string => {
    const metricNameMap: { [key: string]: string } = {
      'clicks': 'Clicks',
      'impressions': 'Impressions',
      'conversions': 'Conversions',
      'conversionsValue': 'Conversion Value',
      'conversionRate': 'Conversion Rate',
      'cost': 'Cost',
      'ctr': 'CTR',
      'avgCpc': 'CPC',
      'cpc': 'CPC',
      'cpm': 'CPM',
      'cpa': 'CPA',
      'costPerConversion': 'CPA',
      'roas': 'ROAS',
      'poas': 'POAS',
      'searchImpressionShare': 'Search Impression Share',
      'qualityScore': 'Quality Score'
    };
    return metricNameMap[metricId] || metricId.charAt(0).toUpperCase() + metricId.slice(1);
  };

  // Common tooltip component to avoid duplication
  const commonTooltip = (
    <Tooltip 
      content={({ active, payload, label }) => {
        if (!active || !payload || !payload.length) return null;
        
        const uniquePayload = payload.filter((entry, index, self) => 
          index === self.findIndex(e => e.dataKey === entry.dataKey)
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
            {uniquePayload.map((entry: any, index: number) => (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: index < uniquePayload.length - 1 ? '4px' : '0'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: getKpiChartColor(entry.dataKey, selectedChartMetrics),
                  marginRight: '8px',
                  flexShrink: 0
                }}></div>
                <span style={{ color: getKpiChartColor(entry.dataKey, selectedChartMetrics), fontWeight: '500' }}>
                  {formatMetricName(entry.dataKey)} : {formatKPIValue(entry.dataKey, entry.value)}
                </span>
              </div>
            ))}
          </div>
        );
      }}
      wrapperStyle={{ outline: 'none' }}
      cursor={false}
    />
  );

  // Common axis components to avoid duplication
  const commonXAxis = (
    <XAxis 
      dataKey="dateFormatted" 
      stroke="#475569"
      fontSize={11}
      tickLine={true}
      tickSize={6}
      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
      dy={12}
      tick={{ fill: '#475569' }}
      tickMargin={8}
    />
  );

  const commonLeftYAxis = (chartData: any) => (
    <YAxis 
      yAxisId="left"
      stroke="#475569"
      fontSize={11}
      tickLine={true}
      tickSize={6}
      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
      dx={-10}
      width={48}
      tick={{ fill: '#475569' }}
      tickMargin={8}
      domain={getLeftAxisDomain(selectedChartMetrics, chartData)}
      tickFormatter={(value) => {
        const leftMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'left');
        return leftMetrics.length > 0 ? formatLeftYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
      }}
    />
  );

  const commonRightYAxis = (chartData: any) => (
    <YAxis 
      yAxisId="right"
      orientation="right"
      stroke="#475569"
      fontSize={11}
      tickLine={true}
      tickSize={6}
      axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }}
      dx={10}
      width={48}
      tick={{ fill: '#475569' }}
      tickMargin={8}
      domain={getRightAxisDomain(selectedChartMetrics, chartData)}
      tickFormatter={(value) => {
        const rightMetrics = selectedChartMetrics.filter(m => getYAxisOrientation(m, selectedChartMetrics, chartData) === 'right');
        return rightMetrics.length > 0 ? formatRightYAxis(value, selectedChartMetrics, chartData) : value.toFixed(1);
      }}
    />
  );

  return (
    <div className="bg-white rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trends</h3>
            <p className="text-sm text-gray-500">
              {selectedChartMetrics.length === 1 
                ? `${formatMetricName(selectedChartMetrics[0])} over ${selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'the selected period'}`
                : `${selectedChartMetrics.length} metrics over ${selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'the selected period'}`
              }
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Date Granularity Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => {
                  setDateGranularity('daily');
                  setManualGranularityOverride(true);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dateGranularity === 'daily'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Daily
              </button>
              <button
                onClick={() => {
                  setDateGranularity('weekly');
                  setManualGranularityOverride(true);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dateGranularity === 'weekly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => {
                  setDateGranularity('monthly');
                  setManualGranularityOverride(true);
                }}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dateGranularity === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
            </div>
            
            {/* Chart Type Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setChartType('line')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  chartType === 'line'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Line</span>
              </button>
              <button
                onClick={() => setChartType('bar')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  chartType === 'bar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Bar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Chart */}
      <div className="h-[480px] bg-gray-50/30 rounded-lg px-2 py-6">
        {(() => {
          // Calculate chart data once and reuse for both chart types
          const chartData = generateMultiMetricChartData(selectedChartMetrics, historicalData, dateGranularity, selectedDateRange);
          
          // Common gradient definitions - only include what's needed for current chart type
          const gradientDefs = (
            <defs>
              {chartType === 'line' ? (
                // Line Chart Area Fill Gradients
                selectedChartMetrics.map((metricId, index) => (
                  <linearGradient
                    key={`gradient-${metricId}`}
                    id={`gradient-${metricId}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={getKpiChartColor(metricId, selectedChartMetrics)} stopOpacity={0.15} />
                    <stop offset="70%" stopColor={getKpiChartColor(metricId, selectedChartMetrics)} stopOpacity={0.05} />
                    <stop offset="100%" stopColor={getKpiChartColor(metricId, selectedChartMetrics)} stopOpacity={0} />
                  </linearGradient>
                ))
              ) : (
                // Bar Chart Fill Gradients
                selectedChartMetrics.map((metricId, index) => (
                  <linearGradient
                    key={`bar${getKpiGradientId(metricId)}`}
                    id={`bar${getKpiGradientId(metricId)}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={getKpiChartColor(metricId, selectedChartMetrics)} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={getKpiChartColor(metricId, selectedChartMetrics)} stopOpacity={0.60} />
                  </linearGradient>
                ))
              )}
            </defs>
          );
          
          return (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
              <AreaChart
                data={chartData}
                margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
              >
                {gradientDefs}
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
                {commonXAxis}
                {commonLeftYAxis(chartData)}
                {/* Secondary Y-Axis (Right) - Only if needed */}
                {needsDualYAxis(selectedChartMetrics, chartData) && commonRightYAxis(chartData)}
                {commonTooltip}
                {/* Layer 1: Gradient Fill Areas (drawn first, behind lines) */}
                {selectedChartMetrics.map((metricId) => (
                  <Area
                    key={`fill-${metricId}`}
                    yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    type="monotoneX"
                    dataKey={metricId}
                    stroke="none"
                    fill={`url(#gradient-${metricId})`}
                    dot={false}
                  />
                ))}
                
                {/* Layer 2: Lines (drawn second, on top of fills) */}
                {selectedChartMetrics.map((metricId) => (
                  <Area
                    key={`line-${metricId}`}
                    yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    type="monotoneX"
                    dataKey={metricId}
                    stroke={getKpiChartColor(metricId, selectedChartMetrics)}
                    strokeWidth={2}
                    fill="none"
                    dot={false}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </AreaChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
                barCategoryGap="20%"
                barGap={6}
              >
                {gradientDefs}
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
                {commonXAxis}
                {commonLeftYAxis(chartData)}
                {/* Secondary Y-Axis (Right) - Only if needed */}
                {needsDualYAxis(selectedChartMetrics, chartData) && commonRightYAxis(chartData)}
                {commonTooltip}
                {/* Multiple Bars with gradient fills */}
                {selectedChartMetrics.map((metricId, index) => (
                  <Bar
                    key={metricId}
                    yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    dataKey={metricId}
                    fill={`url(#bar${getKpiGradientId(metricId)})`}
                    name={metricId}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={selectedChartMetrics.length === 1 ? 32 : 24}
                    stroke={getKpiChartColor(metricId, selectedChartMetrics)}
                    strokeWidth={0.5}
                    strokeOpacity={0.3}
                  />
                ))}
              </BarChart>
              )}
            </ResponsiveContainer>
          );
        })()}
      </div>
    </div>
  );
};

export default Charts; 