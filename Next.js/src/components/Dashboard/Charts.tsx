import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts';
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
  return (
    <div className="bg-white rounded-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Performance Trends</h3>
            <p className="text-sm text-gray-500">
              {selectedChartMetrics.length === 1 
                ? `${selectedChartMetrics[0]} over ${selectedDateRange ? formatDateRangeDisplay(selectedDateRange) : 'the selected period'}`
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
        <ResponsiveContainer width="100%" height="100%">
          {(() => {
            // Cache chart data calculation to avoid multiple expensive calls
            const chartData = generateMultiMetricChartData(selectedChartMetrics, historicalData, dateGranularity, selectedDateRange);
            
            return chartType === 'line' ? (
              <LineChart
                data={chartData}
                margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
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
                {/* Secondary Y-Axis (Right) - Only if needed */}
                {needsDualYAxis(selectedChartMetrics, chartData) && (
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
                )}
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    return [formatKPIValue(name, value), name];
                  }}
                  labelFormatter={(label) => label}
                />
                {/* Multiple Lines */}
                {selectedChartMetrics.map((metricId) => (
                  <Line
                    key={metricId}
                    yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    type="monotone"
                    dataKey={metricId}
                    stroke={getKpiChartColor(metricId, selectedChartMetrics)}
                    strokeWidth={2}
                    dot={{ 
                      fill: getKpiChartColor(metricId, selectedChartMetrics),
                      strokeWidth: 0, 
                      r: 3
                    }}
                    activeDot={{ 
                      r: 5, 
                      stroke: 'white', 
                      strokeWidth: 2, 
                      fill: getKpiChartColor(metricId, selectedChartMetrics)
                    }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart
                data={chartData}
                margin={{ top: 20, right: needsDualYAxis(selectedChartMetrics, chartData) ? 50 : 25, left: 35, bottom: 25 }}
                barCategoryGap="30%"
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} vertical={false} />
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
                {/* Secondary Y-Axis (Right) - Only if needed */}
                {needsDualYAxis(selectedChartMetrics, chartData) && (
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
                )}
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    fontSize: '12px'
                  }}
                  formatter={(value: any, name: string) => {
                    return [formatKPIValue(name, value), name];
                  }}
                  labelFormatter={(label) => label}
                />
                {/* Multiple Bars with minimal styling */}
                {selectedChartMetrics.map((metricId, index) => (
                  <Bar
                    key={metricId}
                    yAxisId={needsDualYAxis(selectedChartMetrics, chartData) ? getYAxisOrientation(metricId, selectedChartMetrics, chartData) : 'left'}
                    dataKey={metricId}
                    fill={getKpiChartColor(metricId, selectedChartMetrics)}
                    fillOpacity={0.85}
                    name={metricId}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={selectedChartMetrics.length === 1 ? 32 : 24}
                  />
                ))}
              </BarChart>
            );
          })()}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Charts; 