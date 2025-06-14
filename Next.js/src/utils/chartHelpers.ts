/**
 * Chart utility functions for the Google Ads Dashboard
 * Extracted from the main Dashboard component for better code organization
 */

import { formatKPIValue } from './formatters';

// Data aggregation functions
export const aggregateDataByWeek = (dailyData: any[]): any[] => {
  const weeklyData: { [key: string]: any } = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    // Get Monday of the week (ISO week)
    const dayOfWeek = date.getDay();
    const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = {
        date: weekKey,
        dateFormatted: `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionsValue: 0,
        count: 0
      };
    }
    
    // Sum up metrics
    weeklyData[weekKey].impressions += day.impressions || 0;
    weeklyData[weekKey].clicks += day.clicks || 0;
    weeklyData[weekKey].cost += day.cost || 0;
    weeklyData[weekKey].conversions += day.conversions || 0;
    weeklyData[weekKey].conversionsValue += day.conversionsValue || 0;
    weeklyData[weekKey].count += 1;
  });
  
  // Calculate derived metrics
  return Object.values(weeklyData).map((week: any) => {
    week.ctr = week.impressions > 0 ? (week.clicks / week.impressions) * 100 : 0;
    week.avgCpc = week.clicks > 0 ? week.cost / week.clicks : 0;
    week.conversionRate = week.clicks > 0 ? (week.conversions / week.clicks) * 100 : 0;
    week.cpa = week.conversions > 0 ? week.cost / week.conversions : 0;
    week.roas = week.cost > 0 ? week.conversionsValue / week.cost : 0;
    week.poas = week.cost > 0 ? (week.conversionsValue / week.cost) * 100 : 0;
    delete week.count;
    return week;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const aggregateDataByMonth = (dailyData: any[]): any[] => {
  const monthlyData: { [key: string]: any } = {};
  
  dailyData.forEach(day => {
    const date = new Date(day.date);
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-01`;
    
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        date: monthKey,
        dateFormatted: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        conversionsValue: 0,
        count: 0
      };
    }
    
    // Sum up metrics
    monthlyData[monthKey].impressions += day.impressions || 0;
    monthlyData[monthKey].clicks += day.clicks || 0;
    monthlyData[monthKey].cost += day.cost || 0;
    monthlyData[monthKey].conversions += day.conversions || 0;
    monthlyData[monthKey].conversionsValue += day.conversionsValue || 0;
    monthlyData[monthKey].count += 1;
  });
  
  // Calculate derived metrics
  return Object.values(monthlyData).map((month: any) => {
    month.ctr = month.impressions > 0 ? (month.clicks / month.impressions) * 100 : 0;
    month.avgCpc = month.clicks > 0 ? month.cost / month.clicks : 0;
    month.conversionRate = month.clicks > 0 ? (month.conversions / month.clicks) * 100 : 0;
    month.cpa = month.conversions > 0 ? month.cost / month.conversions : 0;
    month.roas = month.cost > 0 ? month.conversionsValue / month.cost : 0;
    month.poas = month.cost > 0 ? (month.conversionsValue / month.cost) * 100 : 0;
    delete month.count;
    return month;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

// Get chart data with appropriate granularity
export const getChartDataWithGranularity = (data: any[], granularity: 'daily' | 'weekly' | 'monthly'): any[] => {
  if (!data || data.length === 0) return [];
  
  switch (granularity) {
    case 'weekly':
      return aggregateDataByWeek(data);
    case 'monthly':
      return aggregateDataByMonth(data);
    case 'daily':
    default:
      return data;
  }
};

// Generate multi-metric chart data using real historical data
export const generateMultiMetricChartData = (selectedMetrics: string[], historicalData: any[], dateGranularity: 'daily' | 'weekly' | 'monthly', selectedDateRange: any) => {
  if (!selectedDateRange || !historicalData || historicalData.length === 0) {
    console.log('📊 No historical data available, returning empty array');
    return [];
  }
  
  console.log('📊 Generating chart data from historical data:', {
    selectedMetrics,
    historicalDataLength: historicalData.length,
    firstDataPoint: historicalData[0],
    lastDataPoint: historicalData[historicalData.length - 1]
  });
  
  // Apply granularity aggregation
  const aggregatedData = getChartDataWithGranularity(historicalData, dateGranularity);
  
  // Use aggregated data directly
  return aggregatedData.map((day: any) => {
    const dataPoint: any = {
      date: day.date,
      dateFormatted: day.dateFormatted,
    };
    
    // Map each selected metric to the data point
    selectedMetrics.forEach(metricId => {
      dataPoint[metricId] = day[metricId] || 0;
      dataPoint[`${metricId}Formatted`] = formatKPIValue(metricId, day[metricId] || 0);
    });
    
    return dataPoint;
  });
};

// Get chart colors for KPIs
export const getKpiChartColor = (kpiId: string, selectedChartMetrics: string[]): string => {
  const colors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b']; // blue, green, purple, orange
  const index = selectedChartMetrics.indexOf(kpiId);
  return colors[index % colors.length];
};

// Y-axis orientation for dual-axis charts
// User requirement: First metric = left axis, other metrics = right axis  
// This ensures proper separation of different scale metrics (e.g., clicks vs conversions)
export const getYAxisOrientation = (metricId: string, selectedMetrics: string[], chartData: any[]): 'left' | 'right' => {
  // If only one metric, always use left axis (though this won't be used in single-axis mode)
  if (selectedMetrics.length === 1) {
    return 'left';
  }

  // For 2+ metrics: first metric on left, all others on right
  // This separates high-value metrics (clicks, impressions) from low-value ones (conversions, rates)
  const orientation = selectedMetrics.indexOf(metricId) === 0 ? 'left' : 'right';
  console.log('🎯 getYAxisOrientation:', { metricId, selectedMetrics, orientation });
  return orientation;
};

// Helper to check if we need dual Y-axis
// User requirement: 1 KPI = 1 Y-axis, 2+ KPIs = 2 Y-axis
export const needsDualYAxis = (metrics: string[], chartData: any[]): boolean => {
  const isDual = metrics.length >= 2;
  console.log('🔄 needsDualYAxis:', { metrics, isDual });
  return isDual;
};

// Calculate domain for left Y-axis (updated to use new orientation logic)
export const getLeftAxisDomain = (selectedMetrics: string[], chartData: any[]): [number, number] => {
  const leftMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'left');
  console.log('🔍 getLeftAxisDomain:', { selectedMetrics, leftMetrics, chartDataLength: chartData.length });
  
  if (leftMetrics.length === 0) {
    console.log('⚠️ No left metrics found, returning default domain');
    return [0, 100];
  }
  
  let maxValue = 0;
  let dataPoints = 0;
  
  try {
    chartData.forEach((dataPoint, index) => {
      leftMetrics.forEach(metric => {
        const value = dataPoint[metric];
        console.log(`📊 DataPoint ${index}, Metric ${metric}:`, value);
        
        if (typeof value === 'number' && !isNaN(value) && value > maxValue) {
          maxValue = value;
        }
        dataPoints++;
      });
    });
    
    console.log('📊 Left axis calculation:', { maxValue, dataPoints, leftMetrics });
    
    // Add 10% padding to the top
    const paddedMax = maxValue > 0 ? maxValue * 1.1 : 100;
    console.log('🔧 Left axis paddedMax calculated:', paddedMax);
    
    const ceiledMax = Math.ceil(paddedMax);
    console.log('🔧 Left axis ceiledMax calculated:', ceiledMax);
    
    const domain: [number, number] = [0, ceiledMax];
    console.log('📊 Left axis domain FINAL:', { maxValue, paddedMax, ceiledMax, domain });
    
    return domain;
  } catch (error) {
    console.error('❌ Error in getLeftAxisDomain:', error);
    return [0, 100];
  }
};

// Calculate domain for right Y-axis (updated to use new orientation logic)  
export const getRightAxisDomain = (selectedMetrics: string[], chartData: any[]): [number, number] => {
  const rightMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'right');
  console.log('🔍 getRightAxisDomain:', { selectedMetrics, rightMetrics, chartDataLength: chartData.length });
  
  if (rightMetrics.length === 0) {
    console.log('⚠️ No right metrics found, returning default domain');
    return [0, 100];
  }
  
  let maxValue = 0;
  let dataPoints = 0;
  
  try {
    chartData.forEach((dataPoint, index) => {
      rightMetrics.forEach(metric => {
        const value = dataPoint[metric];
        console.log(`📊 DataPoint ${index}, Metric ${metric}:`, value);
        
        if (typeof value === 'number' && !isNaN(value) && value > maxValue) {
          maxValue = value;
        }
        dataPoints++;
      });
    });
    
    console.log('📊 Right axis calculation:', { maxValue, dataPoints, rightMetrics });
    
    // Add 10% padding to the top
    const paddedMax = maxValue > 0 ? maxValue * 1.1 : 100;
    console.log('🔧 Right axis paddedMax calculated:', paddedMax);
    
    const ceiledMax = Math.ceil(paddedMax);
    console.log('🔧 Right axis ceiledMax calculated:', ceiledMax);
    
    const domain: [number, number] = [0, ceiledMax];
    console.log('📊 Right axis domain FINAL:', { maxValue, paddedMax, ceiledMax, domain });
    
    return domain;
  } catch (error) {
    console.error('❌ Error in getRightAxisDomain:', error);
    return [0, 100];
  }
};

