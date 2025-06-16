import React from 'react';
import TopPerformanceComponent from './TopPerformanceComponent';
import { topCampaignsConfig } from '../../utils/topPerformanceConfigs';

interface TopCampaignsPerformanceProps {
  campaignData: any;
  onCampaignClick?: (campaign: any) => void;
}

const TopCampaignsPerformance: React.FC<TopCampaignsPerformanceProps> = ({ campaignData, onCampaignClick }) => {
  // Calculate KPI metrics from campaign data
  const calculateKPIs = () => {
    if (!campaignData?.campaigns || campaignData.campaigns.length === 0) {
      return {
        totalCampaigns: 0,
        avgConversions: 0,
        avgPOAS: 0,
        totalSpend: 0,
        topPerformer: null
      };
    }

    const campaigns = campaignData.campaigns;
    const activeCampaigns = campaigns.filter((c: any) => c.status === 'ENABLED');
    
    const totalConversions = activeCampaigns.reduce((sum: number, c: any) => sum + (c.conversions || 0), 0);
    const totalSpend = activeCampaigns.reduce((sum: number, c: any) => sum + (c.cost || 0), 0);
    const totalConversionsValue = activeCampaigns.reduce((sum: number, c: any) => sum + (c.conversionsValue || 0), 0);
    
    const avgConversions = activeCampaigns.length > 0 ? totalConversions / activeCampaigns.length : 0;
    const avgPOAS = totalSpend > 0 ? (totalConversionsValue / totalSpend) * 100 : 0;
    
    // Find top performer by conversions
    const topPerformer = activeCampaigns.reduce((best: any, current: any) => 
      (current.conversions || 0) > (best.conversions || 0) ? current : best, 
      activeCampaigns[0] || null
    );

    return {
      totalCampaigns: activeCampaigns.length,
      avgConversions: avgConversions,
      avgPOAS: avgPOAS,
      totalSpend: totalSpend,
      topPerformer: topPerformer
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 h-full flex flex-col">
      {/* Header with KPI Summary */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Campaign Performance Overview</h3>
          <p className="text-sm text-gray-600 mt-1">
            {kpis.totalCampaigns} active campaigns • Avg POAS {kpis.avgPOAS.toFixed(0)}% • €{kpis.totalSpend.toLocaleString()} total spend
          </p>
        </div>
      </div>

      {/* Top Performance Component */}
      <div className="flex-1">
        <TopPerformanceComponent 
          data={campaignData}
          config={topCampaignsConfig}
          onItemClick={onCampaignClick}
        />
      </div>
    </div>
  );
};

export default TopCampaignsPerformance; 