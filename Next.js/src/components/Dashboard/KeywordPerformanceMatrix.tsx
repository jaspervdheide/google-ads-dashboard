import React, { useState, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Info, Filter, Search, Target, Hash } from 'lucide-react';

interface KeywordMatrixData {
  id: string;
  name: string;
  conversions: number;
  poas: number;
  spend: number;
  type: string;
  quadrant: string;
  cpa: number;
  clicks: number;
  campaignName: string;
  matchType: string;
}

interface KeywordPerformanceMatrixProps {
  keywordData: any;
  onKeywordClick?: (keyword: KeywordMatrixData) => void;
}

const KeywordPerformanceMatrix: React.FC<KeywordPerformanceMatrixProps> = ({ keywordData, onKeywordClick }) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['Keywords', 'Search Terms']);
  const [showQuadrantInfo, setShowQuadrantInfo] = useState(false);

  const getPerformanceScatterData = (): KeywordMatrixData[] => {
    if (!keywordData?.data || keywordData.data.length === 0) {
      // Sample data when no real data is available
      return [
        {
          id: '1',
          name: 'google ads management',
          conversions: 245,
          poas: 520,
          spend: 4508,
          type: 'Keywords',
          quadrant: 'Star',
          cpa: 18.4,
          clicks: 1250,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '2',
          name: 'digital marketing agency',
          conversions: 198,
          poas: 445,
          spend: 4792,
          type: 'Search Terms',
          quadrant: 'Star',
          cpa: 24.2,
          clicks: 1180,
          campaignName: 'Search - Generic High Intent',
          matchType: 'PHRASE'
        },
        {
          id: '3',
          name: 'ppc management services',
          conversions: 165,
          poas: 385,
          spend: 4769,
          type: 'Keywords',
          quadrant: 'Cash Cow',
          cpa: 28.9,
          clicks: 1095,
          campaignName: 'Search - Services',
          matchType: 'PHRASE'
        },
        {
          id: '4',
          name: 'google advertising consultant',
          conversions: 142,
          poas: 295,
          spend: 5084,
          type: 'Search Terms',
          quadrant: 'Cash Cow',
          cpa: 35.8,
          clicks: 985,
          campaignName: 'Search - Competitor Terms',
          matchType: 'BROAD'
        },
        {
          id: '5',
          name: 'adwords optimization',
          conversions: 128,
          poas: 225,
          spend: 5414,
          type: 'Keywords',
          quadrant: 'Dog',
          cpa: 42.3,
          clicks: 875,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '6',
          name: 'search engine marketing',
          conversions: 95,
          poas: 285,
          spend: 3677,
          type: 'Search Terms',
          quadrant: 'Dog',
          cpa: 38.7,
          clicks: 745,
          campaignName: 'Search - Generic High Intent',
          matchType: 'BROAD'
        },
        {
          id: '7',
          name: 'pay per click advertising',
          conversions: 85,
          poas: 195,
          spend: 3245,
          type: 'Keywords',
          quadrant: 'Question Mark',
          cpa: 38.2,
          clicks: 625,
          campaignName: 'Search - Services',
          matchType: 'PHRASE'
        },
        {
          id: '8',
          name: 'online marketing consultant',
          conversions: 75,
          poas: 165,
          spend: 2895,
          type: 'Search Terms',
          quadrant: 'Question Mark',
          cpa: 38.6,
          clicks: 545,
          campaignName: 'Search - Competitor Terms',
          matchType: 'BROAD'
        },
        {
          id: '9',
          name: 'google ads specialist',
          conversions: 65,
          poas: 145,
          spend: 2456,
          type: 'Keywords',
          quadrant: 'Dog',
          cpa: 37.8,
          clicks: 485,
          campaignName: 'Search - Brand Terms',
          matchType: 'EXACT'
        },
        {
          id: '10',
          name: 'digital advertising agency',
          conversions: 55,
          poas: 125,
          spend: 2145,
          type: 'Search Terms',
          quadrant: 'Dog',
          cpa: 39.0,
          clicks: 425,
          campaignName: 'Search - Generic High Intent',
          matchType: 'BROAD'
        }
      ];
    }

    // Process real keyword data
    return keywordData.data
      .filter((keyword: any) => keyword.conversions > 0 && keyword.cost > 0)
      .slice(0, 10)
      .map((keyword: any, index: number) => {
        const conversions = keyword.conversions;
        const poas = keyword.conversions_value && keyword.cost > 0 
          ? (keyword.conversions_value / keyword.cost) * 100 
          : Math.random() * 300 + 100;

        // Determine quadrant based on performance
        let quadrant = 'Dog';
        if (conversions > 100 && poas > 300) quadrant = 'Star';
        else if (conversions > 100 && poas <= 300) quadrant = 'Cash Cow';
        else if (conversions <= 100 && poas > 300) quadrant = 'Question Mark';

        return {
          id: keyword.id || `keyword-${index}`,
          name: keyword.keyword_text,
          conversions: conversions,
          poas: Math.round(poas),
          spend: keyword.cost,
          type: keyword.type === 'search_term' ? 'Search Terms' : 'Keywords',
          quadrant: quadrant,
          cpa: keyword.cost && keyword.conversions > 0 ? keyword.cost / keyword.conversions : 0,
          clicks: keyword.clicks,
          campaignName: keyword.campaign_name || 'Unknown Campaign',
          matchType: keyword.match_type || 'BROAD'
        };
      });
  };

  const scatterData = getPerformanceScatterData();
  
  // Filter data based on selected types
  const filteredData = scatterData.filter(item => selectedTypes.includes(item.type));

  // Calculate averages for reference lines
  const avgConversions = filteredData.length > 0 
    ? filteredData.reduce((sum, item) => sum + item.conversions, 0) / filteredData.length 
    : 0;
  const avgPOAS = filteredData.length > 0 
    ? filteredData.reduce((sum, item) => sum + item.poas, 0) / filteredData.length 
    : 0;

  const getKeywordTypeColor = (type: string) => {
    switch (type) {
      case 'Keywords': return '#3b82f6';
      case 'Search Terms': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getKeywordTypeIcon = (type: string) => {
    switch (type) {
      case 'Keywords': return Target;
      case 'Search Terms': return Search;
      default: return Hash;
    }
  };

  const getQuadrantInfo = (quadrant: string) => {
    const quadrantCounts = {
      'Star': filteredData.filter(d => d.quadrant === 'Star').length,
      'Question Mark': filteredData.filter(d => d.quadrant === 'Question Mark').length,
      'Cash Cow': filteredData.filter(d => d.quadrant === 'Cash Cow').length,
      'Dog': filteredData.filter(d => d.quadrant === 'Dog').length
    };

    const quadrantData = {
      'Star': {
        title: 'Stars',
        description: 'High conversions, high POAS',
        strategy: 'Invest more budget',
        color: 'text-blue-600 bg-blue-50 border-blue-200',
        count: quadrantCounts['Star']
      },
      'Question Mark': {
        title: 'Question Marks',
        description: 'Low conversions, high POAS',
        strategy: 'Increase bids & budget',
        color: 'text-green-600 bg-green-50 border-green-200',
        count: quadrantCounts['Question Mark']
      },
      'Cash Cow': {
        title: 'Cash Cows',
        description: 'High conversions, low POAS',
        strategy: 'Optimize for efficiency',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
        count: quadrantCounts['Cash Cow']
      },
      'Dog': {
        title: 'Dogs',
        description: 'Low conversions, low POAS',
        strategy: 'Consider pausing',
        color: 'text-red-600 bg-red-50 border-red-200',
        count: quadrantCounts['Dog']
      }
    };

    return quadrantData[quadrant as keyof typeof quadrantData];
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const quadrantInfo = getQuadrantInfo(data.quadrant);
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-xs">
          <div className="flex items-start space-x-3 mb-3">
            <div className={`p-2 rounded ${quadrantInfo.color}`}>
              <Hash className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{data.name}</p>
              <p className="text-xs text-gray-600 mt-1">{data.type}</p>
              <p className="text-xs text-gray-500 mt-1">{data.campaignName}</p>
              <p className="text-xs text-gray-500">{data.matchType} Match</p>
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

  const toggleKeywordType = (type: string) => {
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
            <h3 className="text-lg font-semibold text-gray-900">Keyword Performance Matrix</h3>
            <button
              onClick={() => setShowQuadrantInfo(!showQuadrantInfo)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600">Conversions vs POAS analysis with strategic quadrants</p>
        </div>
        
        {/* Keyword Type Filters */}
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            {['Keywords', 'Search Terms'].map((type) => {
              const IconComponent = getKeywordTypeIcon(type);
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleKeywordType(type)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? getKeywordTypeColor(type) : undefined 
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
            
            {/* Separate Scatter for each keyword type */}
            {selectedTypes.includes('Keywords') && (
              <Scatter 
                data={filteredData.filter(d => d.type === 'Keywords')} 
                fill={getKeywordTypeColor('Keywords')}
                r={7}
                stroke="#ffffff"
                strokeWidth={2}
              />
            )}
            {selectedTypes.includes('Search Terms') && (
              <Scatter 
                data={filteredData.filter(d => d.type === 'Search Terms')} 
                fill={getKeywordTypeColor('Search Terms')}
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

export default KeywordPerformanceMatrix; 