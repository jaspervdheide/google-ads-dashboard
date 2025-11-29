import React from 'react';
import { 
  MousePointer,
  Eye,
  Target,
  Euro,
  CreditCard,
  CheckCircle,
  TrendingUp,
  Percent,
  Calculator,
  Trophy,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { CampaignData } from '../../types';
import { formatKPIValue, calculatePOAS, getKpiChartColor } from '../../utils';

interface KPICardsProps {
  campaignData: CampaignData | null;
  campaignLoading: boolean;
  isRefreshing?: boolean; // Subtle indicator when refreshing data
  kpiPercentageChanges: Record<string, number>;
  selectedChartMetrics: string[];
  onKpiSelection: (kpiId: string) => void;
}

const KPICards: React.FC<KPICardsProps> = ({
  campaignData,
  campaignLoading,
  isRefreshing = false,
  kpiPercentageChanges,
  selectedChartMetrics,
  onKpiSelection
}) => {
  // KPI Configuration
  const kpiConfig = [
    {
      id: 'clicks',
      label: 'Clicks',
      icon: MousePointer,
      color: 'blue',
      bgColor: 'bg-blue-500',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      gradientFrom: 'from-blue-400',
      gradientTo: 'to-blue-600'
    },
    {
      id: 'impressions',
      label: 'Impressions',
      icon: Eye,
      color: 'purple',
      bgColor: 'bg-purple-500',
      textColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      gradientFrom: 'from-purple-400',
      gradientTo: 'to-purple-600'
    },
    {
      id: 'ctr',
      label: 'CTR',
      icon: Target,
      color: 'green',
      bgColor: 'bg-green-500',
      textColor: 'text-green-600',
      borderColor: 'border-green-200',
      gradientFrom: 'from-green-400',
      gradientTo: 'to-green-600'
    },
    {
      id: 'avgCpc',
      label: 'CPC',
      icon: Euro,
      color: 'orange',
      bgColor: 'bg-orange-500',
      textColor: 'text-orange-600',
      borderColor: 'border-orange-200',
      gradientFrom: 'from-orange-400',
      gradientTo: 'to-orange-600'
    },
    {
      id: 'cost',
      label: 'Cost',
      icon: CreditCard,
      color: 'red',
      bgColor: 'bg-red-500',
      textColor: 'text-red-600',
      borderColor: 'border-red-200',
      gradientFrom: 'from-red-400',
      gradientTo: 'to-red-600'
    },
    {
      id: 'conversions',
      label: 'Conversions',
      icon: CheckCircle,
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      textColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      gradientFrom: 'from-emerald-400',
      gradientTo: 'to-emerald-600'
    },
    {
      id: 'conversionsValue',
      label: 'Conversion Value',
      icon: TrendingUp,
      color: 'cyan',
      bgColor: 'bg-cyan-500',
      textColor: 'text-cyan-600',
      borderColor: 'border-cyan-200',
      gradientFrom: 'from-cyan-400',
      gradientTo: 'to-cyan-600'
    },
    {
      id: 'conversionRate',
      label: 'Conversion Rate',
      icon: Percent,
      color: 'indigo',
      bgColor: 'bg-indigo-500',
      textColor: 'text-indigo-600',
      borderColor: 'border-indigo-200',
      gradientFrom: 'from-indigo-400',
      gradientTo: 'to-indigo-600'
    },
    {
      id: 'cpa',
      label: 'CPA',
      icon: Calculator,
      color: 'pink',
      bgColor: 'bg-pink-500',
      textColor: 'text-pink-600',
      borderColor: 'border-pink-200',
      gradientFrom: 'from-pink-400',
      gradientTo: 'to-pink-600'
    },
    {
      id: 'poas',
      label: 'POAS',
      icon: Trophy,
      color: 'yellow',
      bgColor: 'bg-yellow-500',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      gradientFrom: 'from-yellow-400',
      gradientTo: 'to-yellow-600'
    }
  ];

  // Helper function to determine if a change is positive
  const isPositiveChange = (kpiId: string, percentageChange: number): boolean => {
    // For these metrics, lower values are better
    const lowerIsBetter = ['cost', 'avgCpc', 'cpa'];
    const isLowerBetter = lowerIsBetter.includes(kpiId);
    
    // Return true if change is in the desired direction
    return isLowerBetter ? percentageChange < 0 : percentageChange > 0;
  };

  // Get KPI value from campaign data
  const getKPIValue = (kpiId: string, data: CampaignData): number => {
    const value = (() => {
      switch (kpiId) {
        case 'poas':
          return calculatePOAS(data.totals.conversionsValue, data.totals.cost);
        default:
          return data.totals[kpiId as keyof typeof data.totals] as number;
      }
    })();
    
    // Debug: Log calculated values with more detail
    console.log(`📊 KPI ${kpiId} calculation:`, {
      kpiId,
      calculatedValue: value,
      conversionsValue: data.totals.conversionsValue,
      cost: data.totals.cost,
      roas: data.totals.roas,
      rawTotals: data.totals
    });
    
    return value;
  };

  // Only return null if no data and still loading for the first time
  if (!campaignData && campaignLoading) {
    return null;
  }

  // If we have no data at all, don't render
  if (!campaignData) {
    return null;
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8 transition-opacity duration-300 ${isRefreshing ? 'opacity-70' : 'opacity-100'}`}>
      {kpiConfig.map((kpi) => {
        const IconComponent = kpi.icon;
        const value = getKPIValue(kpi.id, campaignData);
        const formattedValue = formatKPIValue(kpi.id, value);
        
        // Use static percentage change from state
        const percentageChange = kpiPercentageChanges[kpi.id] || 0;
        const isPositive = isPositiveChange(kpi.id, percentageChange);
        

        
        return (
          <div
            key={kpi.id}
            className="group relative cursor-pointer transition-all duration-200 hover:-translate-y-1"
            style={{
              height: '160px',
              background: 'white',
              boxShadow: selectedChartMetrics.includes(kpi.id) 
                ? `0 1px 3px rgba(0, 0, 0, 0.1), 0 0 0 1px ${getKpiChartColor(kpi.id, selectedChartMetrics)}`
                : '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: selectedChartMetrics.includes(kpi.id) 
                ? 'none'
                : '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '24px'
            }}
            onClick={() => onKpiSelection(kpi.id)}
          >
            {/* Clean Icon */}
            <div 
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
              style={{
                backgroundColor: selectedChartMetrics.includes(kpi.id) 
                  ? `${getKpiChartColor(kpi.id, selectedChartMetrics)}20` 
                  : '#f3f4f6',
                border: selectedChartMetrics.includes(kpi.id)
                  ? `1px solid ${getKpiChartColor(kpi.id, selectedChartMetrics)}`
                  : '1px solid transparent'
              }}
            >
              <IconComponent 
                className="h-4 w-4" 
                style={{ 
                  color: selectedChartMetrics.includes(kpi.id) 
                    ? getKpiChartColor(kpi.id, selectedChartMetrics) 
                    : '#6b7280' 
                }}
              />
            </div>
            
            {/* Value */}
            <div className="mb-2">
              <div className="text-2xl font-bold text-gray-900 leading-tight">
                {formattedValue}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {kpi.label}
              </div>
            </div>
            
            {/* Enhanced Status Label */}
            <div className="flex items-center justify-between">
              <div 
                className="text-xs font-semibold px-2 py-1 rounded-md border"
                style={{
                  color: Math.abs(percentageChange) >= 20 
                    ? isPositive ? '#047857' : '#dc2626'
                    : Math.abs(percentageChange) >= 10
                    ? isPositive ? '#047857' : '#dc2626'
                    : Math.abs(percentageChange) >= 5
                    ? '#d97706'
                    : '#6b7280',
                  backgroundColor: Math.abs(percentageChange) >= 20 
                    ? isPositive ? '#f0fdf4' : '#fef2f2'
                    : Math.abs(percentageChange) >= 10
                    ? isPositive ? '#f0fdf4' : '#fef2f2'
                    : Math.abs(percentageChange) >= 5
                    ? '#fffbeb'
                    : '#f9fafb',
                  borderColor: Math.abs(percentageChange) >= 20 
                    ? isPositive ? '#bbf7d0' : '#fecaca'
                    : Math.abs(percentageChange) >= 10
                    ? isPositive ? '#bbf7d0' : '#fecaca'
                    : Math.abs(percentageChange) >= 5
                    ? '#fed7aa'
                    : '#e5e7eb'
                }}
              >
                {Math.abs(percentageChange) >= 20 
                  ? isPositive ? 'Excellent' : 'Needs Attention'
                  : Math.abs(percentageChange) >= 10
                  ? isPositive ? 'Good' : 'Declining'
                  : Math.abs(percentageChange) >= 5
                  ? 'Stable'
                  : 'Minimal Change'
                }
              </div>
              
              {/* Minimal Percentage */}
              <div className="flex items-center space-x-1">
                {percentageChange >= 0 ? (
                  <ArrowUp className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                ) : (
                  <ArrowDown className={`h-3 w-3 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
                )}
                <span 
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: isPositive ? '#dcfce7' : '#fef2f2',
                    color: isPositive ? '#166534' : '#dc2626'
                  }}
                >
                  {Math.abs(percentageChange).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {/* Clean selection indicator */}
            {selectedChartMetrics.includes(kpi.id) && (
              <div className="absolute top-3 right-3">
                <div 
                  className="w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: getKpiChartColor(kpi.id, selectedChartMetrics) }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default KPICards; 