import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Target, Award, ShoppingBag, Search, Hash, Info, Filter } from 'lucide-react';

// Generic data interface that covers all matrix types
interface GenericMatrixData {
  id: string;
  name: string;
  conversions: number;
  poas: number;
  spend: number;
  type: string;
  quadrant: string;
  cpa: number;
  clicks: number;
  campaignName?: string; // For AdGroup and Keyword matrices
  matchType?: string; // For Keyword matrix only
}

// Configuration interface for different matrix types
export interface MatrixConfig {
  title: string;
  description: string;
  filterTypes: string[];
  getTypeColor: (type: string) => string;
  getTypeIcon: (type: string) => React.ComponentType<any>;
  processData: (rawData: any) => GenericMatrixData[];
}

interface GenericPerformanceMatrixProps {
  data: any;
  config: MatrixConfig;
  onItemClick?: (item: GenericMatrixData) => void;
}

const GenericPerformanceMatrix: React.FC<GenericPerformanceMatrixProps> = ({ 
  data, 
  config, 
  onItemClick 
}) => {
  const [selectedTypes, setSelectedTypes] = useState<string[]>(config.filterTypes);
  const [showQuadrantInfo, setShowQuadrantInfo] = useState(false);

  // Process data using the provided config function
  const performanceScatterData = config.processData(data);

  // Calculate averages for reference lines and quadrants
  const avgConversions = performanceScatterData.length > 0 
    ? performanceScatterData.reduce((sum, d) => sum + d.conversions, 0) / performanceScatterData.length 
    : 0;
  const avgPOAS = performanceScatterData.length > 0 
    ? performanceScatterData.reduce((sum, d) => sum + d.poas, 0) / performanceScatterData.length 
    : 0;

  // Assign quadrants based on averages
  const dataWithQuadrants = performanceScatterData.map(item => ({
    ...item,
    quadrant: item.conversions >= avgConversions && item.poas >= avgPOAS ? 'Star' :
              item.conversions < avgConversions && item.poas >= avgPOAS ? 'Question Mark' :
              item.conversions >= avgConversions && item.poas < avgPOAS ? 'Cash Cow' : 'Dog'
  }));

  // Filter data based on selected types
  const filteredData = dataWithQuadrants.filter(d => selectedTypes.includes(d.type));

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const IconComponent = config.getTypeIcon(data.type);
      const quadrantInfo = getQuadrantInfo(data.quadrant);
      
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-72">
          <div className="flex items-start space-x-2 mb-3">
            <div className="p-1 rounded" style={{ backgroundColor: config.getTypeColor(data.type) + '20' }}>
              <IconComponent className="h-4 w-4" style={{ color: config.getTypeColor(data.type) }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{data.name}</p>
              <p className="text-xs text-gray-600 mt-1">{data.type}</p>
              {data.campaignName && (
                <p className="text-xs text-gray-500 mt-1">{data.campaignName}</p>
              )}
              {data.matchType && (
                <p className="text-xs text-gray-500">{data.matchType} Match</p>
              )}
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

  const toggleType = (type: string) => {
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
            <h3 className="text-lg font-semibold text-gray-900">{config.title}</h3>
            <button
              onClick={() => setShowQuadrantInfo(!showQuadrantInfo)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <Info className="h-4 w-4" />
            </button>
          </div>
          <p className="text-sm text-gray-600">{config.description}</p>
        </div>
        
        {/* Type Filters */}
        <div className="flex items-center space-x-3">
          <Filter className="h-4 w-4 text-gray-400" />
          <div className="flex items-center space-x-2">
            {config.filterTypes.map((type) => {
              const IconComponent = config.getTypeIcon(type);
              const isSelected = selectedTypes.includes(type);
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? 'text-white shadow-sm'
                      : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={{ 
                    backgroundColor: isSelected ? config.getTypeColor(type) : undefined 
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
            
            {/* Separate Scatter for each type */}
            {config.filterTypes.map(type => (
              selectedTypes.includes(type) && (
                <Scatter 
                  key={type}
                  data={filteredData.filter(d => d.type === type)} 
                  fill={config.getTypeColor(type)}
                  r={7}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              )
            ))}
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

export default GenericPerformanceMatrix; 