'use client';

import React, { useState } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  Target, DollarSign, TrendingUp, Info, Eye, Award
} from 'lucide-react';
import { useKeywordData } from '../../hooks/useKeywordData';
import { DateRange } from '../../types/common';

// CPC bucket data structure
interface CpcBucketData {
  cpcRange: string;
  avgCpc: number;
  totalConversions: number;
  keywordCount: number;
  totalCost: number;
  totalClicks: number;
  avgCpa: number;
  efficiency: 'high' | 'medium' | 'low';
}

interface KeywordCpcConversionChartProps {
  customerId: string;
  dateRange?: string; // Keep for backward compatibility
  selectedDateRange?: DateRange | null; // Use proper DateRange type
  className?: string;
}

const KeywordCpcConversionChart: React.FC<KeywordCpcConversionChartProps> = ({
  customerId,
  dateRange = '30',
  selectedDateRange,
  className = ""
}) => {
  const [bucketSize, setBucketSize] = useState(0.25); // Default 25 cents
  const [hoveredBucket, setHoveredBucket] = useState<string | null>(null);

  // Use the selectedDateRange if available, otherwise fall back to string dateRange
  const dateRangeToUse = selectedDateRange || { 
    id: `last-${dateRange}-days`,
    name: `Last ${dateRange} days`,
    icon: Target, // Use Target icon as fallback
    startDate: new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    apiDays: parseInt(dateRange)
  };

  // Use real keyword data with proper DateRange object
  const { data: keywordData, loading, error } = useKeywordData(customerId, dateRangeToUse, false, 'both');

  // Process and bucket the data
  const processedData = React.useMemo(() => {
    if (!keywordData || !keywordData.keywords || keywordData.keywords.length === 0) {
      return [];
    }

    // Filter keywords with valid data
    const validKeywords = keywordData.keywords.filter((keyword: any) => 
      keyword.clicks > 0 && 
      keyword.cost > 0 && 
      keyword.average_cpc > 0
    );

    if (validKeywords.length === 0) {
      return [];
    }

    // Create CPC buckets
    const buckets: { [key: string]: {
      keywords: any[];
      totalConversions: number;
      totalCost: number;
      totalClicks: number;
      totalCpc: number;
    } } = {};

    validKeywords.forEach((keyword: any) => {
      const cpc = keyword.average_cpc;
      const bucketStart = Math.floor(cpc / bucketSize) * bucketSize;
      const bucketEnd = bucketStart + bucketSize;
      const bucketKey = `€${bucketStart.toFixed(2)}-€${bucketEnd.toFixed(2)}`;
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = {
          keywords: [],
          totalConversions: 0,
          totalCost: 0,
          totalClicks: 0,
          totalCpc: 0
        };
      }
      
      buckets[bucketKey].keywords.push(keyword);
      buckets[bucketKey].totalConversions += keyword.conversions || 0;
      buckets[bucketKey].totalCost += keyword.cost;
      buckets[bucketKey].totalClicks += keyword.clicks;
      buckets[bucketKey].totalCpc += cpc;
    });

    // Convert to array and calculate metrics
    return Object.entries(buckets).map(([range, data]) => {
      const keywordCount = data.keywords.length;
      const avgCpc = data.totalCpc / keywordCount;
      const avgCpa = data.totalConversions > 0 ? data.totalCost / data.totalConversions : 0;
      const conversionRate = data.totalClicks > 0 ? (data.totalConversions / data.totalClicks) * 100 : 0;
      
      // Determine efficiency
      let efficiency: 'high' | 'medium' | 'low' = 'medium';
      if (conversionRate > 3 && avgCpa < 60) efficiency = 'high';
      else if (conversionRate < 1 || avgCpa > 120) efficiency = 'low';
      
      return {
        cpcRange: range,
        avgCpc,
        totalConversions: data.totalConversions,
        keywordCount,
        totalCost: data.totalCost,
        totalClicks: data.totalClicks,
        avgCpa,
        efficiency
      } as CpcBucketData;
    }).sort((a, b) => a.avgCpc - b.avgCpc);
  }, [keywordData, bucketSize]);

  // Calculate insights
  const totalConversions = processedData.reduce((sum, bucket) => sum + bucket.totalConversions, 0);
  const totalKeywords = processedData.reduce((sum, bucket) => sum + bucket.keywordCount, 0);
  const avgCpc = processedData.length > 0 
    ? processedData.reduce((sum, bucket) => sum + (bucket.avgCpc * bucket.keywordCount), 0) / totalKeywords
    : 0;

  // Find best performing bucket
  const bestBucket = processedData.reduce((best, current) => 
    current.totalConversions > best.totalConversions ? current : best, 
    processedData[0] || {} as CpcBucketData
  );

  // Find most efficient bucket
  const mostEfficientBucket = processedData.reduce((best, current) => 
    current.efficiency === 'high' && current.totalConversions > (best.totalConversions || 0) ? current : best,
    {} as CpcBucketData
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as CpcBucketData;
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-64">
          <div className="flex items-center space-x-2 mb-3">
            <DollarSign className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">
              {data.cpcRange}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              data.efficiency === 'high' ? 'bg-green-100 text-green-800' :
              data.efficiency === 'low' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {data.efficiency.charAt(0).toUpperCase() + data.efficiency.slice(1)}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Total Conversions</p>
              <p className="font-semibold text-gray-900 text-lg">{data.totalConversions.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Keywords</p>
              <p className="font-semibold text-gray-900 text-lg">{data.keywordCount}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Avg CPC</p>
              <p className="font-semibold text-gray-900">€{data.avgCpc.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Avg CPA</p>
              <p className="font-semibold text-gray-900">€{data.avgCpa.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Total Cost</p>
              <p className="font-semibold text-gray-900">€{data.totalCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600 uppercase tracking-wide">Total Clicks</p>
              <p className="font-semibold text-gray-900">{data.totalClicks.toLocaleString()}</p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              Conv. Rate: {data.totalClicks > 0 ? ((data.totalConversions / data.totalClicks) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading && !keywordData) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CPC vs Conversions Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Keyword performance by CPC ranges</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading keyword data...</p>
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
            <h3 className="text-lg font-semibold text-gray-900">CPC vs Conversions Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Keyword performance by CPC ranges</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500">Error loading keyword data: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">CPC vs Conversions Analysis</h3>
            <p className="text-sm text-gray-600 mt-1">Keyword performance by CPC ranges</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-500">No keyword data available</p>
            <p className="text-sm text-gray-400 mt-1">CPC analysis will appear once keywords have sufficient data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl p-6 shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">CPC vs Conversions Analysis</h3>
          <p className="text-sm text-gray-600 mt-1">
            Keyword performance by CPC ranges (€{bucketSize.toFixed(2)} buckets) - {selectedDateRange?.name || 'Last 30 days'}
          </p>
        </div>
        
        {/* Bucket Size Toggles */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Bucket size:</span>
          <div className="flex items-center space-x-1">
            {[0.10, 0.25, 0.50, 1.00].map(size => (
              <button
                key={size}
                onClick={() => setBucketSize(size)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  bucketSize === size
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                €{size.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="h-4 w-4 text-teal-600" />
            <span className="text-sm font-medium text-teal-900">Total Conversions</span>
          </div>
          <div className="text-2xl font-bold text-teal-900">
            {totalConversions.toFixed(1)}
          </div>
          <div className="text-xs text-teal-600 mt-1">
            Across {totalKeywords} keywords
          </div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Award className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Best CPC Range</span>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {bestBucket?.cpcRange || 'N/A'}
          </div>
          <div className="text-xs text-blue-600 mt-1">
            {bestBucket?.totalConversions.toFixed(1)} conversions
          </div>
        </div>

        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Eye className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">Avg CPC</span>
          </div>
          <div className="text-2xl font-bold text-green-900">
            €{avgCpc.toFixed(2)}
          </div>
          <div className="text-xs text-green-600 mt-1">
            Weighted average
          </div>
        </div>
      </div>

      {/* Scatter Plot */}
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, left: 40, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
            <XAxis 
              type="number" 
              dataKey="avgCpc" 
              name="Average CPC"
              stroke="#475569"
              fontSize={11}
              tickFormatter={(value) => `€${value.toFixed(2)}`}
              label={{ 
                value: 'Average CPC (€)', 
                position: 'insideBottom', 
                offset: -40, 
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#475569', fontWeight: 500 } 
              }}
            />
            <YAxis 
              type="number" 
              dataKey="totalConversions" 
              name="Total Conversions"
              stroke="#475569"
              fontSize={11}
              label={{ 
                value: 'Total Conversions', 
                angle: -90, 
                position: 'insideLeft', 
                style: { textAnchor: 'middle', fontSize: '12px', fill: '#475569', fontWeight: 500 } 
              }}
            />
            
            {/* Reference line for average CPC */}
            <ReferenceLine 
              x={avgCpc} 
              stroke="#94a3b8" 
              strokeDasharray="3 3" 
              strokeWidth={1}
              label={{ 
                value: "Avg CPC", 
                position: "top",
                style: { fontSize: '10px', fill: '#94a3b8', fontWeight: 500 }
              }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* High efficiency buckets - Green */}
            <Scatter 
              data={processedData.filter(d => d.efficiency === 'high')} 
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={2}
              r={8}
            />
            
            {/* Medium efficiency buckets - Blue */}
            <Scatter 
              data={processedData.filter(d => d.efficiency === 'medium')} 
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth={2}
              r={7}
            />
            
            {/* Low efficiency buckets - Red */}
            <Scatter 
              data={processedData.filter(d => d.efficiency === 'low')} 
              fill="#ef4444"
              stroke="#ffffff"
              strokeWidth={2}
              r={6}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Legend */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Performance Legend</h4>
          <div className="space-y-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white"></div>
              <span className="text-gray-600">High Efficiency (Conv. Rate &gt;3%, CPA &lt;€60)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>
              <span className="text-gray-600">Medium Efficiency</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white"></div>
              <span className="text-gray-600">Low Efficiency (Conv. Rate &lt;1% or CPA &gt;€120)</span>
            </div>
          </div>
        </div>
        
        {/* Key Insights */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Key Insights</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div className="flex items-center space-x-1">
              <span>•</span>
              <span>Larger circles indicate more total conversions</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>•</span>
              <span>Green buckets show high efficiency CPC ranges</span>
            </div>
            <div className="flex items-center space-x-1">
              <span>•</span>
              <span>Focus budget on high-performing CPC ranges</span>
            </div>
            {mostEfficientBucket?.cpcRange && (
              <div className="flex items-center space-x-1 font-medium text-green-700 mt-2">
                <TrendingUp className="h-3 w-3" />
                <span>Most efficient range: {mostEfficientBucket.cpcRange}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-900">Optimization Strategy</h4>
            <div className="text-xs text-blue-700 mt-1 space-y-1">
              <div>• <strong>Scale winners:</strong> Increase bids for keywords in high-efficiency, high-conversion CPC ranges</div>
              <div>• <strong>Optimize spend:</strong> Reduce bids for keywords in low-efficiency ranges</div>
              <div>• <strong>Sweet spot:</strong> Target the CPC range that delivers the best conversion volume and efficiency</div>
              <div>• <strong>Budget allocation:</strong> Shift budget towards CPC ranges with proven conversion performance</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeywordCpcConversionChart; 