/**
 * Date utility functions for the Google Ads Dashboard
 * Extracted from the main Dashboard component for better code organization
 */

import React from 'react';
import { 
  Clock,
  History,
  CalendarDays,
  Calendar,
  BarChart3
} from 'lucide-react';
import { DateRange, CustomDateRange } from '../types/common';

// Re-export types for backward compatibility
export type { DateRange, CustomDateRange };

// Utility functions that need to be accessible by hooks
export const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0].replace(/-/g, '');
};

export const getApiDateRange = (range: DateRange | null): { days: number, startDate: string, endDate: string } => {
  if (!range) {
    return { days: 30, startDate: formatDateForAPI(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), endDate: formatDateForAPI(new Date()) };
  }

  if (range.apiDays) {
    return { 
      days: range.apiDays, 
      startDate: formatDateForAPI(range.startDate), 
      endDate: formatDateForAPI(range.endDate) 
    };
  }

  // Calculate days between start and end date
  const diffTime = Math.abs(range.endDate.getTime() - range.startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return { 
    days: diffDays, 
    startDate: formatDateForAPI(range.startDate), 
    endDate: formatDateForAPI(range.endDate) 
  };
};

// Generate date range options
export const generateDateRanges = (): DateRange[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const last7Days = new Date(today);
  last7Days.setDate(today.getDate() - 7);

  const last30Days = new Date(today);
  last30Days.setDate(today.getDate() - 30);

  const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

  const lastQuarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 - 3, 1);
  const lastQuarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 0);

  const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);

  return [
    {
      id: 'today',
      name: 'Today',
      icon: Clock,
      startDate: today,
      endDate: today,
      apiDays: 1
    },
    {
      id: 'yesterday',
      name: 'Yesterday',
      icon: History,
      startDate: yesterday,
      endDate: yesterday,
      apiDays: 1
    },
    {
      id: 'last-7-days',
      name: 'Last 7 days',
      icon: CalendarDays,
      startDate: last7Days,
      endDate: today,
      apiDays: 7
    },
    {
      id: 'last-30-days',
      name: 'Last 30 days',
      icon: Calendar,
      startDate: last30Days,
      endDate: today,
      apiDays: 30
    },
    {
      id: 'last-month',
      name: 'Last month',
      icon: Calendar,
      startDate: lastMonthStart,
      endDate: lastMonthEnd
    },
    {
      id: 'last-quarter',
      name: 'Last quarter',
      icon: BarChart3,
      startDate: lastQuarterStart,
      endDate: lastQuarterEnd
    },
    {
      id: 'last-year',
      name: 'Last year',
      icon: Calendar,
      startDate: lastYearStart,
      endDate: lastYearEnd
    }
  ];
};

export const formatDateRangeDisplay = (range: DateRange): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric'
    });
  };

  // Handle special cases for "Today" and "Yesterday"
  if (range.id === 'today') {
    return 'Today';
  }
  
  if (range.id === 'yesterday') {
    return 'Yesterday';
  }

  const startFormatted = formatDate(range.startDate);
  const endFormatted = formatDate(range.endDate);
  
  // If same year, don't repeat the year
  if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
  return `${startFormatted} - ${endFormatted}, ${range.endDate.getFullYear()}`;
  } else {
    return `${formatDate(range.startDate)}, ${range.startDate.getFullYear()} - ${formatDate(range.endDate)}, ${range.endDate.getFullYear()}`;
  }
};

export const isValidDateRange = (start: Date, end: Date): boolean => {
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  return start <= end && end <= today;
};

export const formatTimeAgo = (dateString: string) => {
  const now = new Date();
  const time = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
}; 