import { useState } from 'react';

export function useAdGroupState() {
  const [adGroupTypeFilter, setAdGroupTypeFilter] = useState<'all' | 'traditional' | 'asset'>('all');
  const [adGroupViewMode, setAdGroupViewMode] = useState<'table' | 'graphs'>('table');
  const [adGroupSort, setAdGroupSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'name',
    direction: 'asc'
  });

  // Type filter handlers
  const handleAdGroupTypeFilterChange = (filter: 'all' | 'traditional' | 'asset') => {
    setAdGroupTypeFilter(filter);
  };

  // View mode handlers
  const handleAdGroupViewModeChange = (mode: 'table' | 'graphs') => {
    setAdGroupViewMode(mode);
  };

  // Sort handlers
  const handleAdGroupSort = (column: string) => {
    if (adGroupSort.field === column) {
      setAdGroupSort(prev => ({
        ...prev,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setAdGroupSort({
        field: column,
        direction: 'desc'
      });
    }
  };

  // Reset function
  const resetAdGroupState = () => {
    setAdGroupTypeFilter('all');
    setAdGroupViewMode('table');
    setAdGroupSort({ field: 'name', direction: 'asc' });
  };

  return {
    // State
    adGroupTypeFilter,
    adGroupViewMode,
    adGroupSort,
    
    // Handlers
    handleAdGroupTypeFilterChange,
    handleAdGroupViewModeChange,
    handleAdGroupSort,
    resetAdGroupState,
    
    // Setters for direct control
    setAdGroupTypeFilter,
    setAdGroupViewMode,
    setAdGroupSort
  };
} 