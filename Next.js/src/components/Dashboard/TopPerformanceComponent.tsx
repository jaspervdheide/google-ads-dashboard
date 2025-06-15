import React from 'react';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

// Generic interfaces
interface BasePerformanceItem {
  id: string;
  name: string;
  conversions: number;
  cpa: number;
  poas: number;
  spend: number;
  trend: 'up' | 'down';
  trendValue: number;
}

interface PerformanceConfig {
  title: string;
  description: string;
  dataKey: string; // Key to access data from props (e.g., 'campaigns', 'adGroups', 'data')
  getItems: (data: any) => BasePerformanceItem[];
  getTypeInfo: (item: any) => {
    type: string;
    icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  };
  getExtraInfo?: (item: any) => {
    label: string;
    value: string;
    colorClass: string;
  } | null;
  getSubtitle?: (item: any) => string;
}

interface TopPerformanceComponentProps {
  data: any;
  config: PerformanceConfig;
  onItemClick?: (item: BasePerformanceItem) => void;
}

const TopPerformanceComponent: React.FC<TopPerformanceComponentProps> = ({ 
  data, 
  config, 
  onItemClick 
}) => {
  // Process data using the configuration
  const getTopItemsData = (): BasePerformanceItem[] => {
    if (!data || !data[config.dataKey] || data[config.dataKey].length === 0) {
      return [];
    }

    return config.getItems(data);
  };

  const topItemsData = getTopItemsData();

  const getPerformanceRating = (poas: number) => {
    if (poas >= 400) return { rating: 'excellent', color: 'bg-green-500', label: 'Excellent' };
    if (poas >= 300) return { rating: 'good', color: 'bg-blue-500', label: 'Good' };
    if (poas >= 200) return { rating: 'fair', color: 'bg-yellow-500', label: 'Fair' };
    return { rating: 'poor', color: 'bg-red-500', label: 'Needs Attention' };
  };

  const maxConversions = topItemsData.length > 0 ? Math.max(...topItemsData.map(item => item.conversions)) : 1;

  if (topItemsData.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{config.description}</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">No data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{config.description}</p>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center space-x-1">
          <span>View All</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {/* Items List */}
      <div className="space-y-4 flex-1">
        {topItemsData.map((item, index) => {
          const performance = getPerformanceRating(item.poas);
          const typeInfo = config.getTypeInfo(item);
          const extraInfo = config.getExtraInfo?.(item);
          const subtitle = config.getSubtitle?.(item);
          const IconComponent = typeInfo.icon;
          
          return (
            <div 
              key={item.id} 
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer group"
              onClick={() => onItemClick && onItemClick(item)}
            >
              {/* Item Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div className={`p-1 rounded ${typeInfo.colorClass}`}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.colorClass}`}>
                      {typeInfo.type}
                    </span>
                    {extraInfo && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${extraInfo.colorClass}`}>
                        {extraInfo.value}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                    {item.name}
                  </h4>
                  {subtitle && (
                    <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                  )}
                </div>
                
                {/* Trend Indicator */}
                <div className="ml-2 flex-shrink-0 flex items-center space-x-1">
                  {item.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    item.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.trend === 'up' ? '+' : ''}{item.trendValue}%
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 mb-3 text-xs">
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">Conversions</p>
                  <p className="font-semibold text-gray-900">{item.conversions.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">CPA</p>
                  <p className="font-semibold text-gray-900">€{item.cpa.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">POAS</p>
                  <p className="font-semibold text-gray-900">{item.poas}%</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">Spend</p>
                  <p className="font-semibold text-gray-900">€{item.spend.toLocaleString()}</p>
                </div>
              </div>

              {/* Performance Bar and Rating */}
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Performance</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full text-white ${performance.color}`}>
                      {performance.label}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-teal-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((item.conversions / maxConversions) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${performance.color}`}></div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TopPerformanceComponent; 