import React from 'react';
import TopPerformanceComponent from './TopPerformanceComponent';
import { topAdGroupsConfig } from '../../utils/topPerformanceConfigs';

interface TopAdGroupsPerformanceProps {
  adGroupData: any;
  onAdGroupClick?: (adGroup: any) => void;
}

const TopAdGroupsPerformance: React.FC<TopAdGroupsPerformanceProps> = ({ adGroupData, onAdGroupClick }) => {
  return (
    <TopPerformanceComponent 
      data={adGroupData}
      config={topAdGroupsConfig}
      onItemClick={onAdGroupClick}
    />
  );
};

export default TopAdGroupsPerformance; 