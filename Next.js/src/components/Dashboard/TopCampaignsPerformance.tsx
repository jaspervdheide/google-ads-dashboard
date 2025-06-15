import React from 'react';
import TopPerformanceComponent from './TopPerformanceComponent';
import { topCampaignsConfig } from '../../utils/topPerformanceConfigs';

interface TopCampaignsPerformanceProps {
  campaignData: any;
  onCampaignClick?: (campaign: any) => void;
}

const TopCampaignsPerformance: React.FC<TopCampaignsPerformanceProps> = ({ campaignData, onCampaignClick }) => {
  return (
    <TopPerformanceComponent 
      data={campaignData}
      config={topCampaignsConfig}
      onItemClick={onCampaignClick}
    />
  );
};

export default TopCampaignsPerformance; 