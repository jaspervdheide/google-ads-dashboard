'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber, formatPercentage, formatCurrency } from '../../utils';
import { useHistoricalData } from '../../hooks';

interface CampaignYoYTableProps {
  selectedAccount: string | null;
  selectedDateRange: any;
  onMetricHover?: (event: React.MouseEvent, metricType: string, metricValue: string | number, weekInfo: string) => void;
  onMetricLeave?: () => void;
}

interface WeeklyData {
  week: number;
  year: number;
  clicks: number;
  impressions: number;
  ctr: number;
  cpc: number;
  cost: number;
  conversions: number;
  cpa: number;
  conversionsValue: number;
  poas: number;
  conversionRate: number;
}

interface YoYWeekComparison {
  week: number;
  dataThisYear: WeeklyData | null;
  dataLastYear: WeeklyData | null;
  indexYoY: {
    clicks: number;
    impressions: number;
    ctr: number;
    cpc: number;
    cost: number;
    conversions: number;
    cpa: number;
    conversionsValue: number;
    poas: number;
    conversionRate: number;
  };
}

type ViewMode = 'default' | 'conversions';

const CampaignYoYTable: React.FC<CampaignYoYTableProps> = ({
  selectedAccount,
  selectedDateRange: _selectedDateRange,
  onMetricHover: _onMetricHover,
  onMetricLeave: _onMetricLeave
}) => {
  // View mode state for navigation
  const [viewMode, setViewMode] = useState<ViewMode>('default');

  // Get current and previous years dynamically (always use current year, not from selected date range)
  const { thisYear, lastYear } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    
    return { thisYear: currentYear, lastYear: previousYear };
  }, []);

  // Create full year date ranges (Jan 1 to Dec 31) - independent of selected date range
  const dateRangeThisYear = useMemo(() => {
    return {
      id: `full-year-${thisYear}`,
      name: `Full Year ${thisYear}`,
      icon: Calendar,
      startDate: new Date(thisYear, 0, 1), // January 1st
      endDate: new Date(thisYear, 11, 31), // December 31st
      apiDays: 365
    };
  }, [thisYear]);

  const dateRangeLastYear = useMemo(() => {
    return {
      id: `full-year-${lastYear}`,
      name: `Full Year ${lastYear}`,
      icon: Calendar,
      startDate: new Date(lastYear, 0, 1), // January 1st
      endDate: new Date(lastYear, 11, 31), // December 31st
      apiDays: 365
    };
  }, [lastYear]);

  // Fetch full year data for both years
  const { data: dataThisYear, loading: loadingThisYear } = useHistoricalData(
    selectedAccount, 
    dateRangeThisYear, 
    false
  );

  const { data: dataLastYear, loading: loadingLastYear } = useHistoricalData(
    selectedAccount, 
    dateRangeLastYear, 
    false
  );

  // Debug logging to see what data we're getting
  useEffect(() => {
    if (dataThisYear && dataLastYear) {
      console.log('🔍 YoY Debug - This Year data:', dataThisYear?.slice(0, 3));
      console.log('🔍 YoY Debug - Last Year data:', dataLastYear?.slice(0, 3));
      console.log('🔍 YoY Debug - Date ranges:', {
        thisYear: dateRangeThisYear,
        lastYear: dateRangeLastYear
      });
    }
  }, [dataThisYear, dataLastYear, dateRangeThisYear, dateRangeLastYear]);

  // Helper function to get week number
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Process data into weekly format
  const weeklyComparison = useMemo(() => {
    const processDataIntoWeeks = (data: any[], year: number): WeeklyData[] => {
      if (!data || data.length === 0) return [];
      
      const weeklyData: { [week: number]: WeeklyData } = {};
      
      data.forEach(day => {
        const date = new Date(day.date);
        const weekNumber = getWeekNumber(date);
        
        if (!weeklyData[weekNumber]) {
          weeklyData[weekNumber] = {
            week: weekNumber,
            year,
            clicks: 0,
            impressions: 0,
            ctr: 0,
            cpc: 0,
            cost: 0,
            conversions: 0,
            cpa: 0,
            conversionsValue: 0,
            poas: 0,
            conversionRate: 0
          };
        }
        
        // Aggregate daily data into weekly totals
        weeklyData[weekNumber].clicks += day.clicks || 0;
        weeklyData[weekNumber].impressions += day.impressions || 0;
        weeklyData[weekNumber].cost += day.cost || 0;
        weeklyData[weekNumber].conversions += day.conversions || 0;
        weeklyData[weekNumber].conversionsValue += day.conversionsValue || 0;
      });
      
      // Calculate derived metrics for each week
      Object.values(weeklyData).forEach(week => {
        week.ctr = week.impressions > 0 ? (week.clicks / week.impressions) * 100 : 0;
        week.cpc = week.clicks > 0 ? week.cost / week.clicks : 0;
        week.cpa = week.conversions > 0 ? week.cost / week.conversions : 0;
        week.poas = week.cost > 0 ? (week.conversionsValue / week.cost) * 100 : 0;
        week.conversionRate = week.clicks > 0 ? (week.conversions / week.clicks) * 100 : 0;
      });
      
      return Object.values(weeklyData).sort((a, b) => a.week - b.week);
    };
    
    const weeksThisYear = processDataIntoWeeks(dataThisYear || [], thisYear);
    const weeksLastYear = processDataIntoWeeks(dataLastYear || [], lastYear);
    
    const allWeeks = new Set([
      ...weeksThisYear.map(w => w.week),
      ...weeksLastYear.map(w => w.week)
    ]);
    
    // Get current week number to filter out future weeks
    const currentWeekNumber = getWeekNumber(new Date());
    
    // Filter to only include current and past weeks, then sort by week descending (current week first)
    const comparison: YoYWeekComparison[] = Array.from(allWeeks)
      .filter(week => week <= currentWeekNumber) // Only show current and past weeks
      .sort((a, b) => b - a) // Sort descending (current week first)
      .map(week => {
        const thisYearData = weeksThisYear.find(w => w.week === week) || null;
        const lastYearData = weeksLastYear.find(w => w.week === week) || null;
        
        const calculateIndex = (valueCurrent: number, valuePrevious: number): number => {
          if (valuePrevious === 0 || valuePrevious === null || valuePrevious === undefined) {
            return valueCurrent > 0 ? 100 : 0;
          }
          return (valueCurrent / valuePrevious) * 100;
        };
        
        return {
          week,
          dataThisYear: thisYearData,
          dataLastYear: lastYearData,
          indexYoY: {
            clicks: calculateIndex(thisYearData?.clicks || 0, lastYearData?.clicks || 0),
            impressions: calculateIndex(thisYearData?.impressions || 0, lastYearData?.impressions || 0),
            ctr: calculateIndex(thisYearData?.ctr || 0, lastYearData?.ctr || 0),
            cpc: calculateIndex(thisYearData?.cpc || 0, lastYearData?.cpc || 0),
            cost: calculateIndex(thisYearData?.cost || 0, lastYearData?.cost || 0),
            conversions: calculateIndex(thisYearData?.conversions || 0, lastYearData?.conversions || 0),
            cpa: calculateIndex(thisYearData?.cpa || 0, lastYearData?.cpa || 0),
            conversionsValue: calculateIndex(thisYearData?.conversionsValue || 0, lastYearData?.conversionsValue || 0),
            poas: calculateIndex(thisYearData?.poas || 0, lastYearData?.poas || 0),
            conversionRate: calculateIndex(thisYearData?.conversionRate || 0, lastYearData?.conversionRate || 0)
          }
        };
      });
    
    return comparison;
  }, [dataThisYear, dataLastYear, thisYear, lastYear]);

  const isPositiveChange = (kpiId: string, percentageChange: number): boolean => {
    const lowerIsBetterMetrics = ['cpc', 'cost', 'cpa'];
    const isLowerBetter = lowerIsBetterMetrics.includes(kpiId);
    
    if (isLowerBetter) {
      return percentageChange < 100; // Lower than 100% means decrease, which is good
    } else {
      return percentageChange > 100; // Higher than 100% means increase, which is good
    }
  };

  const formatIndexValue = (value: number, metricKey: string): { value: string; className: string } => {
    const isNaN_value = isNaN(value) || !isFinite(value);
    const formatted = isNaN_value ? '0.00%' : `${value.toFixed(2)}%`;
    
    if (isNaN_value) {
      return { value: formatted, className: 'text-gray-400 bg-gray-50' };
    }
    
    // Performance-based coloring using same logic as KPICards.tsx
    const lowerIsBetterMetrics = ['cpc', 'cost', 'cpa'];
    const isLowerBetter = lowerIsBetterMetrics.includes(metricKey);
    
    // Calculate percentage change from 100% baseline
    const percentageChange = Math.abs(value - 100);
    
    // Determine if this is a positive change based on metric type
    const isPositiveChange = isLowerBetter ? value < 100 : value > 100;
    
    let className = ''; // Dynamic text color based on performance
    
    // Color intensity based on magnitude of change with stronger design
    if (percentageChange >= 20) {
      // Strong change (≥20%) - bold design with borders
      className += isPositiveChange 
        ? 'bg-green-200 border-2 border-green-400 text-green-900 font-bold shadow-sm' 
        : 'bg-red-200 border-2 border-red-400 text-red-900 font-bold shadow-sm';
    } else if (percentageChange >= 10) {
      // Moderate change (≥10%) - medium design with light borders
      className += isPositiveChange 
        ? 'bg-green-100 border border-green-300 text-green-800 font-semibold' 
        : 'bg-red-100 border border-red-300 text-red-800 font-semibold';
    } else if (percentageChange >= 5) {
      // Light change (≥5%) - yellow with border
      className += 'bg-yellow-100 border border-yellow-300 text-yellow-800 font-medium';
    } else {
      // Minimal change (<5%) - subtle gray
      className += 'bg-gray-100 border border-gray-200 text-gray-600';
    }
    
    return { value: formatted, className };
  };

  // Define column configurations for each view
  const getColumnsForView = (mode: ViewMode) => {
    if (mode === 'conversions') {
      return [
        { key: 'conversions', label: 'Conversions', format: formatNumber },
        { key: 'cpa', label: 'CPA', format: formatCurrency },
        { key: 'conversionsValue', label: 'Conv. Value', format: formatCurrency },
        { key: 'poas', label: 'POAS', format: formatPercentage },
        { key: 'conversionRate', label: 'Conv. Rate', format: formatPercentage }
      ];
    }
    
    // Default view
    return [
      { key: 'clicks', label: 'Clicks', format: formatNumber },
      { key: 'impressions', label: 'Impressions', format: formatNumber },
      { key: 'ctr', label: 'CTR', format: formatPercentage },
      { key: 'cpc', label: 'CPC', format: formatCurrency },
      { key: 'cost', label: 'Cost', format: formatCurrency }
    ];
  };

  const currentColumns = getColumnsForView(viewMode);

  if (loadingThisYear || loadingLastYear) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading YoY data...</span>
      </div>
    );
  }

  if (weeklyComparison.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No data available for YoY comparison</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Navigation Controls */}
      <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">View:</span>
          <span className="text-sm text-gray-900 font-semibold">
            {viewMode === 'default' ? 'Performance Metrics' : 'Conversion Metrics'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('default')}
            disabled={viewMode === 'default'}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'default'
                ? 'bg-blue-100 text-blue-700 cursor-default'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Performance</span>
          </button>
          
          <button
            onClick={() => setViewMode('conversions')}
            disabled={viewMode === 'conversions'}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'conversions'
                ? 'bg-blue-100 text-blue-700 cursor-default'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            <span>Conversions</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {/* Main table container */}
      <div className="border border-gray-200 rounded-lg shadow-sm max-h-[75vh] overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300 sticky top-0 z-30">
            {/* Main header row */}
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-black uppercase tracking-wide border-r-8 border-blue-600 bg-white sticky left-0 z-40 shadow-2xl">
                Week #
              </th>
              {currentColumns.map((column, index) => (
                <th 
                  key={column.key}
                  className={`px-12 py-4 text-center text-xs font-bold text-black uppercase tracking-wide ${
                    index < currentColumns.length - 1 ? 'border-r-2 border-gray-400' : ''
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
            
            {/* Subheader row with dynamic years, Index YoY */}
            <tr className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-300">
              <th className="px-6 py-3 text-xs text-black border-r-8 border-blue-600 bg-white sticky left-0 z-40 shadow-2xl"></th>
              {currentColumns.map((column, index) => (
                <th 
                  key={`header-${column.key}`}
                  className={`px-4 py-3 ${index < currentColumns.length - 1 ? 'border-r-2 border-gray-400' : ''}`}
                >
                  <div className="grid grid-cols-3 gap-3 text-xs font-semibold">
                    <span className="text-blue-900 text-center">{thisYear}</span>
                    <span className="text-blue-900 text-center">{lastYear}</span>
                    <span className="text-blue-900 text-center">% YoY</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        
          <tbody className="bg-white divide-y-2 divide-gray-200">
            {weeklyComparison.map((weekData) => {
              const currentWeek = getWeekNumber(new Date());
              const isCurrentWeek = weekData.week === currentWeek;
              
              return (
                <tr 
                  key={weekData.week} 
                  className={`hover:bg-blue-50 transition-colors duration-200 ${isCurrentWeek ? 'bg-gradient-to-r from-blue-100 to-blue-50 ring-2 ring-blue-300' : 'hover:shadow-sm'}`}
                >
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold border-r-8 border-blue-600 bg-white sticky left-0 z-20 shadow-2xl ${isCurrentWeek ? 'text-blue-900 bg-blue-50' : 'text-black'}`}>
                    {isCurrentWeek && <span className="mr-2 text-blue-600 text-sm">▶</span>}
                    <span className="text-sm">Week {weekData.week}</span>
                    {isCurrentWeek && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">Current</span>}
                  </td>
                
                  {currentColumns.map((column, index) => {
                    const thisYearValue = weekData.dataThisYear?.[column.key as keyof WeeklyData] || 0;
                    const lastYearValue = weekData.dataLastYear?.[column.key as keyof WeeklyData] || 0;
                    const indexValue = weekData.indexYoY[column.key as keyof typeof weekData.indexYoY];
                    const indexFormatted = formatIndexValue(indexValue, column.key);
                    
                    return (
                      <td 
                        key={column.key}
                        className={`px-4 py-4 whitespace-nowrap text-sm ${index < currentColumns.length - 1 ? 'border-r-2 border-gray-400' : ''}`}
                      >
                        <div className="grid grid-cols-3 gap-3 items-center min-h-[2.5rem]">
                          <span className="text-black text-center font-semibold text-sm">
                            {column.format(thisYearValue as number)}
                          </span>
                          <span className="text-black text-center font-medium text-sm">
                            {column.format(lastYearValue as number)}
                          </span>
                          <span className={`text-center text-xs px-3 py-2 rounded-lg inline-block min-w-[80px] ${indexFormatted.className}`}>
                            {indexFormatted.value}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CampaignYoYTable; 