import React from 'react';
import DashboardView from './DashboardView';
import AdGroupsView from './AdGroupsView';
import KeywordsWrapper from './KeywordsWrapper';
import SettingsView from './SettingsView';
import MccOverviewView from './MccOverviewView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  adGroupsProps: any;
  keywordsProps: any;
  settingsProps: any;
  mccOverviewProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  adGroupsProps,
  keywordsProps,
  settingsProps,
  mccOverviewProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'campaigns':
      return <AdGroupsView {...adGroupsProps} />;
    
    case 'keywords':
      return <KeywordsWrapper {...keywordsProps} />;
    
    case 'settings':
      return <SettingsView {...settingsProps} />;
    
    case 'mcc-overview':
      return <MccOverviewView {...mccOverviewProps} />;
    
    default:
      return <DashboardView {...dashboardProps} />;
  }
}
