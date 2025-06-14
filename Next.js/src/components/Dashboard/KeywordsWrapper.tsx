'use client';

import React, { useState } from 'react';
import { Search, Target, BarChart3, Table as TableIcon } from 'lucide-react';
import { DateRange } from '../../utils';
import Keywords from './Keywords';

interface KeywordsWrapperProps {
  selectedAccount: string;
  selectedDateRange: DateRange | null;
}

const KeywordsWrapper: React.FC<KeywordsWrapperProps> = ({ 
  selectedAccount, 
  selectedDateRange 
}) => {
  // View controls - matching Ad Groups exactly
  const [viewMode, setViewMode] = useState<'table' | 'graphs'>('table');
  const [dataTypeFilter, setDataTypeFilter] = useState<'all' | 'keywords' | 'search_terms'>('all');

  // Table controls
  const [sortColumn, setSortColumn] = useState<string>('impressions');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageSize] = useState(50);

  // Fixed filter values (no UI controls)
  const searchTerm = '';
  const statusFilter = 'active';

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Keywords & Search Terms</h1>
            <p className="text-gray-600 mt-1">Analyze keyword performance and search term insights</p>
          </div>
          
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-4">
            {/* Data Type Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setDataTypeFilter('all')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  dataTypeFilter === 'all'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>All</span>
              </button>
              <button
                onClick={() => setDataTypeFilter('keywords')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  dataTypeFilter === 'keywords'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Target className="h-4 w-4" />
                <span>Keywords</span>
              </button>
              <button
                onClick={() => setDataTypeFilter('search_terms')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  dataTypeFilter === 'search_terms'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search Terms</span>
              </button>
            </div>

            {/* Table/Graphs Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TableIcon className="h-4 w-4" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('graphs')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'graphs'
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>Graphs</span>
              </button>
            </div>
          </div>
        </div>


      </div>

      {/* Keywords Component */}
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
  );
};

export default KeywordsWrapper; 