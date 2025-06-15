import { useState } from 'react';

export function useKeywordState() {
  const [keywordMatchTypeFilter, setKeywordMatchTypeFilter] = useState<'all' | 'exact' | 'phrase' | 'broad'>('all');
  const [keywordStatusFilter, setKeywordStatusFilter] = useState<'all' | 'enabled' | 'paused' | 'removed'>('all');
  const [keywordSearch, setKeywordSearch] = useState<string>('');
  const [keywordSort, setKeywordSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'clicks',
    direction: 'desc'
  });

  // Match type filter handlers
  const handleKeywordMatchTypeFilterChange = (filter: 'all' | 'exact' | 'phrase' | 'broad') => {
    setKeywordMatchTypeFilter(filter);
  };

  // Status filter handlers
  const handleKeywordStatusFilterChange = (filter: 'all' | 'enabled' | 'paused' | 'removed') => {
    setKeywordStatusFilter(filter);
  };

  // Search handlers
  const handleKeywordSearchChange = (search: string) => {
    setKeywordSearch(search);
  };

  // Sort handlers
  const handleKeywordSort = (column: string) => {
    if (keywordSort.field === column) {
      setKeywordSort(prev => ({
        ...prev,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setKeywordSort({
        field: column,
        direction: 'desc'
      });
    }
  };

  // Reset function
  const resetKeywordState = () => {
    setKeywordMatchTypeFilter('all');
    setKeywordStatusFilter('all');
    setKeywordSearch('');
    setKeywordSort({ field: 'clicks', direction: 'desc' });
  };

  return {
    // State
    keywordMatchTypeFilter,
    keywordStatusFilter,
    keywordSearch,
    keywordSort,
    
    // Handlers
    handleKeywordMatchTypeFilterChange,
    handleKeywordStatusFilterChange,
    handleKeywordSearchChange,
    handleKeywordSort,
    resetKeywordState,
    
    // Setters for direct control
    setKeywordMatchTypeFilter,
    setKeywordStatusFilter,
    setKeywordSearch,
    setKeywordSort
  };
} 