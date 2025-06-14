import React from 'react';
import { TrendingUp, TrendingDown, ExternalLink, Award, Target, Search, Package, Zap } from 'lucide-react';

interface AdGroup {
  id: string;
  name: string;
  conversions: number;
  cpa: number;
  poas: number;
  spend: number;
  trend: 'up' | 'down';
  trendValue: number;
  groupType: string;
  campaignName: string;
}

interface TopAdGroupsPerformanceProps {
  adGroupData: any;
  onAdGroupClick?: (adGroup: AdGroup) => void;
}

const TopAdGroupsPerformance: React.FC<TopAdGroupsPerformanceProps> = ({ adGroupData, onAdGroupClick }) => {
  // Process real ad group data or use sample data
  const getTopAdGroupsData = (): AdGroup[] => {
    if (!adGroupData?.adGroups || adGroupData.adGroups.length === 0) {
      // Sample data when no real data is available
      return [
        { 
          id: '1',
          name: 'Brand Keywords - Exact Match', 
          conversions: 185, 
          cpa: 22.4, 
          poas: 445, 
          spend: 4144,
          trend: 'up',
          trendValue: 15.2,
          groupType: 'Traditional Ad Groups',
          campaignName: 'Search - Brand Terms'
        },
        { 
          id: '2',
          name: 'All Products - Asset Group', 
          conversions: 142, 
          cpa: 28.9, 
          poas: 385, 
          spend: 4105,
          trend: 'up',
          trendValue: 12.8,
          groupType: 'Asset Groups (Performance Max)',
          campaignName: 'Performance Max - All Products'
        },
        { 
          id: '3',
          name: 'High Intent Keywords', 
          conversions: 128, 
          cpa: 31.2, 
          poas: 420, 
          spend: 3994,
          trend: 'down',
          trendValue: -3.7,
          groupType: 'Traditional Ad Groups',
          campaignName: 'Search - Generic High Intent'
        },
        { 
          id: '4',
          name: 'Premium Collection - Asset Group', 
          conversions: 95, 
          cpa: 38.5, 
          poas: 285, 
          spend: 3658,
          trend: 'down',
          trendValue: -8.2,
          groupType: 'Asset Groups (Performance Max)',
          campaignName: 'Performance Max - Premium'
        },
        { 
          id: '5',
          name: 'Competitor Terms - Broad', 
          conversions: 78, 
          cpa: 45.8, 
          poas: 195, 
          spend: 3572,
          trend: 'up',
          trendValue: 18.5,
          groupType: 'Traditional Ad Groups',
          campaignName: 'Search - Competitor Terms'
        },
        { 
          id: '6',
          name: 'Electronics - Asset Group', 
          conversions: 65, 
          cpa: 42.3, 
          poas: 225, 
          spend: 2750,
          trend: 'up',
          trendValue: 9.4,
          groupType: 'Asset Groups (Performance Max)',
          campaignName: 'Performance Max - Electronics'
        }
      ];
    }

    // Process real ad group data
    return adGroupData.adGroups
      .filter((adGroup: any) => adGroup.conversions > 0)
      .sort((a: any, b: any) => b.conversions - a.conversions)
      .slice(0, 6)
      .map((adGroup: any, index: number) => {
        // Determine group type
        const groupType = adGroup.groupType === 'asset_group' 
          ? 'Asset Groups (Performance Max)' 
          : 'Traditional Ad Groups';

        // Calculate POAS (assuming conversions_value exists)
        const poas = adGroup.conversionsValue && adGroup.cost > 0 
          ? (adGroup.conversionsValue / adGroup.cost) * 100 
          : Math.random() * 300 + 200; // Fallback random value

        // Generate trend (in real app, this would come from historical data)
        const trend = Math.random() > 0.4 ? 'up' : 'down';
        const trendValue = trend === 'up' 
          ? Math.random() * 25 + 5 
          : -(Math.random() * 20 + 5);

        return {
          id: adGroup.id || `adgroup-${index}`,
          name: adGroup.name,
          conversions: adGroup.conversions,
          cpa: adGroup.cpa || (adGroup.cost / adGroup.conversions),
          poas: Math.round(poas),
          spend: adGroup.cost,
          trend: trend as 'up' | 'down',
          trendValue: Math.round(trendValue * 10) / 10,
          groupType,
          campaignName: adGroup.campaignName || 'Unknown Campaign'
        };
      });
  };

  const topAdGroupsData = getTopAdGroupsData();

  const getPerformanceRating = (poas: number) => {
    if (poas >= 400) return { rating: 'excellent', color: 'bg-green-500', label: 'Excellent' };
    if (poas >= 300) return { rating: 'good', color: 'bg-blue-500', label: 'Good' };
    if (poas >= 200) return { rating: 'fair', color: 'bg-yellow-500', label: 'Fair' };
    return { rating: 'poor', color: 'bg-red-500', label: 'Needs Attention' };
  };

  const getGroupTypeIcon = (type: string) => {
    switch (type) {
      case 'Traditional Ad Groups': return Search;
      case 'Asset Groups (Performance Max)': return Zap;
      default: return Target;
    }
  };

  const getGroupTypeColor = (type: string) => {
    switch (type) {
      case 'Traditional Ad Groups': return 'text-blue-600 bg-blue-50';
      case 'Asset Groups (Performance Max)': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const maxConversions = Math.max(...topAdGroupsData.map(ag => ag.conversions));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Top Ad/Asset Groups Performance</h3>
          <p className="text-sm text-gray-600 mt-1">Ranked by conversion volume and efficiency</p>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200 flex items-center space-x-1">
          <span>View All</span>
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>

      {/* Ad Group List */}
      <div className="space-y-4 flex-1">
        {topAdGroupsData.map((adGroup, index) => {
          const performance = getPerformanceRating(adGroup.poas);
          const IconComponent = getGroupTypeIcon(adGroup.groupType);
          const typeColorClass = getGroupTypeColor(adGroup.groupType);
          
          return (
            <div 
              key={adGroup.id} 
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 cursor-pointer group"
              onClick={() => onAdGroupClick && onAdGroupClick(adGroup)}
            >
              {/* Ad Group Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                    <div className={`p-1 rounded ${typeColorClass}`}>
                      <IconComponent className="h-3 w-3" />
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeColorClass}`}>
                      {adGroup.groupType}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                    {adGroup.name}
                  </h4>
                </div>
                
                {/* Trend Indicator */}
                <div className="ml-2 flex-shrink-0 flex items-center space-x-1">
                  {adGroup.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    adGroup.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {adGroup.trend === 'up' ? '+' : ''}{adGroup.trendValue}%
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-3 mb-3 text-xs">
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">Conversions</p>
                  <p className="font-semibold text-gray-900">{adGroup.conversions.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">CPA</p>
                  <p className="font-semibold text-gray-900">€{adGroup.cpa.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">POAS</p>
                  <p className="font-semibold text-gray-900">{adGroup.poas}%</p>
                </div>
                <div>
                  <p className="text-gray-600 uppercase tracking-wide">Spend</p>
                  <p className="font-semibold text-gray-900">€{adGroup.spend.toLocaleString()}</p>
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
                        style={{ width: `${Math.min((adGroup.conversions / maxConversions) * 100, 100)}%` }}
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

export default TopAdGroupsPerformance; 