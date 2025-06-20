import React from 'react';
import DashboardView from './DashboardView';
import AdGroupsView from './AdGroupsView';
import ProductsView from './ProductsView';
import AnalyticsView from './AnalyticsView';
import KeywordsWrapper from './KeywordsWrapper';
import SettingsView from './SettingsView';
import MccOverviewView from './MccOverviewView';

interface PageRouterProps {
  currentPage: string;
  dashboardProps: any;
  adGroupsProps: any;
  productsProps: any;
  analyticsProps: any;
  keywordsProps: any;
  settingsProps: any;
  mccOverviewProps: any;
}

export default function PageRouter({
  currentPage,
  dashboardProps,
  adGroupsProps,
  productsProps,
  analyticsProps,
  keywordsProps,
  settingsProps,
  mccOverviewProps
}: PageRouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <DashboardView {...dashboardProps} />;
    
    case 'campaigns':
      return <AdGroupsView {...adGroupsProps} />;
    
    case 'products':
      return <ProductsView {...productsProps} />;
    
    case 'analytics':
      return <AnalyticsView {...analyticsProps} />;
    
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