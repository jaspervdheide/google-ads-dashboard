/**
 * Google Ads specific date utilities
 * Consolidated wrapper around shared dateHelpers for DRY compliance
 */

import { 
  formatDateForAPI, 
  getApiDateRange, 
  generateDateRanges,
  formatDateRangeDisplay,
  isValidDateRange,
  formatTimeAgo,
  type DateRange,
  type CustomDateRange
} from './dateHelpers';

// Re-export all shared functionality
export {
  formatDateForAPI,
  getApiDateRange,
  generateDateRanges,
  formatDateRangeDisplay,
  isValidDateRange,
  formatTimeAgo,
  type DateRange,
  type CustomDateRange
};

// Legacy alias for backward compatibility - will be removed in future version
export const formatDateForGoogleAds = formatDateForAPI;

/**
 * Google Ads specific: Get formatted date range for API calls
 * Uses shared getApiDateRange internally
 */
export const getFormattedDateRange = (dateRange: number) => {
  const today = new Date();
  const startDate = new Date();
  startDate.setDate(today.getDate() - dateRange);
  
  return {
    startDateStr: formatDateForAPI(startDate),
    endDateStr: formatDateForAPI(today),
    startDate,
    endDate: today
  };
};

/**
 * Google Ads specific: Calculate comparison periods for KPI analysis
 */
export const calculateComparisonPeriods = (dateRange: number) => {
  const currentEndDate = new Date();
  const currentStartDate = new Date();
  currentStartDate.setDate(currentEndDate.getDate() - dateRange);
  
  const previousEndDate = new Date(currentStartDate);
  previousEndDate.setDate(previousEndDate.getDate() - 1);
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