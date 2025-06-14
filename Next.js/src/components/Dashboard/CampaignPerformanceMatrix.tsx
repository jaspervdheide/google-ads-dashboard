import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, Award, ShoppingBag, TrendingUp, TrendingDown, Info, Filter } from 'lucide-react';

interface CampaignMatrixData {
  id: string;
  name: string;
  conversions: number;
  poas: number;
  spend: number;
  type: string;
  quadrant: string;
  cpa: number;
  clicks: number;
}

interface CampaignPerformanceMatrixProps {
  campaignData: any;
  onCampaignClick?: (campaign: CampaignMatrixData) => void;
}

const CampaignPerformanceMatrix: React.FC<CampaignPerformanceMatrixProps> = ({ campaignData, onCampaignClick }) => {
  const [selectedTypes, setSelectedTypes] = useState(['Search', 'Performance Max', 'Shopping']);
  const [showQuadrantInfo, setShowQuadrantInfo] = useState(false);

  // Process real campaign data or use sample data
  const getPerformanceScatterData = (): CampaignMatrixData[] => {
    if (!campaignData?.campaigns || campaignData.campaigns.length === 0) {
      // Sample data when no real data is available
      return [
        { 
          id: '1',
          name: 'Search - Branding', 
          conversions: 180, 
          poas: 425, 
          spend: 15000, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 28.5,
          clicks: 2450
        },
        { 
          id: '2',
          name: 'Search - Generic High Intent', 
          conversions: 220, 
          poas: 380, 
          spend: 22000, 
          type: 'Search', 
          quadrant: 'Star',
          cpa: 31.2,
          clicks: 3100
        },
        { 
          id: '3',
          name: 'Performance Max - Basic', 
          conversions: 95, 
          poas: 520, 
          spend: 8500, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 24.8,
          clicks: 1850
        },
        { 
          id: '4',
          name: 'Shopping - Premium', 
          conversions: 65, 
          poas: 180, 
          spend: 18000, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 58.2,
          clicks: 1200
        },
        { 
          id: '5',
          name: 'Search - Brands', 
          conversions: 340, 
          poas: 290, 
          spend: 35000, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 35.8,
          clicks: 4200
        },
        { 
          id: '6',
          name: 'Performance Max - Luxury', 
          conversions: 125, 
          poas: 445, 
          spend: 12000, 
          type: 'Performance Max', 
          quadrant: 'Star',
          cpa: 26.9,
          clicks: 2100
        },
        { 
          id: '7',
          name: 'Shopping - Basic', 
          conversions: 85, 
          poas: 245, 
          spend: 14000, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 42.5,
          clicks: 1650
        },
        { 
          id: '8',
          name: 'Search - Generic Efficiency', 
          conversions: 160, 
          poas: 195, 
          spend: 28000, 
          type: 'Search', 
          quadrant: 'Cash Cow',
          cpa: 48.2,
          clicks: 2900
        },
        { 
          id: '9',
          name: 'Performance Max - Premium', 
          conversions: 75, 
          poas: 385, 
          spend: 9500, 
          type: 'Performance Max', 
          quadrant: 'Question Mark',
          cpa: 29.8,
          clicks: 1500
        },
        { 
          id: '10',
          name: 'Shopping - Mid-tier', 
          conversions: 110, 
          poas: 165, 
          spend: 16500, 
          type: 'Shopping', 
          quadrant: 'Dog',
          cpa: 52.1,
          clicks: 1980
        }
      ];
    }

    // Process real campaign data
    return campaignData.campaigns
      .filter((campaign: any) => campaign.conversions > 0 && campaign.cost > 0)
      .slice(0, 10) // Limit to top 10 for better visualization
      .map((campaign: any, index: number) => {
        // Determine campaign type based on name
        const name = campaign.name.toLowerCase();
        let campaignType = 'Other';
        if (name.includes('performance max') || name.includes('pmax')) {
          campaignType = 'Performance Max';
        } else if (name.includes('shopping') || name.includes('shop')) {
          campaignType = 'Shopping';
        } else if (name.includes('search') || name.includes('src')) {
          campaignType = 'Search';
        }

        // Calculate POAS (assuming conversions_value exists)
        const poas = campaign.conversions_value && campaign.cost > 0 
          ? (campaign.conversions_value / campaign.cost) * 100 
          : Math.random() * 300 + 200; // Fallback random value

        const cpa = campaign.cpa || (campaign.cost / campaign.conversions);

        return {
          id: campaign.id || `campaign-${index}`,
          name: campaign.name,
          conversions: campaign.conversions,
          poas: Math.round(poas),
          spend: campaign.cost,
          type: campaignType,
          quadrant: 'Star', // Will be calculated below
          cpa: cpa,
          clicks: campaign.clicks
        };
      });
  };

  const performanceScatterData = getPerformanceScatterData();

  // Calculate averages for reference lines and quadrants
  const avgConversions = performanceScatterData.reduce((sum, d) => sum + d.conversions, 0) / performanceScatterData.length;
  const avgPOAS = performanceScatterData.reduce((sum, d) => sum + d.poas, 0) / performanceScatterData.length;

  // Assign quadrants based on averages
  const dataWithQuadrants = performanceScatterData.map(campaign => ({
    ...campaign,
    quadrant: campaign.conversions >= avgConversions && campaign.poas >= avgPOAS ? 'Star' :
              campaign.conversions < avgConversions && campaign.poas >= avgPOAS ? 'Question Mark' :
              campaign.conversions >= avgConversions && campaign.poas < avgPOAS ? 'Cash Cow' : 'Dog'
  }));

  // Filter data based on selected types
  const filteredData = dataWithQuadrants.filter(d => selectedTypes.includes(d.type));

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'Search': return '#3b82f6';
      case 'Performance Max': return '#10b981';
      case 'Shopping': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'Search': return Target;
      case 'Performance Max': return Award;
      case 'Shopping': return ShoppingBag;
      default: return Target;
    }
  };

  const getQuadrantInfo = (quadrant: string) => {
    const quadrantData: Record<string, {
      title: string;
      description: string;
      strategy: string;
      color: string;
      count: number;
    }> = {
      'Star': {
        title: 'Stars',
        description: 'High conversions, high POAS',
        strategy: 'Invest more - these are your winners',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        count: filteredData.filter(d => d.quadrant === 'Star').length
      },
      'Question Mark': {
        title: 'Question Marks',
        description: 'Low conversions, high POAS',
        strategy: 'Scale up - good efficiency, needs volume',
        color: 'text-green-600 bg-green-50 border-green-200',
        count: filteredData.filter(d => d.quadrant === 'Question Mark').length
      },
      'Cash Cow': {
        title: 'Cash Cows',
        description: 'High conversions, lower POAS',
        strategy: 'Optimize - good volume, improve efficiency',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        count: filteredData.filter(d => d.quadrant === 'Cash Cow').length
      },
      'Dog': {
        title: 'Dogs',
        description: 'Low conversions, low POAS',
        strategy: 'Review or pause - poor performance',
        color: 'text-red-600 bg-red-50 border-red-200',
        count: filteredData.filter(d => d.quadrant === 'Dog').length
      }
    };
    return quadrantData[quadrant];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const IconComponent = getCampaignTypeIcon(data.type);
      const quadrantInfo = getQuadrantInfo(data.quadrant);
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-72">
          <div className="flex items-start space-x-2 mb-3">
            <div className="p-1 rounded" style={{ backgroundColor: getCampaignTypeColor(data.type) + '20' }}>
              <IconComponent className="h-4 w-4" style={{ color: getCampaignTypeColor(data.type) }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{data.name}</p>
              <p className="text-xs text-gray-600 mt-1">{data.type}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs mb-3">
            <div>
              <p className="text-gray-600">Conversions</p>
              <p className="font-semibold text-gray-900">{data.conversions.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-600">POAS</p>
              <p className="font-semibold text-gray-900">{data.poas}%</p>
            </div>
            <div>
              <p className="text-gray-600">Spend</p>
              <p className="font-semibold text-gray-900">€{data.spend.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-600">CPA</p>
              <p className="font-semibold text-gray-900">€{data.cpa.toFixed(2)}</p>
            </div>
          </div>
          
          <div className={`text-xs px-2 py-1 rounded border ${quadrantInfo.color}`}>
            <span className="font-medium">{quadrantInfo.title}</span>
            <p className="mt-1">{quadrantInfo.strategy}</p>
          </div>
        </div>
      );
    }
    return null;
  };

  const toggleCampaignType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Campaign Performance Matrix</h3>
            <button
              onClick={() => setShowQuadrantInfo(!showQuadrantInfo)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600">Conversions vs POAS analysis with strategic quadrants</p>
        </div>
        
        {/* Campaign Type Filters */}
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            {['Search', 'Performance Max', 'Shopping'].map((type) => {
              const IconComponent = getCampaignTypeIcon(type);
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleCampaignType(type)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? getCampaignTypeColor(type) : undefined 
                  }}
                >
                  <IconComponent className="h-3 w-3" />
                  <span>{type}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Quadrant Info Panel */}
      {showQuadrantInfo && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance Quadrants Guide</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {['Star', 'Question Mark', 'Cash Cow', 'Dog'].map((quadrant) => {
              const info = getQuadrantInfo(quadrant);
              return (
                <div key={quadrant} className={`p-3 rounded border ${info.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{info.title}</span>
                    <span className="px-1.5 py-0.5 bg-white rounded text-xs">{info.count}</span>
                  </div>
                  <p className="mb-1">{info.description}</p>
                  <p className="font-medium">{info.strategy}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="h-96 relative">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeWidth={0.75} />
            <XAxis 
              type="number" 
              dataKey="conversions" 
              name="Conversions"
              stroke="#64748b"
              fontSize={11}
              tickLine={true}
            />
            <YAxis 
              type="number" 
              dataKey="poas" 
              name="POAS %" 
              stroke="#64748b"
              fontSize={11}
              tickLine={true}
            />
            
            {/* Reference Lines for Quadrants */}
            <ReferenceLine 
              x={avgConversions} 
              stroke="#94a3b8" 
              strokeDasharray="2 2" 
              strokeWidth={1}
            />
            <ReferenceLine 
              y={avgPOAS} 
              stroke="#94a3b8" 
              strokeDasharray="2 2" 
              strokeWidth={1}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Separate Scatter for each campaign type */}
            {selectedTypes.includes('Search') && (
              <Scatter 
                data={filteredData.filter(d => d.type === 'Search')} 
                fill={getCampaignTypeColor('Search')}
                r={7}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
            {selectedTypes.includes('Performance Max') && (
              <Scatter 
                data={filteredData.filter(d => d.type === 'Performance Max')} 
                fill={getCampaignTypeColor('Performance Max')}
                r={7}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
            {selectedTypes.includes('Shopping') && (
              <Scatter 
                data={filteredData.filter(d => d.type === 'Shopping')} 
                fill={getCampaignTypeColor('Shopping')}
                r={7}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        
        {/* Quadrant Labels */}
        <div className="absolute top-8 left-8 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded shadow-sm">
          Question Mark
        </div>
        <div className="absolute top-8 right-8 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded shadow-sm">
          Stars
        </div>
        <div className="absolute bottom-8 left-8 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded shadow-sm">
          Dogs
        </div>
        <div className="absolute bottom-8 right-8 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded shadow-sm">
          Cash Cows
        </div>
      </div>
    </div>
  );
};

export default CampaignPerformanceMatrix; 