// Enhanced formatting for left Y-axis
export const formatLeftYAxis = (value: number, selectedMetrics: string[], chartData: any[]): string => {
  const leftMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'left');
  if (leftMetrics.length === 0) return value.toFixed(0);
  
  // Format based on the metric type
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  } else {
    return value.toFixed(0);
  }
};

// Enhanced formatting for right Y-axis
export const formatRightYAxis = (value: number, selectedMetrics: string[], chartData: any[]): string => {
  const rightMetrics = selectedMetrics.filter(m => getYAxisOrientation(m, selectedMetrics, chartData) === 'right');
  if (rightMetrics.length === 0) return value.toFixed(1);
  
  // Determine the primary metric type on right axis for formatting
  const currencyMetrics = rightMetrics.filter(m => ['cost', 'conversionsValue', 'avgCpc', 'cpa'].includes(m));
  const percentageMetrics = rightMetrics.filter(m => ['ctr', 'conversionRate', 'poas'].includes(m));
  const ratioMetrics = rightMetrics.filter(m => ['roas'].includes(m));
  const countMetrics = rightMetrics.filter(m => ['conversions'].includes(m));
  
  // Priority: Count > Currency > Percentage > Ratio
  if (countMetrics.length > 0) {
    // Count formatting for conversions on right axis
    return value.toFixed(0);
  } else if (currencyMetrics.length > 0) {
    // Currency formatting
    if (value >= 1000) {
      return `€${(value / 1000).toFixed(0)}K`;
    } else if (value >= 1) {
      return `€${value.toFixed(0)}`;
    } else {
      return `€${value.toFixed(2)}`;
    }
  } else if (percentageMetrics.length > 0) {
    // Percentage formatting
    return `${value.toFixed(1)}%`;
  } else if (ratioMetrics.length > 0) {
    // ROAS formatting (multiplier)
    return `${value.toFixed(1)}x`;
  } else {
    return value.toFixed(1);
  }
}; 