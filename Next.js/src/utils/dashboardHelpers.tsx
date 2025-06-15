import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { Account } from '../types';

// =============================================================================
// ACCOUNT DISPLAY HELPERS
// =============================================================================

/**
 * Clean country code display - remove parentheses content
 * @param countryCode - Country code like "FR (Tapis)" or "NL"
 * @returns Clean country code like "FR" or "NL"
 */
export const cleanCountryCode = (countryCode: string): string => {
  // "FR (Tapis)" → "FR", "NL" → "NL"
  return countryCode.split(' ')[0];
};

/**
 * Get display name for account - prepend country code if needed
 * @param account - Account object
 * @returns Formatted display name
 */
export const getDisplayName = (account: Account): string => {
  // Check if Account type has countryCode property - if not, just return name
  if (!('countryCode' in account) || !account.countryCode) {
    return (account as any).name || 'Unknown Account';
  }
  
  const cleanCode = cleanCountryCode((account as any).countryCode);
  // If name already starts with country code, use as is
  // Otherwise, prepend the country code
  if ((account as any).name?.startsWith(cleanCode + ' - ')) {
    return (account as any).name;
  }
  return `${cleanCode} - ${(account as any).name}`;
};

// =============================================================================
// ANOMALY DISPLAY HELPERS
// =============================================================================

/**
 * Get severity icon for anomaly display
 * @param severity - Anomaly severity level
 * @returns React icon component
 */
export const getSeverityIcon = (severity: 'high' | 'medium' | 'low'): React.ReactElement => {
  switch (severity) {
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'medium':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'low':
      return <Info className="h-4 w-4 text-blue-500" />;
  }
};

/**
 * Get severity color for anomaly display
 * @param severity - Anomaly severity level
 * @returns Hex color string
 */
export const getSeverityColor = (severity: 'high' | 'medium' | 'low'): string => {
  switch (severity) {
    case 'high':
      return '#ef4444'; // red-500
    case 'medium':
      return '#eab308'; // yellow-500
    case 'low':
      return '#3b82f6'; // blue-500
  }
};

// =============================================================================
// DATE GRANULARITY HELPERS
// =============================================================================

/**
 * Determine appropriate date granularity based on date range
 * @param rangeId - Date range identifier
 * @returns Appropriate granularity
 */
export const getDefaultGranularity = (rangeId: string): 'daily' | 'weekly' | 'monthly' => {
  if (rangeId === 'today' || rangeId === 'yesterday' || rangeId === 'last-7-days') {
    return 'daily';
  } else if (rangeId === 'last-30-days' || rangeId === 'last-month') {
    return 'weekly';
  } else {
    return 'monthly';
  }
};

// =============================================================================
// PERFORMANCE DISTRIBUTION HELPERS
// =============================================================================

/**
 * Calculate performance distribution for pie chart
 * @param campaigns - Array of campaigns
 * @returns Performance distribution data
 */
export const getPerformanceDistribution = (campaigns: any[]) => {
  if (!campaigns || campaigns.length === 0) return [];
  
  const high = campaigns.filter(c => c.ctr > 0.05).length;
  const medium = campaigns.filter(c => c.ctr > 0.02 && c.ctr <= 0.05).length;
  const low = campaigns.filter(c => c.ctr <= 0.02).length;
  
  return [
    { name: 'High Performance', value: high, color: '#10B981' },
    { name: 'Medium Performance', value: medium, color: '#F59E0B' },
    { name: 'Low Performance', value: low, color: '#EF4444' }
  ];
}; 