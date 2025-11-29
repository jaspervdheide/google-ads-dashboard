import React from 'react';
import DashboardView from './DashboardView';
import SettingsView from './SettingsView';
import MccOverviewView from './MccOverviewView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  settingsProps: any;
  mccOverviewProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  settingsProps,
  mccOverviewProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'settings':
      return <SettingsView {...settingsProps} />;
    
    case 'mcc-overview':
      return <MccOverviewView {...mccOverviewProps} />;
    
    default:
      return <DashboardView {...dashboardProps} />;
  }
}
