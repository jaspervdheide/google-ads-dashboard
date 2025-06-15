import { useState } from 'react';
import { Calendar, Clock, CalendarDays } from 'lucide-react';
import { DateRange } from '../types/common';

export function useDateRangeState() {
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({
    id: '30',
    name: 'Last 30 days',
    icon: Calendar,
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
    apiDays: 30
  });

  const [customDateRange, setCustomDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date()
  });

  const dateRanges: DateRange[] = [
    { id: '1', name: 'Today', icon: Clock, startDate: new Date(), endDate: new Date(), apiDays: 1 },
    { id: 'yesterday', name: 'Yesterday', icon: Clock, startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), apiDays: 1 },
    { id: '7', name: 'Last 7 days', icon: Calendar, startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate: new Date(), apiDays: 7 },
    { id: '30', name: 'Last 30 days', icon: Calendar, startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate: new Date(), apiDays: 30 },
    { id: '90', name: 'Last 90 days', icon: Calendar, startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), endDate: new Date(), apiDays: 90 },
    { id: 'thisMonth', name: 'This month', icon: CalendarDays, startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1), endDate: new Date(), apiDays: new Date().getDate() },
    { id: 'lastMonth', name: 'Last month', icon: CalendarDays, startDate: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), endDate: new Date(new Date().getFullYear(), new Date().getMonth(), 0), apiDays: new Date(new Date().getFullYear(), new Date().getMonth(), 0).getDate() },
    { id: 'custom', name: 'Custom', icon: CalendarDays, startDate: customDateRange.startDate, endDate: customDateRange.endDate }
  ];

  // Date range handlers
  const handleDateRangeSelect = (range: DateRange) => {
    setSelectedDateRange(range);
  };

  const handleCustomDateChange = (range: { startDate: Date; endDate: Date }) => {
    setCustomDateRange(range);
  };

  const handleCustomDateApply = () => {
    const customRange: DateRange = {
      id: 'custom',
      name: 'Custom',
      icon: CalendarDays,
      startDate: customDateRange.startDate,
      endDate: customDateRange.endDate
    };
    setSelectedDateRange(customRange);
  };

  // Utility functions
  const formatDateRangeDisplay = (range: DateRange): string => {
    if (range.id === 'custom') {
      return `${range.startDate.toLocaleDateString()} - ${range.endDate.toLocaleDateString()}`;
    }
    return range.name;
  };

  const getDateRangeForAPI = () => {
    return {
      startDate: selectedDateRange.startDate.toISOString().split('T')[0],
      endDate: selectedDateRange.endDate.toISOString().split('T')[0],
      value: selectedDateRange.id
    };
  };

  return {
    // State
    selectedDateRange,
    customDateRange,
    dateRanges,
    
    // Handlers
    handleDateRangeSelect,
    handleCustomDateChange,
    handleCustomDateApply,
    
    // Utilities
    formatDateRangeDisplay,
    getDateRangeForAPI,
    
    // Setters for direct control
    setSelectedDateRange,
    setCustomDateRange
  };
} 