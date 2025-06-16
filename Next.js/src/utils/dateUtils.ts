/**
 * Google Ads specific date utilities
 * Uses shared formatDateForAPI from dateHelpers for consistency
 */

import { formatDateForAPI } from './dateHelpers';

// Re-export the shared function with Google Ads specific name for backward compatibility
export const formatDateForGoogleAds = formatDateForAPI;

/**
 * Calculates start and end dates for a given date range
 * @param dateRange - Number of days to go back from today
 * @returns Object with startDate and endDate as Date objects
 */
export const calculateDateRange = (dateRange: number) => {
  const endDate = new Date();
  const startDate = new Date();
  
  if (dateRange === 1) {
    // For today only, use the same date for start and end
    startDate.setTime(endDate.getTime());
  } else {
    // For multiple days, subtract the range
    startDate.setDate(endDate.getDate() - dateRange);
  }
  
  return { startDate, endDate };
};

/**
 * Calculates date range and returns Google Ads formatted strings
 * @param dateRange - Number of days to go back from today  
 * @returns Object with formatted startDateStr and endDateStr
 */
export const getFormattedDateRange = (dateRange: number) => {
  const { startDate, endDate } = calculateDateRange(dateRange);
  
  return {
    startDateStr: formatDateForAPI(startDate),
    endDateStr: formatDateForAPI(endDate),
    startDate,
    endDate
  };
};

/**
 * Calculates comparison periods for KPI analysis
 * @param dateRange - Number of days for the analysis period
 * @returns Object with current and previous period dates
 */
export const calculateComparisonPeriods = (dateRange: number) => {
  // Calculate current period
  const currentEndDate = new Date();
  const currentStartDate = new Date();
  currentStartDate.setDate(currentEndDate.getDate() - dateRange);
  
  // Calculate previous period (same duration)
  const previousEndDate = new Date(currentStartDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1); // End one day before current period
  const previousStartDate = new Date(previousEndDate);
  previousStartDate.setDate(previousStartDate.getDate() - dateRange + 1);
  
  return {
    currentPeriod: {
      startDate: currentStartDate,
      endDate: currentEndDate,
      startDateStr: formatDateForAPI(currentStartDate),
      endDateStr: formatDateForAPI(currentEndDate)
    },
    previousPeriod: {
      startDate: previousStartDate,
      endDate: previousEndDate,
      startDateStr: formatDateForAPI(previousStartDate),
      endDateStr: formatDateForAPI(previousEndDate)
    }
  };
}; 