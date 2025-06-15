import { useState, useRef, useCallback } from 'react';

interface HoverChartState {
  isVisible: boolean;
  position: { x: number; y: number };
  metricType: string;
  metricValue: string;
  campaignName: string;
  campaignId: string;
}

interface UseHoverChartReturn {
  hoverChart: HoverChartState;
  handleMetricHover: (
    event: React.MouseEvent,
    metricType: string,
    metricValue: string | number,
    campaignName: string,
    campaignId: string
  ) => void;
  handleMetricLeave: (metricType?: string) => void;
  handleChartHover: () => void;
  handleChartLeave: () => void;
}

export const useHoverChart = (): UseHoverChartReturn => {
  const [hoverChart, setHoverChart] = useState<HoverChartState>({
    isVisible: false,
    position: { x: 0, y: 0 },
    metricType: '',
    metricValue: '',
    campaignName: '',
    campaignId: ''
  });

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMetricHover = useCallback((
    event: React.MouseEvent,
    metricType: string,
    metricValue: string | number,
    campaignName: string,
    campaignId: string
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoverChart({
      isVisible: true,
      position: { x: rect.right + 10, y: rect.top },
      metricType,
      metricValue: metricValue.toString(),
      campaignName,
      campaignId
    });
  }, []);

  const handleMetricLeave = useCallback((metricType?: string) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Only add delay for last two columns where chart appears to the left
    const isLastTwoColumns = metricType === 'conversionsValue' || metricType === 'roas';
    
    if (isLastTwoColumns) {
      // Add delay for last two columns to allow mouse to move to chart
      hoverTimeoutRef.current = setTimeout(() => {
        setHoverChart(prev => ({ ...prev, isVisible: false }));
      }, 150);
    } else {
      // Hide immediately for other columns
      setHoverChart(prev => ({ ...prev, isVisible: false }));
    }
  }, []);

  const handleChartHover = useCallback(() => {
    // Clear the timeout when hovering over chart
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Keep chart visible when hovering over it
    setHoverChart(prev => ({ ...prev, isVisible: true }));
  }, []);

  const handleChartLeave = useCallback(() => {
    // Hide chart immediately when leaving the chart area
    setHoverChart(prev => ({ ...prev, isVisible: false }));
  }, []);

  return {
    hoverChart,
    handleMetricHover,
    handleMetricLeave,
    handleChartHover,
    handleChartLeave
  };
}; 