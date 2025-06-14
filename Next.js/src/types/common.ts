/**
 * Common TypeScript interfaces and types
 * Shared across multiple components and utilities
 */

import React from 'react';

export interface DateRange {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  startDate: Date;
  endDate: Date;
  apiDays?: number; // For API compatibility
}

export interface CustomDateRange {
  startDate: Date;
  endDate: Date;
} 