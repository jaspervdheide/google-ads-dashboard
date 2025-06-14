'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { getCampaignsByType, calculateConversionsByType, calculateCPAByType } from '@/utils/campaignAnalysis';

interface ConversionsByTypeChartProps {
  campaignData: any;
}

const ConversionsByTypeChart: React.FC<ConversionsByTypeChartProps> = ({ campaignData }) => {
  if (!campaignData?.campaigns || campaignData.campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Type Distribution</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Live Data</span>
          </div>
        </div>
        <div className="h-80 flex items-center justify-center">
          <p className="text-gray-500">No campaign data available</p>
        </div>
      </div>
    );
  }

  const campaignsByType = getCampaignsByType(campaignData.campaigns);
  const conversionsByType = calculateConversionsByType(campaignData.campaigns);
  const cpaByType = calculateCPAByType(campaignData.campaigns);

  // Calculate total conversions for percentage calculation
  const totalConversions = Object.values(conversionsByType).reduce((sum, conv) => sum + conv, 0);

  // Prepare data for the chart
  const campaignTypeData = [
    {
      name: 'Search Campaigns',
      value: totalConversions > 0 ? Math.round((conversionsByType.Search / totalConversions) * 100) : 0,
      conversions: conversionsByType.Search,
      cpa: cpaByType.Search,
      color: '#3b82f6'
    },
    {
      name: 'Performance Max',
      value: totalConversions > 0 ? Math.round((conversionsByType['Performance Max'] / totalConversions) * 100) : 0,
      conversions: conversionsByType['Performance Max'],
      cpa: cpaByType['Performance Max'],
      color: '#1d4ed8'
    },
    {
      name: 'Shopping Campaigns',
      value: totalConversions > 0 ? Math.round((conversionsByType.Shopping / totalConversions) * 100) : 0,
      conversions: conversionsByType.Shopping,
      cpa: cpaByType.Shopping,
      color: '#1e40af'
    },
    {
      name: 'Other Campaigns',
      value: totalConversions > 0 ? Math.round((conversionsByType.Other / totalConversions) * 100) : 0,
      conversions: conversionsByType.Other,
      cpa: cpaByType.Other,
      color: '#64748b'
    }
  ].filter(item => item.conversions > 0); // Only show types with conversions

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-900 mb-2">{data.name}</p>
          <div className="space-y-1 text-xs">
            <p className="text-gray-600">
              Share: <span className="font-medium text-gray-900">{data.value}%</span>
            </p>
            <p className="text-gray-600">
              Conversions: <span className="font-medium text-gray-900">{data.conversions.toFixed(2)}</span>
            </p>
            <p className="text-gray-600">
              CPA: <span className="font-medium text-gray-900">€{data.cpa.toFixed(2)}</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Campaign Type Distribution</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Live Data</span>
        </div>
      </div>
      
      {/* Chart Container */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={campaignTypeData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {campaignTypeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Legend with Metrics */}
      <div className="mt-4 space-y-2">
        {campaignTypeData.map((item, index) => (
          <div key={index} className="flex items-center justify-between text-sm hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span className="text-gray-700 font-medium">{item.name}</span>
              <span className="text-gray-500">({item.value}%)</span>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-4">
                <div>
                  <span className="font-medium text-gray-900">{item.conversions.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">conv.</span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">€{item.cpa.toFixed(2)}</span>
                  <span className="text-gray-500 ml-1 text-xs">CPA</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {totalConversions.toFixed(2)}
            </div>
            <div className="text-xs text-gray-600">Total Conversions</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              €{campaignTypeData.length > 0 ? (campaignTypeData.reduce((sum, item) => sum + item.cpa, 0) / campaignTypeData.length).toFixed(2) : '0.00'}
            </div>
            <div className="text-xs text-gray-600">Average CPA</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-900">
              {campaignTypeData.length}
            </div>
            <div className="text-xs text-gray-600">Campaign Types</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversionsByTypeChart; 