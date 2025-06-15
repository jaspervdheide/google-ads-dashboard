import { useState } from 'react';

export function useChartState() {
  const [selectedChartMetrics, setSelectedChartMetrics] = useState<string[]>(['impressions', 'clicks']);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [dateGranularity, setDateGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [hoverChart, setHoverChart] = useState({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: '',
    campaignName: '',
    campaignId: ''
  });

  // Chart configuration handlers
  const handleChartMetricsChange = (metrics: string[]) => {
    setSelectedChartMetrics(metrics);
  };

  const handleChartTypeChange = (type: 'line' | 'bar') => {
    setChartType(type);
  };

  const handleDateGranularityChange = (granularity: 'day' | 'week' | 'month') => {
    setDateGranularity(granularity);
  };

  // Hover handlers
  const handleChartHover = () => {
    // This will be implemented based on chart library requirements
    console.log('Chart hover triggered');
  };

  const handleChartLeave = () => {
    setHoverChart(prev => ({ ...prev, isVisible: false }));
  };

  const showHoverChart = (data: {
    position: { x: number; y: number };
    metricType: string;
    metricValue: string;
    campaignName: string;
    campaignId: string;
  }) => {
    setHoverChart({
      isVisible: true,
      ...data
    });
  };

  // Reset functions
  const resetChartSettings = () => {
    setSelectedChartMetrics(['impressions', 'clicks']);
    setChartType('line');
    setDateGranularity('day');
  };

  return {
    // State
    selectedChartMetrics,
    chartType,
    dateGranularity,
    hoverChart,
    
    // Handlers
    handleChartMetricsChange,
    handleChartTypeChange,
    handleDateGranularityChange,
    handleChartHover,
    handleChartLeave,
    showHoverChart,
    resetChartSettings,
    
    // Setters for direct control
    setSelectedChartMetrics,
    setChartType,
    setDateGranularity,
    setHoverChart
  };
} 