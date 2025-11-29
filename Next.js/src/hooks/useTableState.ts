import { useState } from 'react';

export function useTableState() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [campaignSearch, setCampaignSearch] = useState<string>('');

  // Sorting handlers
  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  // Filter handlers
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
  };

  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
  };

  // Page navigation
  const handlePageChange = (page: string) => {
    setCurrentPage(page);
  };

  // Search handlers
  const handleCampaignSearchChange = (search: string) => {
    setCampaignSearch(search);
  };

  // Reset functions
  const resetFilters = () => {
    setStatusFilter('all');
    setCampaignSearch('');
    setSortBy('name');
    setSortOrder('asc');
  };

  return {
    // State
    statusFilter,
    viewMode,
    sortBy,
    sortOrder,
    currentPage,
    campaignSearch,
    
    // Handlers
    handleSort,
    handleStatusFilterChange,
    handleViewModeChange,
    handlePageChange,
    handleCampaignSearchChange,
    resetFilters,
    
    // Setters for direct control
    setStatusFilter,
    setViewMode,
    setSortBy,
    setSortOrder,
    setCurrentPage,
    setCampaignSearch
  };
} 