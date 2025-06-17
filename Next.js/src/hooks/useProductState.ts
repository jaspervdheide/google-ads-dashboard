import { useState } from 'react';

export function useProductState() {
  const [campaignTypeFilter, setCampaignTypeFilter] = useState<'all' | 'shopping' | 'performance_max'>('all');
  const [productViewMode, setProductViewMode] = useState<'table' | 'graphs'>('table');
  const [productSort, setProductSort] = useState<{ field: string; direction: 'asc' | 'desc' }>({
    field: 'clicks',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);

  // Campaign type filter handlers
  const handleCampaignTypeFilterChange = (filter: 'all' | 'shopping' | 'performance_max') => {
    setCampaignTypeFilter(filter);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // View mode handlers
  const handleProductViewModeChange = (mode: 'table' | 'graphs') => {
    setProductViewMode(mode);
  };

  // Sort handlers
  const handleProductSort = (column: string) => {
    if (productSort.field === column) {
      setProductSort(prev => ({
        ...prev,
        direction: prev.direction === 'asc' ? 'desc' : 'asc'
      }));
    } else {
      setProductSort({
        field: column,
        direction: 'desc'
      });
    }
    setCurrentPage(1); // Reset to first page when sort changes
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Reset function
  const resetProductState = () => {
    setCampaignTypeFilter('all');
    setProductViewMode('table');
    setProductSort({ field: 'clicks', direction: 'desc' });
    setCurrentPage(1);
  };

  return {
    // State
    campaignTypeFilter,
    productViewMode,
    productSort,
    currentPage,
    
    // Handlers
    handleCampaignTypeFilterChange,
    handleProductViewModeChange,
    handleProductSort,
    handlePageChange,
    resetProductState,
    
    // Setters for direct control
    setCampaignTypeFilter,
    setProductViewMode,
    setProductSort,
    setCurrentPage
  };
} 