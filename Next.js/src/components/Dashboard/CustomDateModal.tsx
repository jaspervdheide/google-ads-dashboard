'use client';

import React from 'react';

interface LocalCustomDateRange {
  startDate: Date | string;
  endDate: Date | string;
}

interface CustomDateModalProps {
  isOpen: boolean;
  customDateRange: LocalCustomDateRange;
  onClose: () => void;
  onApply: () => void;
  onDateChange: (range: LocalCustomDateRange) => void;
}

const CustomDateModal: React.FC<CustomDateModalProps> = ({
  isOpen,
  customDateRange,
  onClose,
  onApply,
  onDateChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Custom Date Range</h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={typeof customDateRange.startDate === 'string' 
                  ? customDateRange.startDate
                  : customDateRange.startDate.toISOString().split('T')[0]
                }
                onChange={(e) => onDateChange({ 
                  ...customDateRange, 
                  startDate: e.target.value 
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={typeof customDateRange.endDate === 'string' 
                  ? customDateRange.endDate
                  : customDateRange.endDate.toISOString().split('T')[0]
                }
                onChange={(e) => onDateChange({ 
                  ...customDateRange, 
                  endDate: e.target.value 
                })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onApply}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomDateModal; 