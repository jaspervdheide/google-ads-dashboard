import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  count?: number;
  height?: string;
  width?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className = '', 
  count = 1, 
  height = 'h-4', 
  width = 'w-full' 
}) => {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`animate-pulse bg-gray-200 rounded ${height} ${width} ${className}`}
        />
      ))}
    </>
  );
};

export const KpiCardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <div className="flex items-center">
      <div className="flex-1">
        <SkeletonLoader height="h-4" width="w-24" className="mb-2" />
        <SkeletonLoader height="h-8" width="w-16" className="mb-1" />
        <SkeletonLoader height="h-3" width="w-20" />
      </div>
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ columns: number }> = ({ columns }) => (
  <tr className="hover:bg-gray-50">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-6 py-4 whitespace-nowrap">
        <SkeletonLoader height="h-4" width={index === 0 ? 'w-32' : 'w-16'} />
      </td>
    ))}
  </tr>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
    <SkeletonLoader height="h-6" width="w-48" className="mb-4" />
    <div className="h-80 bg-gray-100 rounded flex items-center justify-center">
      <div className="flex items-center space-x-2 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
        <span>Loading chart...</span>
      </div>
    </div>
  </div>
);

export default SkeletonLoader; 