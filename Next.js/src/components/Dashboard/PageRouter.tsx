import React from 'react';
import DashboardView from './DashboardView';
import AdGroupsView from './AdGroupsView';
import AnalyticsView from './AnalyticsView';
import KeywordsWrapper from './KeywordsWrapper';
import SettingsView from './SettingsView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  adGroupsProps: any;
  analyticsProps: any;
  keywordsProps: any;
  settingsProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  adGroupsProps,
  analyticsProps,
  keywordsProps,
  settingsProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'campaigns':
      return <AdGroupsView {...adGroupsProps} />;
    
    case 'analytics':
      return <AnalyticsView {...analyticsProps} />;
    
    case 'keywords':
      return <KeywordsWrapper {...keywordsProps} />;
    
    case 'settings':
      return <SettingsView {...settingsProps} />;
    
    default:
      return <DashboardView {...dashboardProps} />;
  }
} 