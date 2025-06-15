'use client';

import React, { useState } from 'react';
import { Target, BarChart3, Table as TableIcon } from 'lucide-react';
import Keywords from './Keywords';
import { DateRange } from '../../types/common';

interface KeywordsWrapperProps {
  selectedAccount: string;
  selectedDateRange: DateRange | null;
}

const KeywordsWrapper: React.FC<KeywordsWrapperProps> = ({ 
  selectedAccount,
  selectedDateRange
}) => {
  // Local state for keywords page
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [dataTypeFilter, setDataTypeFilter] = useState<'all' | 'keywords' | 'search_terms'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'graphs'>('table');
  const pageSize = 50;

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keywords & Search Terms</h1>
            <p className="text-gray-600 mt-1">Analyze keyword performance and search insights</p>
          </div>
          
          {/* Filter Controls */}
          <div className="flex items-center space-x-4">
            {/* Data Type Filter */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDataTypeFilter('all')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dataTypeFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDataTypeFilter('keywords')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dataTypeFilter === 'keywords'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Keywords
              </button>
              <button
                onClick={() => setDataTypeFilter('search_terms')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  dataTypeFilter === 'search_terms'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Search Terms
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'active'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  statusFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableIcon className="w-4 h-4" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('graphs')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all duration-200 ${
                  viewMode === 'graphs'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Graphs</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Keywords Component */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Keywords
          selectedAccount={selectedAccount}
          selectedDateRange={selectedDateRange}
          searchTerm={searchTerm}
          pageSize={pageSize}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          statusFilter={statusFilter}
          dataTypeFilter={dataTypeFilter}
          viewMode={viewMode}
          onSort={handleSort}
        />
      </div>
    </div>
  );
};

export default KeywordsWrapper; 