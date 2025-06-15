import React from 'react';
import TopPerformanceComponent from './TopPerformanceComponent';
import { topKeywordsConfig } from '../../utils/topPerformanceConfigs';

interface TopKeywordsPerformanceProps {
  keywordData: any;
  onKeywordClick?: (keyword: any) => void;
}

const TopKeywordsPerformance: React.FC<TopKeywordsPerformanceProps> = ({ keywordData, onKeywordClick }) => {
  return (
    <TopPerformanceComponent 
      data={keywordData}
      config={topKeywordsConfig}
      onItemClick={onKeywordClick}
    />
  );
};

export default TopKeywordsPerformance; 